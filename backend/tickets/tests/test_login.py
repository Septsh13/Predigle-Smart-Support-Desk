from django.contrib.auth.hashers import make_password

from tickets import db
from .helpers import MongoAPITestCase


class LoginTests(MongoAPITestCase):
    def setUp(self):
        super().setUp()
        db.upsert_demo_user({
            "username": "agent1",
            "display_name": "Support Agent 1",
            "role": "agent",
            "password_hash": make_password("demo1234"),
        })

    def test_login_success_returns_demo_profile_and_role(self):
        response = self.client.post("/api/login/", {
            "username": "agent1",
            "password": "demo1234",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {
            "username": "agent1",
            "display_name": "Support Agent 1",
            "role": "agent",
        })

    def test_wrong_password_returns_401(self):
        response = self.client.post("/api/login/", {
            "username": "agent1",
            "password": "wrong",
        }, format="json")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["detail"], "Invalid username or password.")

    def test_missing_login_fields_returns_400(self):
        response = self.client.post("/api/login/", {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("username", response.data)
        self.assertIn("password", response.data)
