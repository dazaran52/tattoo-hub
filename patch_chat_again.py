import re

with open('backend/app/routers/chat.py', 'r') as f:
    content = f.read()

def_replace = """def apply_anti_bypass_filter(content: str) -> tuple[str, bool]:
    \"\"\"Mask phone numbers, emails, social handles, and external links to prevent platform bypass. Returns (masked_text, was_bypassed).\"\"\"
    text = content
    was_bypassed = False
    
    # 1. Advanced Phone number bypass
    if SPACE_PHONE_REGEX.search(text): was_bypassed = True
    text = SPACE_PHONE_REGEX.sub('[HIDDEN_CONTACT]', text)
    
    # 2. Advanced Social handle bypass
    if SOCIAL_BYPASS_REGEX.search(text): was_bypassed = True
    text = SOCIAL_BYPASS_REGEX.sub('[HIDDEN_CONTACT]', text)
    
    # 3. Standard masking
    if EMAIL_REGEX.search(text) or LINK_REGEX.search(text) or SOCIAL_REGEX.search(text): was_bypassed = True
    text = EMAIL_REGEX.sub('[HIDDEN_CONTACT]', text)
    text = LINK_REGEX.sub('[HIDDEN_CONTACT]', text)
    text = SOCIAL_REGEX.sub('[HIDDEN_CONTACT]', text)
    
    # 4. Count digits
    digits = sum(c.isdigit() for c in text)
    if digits >= 8:
        was_bypassed = True
        text = PHONE_REGEX.sub('[HIDDEN_CONTACT]', text)
        
    # 5. Check for spelled out numbers
    spelled_out = {
        'ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
        'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'
    }
    words = [w.strip('.,!?()[]{}') for w in text.lower().split()]
    spelled_digits_count = sum(1 for w in words if w in spelled_out)
    
    if spelled_digits_count >= 7:
         return "[HIDDEN_CONTACT]", True
         
    return text, was_bypassed
"""

content = re.sub(r"def apply_anti_bypass_filter\(content: str\) -> tuple\[str, bool\]:.*?return text, was_bypassed\n", def_replace, content, flags=re.DOTALL)

usage_replace = """content, was_bypassed = apply_anti_bypass_filter(message.content)
    
    if was_bypassed:
        # Notify admins about bypass attempt
        from app.services.notifications import notify_admins
        notify_admins(
            title="🚨 ПОПЫТКА ОБХОДА ПЛАТФОРМЫ",
            body=f"Пользователь попытался передать контакты в чате {chat_id}.",
            link="/admin?tab=security"
        )
"""

content = re.sub(r"content, was_bypassed = apply_anti_bypass_filter\(message\.content\).*?link=\"/admin\?tab=security\"\n\s*\)", usage_replace, content, flags=re.DOTALL)

with open('backend/app/routers/chat.py', 'w') as f:
    f.write(content)
