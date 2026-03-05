import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket.js';
import YoutubePlayer from '../components/YoutubePlayer.jsx';
import Scoreboard from '../components/Scoreboard.jsx';

export default function Game({ roomState, myId }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [playerOptions, setPlayerOptions] = useState([]);
  const [songIndex, setSongIndex] = useState(0);
  const [totalSongs, setTotalSongs] = useState(0);
  const [myGuess, setMyGuess] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const autoAdvanceTimer = useRef(null);

  const isHost = roomState?.host === myId;

  useEffect(() => {
    socket.on('song_changed', ({ song, playerOptions, songIndex, totalSongs }) => {
      setCurrentSong(song);
      setPlayerOptions(playerOptions);
      setSongIndex(songIndex);
      setTotalSongs(totalSongs);
      setMyGuess(null);
      setRoundResult(null);
      setShowResult(false);
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    });

    socket.on('guess_locked', ({ guessedPlayerId }) => {
      setMyGuess(guessedPlayerId);
    });

    socket.on('round_result', (result) => {
      setRoundResult(result);
      setShowResult(true);
      // Auto-advance after 6 seconds — host client emits advance_song
      if (isHost) {
        autoAdvanceTimer.current = setTimeout(() => {
          socket.emit('advance_song');
        }, 6000);
      }
    });

    return () => {
      socket.off('song_changed');
      socket.off('guess_locked');
      socket.off('round_result');
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [isHost]);

  function handleGuess(playerId) {
    if (myGuess) return;
    socket.emit('submit_guess', { guessedPlayerId: playerId });
  }

  function handleReveal() {
    socket.emit('next_song');
  }

  if (!currentSong) {
    return (
      <div className="page">
        <p className="text-muted">Loading song...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 560, width: '100%' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <h2>Song {songIndex + 1} of {totalSongs}</h2>
          {roomState && (
            <div className="text-muted" style={{ fontSize: '0.85rem' }}>
              {isHost ? '👑 Host' : '🎮 Player'}
            </div>
          )}
        </div>

        {/* Song info */}
        <div className="card flex" style={{ gap: 16, marginBottom: 24 }}>
          {currentSong.albumArt && (
            <img
              src={currentSong.albumArt}
              alt="Album art"
              style={{ width: 80, height: 80, borderRadius: 8, flexShrink: 0, objectFit: 'cover' }}
            />
          )}
          <div>
            <h2 style={{ marginBottom: 4 }}>{currentSong.name}</h2>
            <p style={{ color: 'var(--text-muted)' }}>{currentSong.artist}</p>
          </div>
        </div>

        {/* YouTube player — host only */}
        {isHost && (
          <YoutubePlayer query={currentSong.youtubeQuery} previewUrl={currentSong.previewUrl} />
        )}

        {/* Guess buttons — all players including host */}
        {!showResult && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 12 }}>Who submitted this song?</h3>
            <div className="flex flex-col gap-4">
              {playerOptions.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleGuess(p.id)}
                  disabled={!!myGuess}
                  style={{
                    background: myGuess === p.id ? 'var(--accent)' : 'var(--surface2)',
                    color: myGuess === p.id ? '#fff' : 'var(--text)',
                    border: `1px solid ${myGuess === p.id ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8,
                    padding: '12px 16px',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: myGuess ? 'default' : 'pointer',
                  }}
                >
                  {p.username}
                </button>
              ))}
            </div>
            {!isHost && myGuess && !showResult && (
              <p className="text-muted text-center" style={{ marginTop: 12 }}>
                Waiting for host to reveal...
              </p>
            )}
          </div>
        )}

        {/* Host controls */}
        {isHost && !showResult && (
          <button className="primary w-full" onClick={handleReveal} style={{ marginBottom: 24 }}>
            Reveal & Show Results
          </button>
        )}

        {/* Round result overlay */}
        {showResult && roundResult && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: 20,
            }}
          >
            <div style={{ maxWidth: 480, width: '100%' }}>
              <div className="card text-center" style={{ marginBottom: 16 }}>
                {roundResult.song.albumArt && (
                  <img
                    src={roundResult.song.albumArt}
                    alt=""
                    style={{ width: 64, height: 64, borderRadius: 8, marginBottom: 12, objectFit: 'cover' }}
                  />
                )}
                <p className="text-muted" style={{ marginBottom: 4 }}>This song was picked by</p>
                <h2 style={{ color: 'var(--accent)' }}>{roundResult.submittedByUsername}</h2>
              </div>

              {roundResult.guesses && roundResult.guesses.length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <h3 style={{ marginBottom: 12 }}>Guesses</h3>
                  {roundResult.guesses.map((g, i) => (
                    <div key={i} className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                      <span>
                        <span style={{ color: g.correct ? 'var(--success)' : 'var(--error)' }}>
                          {g.correct ? '✓' : '✗'}
                        </span>
                        {' '}{g.username} → {g.guessedUsername}
                      </span>
                      {g.correct && (
                        <span style={{ color: 'var(--success)', fontWeight: 700 }}>+{g.points}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Scoreboard scores={roundResult.scores} myId={myId} />

              <p className="text-muted text-center" style={{ marginTop: 12, fontSize: '0.85rem' }}>
                {isHost ? 'Next song in a moment...' : 'Waiting for next song...'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
