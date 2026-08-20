import re

with open('backend/app/routers/leads.py', 'r') as f:
    content = f.read()

start_replace = """is_unlocked = True
            unlock_status = lead.get("status")
            contacts = lead.get("contacts")
            
            # Anti-fraud: Hide direct contacts for paid leads
            if not lead.get("is_personal"):
                contacts = "Доступно только во внутреннем чате"
                lead["phone"] = "Скрыто"
                lead["email"] = "Скрыто"
"""

content = re.sub(
    r"is_unlocked = True\n\s*unlock_status = lead\.get\(\"status\"\)\n\s*contacts = lead\[\"contacts\"\]",
    start_replace,
    content
)

with open('backend/app/routers/leads.py', 'w') as f:
    f.write(content)
