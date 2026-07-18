import os
import time
from pathlib import Path

def find_recent_screenshots():
    print("Searching for recent screenshot.png files...")
    search_root = Path("C:/Users/HP USER")
    now = time.time()
    
    # We will search down to 4 levels max to prevent infinite loops and timeout
    count = 0
    for root, dirs, files in os.walk(search_root):
        # Skip some big directories to avoid performance issues
        if any(p in root for p in ["AppData\\Local\\Microsoft", "AppData\\Local\\Packages", ".gemini\\antigravity-ide\\brain"]):
            continue
            
        for f in files:
            if "screenshot" in f.lower() or f.endswith(".png"):
                full_path = os.path.join(root, f)
                try:
                    mtime = os.path.getmtime(full_path)
                    if now - mtime < 600: # Created/modified in last 10 mins
                        print(f"Found recent: {full_path} (Age: {int(now - mtime)}s)")
                        count += 1
                except Exception:
                    pass
        if count >= 10:
            break

find_recent_screenshots()
