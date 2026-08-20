with open('frontend/src/components/MessagesList.tsx', 'r') as f:
    content = f.read()

target = """          if (changed) {
            if (hasNew) setTimeout(scrollToBottom, 100)
            const combined = Array.from(prevMap.values())"""

replacement = """          if (changed) {
            if (hasNew) {
               setTimeout(scrollToBottom, 100)
               const hasNewFromOther = data.some((m: any) => m.sender_type !== userRole && !prev.find(p => p.id === m.id));
               if (hasNewFromOther) {
                 playSound('pop')
                 vibrate('medium')
               }
            }
            const combined = Array.from(prevMap.values())"""

if target in content:
    content = content.replace(target, replacement)
    print("Replaced successfully")
else:
    print("Target not found")

with open('frontend/src/components/MessagesList.tsx', 'w') as f:
    f.write(content)
