import asyncio
from fastapi.testclient import TestClient
from main import app
from app.middleware.auth import get_current_user, AuthUser
import os
from dotenv import load_dotenv

load_dotenv("/home/dazaran/Загрузки/Tattoo HUB/backend/.env")

# Mock the get_current_user dependency
def override_get_current_user():
    return AuthUser(
        user_id="578269bf-334c-4455-9a67-801d839c254f",
        email="test_45fd36@tattoohub.cz",
        user_metadata={"role": "client"}
    )

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

response = client.get("/api/profile")
print("STATUS:", response.status_code)
print("BODY:", response.text)
