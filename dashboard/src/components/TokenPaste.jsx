import { useState } from 'react';
import { setToken } from '../lib/api';

export default function TokenPaste({ onSaved }) {
  const [value, setValue] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setToken(trimmed);
    onSaved();
  }

  return (
    <div className="token-card">
      <h1><span className="brand-dot" />MeetPilot</h1>
      <p>
        Paste your bearer token from{' '}
        <a href="http://localhost:8000/auth/google/login" target="_blank" rel="noreferrer">
          /auth/google/login
        </a>
        .
      </p>
      <form onSubmit={handleSubmit} className="token-form">
        <input
          type="text"
          placeholder="Paste your token"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        <button type="submit">Save token</button>
      </form>
    </div>
  );
}
