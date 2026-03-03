import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import socket from './socket.js';
import Home from './pages/Home.jsx';
import Lobby from './pages/Lobby.jsx';
import Submission from './pages/Submission.jsx';
import Game from './pages/Game.jsx';
import Results from './pages/Results.jsx';

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
    socket.on('connect', () => setMyId(socket.id));

    socket.on('room_created', ({ code }) => {
      setPhase('lobby');
      navigate('/lobby');
    });

    socket.on('room_joined', ({ code }) => {
      setPhase('lobby');
      navigate('/lobby');
    });

    socket.on('room_update', (state) => {
      setRoomState(state);
      if (state.phase === 'submission' && phaseRef.current !== 'submission') {
        setPhase('submission');
        navigate('/submission');
      }
    });

    socket.on('game_started', () => {
      setPhase('playing');
      navigate('/game');
    });

    socket.on('game_ended', ({ finalScores }) => {
      setPhase('ended');
      navigate('/results', { state: { finalScores } });
    });

    socket.on('error', ({ message }) => {
      console.error('Socket error:', message);
      alert(`Error: ${message}`);
    });

    return () => {
      socket.off('connect');
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('room_update');
      socket.off('game_started');
      socket.off('game_ended');
      socket.off('error');
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
