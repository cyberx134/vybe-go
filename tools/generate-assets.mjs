// assets/logo-original.png (আপনার বানানো মূল লগো, অপরিবর্তিত) থেকে সব আইকন তৈরি করে।
// লগোর কোনো পিক্সেল বদলানো হয় না — শুধু ক্রপ, সাইজ পরিবর্তন ও (অ্যাপ আইকনের জন্য) ব্যাকগ্রাউন্ড বসানো হয়।
// ব্যবহার:  npm run assets
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'assets/logo-original.png');
const BG = { r: 10, g: 44, b: 67, alpha: 1 }; // #0a2c43 — লগোর কিনারার ধোঁয়াশার সাথে মেলে
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

// লগোর টাইল (গ্লাস বক্স) এর সীমানা: মূল ছবির ভেতরে ~ (113,115)–(1139,1114)
const TILE = { left: 106, top: 95, width: 1040, height: 1040 };

const out = async (file, pipeline) => {
  await mkdir(dirname(file), { recursive: true });
  await pipeline.png({ compressionLevel: 9 }).toFile(file);
  console.log('wrote', file.replace(root + '/', ''));
};

const tile = () => sharp(SRC).extract(TILE);
const tileBuffer = (size) => tile().resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();

/** টাইলকে canvas এর মাঝখানে scale% আকারে বসায় */
async function onCanvas(size, scale, background) {
  const inner = Math.round(size * scale);
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: await tileBuffer(inner), gravity: 'center' }]);
}

const web = resolve(root, 'apps/web/public');
const mobile = resolve(root, 'apps/mobile/assets');

// পূর্ণ লগো (ধোঁয়াশাসহ, মূল ছবি হুবহু) — স্ক্রিনে দেখানোর জন্য
const full = () => sharp(SRC).resize(1024, 1024, { kernel: 'lanczos3' });
await out(resolve(web, 'logo.png'), full());
await out(resolve(mobile, 'logo.png'), full());

// ওয়েব
await out(resolve(web, 'favicon.png'), tile().resize(64, 64, { kernel: 'lanczos3' }));
await out(resolve(web, 'icon-192.png'), tile().resize(192, 192, { kernel: 'lanczos3' }));
await out(resolve(web, 'icon-512.png'), tile().resize(512, 512, { kernel: 'lanczos3' }));
await out(resolve(web, 'apple-touch-icon.png'), tile().resize(180, 180, { kernel: 'lanczos3' }).flatten({ background: BG }));
await out(resolve(web, 'icon-maskable-512.png'), await onCanvas(512, 0.78, BG));

// মোবাইল
await out(resolve(mobile, 'icon.png'), tile().resize(1024, 1024, { kernel: 'lanczos3' }).flatten({ background: BG }));
await out(resolve(mobile, 'adaptive-icon.png'), await onCanvas(1024, 0.66, CLEAR));
await out(resolve(mobile, 'splash-icon.png'), await onCanvas(1024, 0.7, CLEAR));
await out(resolve(mobile, 'favicon.png'), tile().resize(96, 96, { kernel: 'lanczos3' }));
