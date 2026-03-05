import React, { useState } from 'react';
import socket from '../socket.js';
import { saveSession } from '../App.jsx';

export default function Home() {
  const [tab, setTab] = useState('create'); // create | join
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [songsPerPlayer, setSongsPerPlayer] = useState(2);
  const [speedBonus, setSpeedBonus] = useState(false);

  function handleCreate(e) {
    e.preventDefault();
    const name = username.trim();
    if (!name) return;
    const payload = { username: name, settings: { songsPerPlayer, speedBonus } };
    // Save username now; App.jsx will update the code once room_created fires
    saveSession('', name);
    if (socket.connected) {
      socket.emit('create_room', payload);
    } else {
      socket.once('connect', () => socket.emit('create_room', payload));
      socket.connect();
    }
  }

  function handleJoin(e) {
    e.preventDefault();
    const name = username.trim();
    const code = roomCode.trim().toUpperCase();
    if (!name || !code) return;
    const payload = { code, username: name };
    saveSession(code, name);
    if (socket.connected) {
      socket.emit('join_room', payload);
    } else {
      socket.once('connect', () => socket.emit('join_room', payload));
      socket.connect();
    }
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 420, width: '100%' }}>
        <h1 className="text-center" style={{ marginBottom: 8 }}>🎵 Song Guesser</h1>
        <p className="text-muted text-center" style={{ marginBottom: 32 }}>
          Add songs, play them, guess who picked what!
        </p>

        <div className="flex" style={{ marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
          {['create', 'join'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                borderRadius: 0,
                background: 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                padding: '10px',
                fontWeight: tab === t ? 700 : 400,
              }}
            >
              {t === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label className="label">Your Name</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                required
              />
            </div>

            <div>
              <label className="label">Songs per player</label>
              <select value={songsPerPlayer} onChange={e => setSongsPerPlayer(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n} song{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>

            <div
              className="flex items-center"
              style={{ gap: 12, cursor: 'pointer' }}
              onClick={() => setSpeedBonus(!speedBonus)}
            >
              <div style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: speedBonus ? 'var(--accent)' : 'var(--surface2)',
                border: '1px solid var(--border)',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute',
                  top: 2,
                  left: speedBonus ? 22 : 2,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </div>
              <span style={{ userSelect: 'none' }}>
                Speed bonus scoring
                <span className="text-muted" style={{ marginLeft: 6, fontSize: '0.85rem' }}>
                  (faster = more points)
                </span>
              </span>
            </div>

            <button type="submit" className="primary" style={{ marginTop: 8 }}>
              Create Room
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div>
              <label className="label">Your Name</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                required
              />
            </div>

            <div>
              <label className="label">Room Code</label>
              <input
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                maxLength={6}
                style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700 }}
                required
              />
            </div>

            <button type="submit" className="primary" style={{ marginTop: 8 }}>
              Join Room
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
