import re

path = "backend/main.py"
with open(path, "r") as f:
    content = f.read()

if "from app.routers import favorites" not in content:
    # Find the imports from app.routers
    content = re.sub(
        r'from app\.routers import (.+)',
        r'from app.routers import \1, favorites',
        content,
        count=1
    )
    
    # Also add the router include
    if "app.include_router(favorites.router)" not in content:
        # Find the last include_router and insert after it
        content = re.sub(
            r'(app\.include_router\(.+\)\n)(?!\s*app\.include_router)',
            r'\1app.include_router(favorites.router)\n',
            content
        )
    
    with open(path, "w") as f:
        f.write(content)
    print("Updated backend/main.py")
else:
    print("backend/main.py already updated")
