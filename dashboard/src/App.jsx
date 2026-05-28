import { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { getToken, clearToken } from './lib/api';
import TokenPaste from './components/TokenPaste';
import SessionsList from './routes/SessionsList';
import MeetingDetail from './routes/MeetingDetail';

export default function App() {
  const [hasToken, setHasToken] = useState(!!getToken());

  const handleAuthFail = useCallback(() => {
    clearToken();
    setHasToken(false);
  }, []);

  if (!hasToken) {
    return <TokenPaste onSaved={() => setHasToken(true)} />;
  }

  return (
    <div className="container">
      <div className="header-bar">
        <h1><span className="brand-dot" />MeetPilot</h1>
        <button className="btn-outline" onClick={handleAuthFail}>
          Sign out
        </button>
      </div>
      <Routes>
        <Route path="/" element={<SessionsList onAuthFail={handleAuthFail} />} />
        <Route path="/meetings/:id" element={<MeetingDetail onAuthFail={handleAuthFail} />} />
      </Routes>
    </div>
  );
}
