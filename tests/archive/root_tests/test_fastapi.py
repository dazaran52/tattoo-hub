import asyncio
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.dependencies import get_current_user
from backend.app.schemas import AuthUser

def override_get_current_user():
    return AuthUser(user_id="26871c06-2686-406b-be67-86ad63f9505c", email="fenix.mcferson@gmail.com", role="master")

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

response = client.get("/api/chat/my")
print(response.status_code)
print(response.json())
