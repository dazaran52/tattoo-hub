import sys
import os
sys.path.insert(0, os.path.abspath('backend'))
import traceback
try:
    import app.routers.crm
    print("Success")
except Exception as e:
    print("Error:", type(e))
    traceback.print_exc()
