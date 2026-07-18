with open("frontend/src/app/dashboard/page.tsx", "r", encoding="utf-8") as f:
    lines = f.read().splitlines()

for idx in range(320, min(348, len(lines))):
    print(f"{idx+1}: {lines[idx]}")
