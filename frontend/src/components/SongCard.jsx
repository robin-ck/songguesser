import React from 'react';

export default function SongCard({ track, selected, disabled, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        marginBottom: 8,
        borderRadius: 10,
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        background: selected ? 'rgba(108, 99, 255, 0.12)' : 'var(--surface)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {track.albumArt ? (
        <img
          src={track.albumArt}
          alt=""
          style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 48, height: 48, borderRadius: 6,
          background: 'var(--surface2)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', fontSize: '1.2rem'
        }}>♪</div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.name}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.artist}
        </div>
      </div>
      {selected && (
        <span style={{ color: 'var(--accent)', flexShrink: 0, fontWeight: 700 }}>✓</span>
      )}
    </div>
  );
}
