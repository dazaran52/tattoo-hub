import re

with open('frontend/src/components/MessagesList.tsx', 'r') as f:
    content = f.read()

# Replace msg.content render
replace_msg = """<p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content.replace(/\\[HIDDEN_CONTACT\\]/g, `[${t('hiddenContact')}]`)}</p>"""
content = re.sub(r'<p className="whitespace-pre-wrap text-sm leading-relaxed">\{msg\.content\}<\/p>', replace_msg, content)

# Add the warning banner at the top of messages list
# Find: <div className="p-4 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-white/5 ...
# Wait, it's easier to put it inside the messages scroll area.
# Find: <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-[#09090b] relative"
banner_replace = """<div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-[#09090b] relative" onScroll={handleScroll}>
            {selectedChat && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl p-3 mb-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-400">
                  {t('antiFraudWarning')}
                </p>
              </div>
            )}"""

content = re.sub(r'<div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-\[#09090b\] relative" onScroll=\{handleScroll\}>', banner_replace, content)

with open('frontend/src/components/MessagesList.tsx', 'w') as f:
    f.write(content)
