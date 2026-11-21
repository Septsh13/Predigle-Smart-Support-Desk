from django.conf import settings
from rest_framework.test import APITestCase

from tickets import db
from tickets.services.similarity import invalidate_cache


class MongoAPITestCase(APITestCase):
    """API test base that always uses and clears the dedicated Mongo test DB."""

    @classmethod
    def setUpClass(cls):
        from django.test import override_settings

        cls._mongo_settings = override_settings(MONGODB_DB=settings.MONGODB_TEST_DB)
        cls._mongo_settings.enable()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        try:
            super().tearDownClass()
        finally:
            cls._mongo_settings.disable()

    def setUp(self):
        self.collection = db.get_tickets_collection()
        self.users_collection = db.get_users_collection()
        self.collection.delete_many({})
        self.users_collection.delete_many({})
        invalidate_cache()

    def tearDown(self):
        self.collection.delete_many({})
        self.users_collection.delete_many({})
        invalidate_cache()
        super().tearDown()

    def add_ticket(self, title, status="Open", category="Account", **extra):
        return db.create_ticket({
            "title": title,
            "description": extra.pop("description", f"Description for {title}"),
            "category": category,
            "status": status,
            **extra,
        })
