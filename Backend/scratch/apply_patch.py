import re

def apply_diff():
    # Read the clean file
    with open("frontend/src/app/dashboard/page.tsx", "r", encoding="utf-8-sig") as f:
        clean_content = f.read().splitlines()

    # Read the diff file
    with open("C:/Users/HP USER/.gemini/antigravity-ide/brain/ad4c47e5-32c2-41f0-b8f3-a0abc1cff2b8/scratch/dashboard.diff", "r", encoding="utf-8") as f:
        diff_lines = f.read().splitlines()

    new_content = []
    # Let's parse the hunks
    hunks = []
    current_hunk = None
    
    hunk_header_re = re.compile(r"^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@")
    
    i = 0
    while i < len(diff_lines):
        line = diff_lines[i]
        match = hunk_header_re.match(line)
        if match:
            if current_hunk:
                hunks.append(current_hunk)
            current_hunk = {
                "old_start": int(match.group(1)),
                "old_len": int(match.group(2)) if match.group(2) else 1,
                "new_start": int(match.group(3)),
                "new_len": int(match.group(4)) if match.group(4) else 1,
                "lines": []
            }
        elif current_hunk is not None:
            if line.startswith(" ") or line.startswith("+") or line.startswith("-"):
                current_hunk["lines"].append(line)
            elif line.startswith("\\"):
                pass
            else:
                hunks.append(current_hunk)
                current_hunk = None
        i += 1
    if current_hunk:
        hunks.append(current_hunk)

    # Apply hunks in reverse order (to not throw off line numbers)
    clean_lines = list(clean_content)
    for hunk in reversed(hunks):
        old_start = hunk["old_start"] - 1 # 0-indexed
        old_len = hunk["old_len"]
        
        # Verify old content match
        diff_old_lines = [l[1:] for l in hunk["lines"] if l.startswith(" ") or l.startswith("-")]
        actual_old_lines = clean_lines[old_start:old_start + old_len]
        
        # Let's construct new lines
        diff_new_lines = [l[1:] for l in hunk["lines"] if l.startswith(" ") or l.startswith("+")]
        
        clean_lines[old_start:old_start + old_len] = diff_new_lines
        print(f"Applied hunk @@ -{hunk['old_start']} +{hunk['new_start']}")

    with open("frontend/src/app/dashboard/page.tsx", "w", encoding="utf-8") as f:
        f.write("\n".join(clean_lines) + "\n")
    print("Success applying patch!")

apply_diff()
