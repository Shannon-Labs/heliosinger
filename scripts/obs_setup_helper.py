#!/usr/bin/env python3
"""
OBS Setup Helper for Heliosinger
Automates OBS configuration checks and provides setup guidance
"""

import subprocess
import sys
import os
import json
import platform
from pathlib import Path

# OBS configuration paths
OBS_CONFIG_BASE = Path.home() / "Library/Application Support/obs-studio"
OBS_GLOBAL_INI = OBS_CONFIG_BASE / "global.ini"
OBS_BASIC_PROFILES = OBS_CONFIG_BASE / "basic/profiles"

class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

def print_header(text):
    """Print a formatted header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}\n")

def print_success(text):
    """Print success message"""
    print(f"{Colors.GREEN}✅ {text}{Colors.RESET}")

def print_warning(text):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.RESET}")

def print_error(text):
    """Print error message"""
    print(f"{Colors.RED}❌ {text}{Colors.RESET}")

def print_info(text):
    """Print info message"""
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.RESET}")

def check_obs_installed():
    """Check if OBS Studio is installed"""
    obs_paths = [
        "/Applications/OBS.app",
        "/Applications/OBS Studio.app",
        "/usr/local/bin/obs",
    ]
    
    for path in obs_paths:
        if os.path.exists(path):
            print_success(f"OBS Studio found at: {path}")
            return True
    
    print_error("OBS Studio not found")
    print_info("Install with: brew install --cask obs")
    return False

def check_hardware_encoding():
    """Check if Mac supports hardware encoding"""
    try:
        result = subprocess.run(
            ["system_profiler", "SPDisplaysDataType"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if "Metal" in result.stdout:
            print_success("Hardware encoding supported (Metal detected)")
            print_info("Use 'Apple VT H264 Hardware Encoder' in OBS")
            return True
        else:
            print_warning("Metal not detected - may need software encoding")
            return False
    except Exception as e:
        print_warning(f"Could not check hardware encoding: {e}")
        return False

def check_dev_server():
    """Check if dev server is running"""
    import urllib.request
    import socket
    
    try:
        # Try to connect to localhost:5173
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex(('localhost', 5173))
        sock.close()
        
        if result == 0:
            # Try to fetch the stream page
            try:
                with urllib.request.urlopen('http://localhost:5173/stream', timeout=3) as response:
                    if response.status == 200:
                        print_success("Dev server is running and stream page is accessible")
                        return True
            except:
                print_warning("Dev server is running but /stream page may not be accessible")
                return False
        else:
            print_error("Dev server is not running on port 5173")
            print_info("Start with: cd /Volumes/VIXinSSD/SolarChime && npm run dev")
            return False
    except Exception as e:
        print_error(f"Could not check dev server: {e}")
        return False

def check_obs_config():
    """Check OBS configuration files"""
    if not OBS_CONFIG_BASE.exists():
        print_warning("OBS configuration directory not found")
        print_info("OBS may not have been launched yet")
        return False
    
    print_success("OBS configuration directory found")
    
    # Check for profiles
    if OBS_BASIC_PROFILES.exists():
        profiles = list(OBS_BASIC_PROFILES.iterdir())
        if profiles:
            print_info(f"Found {len(profiles)} OBS profile(s)")
        else:
            print_warning("No OBS profiles found - create one in OBS")
    
    return True

def generate_obs_settings_template():
    """Generate recommended OBS settings as JSON template"""
    settings = {
        "video": {
            "base_resolution": "1920x1080",
            "output_resolution": "1920x1080",
            "fps": 30
        },
        "output": {
            "mode": "simple",
            "video_bitrate": 6000,
            "audio_bitrate": 160,
            "encoder": "Apple VT H264 Hardware Encoder"
        },
        "audio": {
            "sample_rate": 48000,
            "channels": 2
        },
        "browser_source": {
            "url": "http://localhost:5173/stream",
            "width": 1920,
            "height": 1080,
            "fps": 30,
            "shutdown_when_not_visible": True,
            "refresh_when_scene_active": True
        }
    }
    
    template_path = Path(__file__).parent / "obs_settings_template.json"
    with open(template_path, 'w') as f:
        json.dump(settings, f, indent=2)
    
    print_success(f"Settings template saved to: {template_path}")
    return template_path

def check_system_resources():
    """Check system resources"""
    try:
        # Check CPU cores
        cpu_count = os.cpu_count()
        print_info(f"CPU cores: {cpu_count}")
        
        # Check memory (macOS specific)
        if platform.system() == "Darwin":
            result = subprocess.run(
                ["sysctl", "-n", "hw.memsize"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                mem_gb = int(result.stdout.strip()) / (1024**3)
                print_info(f"Total RAM: {mem_gb:.1f} GB")
        
        # Check if caffeinate is available
        if subprocess.run(["which", "caffeinate"], capture_output=True).returncode == 0:
            print_success("caffeinate available (for preventing sleep)")
        else:
            print_warning("caffeinate not found")
        
    except Exception as e:
        print_warning(f"Could not check system resources: {e}")

def print_setup_instructions():
    """Print step-by-step setup instructions"""
    print_header("OBS Setup Instructions")
    
    instructions = [
        ("1. Launch OBS Studio", "open /Applications/OBS.app"),
        ("2. Auto-Configuration", "Select 'Optimize for streaming' → YouTube"),
        ("3. Add Browser Source", "Sources → + → Browser → Name: 'Heliosinger Stream'"),
        ("4. Configure Browser Source", "URL: http://localhost:5173/stream\n     Width: 1920, Height: 1080, FPS: 30"),
        ("5. Configure Audio", "Settings → Audio → Enable Desktop Audio"),
        ("6. Set Up YouTube Stream", "Settings → Stream → YouTube - RTMPS\n     Get stream key from YouTube Studio"),
        ("7. Optimize Video Settings", "Settings → Video → 1920x1080 @ 30fps\n     Settings → Output → Use Hardware Encoder"),
    ]
    
    for title, details in instructions:
        print(f"\n{Colors.BOLD}{title}{Colors.RESET}")
        print(f"   {details}")

def print_troubleshooting():
    """Print troubleshooting tips"""
    print_header("Troubleshooting Tips")
    
    tips = {
        "No audio from browser source": [
            "Click Browser source settings",
            "Check 'Control audio via OBS'"
        ],
        "Stream is laggy": [
            "Lower FPS to 30",
            "Use Hardware Encoder",
            "Reduce browser source resolution to 1280x720"
        ],
        "Can't connect to localhost": [
            "Make sure dev server is running: npm run dev",
            "Try http://127.0.0.1:5173/stream instead"
        ],
        "YouTube says no data": [
            "Wait 30-60 seconds for initial buffer",
            "Check your stream key is correct"
        ]
    }
    
    for issue, solutions in tips.items():
        print(f"\n{Colors.YELLOW}{issue}{Colors.RESET}")
        for solution in solutions:
            print(f"  • {solution}")

def main():
    """Main function"""
    print_header("Heliosinger OBS Setup Helper")
    
    print("Checking system requirements...\n")
    
    # Run checks
    checks = {
        "OBS Installation": check_obs_installed,
        "Hardware Encoding": check_hardware_encoding,
        "Dev Server": check_dev_server,
        "OBS Configuration": check_obs_config,
        "System Resources": check_system_resources,
    }
    
    results = {}
    for name, check_func in checks.items():
        print(f"\n{Colors.BOLD}Checking: {name}{Colors.RESET}")
        try:
            results[name] = check_func()
        except Exception as e:
            print_error(f"Error checking {name}: {e}")
            results[name] = False
    
    # Generate settings template
    print("\n" + "="*60)
    print("Generating OBS settings template...")
    try:
        template_path = generate_obs_settings_template()
        print_info(f"Reference template: {template_path}")
    except Exception as e:
        print_warning(f"Could not generate template: {e}")
    
    # Print instructions
    print_setup_instructions()
    
    # Print troubleshooting
    print_troubleshooting()
    
    # Summary
    print_header("Setup Summary")
    all_passed = all(results.values())
    
    if all_passed:
        print_success("All checks passed! You're ready to stream.")
    else:
        print_warning("Some checks failed. Review the issues above.")
        print_info("Run this script again after fixing issues.")
    
    print("\n" + "="*60)
    print(f"{Colors.BOLD}Quick Start:{Colors.RESET}")
    print("  1. Run: ./scripts/helio-stream.sh")
    print("  2. Configure OBS as shown above")
    print("  3. Start streaming!")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()





