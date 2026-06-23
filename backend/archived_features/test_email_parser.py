import asyncio
from app.services.email_parser import parse_revolut_email

bodies = [
    "You received €50.00 from John. Note: user123@gmail.com",
    "John sent you 50 UAH. Reference: john_doe@test.com",
    "Here is 100 EUR. Примітка: alex@example.com",
    "Sent €20.50. Сообщение: test@email.com",
    "Sent 20 ₴. Сообщение: test2@email.com"
]

for b in bodies:
    amount, curr, note = parse_revolut_email(b)
    print(f"Body: '{b}' -> amount={amount}, curr={curr}, note='{note}'")

