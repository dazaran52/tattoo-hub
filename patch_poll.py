import re

with open('frontend/src/components/MessagesList.tsx', 'r') as f:
    content = f.read()

# Make sure imports exist
if "import { playSound } from '@/lib/sounds'" not in content:
    content = content.replace("import { toast } from 'react-hot-toast'", "import { toast } from 'react-hot-toast'\nimport { playSound } from '@/lib/sounds'\nimport { vibrate } from '@/lib/haptics'")

# Hook into hasNew
new_logic = """
          if (hasNew) {
            const hasNewFromOther = data.some((m: any) => m.sender_type !== userRole && !prev.find(p => p.id === m.id));
            if (hasNewFromOther) {
               playSound('pop')
               vibrate('medium')
            }
          }
"""

content = re.sub(r'(\s*if\s*\(hasNew\)\s*\{\s*setTimeout\(\(\)\s*=>\s*scrollToBottom\(false\),\s*100\)\s*\})', r'\1' + new_logic, content)

with open('frontend/src/components/MessagesList.tsx', 'w') as f:
    f.write(content)

