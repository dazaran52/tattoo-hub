import os
import re

dir_path = "/home/dazaran/Загрузки/OUT Tattoo WEB/frontend/src/components"

for filename in os.listdir(dir_path):
    if not filename.endswith(".tsx"):
        continue
    filepath = os.path.join(dir_path, filename)
    with open(filepath, "r") as f:
        content = f.read()

    # Match <div className="fixed inset-0 ..."> but not if it has onClick
    # or handle the cases.
    lines = content.split('\n')
    modified = False
    
    # We will try to find the modal wrapper. Usually it has 'fixed inset-0'.
    for i, line in enumerate(lines):
        if 'className="fixed inset-0' in line or "className='fixed inset-0" in line:
            # check if onClick is already there in this line or next line
            # It's a bit naive, but it might work.
            if 'onClick' not in line and '<div' in line:
                # Need to find the close function name. Usually 'onClose'
                close_func = 'onClose'
                if 'onClose=' in content or 'onClose:' in content or 'onClose?:' in content or 'onClose()' in content or 'onClose,' in content:
                    close_func = 'onClose'
                elif 'onCancel' in content:
                    close_func = 'onCancel'
                elif 'setIsModalOpen(false)' in content:
                    close_func = '() => setIsModalOpen(false)'
                
                # We can just add onClick
                # But wait, some components might not have a close function in scope.
                # Let's print out what we would modify.
                print(f"{filename}:{i+1}: {line.strip()}")
