with open("frontend/src/app/dashboard/page.module.css", "r", encoding="utf-8") as f:
    lines = f.read().splitlines()

target_classes = [".settlementDeck", ".workbench", ".commandHeader", ".systemDeck", ".page"]
for tc in target_classes:
    print(f"=== SEARCH FOR {tc} ===")
    found = False
    brace_count = 0
    for idx, line in enumerate(lines):
        if tc in line:
            # Print the line and the subsequent block
            found = True
            for k in range(max(0, idx - 2), min(len(lines), idx + 25)):
                print(f"{k+1}: {lines[k]}")
            break
    if not found:
        print("Not found!")
