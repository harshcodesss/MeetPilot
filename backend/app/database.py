import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./meetpilot.db")

if DATABASE_URL.startswith("sqlite"):
    # check_same_thread is SQLite-only; harmless to guard it here.
    connect_args = {"check_same_thread": False}
else:
    # Neon's pooled endpoint runs PgBouncer in transaction mode, which doesn't
    # support server-side prepared statements. Disabling them at the psycopg3
    # layer keeps us safe on both pooled (-pooler.*) and direct endpoints (no-op
    # on direct). Without this you'd see sporadic
    #   "prepared statement \"_pg3_0\" does not exist"
    # errors as pooled connections cycle between requests.
    connect_args = {"prepare_threshold": None}

# pool_pre_ping recycles connections that a managed Postgres (Neon) or a
# sleeping host may have dropped between requests — avoids stale-connection
# errors on the first hit after idle. Harmless for SQLite.
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
