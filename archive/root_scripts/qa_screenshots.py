import asyncio
from playwright.async_api import async_playwright
import os

PAGES = [
    {"name": "home", "url": "https://tattoo-hub.xyz/"},
    {"name": "login", "url": "https://tattoo-hub.xyz/login"},
    {"name": "admin", "url": "https://tattoo-hub.xyz/admin"}
]

async def main():
    os.makedirs("screenshots", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        # Desktop
        desktop_context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        # Mobile
        mobile_context = await browser.new_context(viewport={"width": 375, "height": 812}, is_mobile=True, has_touch=True)
        
        for page_info in PAGES:
            print(f"Taking screenshots for {page_info['name']}")
            try:
                # Desktop
                d_page = await desktop_context.new_page()
                await d_page.goto(page_info["url"], wait_until="networkidle", timeout=10000)
                # Wait a bit for animations
                await asyncio.sleep(2)
                await d_page.screenshot(path=f"screenshots/{page_info['name']}_desktop.png", full_page=True)
                await d_page.close()
                
                # Mobile
                m_page = await mobile_context.new_page()
                await m_page.goto(page_info["url"], wait_until="networkidle", timeout=10000)
                await asyncio.sleep(2)
                await m_page.screenshot(path=f"screenshots/{page_info['name']}_mobile.png", full_page=True)
                await m_page.close()
            except Exception as e:
                print(f"Error on {page_info['name']}: {e}")
                
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
