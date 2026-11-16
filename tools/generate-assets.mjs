// assets/logo.png (আপনার বানানো লগো; শুধু গোল টাইল, বাইরের পিক্সেল স্বচ্ছ) থেকে সব আইকন তৈরি করে।
// লগোর কোনো ডিজাইন বদলানো হয় না — শুধু সাইজ পরিবর্তন ও (অ্যাপ আইকনের জন্য) ব্যাকগ্রাউন্ড বসানো হয়।
// ব্যবহার:  npm run assets
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'assets/logo.png');
const BG = { r: 10, g: 44, b: 67, alpha: 1 }; // #0a2c43
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

const out = async (file, pipeline) => {
  await mkdir(dirname(file), { recursive: true });
  await pipeline.png({ compressionLevel: 9 }).toFile(file);
  console.log('wrote', file.replace(root + '/', ''));
};

/** লগোকে size×size বর্গে (অনুপাত অক্ষুণ্ণ রেখে) বসায় */
const square = (size) => sharp(SRC).resize(size, size, { fit: 'contain', background: CLEAR, kernel: 'lanczos3' });

/** লগোকে canvas এর মাঝখানে scale% আকারে বসায় */
async function onCanvas(size, scale, background) {
  const inner = Math.round(size * scale);
  const logo = await square(inner).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } }).composite([{ input: logo, gravity: 'center' }]);
}

const web = resolve(root, 'apps/web/public');
const mobile = resolve(root, 'apps/mobile/assets');

// স্ক্রিনে দেখানোর পূর্ণ লগো (স্বচ্ছ কোণ)
const full = () => sharp(SRC).resize(1024, 1024, { fit: 'inside', kernel: 'lanczos3' });
await out(resolve(web, 'logo.png'), full());
await out(resolve(mobile, 'logo.png'), full());

// ওয়েব
await out(resolve(web, 'favicon.png'), square(64));
await out(resolve(web, 'icon-192.png'), square(192));
await out(resolve(web, 'icon-512.png'), square(512));
await out(resolve(web, 'apple-touch-icon.png'), square(180).flatten({ background: BG }));
await out(resolve(web, 'icon-maskable-512.png'), await onCanvas(512, 0.78, BG));

// মোবাইল
await out(resolve(mobile, 'icon.png'), square(1024).flatten({ background: BG }));
await out(resolve(mobile, 'adaptive-icon.png'), await onCanvas(1024, 0.66, CLEAR));
await out(resolve(mobile, 'splash-icon.png'), await onCanvas(1024, 0.7, CLEAR));
await out(resolve(mobile, 'favicon.png'), square(96));
