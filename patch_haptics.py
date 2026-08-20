import re

with open('frontend/src/components/BottomNav.tsx', 'r') as f:
    content = f.read()

content = "import { vibrate } from '@/lib/haptics'\n" + content
content = re.sub(r"if \(typeof window !== 'undefined' && window\.navigator && typeof window\.navigator\.vibrate === 'function'\) \{\n\s*window\.navigator\.vibrate\(10\)\n\s*\}", "vibrate('light')", content)
with open('frontend/src/components/BottomNav.tsx', 'w') as f:
    f.write(content)

with open('frontend/src/components/TouchEffect.tsx', 'r') as f:
    content = f.read()
content = "import { vibrate } from '@/lib/haptics'\n" + content
content = re.sub(r"if \(typeof window !== 'undefined' && window\.navigator && window\.navigator\.vibrate\) \{\n\s*try \{\n\s*window\.navigator\.vibrate\(10\) // premium Google Pixel-like tick \(10ms\)\n\s*\} catch \(e\) \{\}\n\s*\}", "vibrate('light')", content)
with open('frontend/src/components/TouchEffect.tsx', 'w') as f:
    f.write(content)

