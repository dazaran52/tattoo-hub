import re
with open('frontend/src/app/[locale]/dashboard/page.tsx', 'r') as f:
    content = f.read()

# Remove the static glows
content = re.sub(r"\{\/\* Premium ambient glows \*\/\}.*?<\/div>", "", content, flags=re.DOTALL)

with open('frontend/src/app/[locale]/dashboard/page.tsx', 'w') as f:
    f.write(content)
