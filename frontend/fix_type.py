import re

path = "frontend/src/components/MessagesList.tsx"
with open(path, "r") as f:
    content = f.read()

old_type = '''  is_read?: boolean
}'''

new_type = '''  is_read?: boolean
  sessions_count?: number
}'''

content = content.replace(old_type, new_type)

with open(path, "w") as f:
    f.write(content)
print("Fixed type in MessagesList.tsx")
