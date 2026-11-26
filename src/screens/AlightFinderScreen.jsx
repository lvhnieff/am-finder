import React, { useState, useRef, useCallback } from 'react';
import CosmicBackButton from '../../shared/components/CosmicBackButton';
import {
  Smartphone, Search, Copy, Check, Loader2, ExternalLink,
  AlertCircle, Sparkles, Clipboard, MessageCircle, Link2,
  User, Heart, Clock, FileCode, Video, ChevronRight,
  Download, ArrowLeft
} from 'lucide-react';

/* ─────────────── INLINE HELPERS ─────────────── */

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }
};

const readClipboard = async () => {
  try { return await navigator.clipboard.readText(); }
  catch { return ''; }
};

const saveHistory = (item) => {
  try {
    const key = 'kuro_gallery';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift({ ...item, id: Date.now(), createdAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
    return true;
  } catch { return false; }
};

/* ─────────────── 5 TAHAP SCAN ─────────────── */
const SCAN_STEPS = [
  { num: '01', title: 'Validasi Link TikTok', desc: 'Menganalisis URL video & shortlink' },
  { num: '02', title: 'Ambil Komentar', desc: 'Mengambil thread komentar & reply' },
  { num: '03', title: 'Filter Link AM', desc: 'Regex link Alight Motion & shortlink' },
  { num: '04', title: 'Resolve Shortlink', desc: 'Membuka link pendek ke URL asli' },
  { num: '05', title: 'Kumpulkan Preset', desc: 'Mengelompokkan link + metadata' },
];

/* ─────────────── KOMPONEN UTAMA ─────────────── */
export default function AlightFinderScreen({ onBack, onShowToast }) {
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const inputRef = useRef(null);

  const toast = useCallback((msg) => onShowToast?.(msg), [onShowToast]);

  const handlePaste = async () => {
    const text = await readClipboard();
    if (text) {
      setInputQuery(text);
      setError('');
      inputRef.current?.focus();
      toast('Tautan ditempel!');
    } else {
      toast('Papan klip kosong.');
    }
  };

  const handleSearch = async (e, direct = null) => {
    if (e) e.preventDefault();
    const q = (direct ?? inputQuery).trim();
    if (!q) return setError('Masukkan tautan video TikTok terlebih dahulu.');

    setLoading(true);
    setHasStarted(true);
    setActiveStep(0);
    setError('');
    setResult(null);

    const t1 = setTimeout(() => setActiveStep(1), 300);
    const t2 = setTimeout(() => setActiveStep(2), 700);
    const t3 = setTimeout(() => setActiveStep(3), 1200);

    try {
      const res = await fetch('/api/alight-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      setActiveStep(3);
      await new Promise(r => setTimeout(r, 250));

      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('json')
        ? await res.json()
        : JSON.parse((await res.text()) || '{}');

      if (res.ok && data?.success && data?.data) {
        setActiveStep(4);
        setResult(data.data);
        toast(`Ditemukan ${data.data.links?.length || 0} link Alight Motion!`);
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

  const handleCopy = async (text, id) => {
    if (!text) return;
    await copyText(text);
    setCopiedId(id);
    toast('Link disalin!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openAlight = (url) => {
    if (!url) return;
    const deep = `alightcreative://am?url=${encodeURIComponent(url)}`;
    let blurred = false;
    const onBlur = () => { blurred = true; };
    window.addEventListener('blur', onBlur, { once: true });
    window.location.href = deep;
    setTimeout(() => {
      window.removeEventListener('blur', onBlur);
      if (!blurred) window.open(url, '_blank', 'noopener,noreferrer');
    }, 1200);
  };

  const saveToGallery = (link) => {
    const ok = saveHistory({
      title: link.title || 'Preset Alight Motion TikTok',
      type: 'document',
      category: 'Link AM Komentar',
      extension: 'XML',
      size: link.size || '-',
      downloadData: link.url,
      filename: `am_${Date.now()}.xml`,
    });
    toast(ok ? 'Disimpan ke galeri!' : 'Gagal menyimpan.');
  };

  const links = result?.links || [];
  const video = result?.video_info;

  return (
    <main className="flex-grow w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-black">

      <div className="mb-5">
        {onBack ? (
          <CosmicBackButton onClick={onBack} label="Kembali ke Beranda" />
        ) : (
          <button onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-black bg-white shadow-[3px_3px_0px_#000000] font-mono font-bold text-xs cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        )}
      </div>

      <div className="rounded-2xl p-5 sm:p-7 border-2 border-black bg-white shadow-[4px_4px_0px_#000000] mb-6">
        <div className="flex items-center gap-3.5 pb-4 border-b-2 border-black">
          <div className="w-11 h-11 rounded-xl border-2 border-black bg-black text-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000000]">
            <Smartphone className="w-6 h-6 stroke-[2.2] text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black font-display">
              Cari Link Alight Motion di Komentar
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 font-mono mt-0.5">
              Tempel link TikTok — sistem memindai komentar & reply untuk link preset Alight Motion.
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mt-5 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 stroke-[2.5]" />
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => { setInputQuery(e.target.value); setError(''); }}
              disabled={loading}
              placeholder="https://vt.tiktok.com/... atau https://www.tiktok.com/@user/video/..."
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
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Memindai Komentar...</span></>
            ) : (
              <><Sparkles className="w-4 h-4 text-amber-400" /><span>Cari Link AM</span></>
            )}
          </button>
        </form>

        {(loading || result || hasStarted) && (
          <div className="mt-5 space-y-3 pt-3 border-t-2 border-black">
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
              {SCAN_STEPS.map((st, i) => {
                const done = !!result || i < activeStep;
                const active = loading && i === activeStep;
                return (
                  <div key={i} className={`relative flex items-center justify-center p-2 rounded-xl border-2 min-h-[44px] transition-all ${
                    done ? 'bg-emerald-100 border-black shadow-[2px_2px_0px_#000000]'
                    : active ? 'bg-amber-100 border-black shadow-[3px_3px_0px_#000000] scale-[1.03] ring-2 ring-black'
                    : 'bg-neutral-100 border-neutral-300 text-neutral-400 opacity-60'
                  }`}>
                    <span className="font-mono font-black text-xs">{st.num}</span>
                    {done && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full border border-black flex items-center justify-center text-[9px] font-black">✓</span>}
                    {active && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 rounded-full border border-black flex items-center justify-center text-[9px] animate-pulse">•</span>}
                  </div>
                );
              })}
            </div>
            <div className="p-3 rounded-xl border-2 border-black bg-neutral-50 shadow-[2px_2px_0px_#000000] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-mono font-black text-xs shrink-0">
                {SCAN_STEPS[activeStep]?.num}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black font-mono truncate">{SCAN_STEPS[activeStep]?.title}</span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-black shrink-0 ${
                    result ? 'bg-emerald-200' : error ? 'bg-rose-200' : 'bg-amber-200 animate-pulse'
                  }`}>
                    {result ? 'Selesai' : error ? 'Gagal' : 'Proses'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 font-mono truncate mt-0.5">{SCAN_STEPS[activeStep]?.desc}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-xl border-2 border-rose-500 bg-rose-50 text-rose-950 text-xs font-mono flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0px_#000000] flex items-start gap-3">
            {video?.cover && (
              <img src={video.cover} alt="cover"
                className="w-16 h-20 object-cover rounded-lg border-2 border-black shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-black text-white text-[10px] font-mono font-bold">
                  <Video className="w-3 h-3 text-pink-400" /> Video TikTok
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-emerald-100 text-[10px] font-mono font-bold">
                  <MessageCircle className="w-3 h-3" /> {result.comments_count || 0} Komentar
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-cyan-100 text-[10px] font-mono font-bold">
                  <Link2 className="w-3 h-3" /> {links.length} Link
                </span>
              </div>
              <h2 className="text-sm font-black mt-2 line-clamp-2">{video?.title || 'Video TikTok'}</h2>
              <p className="text-[11px] font-mono text-neutral-600 mt-1 flex items-center gap-1">
                <User className="w-3 h-3" /> @{video?.author || 'unknown'}
              </p>
            </div>
          </div>

          {links.length === 0 ? (
            <div className="p-6 rounded-2xl border-2 border-black bg-neutral-50 shadow-[4px_4px_0px_#000000] text-center">
              <AlertCircle className="w-10 h-10 mx-auto text-neutral-400 mb-2" />
              <h3 className="font-black text-sm">Tidak ada link Alight Motion</h3>
              <p className="text-xs font-mono text-neutral-600 mt-1">
                Komentar video ini tidak mengandung link preset Alight Motion.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link, i) => {
                const id = link.id || i;
                return (
                  <div key={id} className="rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0px_#000000]">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-mono font-black text-xs shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold">
                            <User className="w-3 h-3" /> @{link.comment_author || 'anon'}
                          </span>
                          {link.likes > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-600">
                              <Heart className="w-3 h-3 text-rose-500" /> {link.likes}
                            </span>
                          )}
                          {link.comment_time && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-500">
                              <Clock className="w-3 h-3" /> {link.comment_time}
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-mono text-neutral-700 italic mb-2 line-clamp-2">
                          "{link.comment_text || '-'}"
                        </p>

                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-cyan-100 text-[10px] font-mono font-bold">
                            {link.is_shortlink ? <Link2 className="w-3 h-3" /> : <FileCode className="w-3 h-3" />}
                            {link.is_shortlink ? 'Shortlink' : 'Direct Link'}
                          </span>
                          {link.file_type && (
                            <span className="px-2 py-0.5 rounded-full border border-black bg-amber-100 text-[10px] font-mono font-bold">
                              {link.file_type}
                            </span>
                          )}
                          {link.size && <span className="text-[10px] font-mono text-neutral-500">{link.size}</span>}
                        </div>

                        <div className="p-2 rounded-lg bg-neutral-100 border border-neutral-300 font-mono text-[11px] text-neutral-700 break-all mb-2">
                          {link.url}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => openAlight(link.url)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-black bg-black text-white hover:bg-neutral-800 text-[11px] font-mono font-black shadow-[2px_2px_0px_#000000] cursor-pointer">
                            <Smartphone className="w-3.5 h-3.5 text-cyan-400" /> Impor ke AM <ChevronRight className="w-3 h-3" />
                          </button>
                          <a href={link.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black bg-neutral-100 hover:bg-neutral-200 text-[11px] font-mono font-bold">
                            <ExternalLink className="w-3.5 h-3.5" /> Buka
                          </a>
                          <button onClick={() => handleCopy(link.url, id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black bg-neutral-100 hover:bg-neutral-200 text-[11px] font-mono font-bold cursor-pointer">
                            {copiedId === id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedId === id ? 'Tersalin' : 'Salin'}
                          </button>
                          <button onClick={() => saveToGallery(link)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black bg-neutral-100 hover:bg-neutral-200 text-[11px] font-mono font-bold cursor-pointer">
                            <Download className="w-3.5 h-3.5" /> Simpan
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
