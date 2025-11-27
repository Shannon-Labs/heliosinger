#!/bin/bash
# Heliosinger Stream Launch Script
# One-click launch for OBS streaming setup

set -e

PROJECT_DIR="/Volumes/VIXinSSD/SolarChime"
STREAM_URL="http://localhost:5173/stream"
OBS_APP="/Applications/OBS.app"

echo "🚀 Heliosinger Stream Launcher"
echo "================================"
echo ""

# Check if OBS is installed
if [ ! -d "$OBS_APP" ]; then
    echo "❌ OBS Studio not found at $OBS_APP"
    echo ""
    echo "📦 Install OBS Studio:"
    echo "   brew install --cask obs"
    echo ""
    exit 1
fi

# Check if we're in the project directory
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo "⚠️  Warning: Not in project directory"
    echo "   Expected: $PROJECT_DIR"
    echo ""
fi

# Start dev server in background if not running
if ! lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "🌐 Starting dev server..."
    cd "$PROJECT_DIR" || exit 1
    npm run dev > /dev/null 2>&1 &
    DEV_PID=$!
    echo "   Dev server started (PID: $DEV_PID)"
    echo "   Waiting for server to be ready..."
    sleep 5
    
    # Wait for server to be ready
    for i in {1..30}; do
        if curl -s "$STREAM_URL" > /dev/null 2>&1; then
            echo "✅ Server is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "⚠️  Server may not be ready yet, but continuing..."
        fi
        sleep 1
    done
else
    echo "✅ Dev server already running on port 5173"
fi

echo ""
echo "🎬 Launching OBS Studio..."
open "$OBS_APP"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps in OBS:"
echo "   1. Add Browser Source → URL: $STREAM_URL"
echo "   2. Set Width: 1920, Height: 1080, FPS: 30"
echo "   3. Configure YouTube stream key in Settings → Stream"
echo "   4. Click 'Start Streaming' when ready!"
echo ""
echo "💡 Tip: Run 'caffeinate -dims &' to prevent Mac from sleeping"
echo ""



