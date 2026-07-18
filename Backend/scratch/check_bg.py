with open("frontend/src/components/fx/RecommendationPanel/RecommendationPanel.module.css", "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = re.findall(r"background[^;]+;", content)
for m in matches:
    print(m)
