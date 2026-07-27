import asyncio
from app.database import supabase

async def main():
    res = await supabase.auth.admin.generate_link({
        "type": "magiclink",
        "email": "fenix.mcferson@gmail.com"
    })
    print(res)

if __name__ == "__main__":
    asyncio.run(main())
