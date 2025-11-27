# 🎬 Heliosinger Streaming Scripts

Automation scripts for setting up and managing OBS Studio streaming for Heliosinger.

## 📋 Available Scripts

### `helio-stream.sh`
One-click launcher that:
- Checks if OBS is installed
- Starts the dev server if not running
- Waits for server to be ready
- Launches OBS Studio

**Usage:**
```bash
npm run stream:launch
# or
./scripts/helio-stream.sh
```

### `obs_setup_helper.py`
Python script that checks your system and provides setup guidance:
- Verifies OBS installation
- Checks hardware encoding support
- Tests dev server connectivity
- Generates OBS settings template
- Provides step-by-step setup instructions
- Troubleshooting tips

**Usage:**
```bash
npm run stream:setup
# or
python3 scripts/obs_setup_helper.py
```

### `prevent_sleep.sh`
Prevents your Mac from sleeping during 24/7 streams using `caffeinate`.

**Usage:**
```bash
npm run stream:prevent-sleep
# or
./scripts/prevent_sleep.sh
```

**To stop:**
```bash
pkill caffeinate
```

### `check_stream_health.py`
Monitors the stream for health issues:
- Checks if stream page is accessible
- Monitors API endpoints
- Alerts on consecutive failures

**Usage:**
```bash
npm run stream:health
# or
python3 scripts/check_stream_health.py
```

Press `Ctrl+C` to stop monitoring.

## 🚀 Quick Start

1. **Run setup check:**
   ```bash
   npm run stream:setup
   ```

2. **Launch everything:**
   ```bash
   npm run stream:launch
   ```

3. **For 24/7 streaming, prevent sleep:**
   ```bash
   npm run stream:prevent-sleep
   ```

4. **Monitor stream health (optional):**
   ```bash
   npm run stream:health
   ```

## 📝 OBS Settings Template

After running `obs_setup_helper.py`, you'll find `obs_settings_template.json` with recommended settings:
- Video: 1920x1080 @ 30fps
- Output: Hardware encoder, 6000 Kbps
- Browser Source: Pre-configured for Heliosinger

## 🎯 Complete Setup Workflow

```bash
# 1. Check your system
npm run stream:setup

# 2. Launch dev server and OBS
npm run stream:launch

# 3. In OBS, follow the instructions shown by setup helper
#    - Add Browser Source
#    - Configure YouTube stream key
#    - Optimize settings

# 4. For 24/7 streaming
npm run stream:prevent-sleep

# 5. (Optional) Monitor health
npm run stream:health
```

## 🐛 Troubleshooting

If scripts don't work:

1. **Make scripts executable:**
   ```bash
   chmod +x scripts/*.sh scripts/*.py
   ```

2. **Check Python version:**
   ```bash
   python3 --version  # Should be 3.6+
   ```

3. **Verify OBS installation:**
   ```bash
   ls /Applications/OBS.app
   ```

4. **Check dev server:**
   ```bash
   curl http://localhost:5173/stream
   ```

## 📚 Additional Resources

- See `STREAMING_SETUP.md` for detailed OBS configuration
- OBS Studio docs: https://obsproject.com/wiki
- YouTube streaming guide: https://support.google.com/youtube/answer/2907883



