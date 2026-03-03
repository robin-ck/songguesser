import { Router } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';

const router = Router();
const execFileAsync = promisify(execFile);

// Try youtube-search-api first (no API key, scrapes YouTube)
async function searchWithPackage(query) {
  try {
    const { default: YoutubeSearchApi } = await import('youtube-search-api');
    const results = await YoutubeSearchApi.GetListByKeyword(query, false, 1);
    const item = results?.items?.[0];
    if (item?.id) return item.id;
  } catch (err) {
    console.warn('youtube-search-api failed:', err.message);
  }
  return null;
}

// Fallback: yt-dlp binary
async function searchWithYtDlp(query) {
  try {
    const { stdout } = await execFileAsync('yt-dlp', [
      '--get-id',
      '--no-playlist',
      '-q',
      `ytsearch1:${query}`,
    ], { timeout: 15000 });
    const id = stdout.trim();
    if (id) return id;
  } catch (err) {
    console.warn('yt-dlp fallback failed:', err.message);
  }
  return null;
}

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query parameter q' });

  const query = `${q} official audio`;

  let videoId = await searchWithPackage(query);
  if (!videoId) {
    videoId = await searchWithYtDlp(query);
  }

  if (!videoId) {
    return res.status(404).json({ error: 'No YouTube video found' });
  }

  res.json({ videoId });
});

export default router;
