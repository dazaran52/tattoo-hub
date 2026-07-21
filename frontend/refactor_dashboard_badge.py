import re

path = "frontend/src/app/dashboard/page.tsx"
with open(path, "r") as f:
    content = f.read()

old_button = '''                    {t('messages')}
                  </button>'''

new_button = '''                    <span className="flex items-center gap-2">
                      {t('messages')}
                      {unreadMessages > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                    </span>
                  </button>'''

if old_button in content:
    content = content.replace(old_button, new_button)
    print("Updated master messages button in dashboard/page.tsx")
else:
    print("Could not find master messages button")

with open(path, "w") as f:
    f.write(content)
