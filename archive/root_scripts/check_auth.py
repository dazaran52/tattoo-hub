import ast

with open('backend/app/routers/admin.py', 'r') as f:
    tree = ast.parse(f.read())

missing = []
for node in ast.walk(tree):
    if isinstance(node, ast.AsyncFunctionDef) or isinstance(node, ast.FunctionDef):
        # Check if it has a decorator starting with '@router.'
        has_route = False
        for dec in node.decorator_list:
            if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute):
                if getattr(dec.func.value, 'id', '') == 'router':
                    has_route = True
                    break
        
        if has_route:
            # Check if it has Depends(get_admin_user)
            has_auth = False
            for arg in node.args.args + node.args.kwonlyargs:
                if arg.annotation:
                    if isinstance(arg.annotation, ast.Name) and arg.annotation.id == 'AuthUser':
                        has_auth = True
                        break
            if not has_auth:
                missing.append(node.name)

if missing:
    print("WARNING: Missing AuthUser dependency in:", missing)
else:
    print("All routes have AuthUser dependency.")
