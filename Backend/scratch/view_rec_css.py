with open("frontend/src/components/fx/RecommendationPanel/RecommendationPanel.module.css", "r", encoding="utf-8") as f:
    lines = f.read().splitlines()

for i in range(min(50, len(lines))):
    print(f"{i+1}: {lines[i]}")
