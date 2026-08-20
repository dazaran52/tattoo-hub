with open('frontend/src/components/MessagesList.tsx', 'r') as f:
    content = f.read()

target = """          if (hasNew) {
            setTimeout(() => scrollToBottom(false), 100)
          }"""

replacement = """          if (hasNew) {
            setTimeout(() => scrollToBottom(false), 100)
            const hasNewFromOther = data.some((m: any) => m.sender_type !== userRole && !prev.find(p => p.id === m.id));
            if (hasNewFromOther) {
               playSound('pop')
               vibrate('medium')
            }
          }"""

if target in content:
    content = content.replace(target, replacement)
    print("Replaced successfully")
else:
    print("Target not found")

with open('frontend/src/components/MessagesList.tsx', 'w') as f:
    f.write(content)
