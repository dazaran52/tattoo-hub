import sys
import os
sys.path.insert(0, os.path.abspath('backend'))
import traceback
try:
    from main import app
    print("FastAPI app initialized successfully")
except Exception as e:
    print("Error:", type(e))
    print(traceback.format_exc())
