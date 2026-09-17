import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN_DIR = path.join(__dirname, '..', 'bin');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export function resolveBinary() {
  if (process.env.YTDLP) return process.env.YTDLP;
  const file = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const candidates = [path.join(BIN_DIR, file), path.join(BIN_DIR, 'yt-dlp'), 'yt-dlp', 'youtube-dl'];
  for (const c of candidates) {
    try {
      execFileSync(c, ['--version'], { stdio: 'ignore' });
      return c;
    } catch {
      /* not found, try next */
    }
  }
  return null;
}

export const BINARY = resolveBinary();

export function isAvailable() {
  return Boolean(BINARY);
}

export const FFMPEG_PRESENT = resolveFfmpeg();

function resolveFfmpeg() {
  if (process.env.FFMPEG === '0') return false;
  const candidates = [process.env.FFMPEG && process.env.FFMPEG !== '0' ? process.env.FFMPEG : null, 'ffmpeg'];
  for (const c of candidates) {
    if (!c) continue;
    try {
      execFileSync(c, ['-version'], { stdio: 'ignore' });
      return true;
    } catch {
      /* continue */
    }
  }
  return false;
}

function baseArgs(url) {
  const args = [
    '--no-warnings',
    '--no-playlist',
    '--socket-timeout',
    '25',
    '--user-agent',
    USER_AGENT,
  ];
  const cookies = path.join(path.dirname(BIN_DIR), 'cookies.txt');
  if (existsSync(cookies)) args.push('--cookies', cookies);
  args.push(url);
  return args;
}

export function getInfo(url) {
  return new Promise((resolve, reject) => {
    if (!BINARY) {
      reject(new Error('yt-dlp is not installed.'));
      return;
    }
    const child = spawn(BINARY, ['-J', ...baseArgs(url)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Extraction timed out. The host may be slow or blocking requests.'));
    }, 60_000);

    child.stdout.on('data', (d) => chunks.push(d));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to launch yt-dlp: ${err.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch {
          reject(new Error('Unexpected response from the extractor.'));
        }
        return;
      }
      const msg = stderr || `Extractor exited with code ${code}`;
      const err = new Error(
        msg.replace(/^error:\s*/i, '').split('\n').filter(Boolean).slice(0, 3).join(' ') || 'Extraction failed.',
      );
      err.isUnsupported = /unsupported (url|website)/i.test(msg);
      reject(err);
    });
  });
}

function videoFormatExpr(quality) {
  const height = Number(quality) > 0 ? Math.min(Math.round(Number(quality)), 4320) : 0;
  if (FFMPEG_PRESENT) {
    const sel = height ? `[height<=${height}]` : '';
    const progressive = `best${sel}[ext=mp4][acodec!=none]/best${sel}[acodec!=none]`;
    const merged = `bestvideo${sel}+bestaudio/best${sel}`;
    return `${progressive}/${merged}`;
  }
  if (height) return `best[height<=${height}][acodec!=none]/best[height<=${height}]/best`;
  return 'best[acodec!=none]/best';
}

function buildArgs({ url, quality, audio }) {
  const args = [];
  if (audio) {
    args.push('-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else {
    args.push('-f', videoFormatExpr(quality), '--merge-output-format', 'mp4');
  }
  args.push('--no-part', '-o', '-', ...baseArgs(url));
  return args;
}

export function createDownload({ url, quality = 'best', audio = false }) {
  return new Promise((resolve, reject) => {
    if (!BINARY) {
      reject(new Error('yt-dlp is not installed.'));
      return;
    }

    const run = (args, respondToRes) => {
      const child = spawn(BINARY, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      child.stderr.on('data', (d) => (stderr += d.toString()));
      child.stdout.pipe(respondToRes, { end: false });
      child.on('error', () => {
        respondToRes.end();
        stderr = '';
      });
      child.stdout.on('end', () => respondToRes.end());
      return { child, getStderr: () => stderr };
    };

    let firstAttempt = true;
    let pipeRes = null;

    const attempt = (args) => {
      const { child, getStderr } = run(args, pipeRes);
      child.on('close', (code) => {
        if (code === 0) return;
        const stderr = getStderr();
        const mergeFailed = firstAttempt && FFMPEG_PRESENT && /merger|merging|requested format/i.test(stderr);
        if (!audio && mergeFailed) {
          firstAttempt = false;
          attempt(['-f', 'best[acodec!=none]/best', '--no-part', '-o', '-', ...baseArgs(url)]);
          return;
        }
        if (!pipeRes.writableEnded) {
          pipeRes.write(`${stderr || 'Download failed.'}\n`);
          pipeRes.end();
        }
      });
    };

    resolve({
      pipe(res) {
        pipeRes = res;
        attempt(buildArgs({ url, quality, audio }));
      },
    });
  });
}