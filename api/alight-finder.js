// api/alight-finder.js
import express from 'express';
const router = express.Router();

const AM_LINK_REGEX = /(https?:\/\/(?:www\.)?(?:alightcreative\.com|alightmotion\.com|am\.link|cutt\.ly|bit\.ly|s\.id|tinyurl\.com)\/[^\s]+)/gi;

async function resolveShortlink(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    return res.headers.get('location') || url;
  } catch { return url; }
}

async function fetchComments(videoUrl) {
  const videoId = videoUrl.match(/video\/(\d+)/)?.[1];
  if (!videoId) throw new Error('URL TikTok tidak valid');

  const r = await fetch(
    `https://www.tiktok.com/api/comment/list/?aweme_id=${videoId}&count=200&cursor=0`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': videoUrl,
      },
    }
  );
  const json = await r.json();
  return json.comments || [];
}

router.post('/api/alight-finder', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ success: false, message: 'Query kosong' });

  try {
    const vRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(query)}`);
    const vInfo = await vRes.json();

    const comments = await fetchComments(query);

    const found = [];
    for (const c of comments) {
      const matches = c.text?.match(AM_LINK_REGEX) || [];
      for (const raw of matches) {
        const resolved = await resolveShortlink(raw);
        found.push({
          id: `${c.cid}_${found.length}`,
          url: raw,
          resolved_url: resolved,
          is_shortlink: resolved !== raw,
          comment_text: c.text,
          comment_author: c.user?.unique_id || c.user?.nickname || 'anon',
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
          title: vInfo.title,
          author: vInfo.author_name,
          cover: vInfo.thumbnail_url,
        },
        comments_count: comments.length,
        links: found,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
