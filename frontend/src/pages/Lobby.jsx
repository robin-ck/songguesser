import React from 'react';
import socket from '../socket.js';
import PlayerList from '../components/PlayerList.jsx';

export default function Lobby({ roomState, myId }) {
  if (!roomState) return null;

  const isHost = roomState.host === myId;

  function handleStart() {
    socket.emit('start_submission');
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 480, width: '100%' }}>
        <h1 className="text-center" style={{ marginBottom: 8 }}>Waiting Room</h1>

        <div className="card text-center" style={{ marginBottom: 24 }}>
          <p className="label">Room Code</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '0.25em', color: 'var(--accent)' }}>
            {roomState.code}
          </p>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
            Share this code with friends
          </p>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 4 }}>Room Settings</h3>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>
            {roomState.settings.songsPerPlayer} song{roomState.settings.songsPerPlayer > 1 ? 's' : ''} per player
            {' · '}
            Speed bonus: {roomState.settings.speedBonus ? 'ON' : 'OFF'}
          </p>
        </div>

        <PlayerList players={roomState.players} myId={myId} />

        {isHost ? (
          <button
            className="primary w-full"
            style={{ marginTop: 24 }}
            onClick={handleStart}
            disabled={roomState.players.length < 2}
          >
            Start — Everyone Pick Songs
          </button>
        ) : (
          <p className="text-muted text-center" style={{ marginTop: 24 }}>
            Waiting for the host to start...
          </p>
        )}

        {isHost && roomState.players.length < 2 && (
          <p className="text-muted text-center" style={{ marginTop: 8, fontSize: '0.85rem' }}>
            Need at least 2 players to start
          </p>
        )}
      </div>
    </div>
  );
}
