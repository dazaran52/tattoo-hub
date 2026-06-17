import requests
import re

url = "https://www.tattoo-hub.xyz"
resp = requests.get(url)
html = resp.text

# Find script tags
scripts = re.findall(r'src="(/_next/static/chunks/[^"]+\.js)"', html)
print("Found scripts:", scripts)

for script in scripts:
    js_url = url + script
    js_resp = requests.get(js_url)
    js_text = js_resp.text
    
    # Search for URLs
    matches = re.findall(r'https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', js_text)
    if matches:
        # Filter unique domains
        unique_domains = list(set(matches))
        # Filter out nextjs or react domains if any, but keep render or custom ones
        interesting = [d for d in unique_domains if 'nextjs' not in d and 'react' not in d and 'w3.org' not in d]
        if interesting:
            print(f"Found URLs in {script}:", interesting)
