import re
for file in ['frontend/src/app/[locale]/admin/page.tsx', 'frontend/src/app/[locale]/top-up/page.tsx']:
    with open(file, 'r') as f:
        content = f.read()
    content = re.sub(r"\{\/\* Premium ambient glows \*\/\}.*?<\/div>", "", content, flags=re.DOTALL)
    with open(file, 'w') as f:
        f.write(content)
