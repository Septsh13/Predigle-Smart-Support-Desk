from .helpers import MongoAPITestCase


class SimilarityEndpointTests(MongoAPITestCase):
    def setUp(self):
        super().setUp()
        self.add_ticket(
            "Password reset link shows expired",
            status="Resolved",
            category="Account",
            description="The password recovery email link is expired before I can set a new password.",
            resolution_note="Check the latest reset email only",
        )
        self.add_ticket(
            "Cannot reset password",
            status="Open",
            category="Account",
            description="Password reset link is expired.",
        )
        for title in (
            "Dashboard stays blank",
            "Reports screen hangs and becomes unresponsive",
            "Duplicate payment on monthly plan",
            "Profile photo will not update",
        ):
            self.add_ticket(
                title,
                status="Resolved",
                category="Technical",
                resolution_note="Reviewed the issue and applied the appropriate fix.",
            )

    def test_returns_at_most_three_resolved_tickets_and_reworded_match_first(self):
        response = self.client.post("/api/tickets/similar/", {
            "title": "I can't get a new password, the link says it is no longer valid",
            "description": "The reset link in my email has expired again.",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(response.data["count"], 3)
        self.assertEqual(response.data["count"], len(response.data["results"]))
        self.assertTrue(all(item["status"] == "Resolved" for item in response.data["results"]))
        self.assertEqual(response.data["results"][0]["title"], "Password reset link shows expired")

    def test_unrelated_query_returns_empty_results(self):
        response = self.client.post("/api/tickets/similar/", {
            "title": "Orchid watering schedule",
            "description": "How often should I water a tropical orchid in winter?",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_similarity_is_read_only(self):
        before = list(self.collection.find({}, {"_id": 0}))
        response = self.client.post("/api/tickets/similar/", {
            "title": "Expired password reset email",
            "description": "The link in my reset message no longer works.",
        }, format="json")
        after = list(self.collection.find({}, {"_id": 0}))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(after, before)
