import React, { useState } from 'react';
import socket from '../socket.js';
import SongCard from '../components/SongCard.jsx';

export default function Submission({ roomState, myId }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  if (!roomState) return null;

  const maxSongs = roomState.settings.songsPerPlayer;
  const myPlayer = roomState.players.find(p => p.id === myId);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.tracks || []);
    } catch {
      alert('Search failed. Check Spotify credentials.');
    } finally {
      setSearching(false);
    }
  }

  function toggleSong(track) {
    setSelectedSongs(prev => {
      const exists = prev.find(s => s.id === track.id);
      if (exists) return prev.filter(s => s.id !== track.id);
      if (prev.length >= maxSongs) return prev; // already at limit
      return [...prev, track];
    });
  }

  function handleSubmit() {
    if (selectedSongs.length !== maxSongs) return;
    socket.emit('submit_songs', { songs: selectedSongs });
    setSubmitted(true);
  }

  if (submitted || myPlayer?.hasSubmitted) {
    const waitingFor = roomState.players.filter(p => !p.hasSubmitted);
    return (
      <div className="page">
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
          <h2>Songs submitted!</h2>
          <p className="text-muted" style={{ marginTop: 8 }}>
            Waiting for {waitingFor.length} more player{waitingFor.length !== 1 ? 's' : ''}...
          </p>
          <div style={{ marginTop: 24 }}>
            {roomState.players.map(p => (
              <div key={p.id} className="flex items-center" style={{ gap: 10, marginBottom: 8 }}>
                <span style={{ color: p.hasSubmitted ? 'var(--success)' : 'var(--text-muted)' }}>
                  {p.hasSubmitted ? '✓' : '○'}
                </span>
                <span>{p.username}{p.id === myId ? ' (you)' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 560, width: '100%' }}>
        <h1 style={{ marginBottom: 4 }}>Pick Your Songs</h1>
        <p className="text-muted" style={{ marginBottom: 24 }}>
          Choose {maxSongs} song{maxSongs > 1 ? 's' : ''} — others will guess these are yours!
        </p>

        <form onSubmit={handleSearch} className="flex" style={{ gap: 8, marginBottom: 24 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for a song..."
            style={{ flex: 1 }}
          />
          <button type="submit" className="primary" disabled={searching} style={{ whiteSpace: 'nowrap' }}>
            {searching ? '...' : 'Search'}
          </button>
        </form>

        {selectedSongs.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 12 }}>
              Selected ({selectedSongs.length}/{maxSongs})
            </h3>
            {selectedSongs.map(track => (
              <SongCard
                key={track.id}
                track={track}
                selected
                onClick={() => toggleSong(track)}
              />
            ))}
            <button
              className="primary w-full"
              style={{ marginTop: 12 }}
              onClick={handleSubmit}
              disabled={selectedSongs.length !== maxSongs}
            >
              Submit {maxSongs} Song{maxSongs > 1 ? 's' : ''}
            </button>
          </div>
        )}

        {results.length > 0 && (
          <div>
            <h3 style={{ marginBottom: 12 }}>Search Results</h3>
            {results.map(track => {
              const isSelected = selectedSongs.some(s => s.id === track.id);
              const atLimit = selectedSongs.length >= maxSongs && !isSelected;
              return (
                <SongCard
                  key={track.id}
                  track={track}
                  selected={isSelected}
                  disabled={atLimit}
                  onClick={() => !atLimit && toggleSong(track)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
