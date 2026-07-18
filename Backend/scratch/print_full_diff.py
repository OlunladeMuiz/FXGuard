import subprocess

# Run git diff command
res = subprocess.run(
    ["git", "diff", "HEAD", "--", "frontend/src/app/dashboard/page.tsx"],
    capture_output=True,
    text=True,
    encoding="utf-8"
)

# Write to brain artifact directory
target_path = "C:/Users/HP USER/.gemini/antigravity-ide/brain/ad4c47e5-32c2-41f0-b8f3-a0abc1cff2b8/dashboard_full.diff"
with open(target_path, "w", encoding="utf-8") as f:
    f.write(res.stdout)

print("Saved full diff to:", target_path)
