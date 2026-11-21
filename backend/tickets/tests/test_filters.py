from .helpers import MongoAPITestCase


class TicketFilterTests(MongoAPITestCase):
    def setUp(self):
        super().setUp()
        self.add_ticket("Open account", category="Account")
        self.add_ticket("Open billing", category="Billing")
        self.add_ticket(
            "Resolved account",
            status="Resolved",
            category="Account",
            resolution_note="Updated the account settings.",
        )

    def test_filter_by_status(self):
        response = self.client.get("/api/tickets/?status=Resolved")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([ticket["title"] for ticket in response.data], ["Resolved account"])

    def test_filter_by_category(self):
        response = self.client.get("/api/tickets/?category=Billing")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([ticket["title"] for ticket in response.data], ["Open billing"])

    def test_filter_by_status_and_category(self):
        response = self.client.get("/api/tickets/?status=Resolved&category=Account")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([ticket["title"] for ticket in response.data], ["Resolved account"])
