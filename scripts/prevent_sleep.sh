#!/bin/bash
# Prevent Mac from sleeping during stream
# Useful for 24/7 streaming

echo "🛡️  Preventing Mac from sleeping..."
echo ""

# Check if caffeinate is already running
if pgrep -f "caffeinate -dims" > /dev/null; then
    echo "✅ caffeinate is already running"
    echo "   To stop: pkill caffeinate"
else
    # Start caffeinate in background
    caffeinate -dims &
    CAFFEINATE_PID=$!
    echo "✅ Started caffeinate (PID: $CAFFEINATE_PID)"
    echo ""
    echo "💡 This will prevent your Mac from:"
    echo "   • Display sleep"
    echo "   • System sleep"
    echo "   • Disk sleep"
    echo ""
    echo "🛑 To stop: pkill caffeinate"
    echo "   Or: kill $CAFFEINATE_PID"
fi



