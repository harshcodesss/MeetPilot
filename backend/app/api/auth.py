"""Auth router: Google OAuth flow, /me, /auth/logout, and the dev landing page."""

import secrets
from datetime import datetime

from authlib.integrations.base_client.errors import OAuthError
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.google_oauth import (
    AUTH_SUCCESS_REDIRECT_URL,
    AUTH_SUCCESS_REDIRECT_URL_FRONTEND,
    GOOGLE_REDIRECT_URI,
    oauth,
)
from app.database import get_db
from app.models import AuthSession, User

router = APIRouter()


class UserOut(BaseModel):
    user_id: str
    email: str
    display_name: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Google OAuth flow
# ---------------------------------------------------------------------------

@router.get("/auth/google/login")
async def google_login(request: Request):
    """Redirect to Google's consent screen. Authlib generates the state CSRF
    token, stashes it in the session cookie, and returns the redirect."""
    return await oauth.google.authorize_redirect(request, GOOGLE_REDIRECT_URI)


@router.get("/auth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Exchange the code for tokens, upsert the user, mint an AuthSession, redirect
    to the success URL with ?token=<opaque-bearer>.

    Failure paths: OAuth-exchange failures (user denied consent on Google, state
    CSRF mismatch, etc.) are caught and redirected to the frontend callback with
    a short `?error=<code>` so the user sees the friendly "Sign-in failed" UI
    instead of a stack trace. When only the dev-landing fallback is configured
    (no frontend redirect URL), the exception bubbles as a 500 — the dev
    landing has no error UI to land on. DB / handler-body failures still 500
    intentionally; they're internal bugs, not Google's fault.
    """
    try:
        token_data = await oauth.google.authorize_access_token(request)
    except OAuthError as e:
        # Google's documented denial code (`access_denied`), state-mismatch
        # errors, etc. arrive here with `.error` populated. Pass it through to
        # the frontend as-is so client-side mapping can surface friendly text.
        if AUTH_SUCCESS_REDIRECT_URL_FRONTEND:
            error_code = e.error or "sign_in_failed"
            return RedirectResponse(
                f"{AUTH_SUCCESS_REDIRECT_URL_FRONTEND}?error={error_code}"
            )
        raise
    except Exception:
        # Network blip to Google's token endpoint, malformed response, etc.
        if AUTH_SUCCESS_REDIRECT_URL_FRONTEND:
            return RedirectResponse(
                f"{AUTH_SUCCESS_REDIRECT_URL_FRONTEND}?error=sign_in_failed"
            )
        raise

    userinfo = token_data.get("userinfo") or await oauth.google.userinfo(token=token_data)

    google_sub = userinfo["sub"]
    email = userinfo["email"]
    display_name = userinfo.get("name") or email.split("@")[0]
    picture_url = userinfo.get("picture")

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_at = token_data.get("expires_at")
    token_expiry = datetime.fromtimestamp(expires_at) if expires_at else None

    # Upsert by google_sub (the stable identity key — NOT email).
    user = db.query(User).filter(User.google_sub == google_sub).first()
    if user is None:
        user = User(
            google_sub=google_sub,
            email=email,
            display_name=display_name,
            picture_url=picture_url,
            google_access_token=access_token,
            google_refresh_token=refresh_token,
            google_token_expiry=token_expiry,
        )
        db.add(user)
    else:
        user.email = email
        user.display_name = display_name
        user.picture_url = picture_url
        if access_token:
            user.google_access_token = access_token
        if refresh_token:
            user.google_refresh_token = refresh_token
        if token_expiry:
            user.google_token_expiry = token_expiry
    db.flush()  # ensure user.user_id is populated for the AuthSession FK

    bearer = secrets.token_hex(32)
    db.add(AuthSession(token=bearer, user_id=user.user_id))
    db.commit()

    # Prefer the frontend callback (`/auth/callback?token=...`) when configured;
    # fall back to the dev landing page so the extension's paste-token interim
    # keeps working during the build. Phase 10 Step A removes the fallback.
    redirect_base = AUTH_SUCCESS_REDIRECT_URL_FRONTEND or AUTH_SUCCESS_REDIRECT_URL
    return RedirectResponse(f"{redirect_base}?token={bearer}")


# DEV-ONLY — delete this endpoint when the frontend lands.
# Renders the bearer token in a copyable block so we can grab it without a
# proper frontend callback page.
@router.get("/auth/dev/landing", response_class=HTMLResponse)
async def dev_landing(token: str = ""):
    if not token:
        return HTMLResponse("<p>No token in URL.</p>", status_code=400)
    # Minimal HTML — readable, one-click copy, no styling beyond the basics.
    return HTMLResponse(
        f"""<!doctype html>
<html><head><title>MeetPilot — dev token</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 16px;">
  <h2>MeetPilot — bearer token</h2>
  <p>Paste this into the extension popup's token input.</p>
  <pre id="t" style="background:#f3f4f6;padding:12px;border-radius:6px;white-space:pre-wrap;word-break:break-all;">{token}</pre>
  <button id="b" onclick="navigator.clipboard.writeText(document.getElementById('t').innerText).then(()=>{{document.getElementById('b').innerText='Copied!'}})"
          style="padding:8px 14px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;">Copy</button>
  <p style="color:#6b7280;margin-top:24px;font-size:13px;">Dev-only page. This route is removed when the frontend ships.</p>
</body></html>"""
    )


# ---------------------------------------------------------------------------
# Authenticated endpoints
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/auth/logout", status_code=204)
def logout(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete the bearer's AuthSession row. The bearer becomes invalid immediately."""
    # Re-read the token from the header — we already validated it in the dependency.
    header = request.headers.get("authorization", "")
    token = header.split(" ", 1)[1].strip()
    db.query(AuthSession).filter(AuthSession.token == token).delete(synchronize_session=False)
    db.commit()
    return Response(status_code=204)
