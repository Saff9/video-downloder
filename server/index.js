import app from './src/app.js';
import { isAvailable, FFMPEG_PRESENT } from './src/services/ytdlp.service.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 VideoFetch Pro Server running at http://localhost:${PORT}`);
  console.log(`📚 Default Feed: Curated Science, Education & Useful Content`);
  console.log(`🔍 Search: Channels + Videos + Shorts with Channel Cards`);
  console.log(`🎬 yt-dlp: ${isAvailable() ? 'READY' : 'MISSING (run "npm run setup")'}`);
  console.log(`⚡ ffmpeg: ${FFMPEG_PRESENT ? 'AVAILABLE' : 'NOT FOUND (best progressive)'}`);
  console.log(`======================================================\n`);
});