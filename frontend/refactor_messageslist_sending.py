import re

path = "frontend/src/components/MessagesList.tsx"
with open(path, "r") as f:
    content = f.read()

# Remove setSending(true) from blocking the form. Let's just remove sending state usage in the form.
old_button = '''                <button 
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="bg-violet-600 hover:bg-violet-700 disabled:bg-neutral-300 disabled:dark:bg-neutral-800 text-white p-3 rounded-xl transition-all shadow-sm flex items-center justify-center min-w-[48px]"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>'''

new_button = '''                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-violet-600 hover:bg-violet-700 disabled:bg-neutral-300 disabled:dark:bg-neutral-800 text-white p-3 rounded-xl transition-all shadow-sm flex items-center justify-center min-w-[48px]"
                >
                  <Send className="w-5 h-5" />
                </button>'''

if old_button in content:
    content = content.replace(old_button, new_button)
    print("Updated button state")
else:
    print("Could not find button state")

# We should also ensure the message has an entry animation.
old_message_div = '''                  <div key={msg.id} className={`flex ${msg.sender_type === userRole ? 'justify-end' : 'justify-start'} shrink-0`}>'''
new_message_div = '''                  <div key={msg.id} className={`flex ${msg.sender_type === userRole ? 'justify-end' : 'justify-start'} shrink-0 animate-in slide-in-from-bottom-2 fade-in duration-300`}>'''

if old_message_div in content:
    content = content.replace(old_message_div, new_message_div)
    print("Updated message animation")

# We should also remove setSending(true) block in sendMessage so it doesn't block
old_send = '''    setSending(true)
    try {'''
new_send = '''    // setSending(true) -- removed to allow instant typing
    try {'''
content = content.replace(old_send, new_send)

old_finally = '''    } finally {
      setSending(false)
    }'''
new_finally = '''    } finally {
      // setSending(false)
    }'''
content = content.replace(old_finally, new_finally)

with open(path, "w") as f:
    f.write(content)
