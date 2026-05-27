"""Throwaway smoke test: confirms GOOGLE_API_KEY works and the new google-genai
SDK can round-trip one prompt. Not application code — delete or ignore once
GeminiProvider (Task 9) is in.

Run from backend/:
    ./.venv/bin/python scripts/smoke_gemini.py
"""

import os
import sys

from dotenv import load_dotenv
from google import genai

# Locked model for MeetPilot extraction. GA, supports structured output,
# stable name (never use *-latest aliases in production code).
GEMINI_MODEL = "gemini-2.5-flash"

load_dotenv()

api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    sys.exit("GOOGLE_API_KEY is not set. Add it to backend/.env.")

client = genai.Client(api_key=api_key)
response = client.models.generate_content(
    model=GEMINI_MODEL,
    contents="Say hi in one word.",
)

print(response.text)
