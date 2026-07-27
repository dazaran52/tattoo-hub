import requests
import re

url = "https://www.tattoo-hub.xyz/dashboard"
resp = requests.get(url)
html = resp.text

scripts = re.findall(r'src="(/_next/static/chunks/app/dashboard[^"]+\.js)"', html)
for script in scripts:
    js_url = "https://www.tattoo-hub.xyz" + script
    js_resp = requests.get(js_url)
    print(f"Contents of {script}:")
    # Print the part containing '/api/profile'
    idx = js_resp.text.find('/api/profile')
    if idx != -1:
        start = max(0, idx - 100)
        end = min(len(js_resp.text), idx + 100)
        print(js_resp.text[start:end])
    else:
        print("Not found")

