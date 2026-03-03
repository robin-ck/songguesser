import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import socket from '../socket.js';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const finalScores = location.state?.finalScores || [];

  const medals = ['🥇', '🥈', '🥉'];

  function handlePlayAgain() {
    socket.disconnect();
    navigate('/');
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 480, width: '100%' }}>
        <h1 className="text-center" style={{ marginBottom: 8 }}>Game Over!</h1>
        <p className="text-muted text-center" style={{ marginBottom: 32 }}>Final Scores</p>

        <div className="flex flex-col gap-4" style={{ marginBottom: 32 }}>
          {finalScores.map((player, index) => (
            <div
              key={player.id}
              className="card flex items-center justify-between"
              style={{
                border: index === 0 ? '2px solid var(--warning)' : '1px solid var(--border)',
              }}
            >
              <div className="flex items-center" style={{ gap: 12 }}>
                <span style={{ fontSize: '1.5rem', width: 32 }}>
                  {medals[index] || `${index + 1}.`}
                </span>
                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                  {player.username}
                  {player.isHost && <span className="text-muted" style={{ marginLeft: 6, fontSize: '0.8rem' }}>host</span>}
                </span>
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.4rem', color: index === 0 ? 'var(--warning)' : 'var(--text)' }}>
                {player.score}
              </span>
            </div>
          ))}
        </div>

        <button className="primary w-full" onClick={handlePlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
}
