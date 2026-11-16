#!/usr/bin/env bash
# Codespace তৈরির সময় একবার চলে: Android SDK ও npm প্যাকেজ ইনস্টল।
set -euo pipefail

ANDROID_HOME="$HOME/android-sdk"
CMDLINE_ZIP="commandlinetools-linux-11076708_latest.zip"

if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
  echo ">> Android command-line tools নামানো হচ্ছে..."
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  curl -fsSL "https://dl.google.com/android/repository/$CMDLINE_ZIP" -o /tmp/cmdline-tools.zip
  unzip -q /tmp/cmdline-tools.zip -d "$ANDROID_HOME/cmdline-tools"
  mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
  rm -f /tmp/cmdline-tools.zip
fi

if ! grep -q "ANDROID_HOME" "$HOME/.bashrc"; then
  {
    echo "export ANDROID_HOME=\"$ANDROID_HOME\""
    echo "export ANDROID_SDK_ROOT=\"$ANDROID_HOME\""
    echo "export PATH=\"\$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools\""
  } >> "$HOME/.bashrc"
fi

export ANDROID_HOME ANDROID_SDK_ROOT="$ANDROID_HOME"
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null || true
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" "platform-tools" >/dev/null

echo ">> npm প্যাকেজ ইনস্টল হচ্ছে..."
npm install

echo ">> প্রস্তুত! এবার চালান:  bash scripts/build-apk.sh"
