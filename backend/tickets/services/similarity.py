"""In-memory semantic search over resolved support tickets."""
from threading import Lock

from django.conf import settings

_model = None
_model_lock = Lock()
_cache = {}
_cache_lock = Lock()
_cache_initialized = False

DISCLAIMER = "Suggestions are advisory only. Review before using a resolution."


def get_model():
    """Load the local sentence-transformers model once, when first needed."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer

                _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def ticket_text(ticket):
    return f"{ticket['title']}. {ticket['description']}"


def embed(text):
    vector = get_model().encode(text, normalize_embeddings=True)
    return vector.tolist()


def invalidate_cache():
    """Mark resolved ticket vectors stale; rebuild them on the next search."""
    global _cache_initialized
    with _cache_lock:
        _cache.clear()
        _cache_initialized = False


def _build_cache():
    global _cache_initialized
    from .. import db

    with _cache_lock:
        if _cache_initialized:
            return
        tickets = db.list_resolved_tickets()
        for ticket in tickets:
            _cache[ticket["id"]] = {
                "embedding": embed(ticket_text(ticket)),
                "id": ticket["id"],
                "title": ticket["title"],
                "status": ticket["status"],
                "category": ticket["category"],
                "resolution_note": ticket.get("resolution_note", ""),
            }
        _cache_initialized = True


def find_similar(title, description):
    """Return advisory matches from resolved tickets; never writes to MongoDB."""
    _build_cache()
    query_vector = embed(f"{title}. {description}")
    with _cache_lock:
        candidates = list(_cache.values())

    matches = []
    for ticket in candidates:
        # All vectors were normalized, so the dot product is cosine similarity.
        cosine = sum(a * b for a, b in zip(query_vector, ticket["embedding"]))
        score = max(0.0, min(1.0, cosine))
        if score >= settings.SIMILARITY_MIN_SCORE:
            matches.append((score, ticket))
    matches.sort(key=lambda match: match[0], reverse=True)

    results = []
    for score, ticket in matches[: settings.SIMILARITY_TOP_K]:
        results.append({
            "id": ticket["id"],
            "title": ticket["title"],
            "category": ticket["category"],
            "status": ticket["status"],
            "similarity_score": round(score, 2),
            "match_label": (
                "Strong match"
                if score >= settings.SIMILARITY_STRONG_SCORE
                else "Related"
            ),
            "resolution_note": _short_note(ticket["resolution_note"]),
        })
    return {"count": len(results), "results": results, "disclaimer": DISCLAIMER}


def _short_note(note, max_length=240):
    note = note or ""
    if len(note) <= max_length:
        return note
    return note[: max_length - 3].rstrip() + "..."
