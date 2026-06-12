import os

from dotenv import load_dotenv
from redis import Redis
from rq import Queue

load_dotenv()

REDIS_URL = os.environ.get("REDIS_URL")
if not REDIS_URL:
    raise RuntimeError("REDIS_URL is not set. Add it to backend/.env.")

redis_connection = Redis.from_url(REDIS_URL)
q = Queue(connection=redis_connection)


def enqueue_extract(session_id):
    """Enqueue the extraction job for a completed session. Called by
    `/session/{id}/complete` — the API never does AI work inline.
    """
    return q.enqueue("app.queue.worker.extract", session_id)


def enqueue_draft_task(task_id):
    """Enqueue a single-task draft job. Triggered by the answers endpoint
    (Phase B Task 6) after the user submits answers on an awaiting_answers
    task — the worker re-runs the handler with `answers` populated and
    drafts the action.
    """
    return q.enqueue("app.queue.worker.draft_task", task_id)
