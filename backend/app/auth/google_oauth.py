"""Authlib OAuth registry for Google. Reads OAuth config from env at import time
and fails loud if anything is missing.

Authlib handles the OAuth state CSRF token automatically via Starlette's
SessionMiddleware (registered in main.py). The state is stored in a signed
session cookie keyed by AUTH_SESSION_SECRET, generated on /auth/google/login,
and verified on /auth/google/callback.
"""

import os

from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv

load_dotenv()

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI")
# Legacy dev redirect — points at /auth/dev/landing during the build. Deleted
# in Phase 10 Step A when the frontend is the only sign-in path.
AUTH_SUCCESS_REDIRECT_URL = os.environ.get("AUTH_SUCCESS_REDIRECT_URL")
# Frontend Phase 2 — preferred when set. Lets the OAuth callback hand the
# bearer to the React app at `/auth/callback?token=...` instead of the dev
# landing page. Optional during build (falls back to AUTH_SUCCESS_REDIRECT_URL
# so the extension's paste-token flow keeps working). Phase 10 Step A makes
# this the unconditional target and removes the fallback.
AUTH_SUCCESS_REDIRECT_URL_FRONTEND = os.environ.get(
    "AUTH_SUCCESS_REDIRECT_URL_FRONTEND"
)

_missing = [
    name for name, value in [
        ("GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID),
        ("GOOGLE_CLIENT_SECRET", GOOGLE_CLIENT_SECRET),
        ("GOOGLE_REDIRECT_URI", GOOGLE_REDIRECT_URI),
        ("AUTH_SUCCESS_REDIRECT_URL", AUTH_SUCCESS_REDIRECT_URL),
    ] if not value
]
if _missing:
    raise RuntimeError(
        f"Missing required env var(s): {', '.join(_missing)}. Add them to backend/.env."
    )

oauth = OAuth()
oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)
