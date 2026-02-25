#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-/tmp/heliosinger-device-logs}"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/android-logcat-$STAMP.log"

echo "Capturing Android logs to: $OUT_FILE"
echo "Press Ctrl+C to stop."

adb logcat | grep -iE "heliosinger|HeliosingerAudio|expo-notifications|AudioFocus|heliosinger-alerts" | tee "$OUT_FILE"
