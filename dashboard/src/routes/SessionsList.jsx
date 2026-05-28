import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, AuthError } from '../lib/api';

export default function SessionsList({ onAuthFail }) {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/me/sessions')
      .then(setSessions)
      .catch((err) => {
        if (err instanceof AuthError) {
          onAuthFail();
        } else {
          setError(err.message);
        }
      });
  }, [onAuthFail]);

  if (error) return <pre className="error">{error}</pre>;
  if (!sessions) return <p className="meta">Loading…</p>;
  if (sessions.length === 0) {
    return <div className="empty">No meetings yet — open Google Meet and capture one.</div>;
  }

  return (
    <>
      <h2>Sessions ({sessions.length})</h2>
      <ul className="session-list">
        {sessions.map((s) => {
          const started = new Date(s.started_at);
          return (
            <li key={s.session_id}>
              <Link to={`/meetings/${s.session_id}`}>
                <div className="session-row-main">
                  <span className="session-row-title">{started.toLocaleString()}</span>
                  <span className="session-row-sub">
                    <span className="mono subtle">{s.session_id.slice(0, 8)}…</span>
                  </span>
                </div>
                <div className="session-row-chips">
                  <span className={`pill pill-status-${s.status}`}>
                    <span className="pill-dot" />
                    {s.status}
                  </span>
                  <span className="pill pill-count">
                    <strong>{s.segment_count}</strong>&nbsp;segments
                  </span>
                  <span className="pill pill-count">
                    <strong>{s.task_count}</strong>&nbsp;tasks
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
