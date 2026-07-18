with open("frontend/src/app/dashboard/page.module.css", "r", encoding="utf-8") as f:
    content = f.read()

import re
classes = set(re.findall(r"\.([a-zA-Z0-9_-]+)", content))
print("Found classes:", sorted(list(classes)))

if "settlement" in content.lower():
    print("Found settlement in CSS!")
else:
    print("settlement NOT found in CSS!")
