import React, { useState, useRef } from 'react';
import CosmicBackButton from '../../shared/components/CosmicBackButton';
import { addGalleryItem } from '../../shared/utils/storageService';
import { readClipboardText, copyTextToClipboard } from '../../shared/utils/clipboard';
import { downloadFromUrl } from '../../shared/utils/fileDownload';
import {
  Smartphone,
  Search,
  Download,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Clipboard,
  ShieldCheck,
  MessageCircle,
  Link2,
  User,
  Heart,
  Clock,
  Layers,
  FileCode,
  Video,
  ChevronRight,
} from 'lucide-react';

// ─── 5 Tahap Pemindaian Komentar ───
const SCAN_STEPS = [
  { id: 1, num: '01', title: 'Validasi Link TikTok', desc: 'Menganalisis URL video & shortlink' },
  { id: 2, num: '02', title: 'Ambil Komentar', desc: 'Mengambil thread komentar (termasuk reply)' },
  { id: 3, num: '03', title: 'Filter Link AM', desc: 'Regex link Alight Motion & shortlink' },
  { id: 4, num: '04', title: 'Resolve Shortlink', desc: 'Membuka link pendek ke project asli' },
  { id: 5, num: '05', title: 'Kumpulkan Preset', desc: 'Mengelompokkan link + metadata komentar' },
];

export default function AlightFinderScreen({ onBack, onShowToast }) {
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [error, setError] = useState('');
  const [resultData, setResultData] = useState(null); // { video_info, comments_count, links: [] }
  const [copiedId, setCopiedId] = useState(null);
  const inputRef = useRef(null);

  // ─── Tempel dari clipboard ───
  const handlePaste = async () => {
    const res = await readClipboardText();
    if (res.success && res.text) {
      setInputQuery(res.text);
      setError('');
      inputRef.current?.focus();
      onShowToast?.('Tautan TikTok ditempel!');
    } else {
      inputRef.current?.focus();
      onShowToast?.(res.message || 'Papan klip kosong.');
    }
  };

  // ─── Pencarian utama ───
  const handleSearch = async (e, directQuery = null) => {
    if (e) e.preventDefault();
    const targetQuery = (directQuery ?? inputQuery).trim();

    if (!targetQuery) {
      setError('Masukkan tautan video TikTok terlebih dahulu.');
      return;
    }

    setLoading(true);
    setHasStarted(true);
    setActiveStepIndex(0);
    setError('');
    setResultData(null);

    const t1 = setTimeout(() => setActiveStepIndex(1), 300);
    const t2 = setTimeout(() => setActiveStepIndex(2), 700);
    const t3 = setTimeout(() => setActiveStepIndex(3), 1200);

    try {
      const res = await fetch('/api/alight-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: targetQuery }),
      });

      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      setActiveStepIndex(3);
      await new Promise((r) => setTimeout(r, 250));

      const contentType = res.headers.get('content-type') || '';
      let data = contentType.includes('application/json')
        ? await res.json()
        : JSON.parse(await res.text() || '{}');

      if (res.ok && data?.success && data?.data) {
        setActiveStepIndex(4);
        setResultData(data.data);
        onShowToast?.(`Ditemukan ${data.data.links?.length || 0} link Alight Motion!`);
      } else {
        throw new Error(data?.message || 'Tidak ada link Alight Motion di komentar video ini.');
      }
    } catch (err) {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      setError(err.message || 'Gagal memindai komentar TikTok.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Salin link ───
  const handleCopy = async (text, id) => {
    if (!text) return;
    const res = await copyTextToClipboard(text);
    if (res.success) {
      setCopiedId(id);
      onShowToast?.('Link berhasil disalin!');
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      onShowToast?.(res.message || 'Gagal menyalin.');
    }
  };

  // ─── Buka deep link AM ───
  const handleOpenAlight = (url) => {
    if (!url) return;
    // Deep link resmi Alight Motion
    const amDeepLink = `alightcreative://am?url=${encodeURIComponent(url)}`;
    let didBlur = false;
    const onBlur = () => { didBlur = true; };
    window.addEventListener('blur', onBlur, { once: true });

    window.location.href = amDeepLink;

    setTimeout(() => {
      window.removeEventListener('blur', onBlur);
      if (!didBlur) window.open(url, '_blank', 'noopener,noreferrer');
    }, 1200);
  };

  // ─── Unduh / simpan ke galeri ───
  const handleSaveToGallery = (link) => {
    try {
      addGalleryItem({
        title: link.title || 'Preset Alight Motion TikTok',
        type: 'document',
        category: 'Link AM Komentar',
        extension: 'XML',
        size: link.size || '-',
        previewUrl: link.author_avatar || null,
        downloadData: link.url,
        filename: `am_${Date.now()}.xml`,
      });
      onShowToast?.('Disimpan ke galeri!');
    } catch {
      onShowToast?.('Gagal menyimpan ke galeri.');
    }
  };

  const links = resultData?.links || [];
  const videoInfo = resultData?.video_info;

  return (
    <main className="flex-grow w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-black">
      {/* Back */}
      <div className="mb-5">
        <CosmicBackButton onClick={onBack} label="Kembali ke Beranda" />
      </div>

      {/* ─── CARD PENCARIAN ─── */}
      <div className="rounded-2xl p-5 sm:p-7 border-2 border-black bg-white shadow-[4px_4px_0px_#000000] mb-6">
        <div className="flex items-center gap-3.5 pb-4 border-b-2 border-black">
          <div className="w-11 h-11 rounded-xl border-2 border-black bg-black text-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000000]">
            <Smartphone className="w-6 h-6 stroke-[2.2] text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight font-display">
              Cari Link Alight Motion di Komentar
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 font-mono mt-0.5">
              Tempel link TikTok — sistem akan memindai seluruh komentar & reply untuk menemukan link preset Alight Motion.
            </p>
          </div>
        </div>

        {/* Input + Cari */}
        <form onSubmit={handleSearch} className="mt-5 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 stroke-[2.5]" />
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => { setInputQuery(e.target.value); setError(''); }}
              disabled={loading}
              placeholder="Tempel link TikTok (https://vt.tiktok.com/... atau https://www.tiktok.com/@user/video/...)"
              className="w-full pl-10 pr-24 py-3.5 rounded-xl border-2 border-black bg-neutral-50 text-xs sm:text-sm font-mono outline-none focus:bg-white focus:shadow-[3px_3px_0px_#000000] placeholder:text-neutral-400 transition-all disabled:bg-neutral-100"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {inputQuery && (
                <button type="button" onClick={() => { setInputQuery(''); setError(''); }}
                  className="px-2 py-1 text-xs font-mono text-neutral-500 hover:text-black cursor-pointer">
                  Clear
                </button>
              )}
              <button type="button" onClick={handlePaste} disabled={loading}
                className="px-2.5 py-1 text-[11px] font-mono font-bold bg-neutral-100 hover:bg-neutral-200 rounded border border-black shadow-[1px_1px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1">
                <Clipboard className="w-3 h-3 stroke-[2.5]" />
                <span>Tempel</span>
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl border-2 border-black bg-black text-white font-extrabold text-xs sm:text-sm shadow-[3px_3px_0px_#000000] hover:bg-neutral-800 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin text-white" /><span>Memindai Komentar...</span></>
            ) : (
              <><Sparkles className="w-4 h-4 text-amber-400" /><span>Cari Link AM</span></>
            )}
          </button>
        </form>

        {/* 5-Step Progress */}
        {(loading || resultData || hasStarted) && (
          <div className="mt-5 space-y-3 pt-3 border-t-2 border-black animate-in fade-in duration-200">
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
              {SCAN_STEPS.map((st, idx) => {
                const isDone = !!resultData || idx < activeStepIndex;
                const isActive = loading && idx === activeStepIndex;
                return (
                  <div key={st.id}
                    className={`relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-200 min-h-[48px] select-none ${
                      isDone ? 'bg-emerald-100 border-black shadow-[2px_2px_0px_#000000]'
                      : isActive ? 'bg-amber-100 border-black shadow-[3px_3px_0px_#000000] scale-[1.03] ring-2 ring-black'
                      : 'bg-neutral-100 border-neutral-300 text-neutral-400 opacity-60'
                    }`}>
                    <span className="font-mono font-black text-xs sm:text-sm">{st.num}</span>
                    {isDone && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full border border-black flex items-center justify-center text-[9px] font-black">✓</span>}
                    {isActive && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 rounded-full border border-black flex items-center justify-center text-[9px] font-black animate-pulse">•</span>}
                  </div>
                );
              })}
            </div>
            <div className="p-3 rounded-xl border-2 border-black bg-neutral-50 shadow-[2px_2px_0px_#000000] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-mono font-black text-xs shrink-0">
                {SCAN_STEPS[activeStepIndex]?.num}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black font-mono truncate">
                    {SCAN_STEPS[activeStepIndex]?.title}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-black shrink-0 ${
                    resultData ? 'bg-emerald-200 text-emerald-900'
                    : error ? 'bg-rose-200 text-rose-900'
                    : 'bg-amber-200 text-amber-900 animate-pulse'
                  }`}>
                    {resultData ? 'Selesai' : error ? 'Gagal' : 'Proses'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-neutral-600 font-mono truncate mt-0.5">
                  {SCAN_STEPS[activeStepIndex]?.desc}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 rounded-xl border-2 border-rose-500 bg-rose-50 text-rose-950 text-xs font-mono flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5] text-rose-600" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* ─── HASIL ─── */}
      {resultData && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Ringkasan Video */}
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0px_#000000] flex items-start gap-3">
            {videoInfo?.cover && (
              <img src={videoInfo.cover} alt="cover"
                className="w-16 h-20 object-cover rounded-lg border-2 border-black shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-black text-white text-[10px] font-mono font-bold">
                  <Video className="w-3 h-3 text-pink-400" />
                  <span>Video TikTok</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-emerald-100 text-emerald-950 text-[10px] font-mono font-bold">
                  <MessageCircle className="w-3 h-3" />
                  <span>{resultData.comments_count || 0} Komentar Dipindai</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-cyan-100 text-cyan-950 text-[10px] font-mono font-bold">
                  <Link2 className="w-3 h-3" />
                  <span>{links.length} Link Ditemukan</span>
                </span>
              </div>
              <h2 className="text-sm font-black mt-2 line-clamp-2">
                {videoInfo?.title || 'Video TikTok'}
              </h2>
              <p className="text-[11px] font-mono text-neutral-600 mt-1 flex items-center gap-1">
                <User className="w-3 h-3" />
                @{videoInfo?.author || 'unknown'}
              </p>
            </div>
          </div>

          {/* Daftar Link */}
          {links.length === 0 ? (
            <div className="p-6 rounded-2xl border-2 border-black bg-neutral-50 shadow-[4px_4px_0px_#000000] text-center">
              <AlertCircle className="w-10 h-10 mx-auto text-neutral-400 mb-2" />
              <h3 className="font-black text-sm">Tidak ada link Alight Motion</h3>
              <p className="text-xs font-mono text-neutral-600 mt-1">
                Komentar pada video ini tidak mengandung link preset Alight Motion.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link, i) => (
                <div key={link.id || i}
                  className="rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0px_#000000]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-mono font-black text-xs shrink-0 border border-black">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Metadata komentar */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-black">
                          <User className="w-3 h-3" />
                          @{link.comment_author || 'anonymous'}
                        </span>
                        {link.likes > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-600">
                            <Heart className="w-3 h-3 text-rose-500" />
                            {link.likes}
                          </span>
                        )}
                        {link.comment_time && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-500">
                            <Clock className="w-3 h-3" />
                            {link.comment_time}
                          </span>
                        )}
                      </div>

                      {/* Teks komentar asli */}
                      <p className="text-xs font-mono text-neutral-700 italic mb-2 line-clamp-2">
                        "{link.comment_text || '-'}"
                      </p>

                      {/* Badge tipe link */}
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-cyan-100 text-cyan-950 text-[10px] font-mono font-bold">
                          {link.is_shortlink ? <Link2 className="w-3 h-3" /> : <FileCode className="w-3 h-3" />}
                          <span>{link.is_shortlink ? 'Shortlink' : 'Direct Link'}</span>
                        </span>
                        {link.file_type && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-amber-100 text-amber-950 text-[10px] font-mono font-bold">
                            <Layers className="w-3 h-3" />
                            {link.file_type}
                          </span>
                        )}
                        {link.size && (
                          <span className="text-[10px] font-mono text-neutral-500">{link.size}</span>
                        )}
                      </div>

                      {/* URL */}
                      <div className="p-2 rounded-lg bg-neutral-100 border border-neutral-300 font-mono text-[11px] text-neutral-700 break-all mb-2">
                        {link.url}
                      </div>

                      {/* Aksi */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => handleOpenAlight(link.url)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-black bg-black text-white hover:bg-neutral-800 text-[11px] font-mono font-black shadow-[2px_2px_0px_#000000] cursor-pointer">
                          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Impor ke AM</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>

                        <a href={link.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black bg-neutral-100 hover:bg-neutral-200 text-[11px] font-mono font-bold">
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka</span>
                        </a>

                        <button type="button" onClick={() => handleCopy(link.url, link.id || i)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black bg-neutral-100 hover:bg-neutral-200 text-[11px] font-mono font-bold cursor-pointer">
                          {copiedId === (link.id || i) ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === (link.id || i) ? 'Tersalin' : 'Salin'}</span>
                        </button>

                        <button type="button" onClick={() => handleSaveToGallery(link)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black bg-neutral-100 hover:bg-neutral-200 text-[11px] font-mono font-bold cursor-pointer">
                          <Download className="w-3.5 h-3.5" />
                          <span>Simpan</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
      }
