# VYBE GO — Meet the world.

র‍্যান্ডম ভিডিও চ্যাট: **Web (React, Vercel)** + **Mobile (Expo)** + **Backend (Supabase)** — সবকিছু ফ্রি টিয়ারে চালানো যায়।
লগো আপনার বানানো মূল ফাইল (`assets/logo-original.png`) থেকে হুবহু ব্যবহার করা হয়েছে, একটি পিক্সেলও বদলানো হয়নি।

---

## ১. অ্যাপ যেভাবে চলে (শুধু স্লাইড — কোনো Start/Stop/Next/Mic বাটন নেই)

| ইশারা | কী ঘটে |
|---|---|
| **ডান থেকে বামে** স্লাইড (স্ক্রিনের যেকোনো জায়গায়) | প্রথমবার: **শুরু** হয়ে অপনেন্ট আসে। এরপর: বর্তমান অপনেন্ট **স্কিপ** হয়ে স্বয়ংক্রিয়ভাবে পরের জন আসে |
| **বাম থেকে ডানে** স্লাইড | **থামে।** উপরে অপনেন্টের জায়গায় অ্যাপের লগো, নিচে আপনার ক্যামেরা চালু থাকে |

- অপনেন্ট আসামাত্র **মাইক আপনাআপনি চালু** (কোনো বাটন নেই)।
- ক্যামেরা সর্বোচ্চ **জুম-আউট** (৪:৩ সেন্সর-দৃশ্য, সম্ভব হলে ডিভাইসের সর্বনিম্ন জুম) এবং পুরো ফ্রেম দেখানো হয় (`contain`), যাতে ছোট জায়গায় কয়েকজন একসাথে ধরে।
  কাটাছাঁট করে ভরাট ছবি চাইলে `apps/web/src/styles/index.css` এ `--video-fit: contain` কে `cover` করুন (মোবাইলে `objectFit="contain"` কে `cover`)।
- ডেস্কটপে মাউস-ড্র্যাগ বা কিবোর্ডের **← / →** কীও একই কাজ করে।
- বাকি আছে: চ্যাট, ক্যামেরা-বদল, রিপোর্ট, ব্লক, ভিডিও লুকানো, Boy/Girl ও দেশের ফিল্টার।

## ২. কেন Supabase (এবং Node সার্ভার নয়)

Vercel শুধু ওয়েবসাইট/সার্ভারলেস ফাংশন চালায়; **স্থায়ী WebSocket সার্ভার চালাতে পারে না।** তাই রিয়েলটাইম অংশ Supabase করে:

```
 Browser / Mobile ──► Vercel (শুধু ওয়েবসাইট ফাইল)
        │
        ├──► Supabase Auth      বেনামী (anonymous) ইউজার, প্রতি ডিভাইসে স্থায়ী
        ├──► Supabase Postgres  matchmaking, report, block, ban (RPC ফাংশন, RLS সহ)
        ├──► Supabase Realtime  signaling + চ্যাট (Broadcast), "ম্যাচ পাওয়া গেছে" নোটিফিকেশন
        └──► Edge Function ice  TURN credential (Cloudflare/Metered ফ্রি TURN)
 ভিডিও-অডিও সরাসরি দুজনের মধ্যে (WebRTC, এনক্রিপ্টেড) — আপনার সার্ভার দিয়ে যায় না
```

```
vybe-go/
├─ apps/web/            React + Vite + Tailwind (Vercel এ যায়)
├─ apps/mobile/         Expo + react-native-webrtc (Android APK / iOS)
├─ packages/shared/     প্রটোকল টাইপ, validation, আইকন, ডিজাইন টোকেন
├─ packages/client-core/ ChatEngine + SupabaseTransport (ওয়েব ও মোবাইল একই কোড)
├─ supabase/            migrations/*.sql (ডাটাবেস) + functions/ice (TURN)
├─ .github/workflows/   CI, Android APK বিল্ড, Supabase keep-alive
└─ vercel.json          Vercel কনফিগ (আলাদা কিছু বদলাতে হবে না)
```

---

## ৩. ফ্রি-তে পাবলিশ করার ধাপ

### ধাপ ১ — GitHub এ আপলোড
1. github.com এ নতুন repository বানান (`vybe-go`, Public বা Private)।
2. এই ফোল্ডারটি push করুন:
   ```bash
   git init && git add . && git commit -m "VYBE GO"
   git branch -M main
   git remote add origin https://github.com/<আপনার-ইউজারনেম>/vybe-go.git
   git push -u origin main
   ```

### ধাপ ২ — Supabase সেটআপ (supabase.com → New project, ফ্রি)
1. **ডাটাবেস:** Dashboard → **SQL Editor → New query** → `supabase/migrations/20260101000000_vybe_go.sql` এর পুরো লেখা পেস্ট করে **Run**।
2. **বেনামী লগইন চালু:** **Authentication → Sign In / Providers → "Allow anonymous sign-ins"** চালু করুন। (স্প্যাম ঠেকাতে Authentication → Attack Protection এ CAPTCHA/Turnstile চালু করা ভালো।)
3. **Realtime:** **Realtime → Settings** এ **"Allow public access"** চালু আছে কিনা দেখুন (নতুন প্রজেক্টে সাধারণত থাকে)।
4. **কী কপি করুন:** **Project Settings → API** থেকে `Project URL` ও `anon public` key। (`service_role` key কখনো ব্যবহার/শেয়ার করবেন না।)
5. **TURN (খুব গুরুত্বপূর্ণ):** মোবাইল নেটওয়ার্ক ও কঠোর ফায়ারওয়ালের পেছনের ইউজারদের ভিডিও TURN ছাড়া কানেক্ট হয় না।
   - ফ্রি **Cloudflare Calls TURN**: dash.cloudflare.com → Calls → TURN → Create → `Key ID` ও `API Token` নিন।
   - Supabase → **Edge Functions → Secrets** এ দিন: `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN`
     (বিকল্প: Metered.ca এর `METERED_APP_NAME` + `METERED_API_KEY`)।
   - ফাংশন deploy: **Edge Functions → Deploy a new function → name: `ice`** → `supabase/functions/ice/index.ts` পেস্ট → Deploy।
     (CLI পছন্দ হলে: `npx supabase login && npx supabase link --project-ref <ref> && npx supabase functions deploy ice`)
   - TURN না দিলেও অ্যাপ চলবে (শুধু STUN), কিন্তু কিছু ইউজার কানেক্ট হতে পারবে না।

### ধাপ ৩ — Vercel এ ওয়েবসাইট (vercel.com → Add New → Project)
1. GitHub repo ইমপোর্ট করুন। **Root Directory = রিপোজিটরির রুট (ডিফল্ট)**, Framework = *Other* (বাকি সব `vercel.json` থেকে আসে)।
2. **Environment Variables** এ দিন:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key
3. **Deploy**। লিংকটি খুলে দুটি আলাদা ব্রাউজারে (একটি Incognito) পরীক্ষা করুন।
4. ওয়েবসাইটই "অ্যাপ" হিসেবেও ইনস্টল হয় (PWA): Chrome → ⋮ → *Install app*; iPhone Safari → Share → *Add to Home Screen*। **iPhone এর জন্য এটাই সবচেয়ে সহজ ফ্রি উপায়।**

### ধাপ ৪ — Android APK (GitHub Actions, ফ্রি)
1. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   `SUPABASE_URL` ও `SUPABASE_ANON_KEY`।
2. **Actions → "Android APK" → Run workflow।** (১৫–২৫ মিনিট লাগে)
3. শেষ হলে রানের পাতার **Artifacts → vybe-go-apk** থেকে APK নামান। ট্যাগ দিলে (`git tag v1.0.0 && git push --tags`) APK স্বয়ংক্রিয়ভাবে **Releases** এ চলে যায়, সেই লিংক যে কাউকে দিতে পারেন।
4. ফোনে "Unknown sources" থেকে ইনস্টল করুন।
- **Google Play** তে দিতে চাইলে এককালীন $25 ডেভেলপার ফি ও নিজস্ব signing keystore লাগে। **App Store** এর জন্য বছরে $99 লাগে — এ দুটো সম্পূর্ণ ফ্রি নয়।

### Supabase pause ঠেকানো
Supabase ফ্রি প্রজেক্ট ~৭ দিন কেউ ব্যবহার না করলে pause হয়ে যায়। `.github/workflows/supabase-keepalive.yml` প্রতি ৩ দিনে একটি ছোট রিকোয়েস্ট পাঠায় (ধাপ ৪ এর সিক্রেট দুটি ব্যবহার করে)।

---

## ৪. নিজের কম্পিউটারে চালানো

```bash
cp .env.example .env        # Supabase URL/key বসান
npm install                 # shared ও client-core নিজে build হবে
npm run dev                 # http://localhost:5173
npm test                    # ইউনিট টেস্ট (ইঞ্জিন + validation)
```
মোবাইল: `cd apps/mobile && cp .env.example .env`, তারপর `npx expo install --fix`, `npx expo prebuild`, `npm run android`
(`react-native-webrtc` Expo Go তে চলে না, development build লাগে)।

## ৫. নিরাপত্তা ও মডারেশন

| বিষয় | কীভাবে |
|---|---|
| টেবিল সুরক্ষা | সব টেবিলে RLS চালু ও কোনো policy নেই; ক্লায়েন্ট শুধু যাচাই-করা RPC ফাংশন ডাকতে পারে |
| ১৮+ গেট | অনবোর্ডিংয়ে নিশ্চিতকরণ বাধ্যতামূলক (আইনগত বয়স-যাচাই নয়) |
| Report | কারণ + ঐচ্ছিক বিবরণ + সর্বশেষ ১০ মেসেজ; ম্যাচের অংশগ্রহণকারী ছাড়া কেউ রিপোর্ট করতে পারে না |
| স্বয়ংক্রিয় ব্যান | ২৪ ঘণ্টায় **৩ জন আলাদা** ইউজার রিপোর্ট করলে ইউজার + IP ২৪ ঘণ্টার জন্য ব্যান (`report_user` ফাংশনের `v_threshold`/`v_hours`) |
| Block | ব্লক করা ইউজারের সাথে আর ম্যাচ হবে না (দুই দিকে) |
| গোপনীয়তা | কাঁচা IP রাখা হয় না (salted SHA-256); চ্যাট সংরক্ষণ হয় না (শুধু রিপোর্টের প্রমাণে যায়); ভিডিও peer-to-peer |
| রেট লিমিট | রিপোর্ট ঘণ্টায় ১০টি; চ্যাট ক্লায়েন্টে থ্রটল |

**অ্যাডমিন:** Supabase → SQL Editor এ:
```sql
select * from admin_recent_reports;     -- সাম্প্রতিক রিপোর্ট
select * from admin_active_bans;        -- চলমান ব্যান
insert into bans (kind, key, until, reason) values ('user', '<ইউজার-uuid>', now() + interval '7 days', 'nudity');
delete from bans where id = 12;         -- ব্যান তুলে নেওয়া
```
**পরিচ্ছন্নতা (ঐচ্ছিক):** Database → Extensions এ `pg_cron` চালু করে চালান:
`select cron.schedule('vybe-cleanup', '0 * * * *', $$select public.vybe_cleanup()$$);`

## ৬. ফ্রি টিয়ারের সীমা (সৎ কথা)

- **Supabase Free:** Realtime এ একসাথে ~২০০ সংযোগ, মাসে ~২০ লাখ রিয়েলটাইম মেসেজ, ৫০০ MB ডাটাবেস। অর্থাৎ **একসাথে প্রায় ২০০ ইউজার** পর্যন্ত ফ্রি চলবে; এর বেশি হলে Pro প্ল্যান ($25/মাস) লাগবে। (সীমা বদলাতে পারে — supabase.com/pricing দেখুন।)
- **Vercel Hobby (ফ্রি):** শুধু ব্যক্তিগত/অ-বাণিজ্যিক ব্যবহারের জন্য। বিজ্ঞাপন/আয় শুরু করলে Pro লাগবে।
- **Cloudflare TURN:** ফ্রি কোটা বড়, কিন্তু ভিডিও রিলে হলে ব্যান্ডউইথ খরচ হয়।

## ৭. যা মনে রাখতে হবে (সীমাবদ্ধতা)

- 🔴 **এই স্যান্ডবক্সে ডাটাবেস (SQL) ও Supabase এর সাথে সরাসরি পরীক্ষা করা যায়নি।** ইঞ্জিনের লজিক ৮টি টেস্টে (ফেক ব্যাকএন্ড দিয়ে) যাচাই হয়েছে, কিন্তু SQL ফাইল আপনার Supabase এ প্রথমবার চলবে। Run করার সময় এরর এলে সেটি আমাকে পাঠান, ঠিক করে দেব।
- ছবি/ভিডিও থেকে **স্বয়ংক্রিয় nudity detection নেই** — পাবলিক লঞ্চের আগে সবচেয়ে জরুরি পরবর্তী কাজ।
- Gender ও দেশ ইউজারের নিজের ঘোষণা (যাচাই হয় না)।
- IP-ব্যান মোবাইল নেটওয়ার্কের শেয়ার্ড IP তে নির্দোষ ইউজারকেও আটকাতে পারে; দরকার হলে `report_user` থেকে IP-ব্যানের অংশ মুছে দিন।
- ম্যাচ-চ্যানেলের নাম এলোমেলো UUID (অনুমান করা যায় না); আরও কঠোর নিরাপত্তায় Supabase private channel + RLS যোগ করা যায়।
- গোপনীয়তা নীতি, Terms ও দেশের আইন (এবং স্টোর নীতি) লঞ্চের আগে আপনাকেই দেখে নিতে হবে।

## ৮. সমস্যা সমাধান

| সমস্যা | সমাধান |
|---|---|
| "Supabase is not configured" | Vercel এ `VITE_SUPABASE_*` দিয়ে **Redeploy** করুন (env বদলালে নতুন deploy লাগে) |
| "CONNECTING TO SERVER…" থেকে যায় | Anonymous sign-ins চালু আছে কিনা এবং SQL Run হয়েছে কিনা দেখুন; ব্রাউজার Console দেখুন |
| দুজন ম্যাচ হয়েও ভিডিও আসে না | TURN ঠিক করুন (ধাপ ২.৫); Network ট্যাবে `ice` ফাংশনের রেসপন্স দেখুন |
| ম্যাচ পেতে ৮ সেকেন্ড লাগছে | Realtime public access বন্ধ থাকতে পারে (ধাপ ২.৩); তখন polling দিয়ে ধীরে চলে |
| ক্যামেরা চালু হয় না | HTTPS/`localhost` লাগে; ব্রাউজারের Permission দেখুন |
| মোবাইলে ভার্সন এরর | `cd apps/mobile && npx expo install --fix` |
