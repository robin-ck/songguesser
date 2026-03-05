import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import socket from './socket.js';
import Home from './pages/Home.jsx';
import Lobby from './pages/Lobby.jsx';
import Submission from './pages/Submission.jsx';
import Game from './pages/Game.jsx';
import Results from './pages/Results.jsx';

const SESSION_KEY = 'songguesser_session';

export function saveSession(code, username) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ code, username }));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function AppInner() {
  const [roomState, setRoomState] = useState(null);
  const [myId, setMyId] = useState(null);
  const [phase, setPhase] = useState('home'); // home | lobby | submission | playing | ended
  const navigate = useNavigate();
  const phaseRef = useRef(phase);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const onConnect = () => {
      setMyId(socket.id);

      // Attempt rejoin if we have a saved session
      const session = loadSession();
      if (session) {
        socket.emit('rejoin_room', { code: session.code, username: session.username });
      }
    };

    const onRejoinResult = ({ success, phase: serverPhase, error }) => {
      if (!success) {
        console.warn('Rejoin failed:', error);
        clearSession();
        navigate('/');
        return;
      }
      // Navigation will be handled by the subsequent room_update event
      // but we force phase-based redirect here as a fallback
      if (serverPhase === 'playing') {
        setPhase('playing');
        navigate('/game');
      } else if (serverPhase === 'submission') {
        setPhase('submission');
        navigate('/submission');
      } else if (serverPhase === 'lobby') {
        setPhase('lobby');
        navigate('/lobby');
      }
    };

    const onRoomCreated = ({ code }) => {
      const session = loadSession();
      saveSession(code, session?.username ?? '');
      setPhase('lobby');
      navigate('/lobby');
    };

    const onRoomJoined = ({ code }) => {
      const session = loadSession();
      saveSession(code, session?.username ?? '');
      setPhase('lobby');
      navigate('/lobby');
    };

    const onRoomUpdate = (state) => {
      setRoomState(state);
      if (state.phase === 'lobby' && phaseRef.current !== 'lobby') navigate('/lobby');
      if (state.phase === 'submission' && phaseRef.current !== 'submission') {
        setPhase('submission');
        navigate('/submission');
      }
    };

    const onGameStarted = () => { setPhase('playing'); navigate('/game'); };

    const onGameEnded = ({ finalScores }) => {
      clearSession();
      setPhase('ended');
      navigate('/results', { state: { finalScores } });
    };

    const onError = ({ message }) => { console.error('Socket error:', message); alert(`Error: ${message}`); };

    const onDisconnect = () => {
      // Don't clear roomState on disconnect — allow reconnect to restore it
    };

    socket.on('connect', onConnect);
    socket.on('rejoin_result', onRejoinResult);
    socket.on('room_created', onRoomCreated);
    socket.on('room_joined', onRoomJoined);
    socket.on('room_update', onRoomUpdate);
    socket.on('game_started', onGameStarted);
    socket.on('game_ended', onGameEnded);
    socket.on('error', onError);
    socket.on('disconnect', onDisconnect);

    // Auto-connect on mount; if already connected, trigger rejoin manually
    if (!socket.connected) {
      socket.connect();
    } else {
      // Already connected (e.g. hot reload) — still attempt rejoin
      const session = loadSession();
      if (session) {
        socket.emit('rejoin_room', { code: session.code, username: session.username });
      }
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('rejoin_result', onRejoinResult);
      socket.off('room_created', onRoomCreated);
      socket.off('room_joined', onRoomJoined);
      socket.off('room_update', onRoomUpdate);
      socket.off('game_started', onGameStarted);
      socket.off('game_ended', onGameEnded);
      socket.off('error', onError);
      socket.off('disconnect', onDisconnect);
    };
  }, [navigate]);

  const sharedProps = { roomState, myId };

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/lobby"
        element={roomState ? <Lobby {...sharedProps} /> : <Navigate to="/" />}
      />
      <Route
        path="/submission"
        element={roomState ? <Submission {...sharedProps} /> : <Navigate to="/" />}
      />
      <Route
        path="/game"
        element={roomState ? <Game {...sharedProps} /> : <Navigate to="/" />}
      />
      <Route path="/results" element={<Results />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
