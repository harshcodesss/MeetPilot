import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, AuthError } from '../lib/api';

export default function MeetingDetail({ onAuthFail }) {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState(null);

  const [showTranscript, setShowTranscript] = useState(false);
  const [segments, setSegments] = useState(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  useEffect(() => {
    Promise.all([apiGet(`/session/${id}`), apiGet(`/session/${id}/tasks`)])
      .then(([s, t]) => {
        setSession(s);
        setTasks(t);
      })
      .catch((err) => {
        if (err instanceof AuthError) {
          onAuthFail();
        } else {
          setError(err.message);
        }
      });
  }, [id, onAuthFail]);

  function toggleTranscript() {
    if (showTranscript) {
      setShowTranscript(false);
      return;
    }
    if (segments) {
      setShowTranscript(true);
      return;
    }
    setTranscriptLoading(true);
    apiGet(`/session/${id}/segments`)
      .then((segs) => {
        setSegments(segs);
        setShowTranscript(true);
      })
      .catch((err) => {
        if (err instanceof AuthError) {
          onAuthFail();
        } else {
          setError(err.message);
        }
      })
      .finally(() => setTranscriptLoading(false));
  }

  if (error) return <pre className="error">{error}</pre>;
  if (!session || !tasks) return <p className="meta">Loading…</p>;

  const mainTasks = tasks.filter((t) => t.placement === 'main_list');
  const suggestedTasks = tasks.filter((t) => t.placement === 'suggested');

  return (
    <div>
      <Link to="/" className="back-link">← Back to sessions</Link>

      <div className="session-detail-header">
        <div className="header-row">
          <h1>{new Date(session.started_at).toLocaleString()}</h1>
          <span className={`pill pill-status-${session.status}`}>
            <span className="pill-dot" />
            {session.status}
          </span>
        </div>
        <div className="header-row">
          <span className="pill pill-count"><strong>{session.segment_count}</strong>&nbsp;segments</span>
          <span className="pill pill-count"><strong>{session.task_count}</strong>&nbsp;tasks</span>
          <span className="mono subtle" style={{ fontSize: '0.78rem' }}>{session.session_id}</span>
        </div>
      </div>

      <h2>Main list ({mainTasks.length})</h2>
      {mainTasks.length === 0 ? (
        <div className="empty">No main-list tasks.</div>
      ) : (
        <div className="card"><TaskTable tasks={mainTasks} /></div>
      )}

      <h2>Suggested ({suggestedTasks.length})</h2>
      {suggestedTasks.length === 0 ? (
        <div className="empty">No suggested tasks.</div>
      ) : (
        <div className="card"><TaskTable tasks={suggestedTasks} /></div>
      )}

      <div className="actions-row">
        <button className="btn-ghost" onClick={toggleTranscript} disabled={transcriptLoading}>
          {transcriptLoading ? 'Loading…' : showTranscript ? 'Hide transcript' : 'Show transcript'}
        </button>
      </div>

      {showTranscript && segments && (
        <div className="transcript">
          {segments.map((seg) => (
            <div key={seg.seq} className="transcript-line">
              <span className="transcript-seq">#{seg.seq}</span>
              <span className="transcript-speaker">{seg.speaker}</span>
              <span className="transcript-text">{seg.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskTable({ tasks }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Assignee</th>
          <th>Action</th>
          <th>Deadline (raw)</th>
          <th>Deadline (date)</th>
          <th>Confidence</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => (
          <tr key={t.task_id} className={`row-conf-${t.confidence}`}>
            <td>{t.assignee}</td>
            <td className="col-action">{t.action}</td>
            <td>{t.deadline_raw ?? <span className="col-dash">—</span>}</td>
            <td>{t.deadline_date ?? <span className="col-dash">—</span>}</td>
            <td>
              <span className={`pill pill-conf-${t.confidence}`}>
                <span className="pill-dot" />
                {t.confidence}
              </span>
            </td>
            <td className="col-mono">[{t.source_seq.join(', ')}]</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
