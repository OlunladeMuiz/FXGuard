import json

log_path = "C:/Users/HP USER/.gemini/antigravity-ide/brain/ad4c47e5-32c2-41f0-b8f3-a0abc1cff2b8/.system_generated/logs/transcript.jsonl"

print("Searching for terminal commands...")
with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("type") == "PLANNER_RESPONSE" or "tool_calls" in data:
                tool_calls = data.get("tool_calls", [])
                for tc in tool_calls:
                    if tc.get("name") == "run_command":
                        cmd = tc.get("args", {}).get("CommandLine", "")
                        print(f"Step {data.get('step_index')}: {cmd}")
        except Exception as e:
            pass
