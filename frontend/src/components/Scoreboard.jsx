import React from 'react';

export default function Scoreboard({ scores, myId }) {
  if (!scores || scores.length === 0) return null;

  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>Scores</h3>
      {sorted.map((p, i) => (
        <div
          key={p.id}
          className="flex items-center justify-between"
          style={{
            padding: '6px 0',
            borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none',
          }}
        >
          <span style={{ color: p.id === myId ? 'var(--accent)' : 'var(--text)', fontWeight: p.id === myId ? 700 : 400 }}>
            {i + 1}. {p.username}{p.id === myId ? ' (you)' : ''}
          </span>
          <span style={{ fontWeight: 700 }}>{p.score}</span>
        </div>
      ))}
    </div>
  );
}
