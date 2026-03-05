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
    const onConnect = () => setMyId(socket.id);
    const onRoomCreated = () => { setPhase('lobby'); navigate('/lobby'); };
    const onRoomJoined = () => { setPhase('lobby'); };
    const onRoomUpdate = (state) => {
      setRoomState(state);
      if (state.phase === 'lobby' && phaseRef.current !== 'lobby') navigate('/lobby');
      if (state.phase === 'submission' && phaseRef.current !== 'submission') {
        setPhase('submission');
        navigate('/submission');
      }
    };
    const onGameStarted = () => { setPhase('playing'); navigate('/game'); };
    const onGameEnded = ({ finalScores }) => { setPhase('ended'); navigate('/results', { state: { finalScores } }); };
    const onError = ({ message }) => { console.error('Socket error:', message); alert(`Error: ${message}`); };

    socket.on('connect', onConnect);
    socket.on('room_created', onRoomCreated);
    socket.on('room_joined', onRoomJoined);
    socket.on('room_update', onRoomUpdate);
    socket.on('game_started', onGameStarted);
    socket.on('game_ended', onGameEnded);
    socket.on('error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('room_created', onRoomCreated);
      socket.off('room_joined', onRoomJoined);
      socket.off('room_update', onRoomUpdate);
      socket.off('game_started', onGameStarted);
      socket.off('game_ended', onGameEnded);
      socket.off('error', onError);
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
