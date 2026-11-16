#!/usr/bin/env bash
# Android APK তৈরি করে dist-apk/vybe-go.apk এ রাখে।
# আগে apps/mobile/.env এ Supabase URL ও key দিন (README দেখুন)।
set -euo pipefail
cd "$(dirname "$0")/.."

export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

if [ ! -f apps/mobile/.env ]; then
  echo "❌ apps/mobile/.env ফাইল নেই। আগে এটি বানান:"
  echo "   cp apps/mobile/.env.example apps/mobile/.env   (তারপর ভেতরে আপনার Supabase মান বসান)"
  exit 1
fi
set -a
# shellcheck disable=SC1091
source apps/mobile/.env
set +a
if [ -z "${EXPO_PUBLIC_SUPABASE_URL:-}" ] || [ -z "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ] || [[ "${EXPO_PUBLIC_SUPABASE_URL}" == *YOUR-PROJECT-REF* ]]; then
  echo "❌ apps/mobile/.env এ EXPO_PUBLIC_SUPABASE_URL ও EXPO_PUBLIC_SUPABASE_ANON_KEY এর আসল মান বসান।"
  exit 1
fi

echo ">> ১/৫ প্যাকেজ ইনস্টল"
npm install

echo ">> ২/৫ Expo প্যাকেজের ভার্সন মেলানো"
(cd apps/mobile && npx expo install --fix) || echo "(সতর্কতা: ভার্সন মেলানো যায়নি, তবু চালিয়ে যাচ্ছি)"

echo ">> ৩/৫ Android প্রজেক্ট তৈরি (prebuild)"
(cd apps/mobile && npx expo prebuild --platform android --no-install --clean)
echo "sdk.dir=$ANDROID_HOME" > apps/mobile/android/local.properties

echo ">> ৪/৫ APK বিল্ড (১৫–৩০ মিনিট লাগতে পারে, প্রথমবার বেশি)"
(cd apps/mobile/android && ./gradlew assembleRelease --no-daemon --max-workers=2 -Dorg.gradle.jvmargs="-Xmx4g")

echo ">> ৫/৫ APK সংগ্রহ"
APK="$(ls apps/mobile/android/app/build/outputs/apk/release/*.apk | head -1)"
mkdir -p dist-apk
cp "$APK" dist-apk/vybe-go.apk
ls -lh dist-apk/vybe-go.apk

cat <<MSG

✅ APK তৈরি: dist-apk/vybe-go.apk

ফোনে নামানোর সবচেয়ে সহজ উপায় (GitHub Release):
  gh release create v1.0.0 dist-apk/vybe-go.apk --title "VYBE GO 1.0.0" --notes "Android APK"
  → তারপর repo এর Releases পাতা থেকে APK নামান।
(নতুন সংস্করণের জন্য v1.0.1, v1.0.2 ... দিন)
MSG
