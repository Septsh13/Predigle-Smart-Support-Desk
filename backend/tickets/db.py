"""Mongo connection and ticket collection operations."""
from functools import lru_cache

from django.conf import settings
from pymongo import DESCENDING, MongoClient


@lru_cache(maxsize=1)
def get_client():
    return MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=3000)


def get_tickets_collection():
    return get_client()[settings.MONGODB_DB]["tickets"]


def get_users_collection():
    return get_client()[settings.MONGODB_DB]["users"]


def serialize_document(document):
    if document is None:
        return None
    document = dict(document)
    document["id"] = str(document.pop("_id"))
    if document.get("created_at") is not None:
        document["created_at"] = document["created_at"].isoformat().replace("+00:00", "Z")
    return document


def list_tickets(status=None, category=None):
    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    cursor = get_tickets_collection().find(query).sort("created_at", DESCENDING)
    return [serialize_document(document) for document in cursor]


def get_ticket(ticket_id):
    from bson import ObjectId

    document = get_tickets_collection().find_one({"_id": ObjectId(ticket_id)})
    return serialize_document(document)


def create_ticket(ticket_data):
    from datetime import datetime, timezone

    document = dict(ticket_data)
    document["created_at"] = datetime.now(timezone.utc)
    result = get_tickets_collection().insert_one(document)
    document["_id"] = result.inserted_id
    return serialize_document(document)


def update_ticket(ticket_id, changes):
    from bson import ObjectId

    result = get_tickets_collection().update_one(
        {"_id": ObjectId(ticket_id)}, {"$set": changes}
    )
    if result.matched_count == 0:
        return None
    return get_ticket(ticket_id)


def list_resolved_tickets():
    """Return resolved tickets in a form suitable for similarity search."""
    cursor = get_tickets_collection().find({"status": "Resolved"})
    return [serialize_document(document) for document in cursor]


def upsert_seed_ticket(ticket):
    """Upsert a sample by title and report whether it was newly inserted."""
    collection = get_tickets_collection()
    existing = collection.find_one({"title": ticket["title"]}, {"_id": 1})
    values = dict(ticket)
    if "resolution_note" not in values:
        collection.update_one(
            {"title": ticket["title"]},
            {"$set": values, "$unset": {"resolution_note": ""}},
            upsert=True,
        )
    else:
        collection.update_one({"title": ticket["title"]}, {"$set": values}, upsert=True)
    return existing is None


def delete_all_tickets():
    return get_tickets_collection().delete_many({}).deleted_count


def get_ticket_status_counts():
    collection = get_tickets_collection()
    return {
        status: collection.count_documents({"status": status})
        for status in ("Resolved", "Open", "In Progress")
    }


def get_ticket_stats():
    collection = get_tickets_collection()
    return {
        "total": collection.count_documents({}),
        "open": collection.count_documents({"status": "Open"}),
        "in_progress": collection.count_documents({"status": "In Progress"}),
        "resolved": collection.count_documents({"status": "Resolved"}),
    }


def upsert_demo_user(user):
    """Create or refresh one demo login, identified by username."""
    collection = get_users_collection()
    existing = collection.find_one({"username": user["username"]}, {"_id": 1})
    collection.update_one(
        {"username": user["username"]},
        {"$set": user},
        upsert=True,
    )
    return existing is None


def get_user_by_username(username):
    return get_users_collection().find_one({"username": username})
