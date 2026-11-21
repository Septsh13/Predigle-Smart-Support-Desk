from .helpers import MongoAPITestCase


class TicketValidationTests(MongoAPITestCase):
    url = "/api/tickets/"

    def test_title_description_and_category_are_required(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("title", response.data)
        self.assertIn("description", response.data)
        self.assertIn("category", response.data)

    def test_title_cannot_exceed_150_characters(self):
        response = self.client.post(self.url, {
            "title": "t" * 151,
            "description": "Cannot sign in",
            "category": "Account",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("title", response.data)

    def test_invalid_category_is_rejected(self):
        response = self.client.post(self.url, {
            "title": "Example",
            "description": "Description",
            "category": "Unknown",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("category", response.data)

    def test_invalid_status_is_rejected(self):
        response = self.client.post(self.url, {
            "title": "Example",
            "description": "Description",
            "category": "Account",
            "status": "Waiting",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("status", response.data)

    def test_resolved_ticket_requires_resolution_note(self):
        response = self.client.post(self.url, {
            "title": "Example",
            "description": "Description",
            "category": "Account",
            "status": "Resolved",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("resolution_note", response.data)
