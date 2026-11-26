// api/alight-finder.js
import express from 'express';
const router = express.Router();

const AM_LINK_REGEX = /(https?:\/\/(?:www\.)?(?:alightcreative\.com|alightmotion\.com|am\.link|cutt\.ly|bit\.ly|s\.id|tinyurl\.com)\/[^\s]+)/gi;

// Resolve shortlink (cutt.ly, bit.ly, dll)
async function resolveShortlink(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    return res.headers.get('location') || url;
  } catch {
    return url;
  }
}

router.post('/api/alight-finder', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ success: false, message: 'Query kosong' });

  try {
    // ── STEP 1: Ambil metadata video via oEmbed ──
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(query)}`;
    const videoRes = await fetch(oembedUrl);
    const videoInfo = await videoRes.json();

    // ── STEP 2: Ambil komentar via scraping ringan (atau API pihak ke-3) ──
    // Catatan: TikTok tidak punya API komentar publik resmi.
    // Opsi produksi: gunakan scraping service / RapidAPI / Apify.
    const comments = await fetchTikTokComments(query);

    // ── STEP 3 & 4: Filter + resolve link ──
    const found = [];
    for (const c of comments) {
      const matches = c.text?.match(AM_LINK_REGEX) || [];
      for (const rawUrl of matches) {
        const resolved = await resolveShortlink(rawUrl);
        found.push({
          id: `${c.id}_${found.length}`,
          url: rawUrl,
          resolved_url: resolved,
          is_shortlink: resolved !== rawUrl,
          comment_text: c.text,
          comment_author: c.user?.unique_id || c.user?.nickname,
          comment_time: c.create_time,
          likes: c.digg_count || 0,
          file_type: resolved.includes('.xml') ? 'XML' : 'Project AM',
        });
      }
    }

    return res.json({
      success: true,
      data: {
        video_info: {
          title: videoInfo.title,
          author: videoInfo.author_name,
          cover: videoInfo.thumbnail_url,
        },
        comments_count: comments.length,
        links: found,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Helper: scraping komentar (contoh pakai endpoint TikTok web) ──
async function fetchTikTokComments(videoUrl) {
  // Implementasi nyata butuh cookie/X-Bogus signature.
  // Gunakan library seperti `tiktok-scraper` atau layanan RapidAPI:
  // https://rapidapi.com/.../tiktok-comments
  //
  // Contoh placeholder:
  const videoId = videoUrl.match(/video\/(\d+)/)?.[1];
  if (!videoId) throw new Error('URL TikTok tidak valid');

  const apiUrl = `https://www.tiktok.com/api/comment/list/?aweme_id=${videoId}&count=200&cursor=0`;
  const r = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Referer': videoUrl,
      // Cookie & X-Bogus signature diperlukan untuk produksi
    },
  });
  const json = await r.json();
  return json.comments || [];
}

export default router;
