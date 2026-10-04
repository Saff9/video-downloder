import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import https from 'node:https';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const binDir = path.join(here, '..', 'bin');
const exePath = path.join(binDir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

const force = process.argv.includes('--force');

if (!force && existsSync(exePath) && statSync(exePath).size > 1_000_000) {
  console.log(`yt-dlp already installed at ${exePath} (run with --force to re-download).`);
  process.exit(0);
}

const LATEST = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
mkdirSync(binDir, { recursive: true });
console.log('Downloading yt-dlp...');

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'videofetch-setup' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return download(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed with status ${res.statusCode}`));
        return;
      }
      const total = Number(res.headers['content-length']) || 0;
      let done = 0;
      res.on('data', (chunk) => {
        done += chunk.length;
        if (total) {
          process.stdout.clearLine?.(0);
          process.stdout.cursorTo?.(0);
          process.stdout.write(`  ${(done / 1e6).toFixed(1)} / ${(total / 1e6).toFixed(1)} MB`);
        }
      });
      pipeline(res, createWriteStream(exePath)).then(() => {
        process.stdout.write('\n');
        resolve();
      }, reject);
    }).on('error', reject);
  });
}

download(LATEST)
  .then(() => {
    console.log(`Saved yt-dlp to ${exePath}`);
    try {
      const out = execFileSync(exePath, ['--version'], { encoding: 'utf8' });
      console.log(`yt-dlp version ${out.trim()} ready.`);
    } catch (e) {
      console.log('Installed, but could not verify version:', e.message);
    }
  })
  .catch((err) => {
    console.error('Setup failed:', err.message);
    process.exit(1);
  });