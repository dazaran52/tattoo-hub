import os
import sys

with open("app/routers/admin.py", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "/status" in line:
        start = max(0, i-2)
        end = min(len(lines), i+30)
        print("".join(lines[start:end]))
        break
