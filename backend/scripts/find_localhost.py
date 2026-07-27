import requests
import re

url = "https://www.tattoo-hub.xyz/dashboard"
resp = requests.get(url)
html = resp.text

scripts = re.findall(r'src="(/_next/static/chunks/[^"]+\.js)"', html)
print("Found scripts:", len(scripts))

found = False
for script in scripts:
    js_url = "https://www.tattoo-hub.xyz" + script
    js_resp = requests.get(js_url)
    if "localhost:8000" in js_resp.text:
        print(f"Found localhost:8000 in {script}!")
        found = True

if not found:
    print("localhost:8000 not found in scripts.")
