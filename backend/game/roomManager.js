// In-memory room state — no database, rooms vanish when all players leave

const rooms = new Map(); // code → Room

function generateCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I/L
  let code;
  do {
    code = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createRoom(hostSocketId, username, settings) {
  const code = generateCode();
  const room = {
    code,
    host: hostSocketId,
    phase: 'lobby', // lobby | submission | playing | ended
    settings: {
      songsPerPlayer: Math.max(1, Math.min(10, settings.songsPerPlayer || 2)),
      speedBonus: Boolean(settings.speedBonus),
    },
    players: new Map(), // socketId → { username, songs[], hasSubmitted }
    songQueue: [], // [{ track, submittedBy (socketId) }]
    currentSongIndex: -1,
    currentSongStartTime: null,
    guesses: new Map(), // socketId → { guessedPlayerId, timestamp }
    scores: new Map(), // socketId → number
  };

  room.players.set(hostSocketId, { username, songs: [], hasSubmitted: false });
  room.scores.set(hostSocketId, 0);
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  return rooms.get(code) || null;
}

export function getRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players.has(socketId)) return room;
  }
  return null;
}

export function addPlayer(code, socketId, username) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.phase !== 'lobby') return { error: 'Game already started' };
  if (room.players.has(socketId)) return { error: 'Already in room' };

  // Check username uniqueness
  for (const p of room.players.values()) {
    if (p.username.toLowerCase() === username.toLowerCase()) {
      return { error: 'Username already taken' };
    }
  }

  room.players.set(socketId, { username, songs: [], hasSubmitted: false });
  room.scores.set(socketId, 0);
  return { room };
}

export function rejoinPlayer(code, newSocketId, username) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };

  // Find existing player by username
  let oldSocketId = null;
  for (const [id, p] of room.players.entries()) {
    if (p.username.toLowerCase() === username.toLowerCase()) {
      oldSocketId = id;
      break;
    }
  }

  if (!oldSocketId) return { error: 'Player not found in room' };
  if (oldSocketId === newSocketId) return { room }; // already connected

  // Migrate player data to new socket id
  const playerData = room.players.get(oldSocketId);
  const score = room.scores.get(oldSocketId) || 0;
  const guess = room.guesses.get(oldSocketId);

  room.players.delete(oldSocketId);
  room.scores.delete(oldSocketId);
  room.guesses.delete(oldSocketId);

  room.players.set(newSocketId, playerData);
  room.scores.set(newSocketId, score);
  if (guess) room.guesses.set(newSocketId, guess);

  // Transfer host if needed
  if (room.host === oldSocketId) room.host = newSocketId;

  // Update submittedBy references in songQueue
  for (const entry of room.songQueue) {
    if (entry.submittedBy === oldSocketId) entry.submittedBy = newSocketId;
  }

  return { room, oldSocketId };
}

export function removePlayer(socketId) {
  const room = getRoomBySocket(socketId);
  if (!room) return null;

  room.players.delete(socketId);
  room.scores.delete(socketId);
  room.guesses.delete(socketId);

  // If room is empty, clean up
  if (room.players.size === 0) {
    rooms.delete(room.code);
    return { room: null, wasEmpty: true };
  }

  // Transfer host if host left
  if (room.host === socketId) {
    room.host = room.players.keys().next().value;
  }

  return { room, wasEmpty: false };
}

export function submitSongs(socketId, songs) {
  const room = getRoomBySocket(socketId);
  if (!room) return { error: 'Not in a room' };
  if (room.phase !== 'submission') return { error: 'Not in submission phase' };

  const player = room.players.get(socketId);
  if (!player) return { error: 'Player not found' };

  const maxSongs = room.settings.songsPerPlayer;
  const validSongs = songs.slice(0, maxSongs).filter(s => s.id && s.name && s.artist);

  if (validSongs.length < maxSongs) {
    return { error: `Must submit exactly ${maxSongs} song(s)` };
  }

  player.songs = validSongs;
  player.hasSubmitted = true;

  return { room };
}

export function allPlayersSubmitted(room) {
  for (const player of room.players.values()) {
    if (!player.hasSubmitted) return false;
  }
  return true;
}

export function buildSongQueue(room) {
  const entries = [];
  for (const [socketId, player] of room.players.entries()) {
    for (const track of player.songs) {
      entries.push({ track, submittedBy: socketId });
    }
  }
  room.songQueue = shuffle(entries);
  room.currentSongIndex = -1;
}

export function advanceSong(room) {
  room.currentSongIndex += 1;
  room.currentSongStartTime = Date.now();
  room.guesses = new Map();

  if (room.currentSongIndex >= room.songQueue.length) {
    room.phase = 'ended';
    return null;
  }

  return room.songQueue[room.currentSongIndex];
}

export function recordGuess(socketId, guessedPlayerId) {
  const room = getRoomBySocket(socketId);
  if (!room) return { error: 'Not in a room' };
  if (room.phase !== 'playing') return { error: 'Not in playing phase' };
  if (room.guesses.has(socketId)) return { error: 'Already guessed' };

  room.guesses.set(socketId, {
    guessedPlayerId,
    timestamp: Date.now(),
  });

  return { room };
}

export function scoreRound(room) {
  const currentEntry = room.songQueue[room.currentSongIndex];
  if (!currentEntry) return;

  const results = [];

  for (const [socketId, guess] of room.guesses.entries()) {
    const correct = guess.guessedPlayerId === currentEntry.submittedBy;
    let points = 0;

    if (correct) {
      if (room.settings.speedBonus) {
        const secondsElapsed = (guess.timestamp - room.currentSongStartTime) / 1000;
        points = Math.max(100, Math.round(1000 - secondsElapsed * 100));
      } else {
        points = 500;
      }
    }

    room.scores.set(socketId, (room.scores.get(socketId) || 0) + points);

    results.push({
      socketId,
      username: room.players.get(socketId)?.username,
      guessedPlayerId: guess.guessedPlayerId,
      guessedUsername: room.players.get(guess.guessedPlayerId)?.username,
      correct,
      points,
    });
  }

  return results;
}

export function getPublicRoomState(room) {
  const players = Array.from(room.players.entries()).map(([id, p]) => ({
    id,
    username: p.username,
    hasSubmitted: p.hasSubmitted,
    isHost: id === room.host,
    score: room.scores.get(id) || 0,
  }));

  return {
    code: room.code,
    phase: room.phase,
    settings: room.settings,
    players,
    host: room.host,
    currentSongIndex: room.currentSongIndex,
    totalSongs: room.songQueue.length,
  };
}
