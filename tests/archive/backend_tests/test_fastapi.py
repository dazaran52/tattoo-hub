import asyncio
import sys
import os
import traceback

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from main import app
from app.middleware.auth import get_current_user, AuthUser

def override_get_current_user():
    return AuthUser(user_id="26871c06-2686-406b-be67-86ad63f9505c", email="fenix.mcferson@gmail.com", role="master")

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

response = client.get("/api/chat/my")
print("Status:", response.status_code)
if response.status_code != 200:
    print("Error content:", response.content)
else:
    print("Success:", response.json())
