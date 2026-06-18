import re

with open("app/routers/admin.py", "r") as f:
    content = f.read()

content = content.replace("UserCreditsUpdate", "UserBalanceUpdate")
content = content.replace("credits: int", "balance: float")
content = content.replace("credits=", "balance=")
content = content.replace('u["credits"]', 'u.get("balance", 0)')
content = content.replace('update_data.credits', 'update_data.balance')
content = content.replace('/credits"', '/balance"')
content = content.replace('update_user_credits', 'update_user_balance')
content = content.replace('"credits": update_data.balance', '"balance": update_data.balance')

if content != open("app/routers/admin.py").read():
    with open("app/routers/admin.py", "w") as f:
        f.write(content)
    print("Updated admin.py")

with open("../frontend/src/app/admin/page.tsx", "r") as f:
    fc = f.read()
fc = fc.replace('/credits`', '/balance`')
if fc != open("../frontend/src/app/admin/page.tsx").read():
    with open("../frontend/src/app/admin/page.tsx", "w") as f:
        f.write(fc)
    print("Updated admin page.tsx")

with open("../frontend/src/components/AdminChat.tsx", "r") as f:
    ac = f.read()
ac = ac.replace('/credits`', '/balance`')
if ac != open("../frontend/src/components/AdminChat.tsx").read():
    with open("../frontend/src/components/AdminChat.tsx", "w") as f:
        f.write(ac)
    print("Updated AdminChat.tsx")

