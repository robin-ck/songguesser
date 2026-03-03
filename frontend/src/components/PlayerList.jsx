import React from 'react';

export default function PlayerList({ players, myId }) {
  if (!players || players.length === 0) return null;

  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>Players ({players.length})</h3>
      {players.map(p => (
        <div
          key={p.id}
          className="flex items-center"
          style={{ gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}
        >
          <span style={{ fontSize: '1.1rem' }}>{p.isHost ? '👑' : '🎮'}</span>
          <span style={{ fontWeight: p.id === myId ? 700 : 400, color: p.id === myId ? 'var(--accent)' : 'var(--text)' }}>
            {p.username}
            {p.id === myId && <span className="text-muted" style={{ marginLeft: 6, fontSize: '0.8rem', fontWeight: 400 }}>(you)</span>}
          </span>
          {p.isHost && <span className="text-muted" style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>host</span>}
        </div>
      ))}
    </div>
  );
}
