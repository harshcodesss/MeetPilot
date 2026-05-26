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
    return q.enqueue("app.queue.worker.extract", session_id)
