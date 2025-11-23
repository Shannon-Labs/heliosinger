#!/usr/bin/env python3
"""
Stream Health Checker
Monitors the Heliosinger stream for issues
"""

import urllib.request
import json
import time
import sys
from datetime import datetime

STREAM_URL = "http://localhost:5173/stream"
HEALTH_CHECK_INTERVAL = 30  # seconds

class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

def check_stream_accessible():
    """Check if stream page is accessible"""
    try:
        with urllib.request.urlopen(STREAM_URL, timeout=5) as response:
            if response.status == 200:
                return True, "Stream page is accessible"
            else:
                return False, f"Stream returned status {response.status}"
    except urllib.error.URLError as e:
        return False, f"Cannot connect to stream: {e}"
    except Exception as e:
        return False, f"Error checking stream: {e}"

def check_api_endpoints():
    """Check if API endpoints are responding"""
    endpoints = [
        "http://localhost:5173/api/space-weather/comprehensive",
        "http://localhost:5173/api/solar-wind/current",
    ]
    
    results = {}
    for endpoint in endpoints:
        try:
            with urllib.request.urlopen(endpoint, timeout=5) as response:
                if response.status == 200:
                    results[endpoint] = "OK"
                else:
                    results[endpoint] = f"Status {response.status}"
        except Exception as e:
            results[endpoint] = f"Error: {str(e)[:50]}"
    
    return results

def print_status(status, message):
    """Print status with color"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    if status == "OK":
        print(f"{Colors.GREEN}[{timestamp}] ✅ {message}{Colors.RESET}")
    elif status == "WARNING":
        print(f"{Colors.YELLOW}[{timestamp}] ⚠️  {message}{Colors.RESET}")
    else:
        print(f"{Colors.RED}[{timestamp}] ❌ {message}{Colors.RESET}")

def main():
    """Main monitoring loop"""
    print(f"{Colors.BOLD}{Colors.BLUE}🔍 Heliosinger Stream Health Monitor{Colors.RESET}")
    print(f"Monitoring: {STREAM_URL}")
    print(f"Check interval: {HEALTH_CHECK_INTERVAL} seconds")
    print("Press Ctrl+C to stop\n")
    
    consecutive_failures = 0
    
    try:
        while True:
            # Check stream page
            accessible, message = check_stream_accessible()
            if accessible:
                print_status("OK", message)
                consecutive_failures = 0
            else:
                print_status("ERROR", message)
                consecutive_failures += 1
                
                if consecutive_failures >= 3:
                    print_status("ERROR", "Multiple consecutive failures detected!")
                    print(f"{Colors.YELLOW}   Consider restarting the dev server{Colors.RESET}")
            
            # Check API endpoints (less frequently)
            if time.time() % (HEALTH_CHECK_INTERVAL * 2) < HEALTH_CHECK_INTERVAL:
                api_results = check_api_endpoints()
                for endpoint, result in api_results.items():
                    if result == "OK":
                        print_status("OK", f"API endpoint OK: {endpoint.split('/')[-1]}")
                    else:
                        print_status("WARNING", f"API issue: {endpoint.split('/')[-1]} - {result}")
            
            time.sleep(HEALTH_CHECK_INTERVAL)
            
    except KeyboardInterrupt:
        print(f"\n{Colors.BLUE}Monitoring stopped by user{Colors.RESET}")
        sys.exit(0)

if __name__ == "__main__":
    main()

