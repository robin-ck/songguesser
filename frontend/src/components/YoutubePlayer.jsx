import React, { useEffect, useRef, useState } from 'react';

let ytApiReady = false;
let ytApiCallbacks = [];

function loadYouTubeAPI() {
  if (ytApiReady) return Promise.resolve();
  return new Promise((resolve) => {
    ytApiCallbacks.push(resolve);
    if (!window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady = () => {
        ytApiReady = true;
        ytApiCallbacks.forEach(cb => cb());
        ytApiCallbacks = [];
      };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
}

export default function YoutubePlayer({ query, previewUrl }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [videoId, setVideoId] = useState(null);
  const [useFallback, setUseFallback] = useState(false);
  const [manualPlay, setManualPlay] = useState(false);

  // Fetch YouTube video ID when query changes
  useEffect(() => {
    if (!query) return;
    setVideoId(null);
    setUseFallback(false);
    setManualPlay(false);

    fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        if (data.videoId) {
          setVideoId(data.videoId);
        } else {
          setUseFallback(true);
        }
      })
      .catch(() => setUseFallback(true));
  }, [query]);

  // Initialize YouTube player
  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    loadYouTubeAPI().then(() => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      const div = document.createElement('div');
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(div);

      playerRef.current = new window.YT.Player(div, {
        height: '180',
        width: '100%',
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onError: () => setUseFallback(true),
        },
      });
    });

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId]);

  if (useFallback && previewUrl) {
    return (
      <div className="card" style={{ marginBottom: 24 }}>
        <p className="text-muted" style={{ marginBottom: 8, fontSize: '0.85rem' }}>
          YouTube unavailable — playing 30s preview
        </p>
        <audio controls autoPlay src={previewUrl} style={{ width: '100%' }} />
      </div>
    );
  }

  if (useFallback) {
    return (
      <div className="card text-center" style={{ marginBottom: 24 }}>
        <p className="text-muted">Could not load audio. Play the song manually.</p>
      </div>
    );
  }

  if (!videoId) {
    return (
      <div className="card text-center" style={{ marginBottom: 24 }}>
        <p className="text-muted">Finding video...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        marginBottom: 24,
        // opacity trick: keeps iframe in DOM (required for autoplay) but subtle
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}
    >
      <div ref={containerRef} style={{ width: '100%' }} />
    </div>
  );
}
