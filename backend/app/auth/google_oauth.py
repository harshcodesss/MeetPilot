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
# Where the OAuth callback lands the user after a successful sign-in. Always
# the frontend `/auth/callback?token=...` endpoint as of Phase 10 Step A —
# the prior dev-landing fallback was removed when the React app became the
# only sign-in surface.
AUTH_SUCCESS_REDIRECT_URL = os.environ.get("AUTH_SUCCESS_REDIRECT_URL")

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
