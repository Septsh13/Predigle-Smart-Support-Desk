import os
from pathlib import Path

from corsheaders.defaults import default_headers
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "development-only-change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

INSTALLED_APPS = ["django.contrib.contenttypes", "rest_framework", "corsheaders", "tickets"]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]
ROOT_URLCONF = "config.urls"
TEMPLATES = []
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
# Django expects a default connection during startup checks. Ticket records still
# live only in MongoDB; this in-memory SQLite connection stores no ticket data.
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
CORS_ALLOWED_ORIGINS = ["http://localhost:4200"]
CORS_ALLOW_HEADERS = [*default_headers, "x-role", "x-username"]

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/smart_support_desk")
MONGODB_DB = os.getenv("MONGODB_DB", "smart_support_desk")
MONGODB_TEST_DB = os.getenv("MONGODB_TEST_DB", "smart_support_desk_test")
SIMILARITY_TOP_K = int(os.getenv("SIMILARITY_TOP_K", "3"))
SIMILARITY_MIN_SCORE = float(os.getenv("SIMILARITY_MIN_SCORE", "0.35"))
SIMILARITY_STRONG_SCORE = float(os.getenv("SIMILARITY_STRONG_SCORE", "0.65"))

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "UNAUTHENTICATED_USER": None,
}
