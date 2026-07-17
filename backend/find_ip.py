import requests
import re

url = "https://www.tattoo-hub.xyz/dashboard"
resp = requests.get(url)
html = resp.text

scripts = re.findall(r'src="(/_next/static/chunks/[^"]+\.js)"', html)

for script in scripts:
    js_url = "https://www.tattoo-hub.xyz" + script
    js_resp = requests.get(js_url)
    if "49.13.145.179" in js_resp.text:
        print(f"Found IP in {script}!")
