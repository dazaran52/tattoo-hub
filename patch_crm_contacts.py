import re

with open('backend/app/routers/crm.py', 'r') as f:
    content = f.read()

start_replace = """client["is_unlocked"] = True
            if client.get("leads"):
                if client["leads"].get("is_personal"):
                    client["source"] = "direct"
                else:
                    client["source"] = "marketplace"
                    # It's a marketplace lead assigned to this master
                    if client["lead_id"] not in selected_lead_ids:
                        client["is_unlocked"] = False
                        client["chat_id"] = None
                        client["leads"]["contacts"] = "Скрыто до выбора мастера"
                    else:
                        client["leads"]["contacts"] = "Доступно только в чате"
                        
                    # MASK CONTACTS
                    client["phone"] = "Скрыто платформой"
                    client["email"] = "Скрыто платформой"
                    client["instagram"] = "Скрыто"
                    client["telegram"] = "Скрыто"
                    client["contact_info"] = "Скрыто"
                    if client.get("leads"):
                        client["leads"]["phone"] = "Скрыто"
                        client["leads"]["email"] = "Скрыто"
                        """

content = re.sub(
    r"client\[\"is_unlocked\"\] = True\n\s*if client\.get\(\"leads\"\):\n\s*if client\[\"leads\"\]\.get\(\"is_personal\"\):\n\s*client\[\"source\"\] = \"direct\"\n\s*else:\n\s*# It's a marketplace lead assigned to this master\n\s*if client\[\"lead_id\"\] not in selected_lead_ids:\n\s*client\[\"is_unlocked\"\] = False\n\s*client\[\"chat_id\"\] = None\n\s*client\[\"phone\"\] = \"Скрыто\"\n\s*client\[\"email\"\] = \"Скрыто\"\n\s*client\[\"instagram\"\] = \"Скрыто\"\n\s*client\[\"contact_info\"\] = \"Скрыто\"\n\s*client\[\"leads\"\]\[\"contacts\"\] = \"Скрыто до выбора мастера\"",
    start_replace,
    content
)

with open('backend/app/routers/crm.py', 'w') as f:
    f.write(content)
