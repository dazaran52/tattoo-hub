import re

with open('frontend/src/app/[locale]/book/[username]/page.tsx', 'r') as f:
    content = f.read()
content = re.sub(r'<div className="absolute top-\[-10%\] left-\[-10%\].*?blur-\[120px\]" \/>\n\s*<div className="absolute bottom-\[-10%\] right-\[-10%\].*?blur-\[120px\]" \/>', '', content)
with open('frontend/src/app/[locale]/book/[username]/page.tsx', 'w') as f:
    f.write(content)

with open('frontend/src/app/[locale]/profile/page.tsx', 'r') as f:
    content = f.read()
content = re.sub(r'<div className="absolute top-\[-20%\] left-\[-10%\].*?blur-\[120px\] .*?><\/div>', '', content)
with open('frontend/src/app/[locale]/profile/page.tsx', 'w') as f:
    f.write(content)

