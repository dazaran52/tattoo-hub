from fastapi.testclient import TestClient
from main import create_application
from app.routers.admin import get_admin_user, AuthUser

app = create_application()

def override_get_admin_user():
    return AuthUser(user_id="d8e14fd9-5a6b-447b-963d-459b7b8cc5b1", email="admin", role="admin")

app.dependency_overrides[get_admin_user] = override_get_admin_user

client = TestClient(app)

response = client.put(
    "/api/admin/users/d8e14fd9-5a6b-447b-963d-459b7b8cc5b1/balance",
    json={"balance": 500}
)
print("PUT response:", response.status_code, response.json())

response = client.post(
    "/api/admin/users/d8e14fd9-5a6b-447b-963d-459b7b8cc5b1/adjust-balance",
    json={"amount": 100, "operation": "add", "reason": "Test"}
)
print("POST response:", response.status_code, response.json())
