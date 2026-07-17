with open('frontend/src/app/admin/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace user.role !== 'client' with a robust check for masters/admins
content = content.replace("user.role !== 'client'", "(user.role === 'master' || user.is_admin || user.is_verified_master)")

# Replace user.role === 'client' with the inverse
content = content.replace("user.role === 'client'", "(!user.role || user.role === 'client' || (!user.is_admin && user.role !== 'master'))")

with open('frontend/src/app/admin/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
