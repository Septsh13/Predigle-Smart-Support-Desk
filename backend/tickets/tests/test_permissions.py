from .helpers import MongoAPITestCase


class TicketPermissionTests(MongoAPITestCase):
    def test_missing_role_defaults_to_user_and_user_cannot_patch(self):
        ticket = self.add_ticket("Needs an update")
        response = self.client.patch(
            f"/api/tickets/{ticket['id']}/",
            {"status": "In Progress"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["detail"], "Only support agents can update tickets.")

    def test_agent_can_patch_ticket(self):
        ticket = self.add_ticket("Needs an update")
        response = self.client.patch(
            f"/api/tickets/{ticket['id']}/",
            {"status": "In Progress"},
            format="json",
            HTTP_X_ROLE="AGENT",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "In Progress")

    def test_invalid_role_returns_400(self):
        response = self.client.get("/api/tickets/", HTTP_X_ROLE="manager")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Invalid role. Use 'user' or 'agent'.")

    def test_stats_are_live_counts(self):
        self.add_ticket("Open", status="Open")
        self.add_ticket(
            "Resolved",
            status="Resolved",
            resolution_note="Repaired the account.",
        )
        self.add_ticket("In progress", status="In Progress")
        response = self.client.get("/api/tickets/stats/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {
            "total": 3,
            "open": 1,
            "in_progress": 1,
            "resolved": 1,
        })
