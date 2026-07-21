import re

path = "frontend/src/components/MessagesList.tsx"
with open(path, "r") as f:
    content = f.read()

old_heading = '''          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-violet-500" />
            Сообщения
          </h2>'''

new_heading = '''          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-violet-500" />
            Сообщения
            {chats.reduce((sum, c: any) => sum + (c.unread_count || 0), 0) > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse ml-1" />
            )}
          </h2>'''

if old_heading in content:
    content = content.replace(old_heading, new_heading)
    print("Updated MessagesList heading")
else:
    print("Could not find MessagesList heading")

with open(path, "w") as f:
    f.write(content)
