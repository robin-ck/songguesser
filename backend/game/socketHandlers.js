import {
  createRoom,
  getRoom,
  getRoomBySocket,
  addPlayer,
  removePlayer,
  submitSongs,
  allPlayersSubmitted,
  buildSongQueue,
  advanceSong,
  recordGuess,
  scoreRound,
  getPublicRoomState,
} from './roomManager.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Create a new room
    socket.on('create_room', ({ username, settings } = {}) => {
      if (!username) return socket.emit('error', { message: 'Username required' });

      const room = createRoom(socket.id, username, settings || {});
      socket.join(room.code);
      socket.emit('room_created', { code: room.code });
      io.to(room.code).emit('room_update', getPublicRoomState(room));
    });

    // Join an existing room
    socket.on('join_room', ({ code, username } = {}) => {
      if (!code || !username) return socket.emit('error', { message: 'Code and username required' });

      const result = addPlayer(code.toUpperCase(), socket.id, username);
      if (result.error) return socket.emit('error', { message: result.error });

      socket.join(code.toUpperCase());
      socket.emit('room_joined', { code: code.toUpperCase() });
      io.to(code.toUpperCase()).emit('room_update', getPublicRoomState(result.room));
    });

    // Host starts the submission phase
    socket.on('start_submission', () => {
      const room = getRoomBySocket(socket.id);
      if (!room) return socket.emit('error', { message: 'Not in a room' });
      if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can start' });
      if (room.phase !== 'lobby') return socket.emit('error', { message: 'Wrong phase' });

      room.phase = 'submission';
      io.to(room.code).emit('room_update', getPublicRoomState(room));
    });

    // Player submits their songs
    socket.on('submit_songs', ({ songs } = {}) => {
      if (!Array.isArray(songs)) return socket.emit('error', { message: 'Songs must be an array' });

      const result = submitSongs(socket.id, songs);
      if (result.error) return socket.emit('error', { message: result.error });

      const room = result.room;
      io.to(room.code).emit('room_update', getPublicRoomState(room));

      // Auto-advance if everyone submitted
      if (allPlayersSubmitted(room)) {
        io.to(room.code).emit('all_submitted');
      }
    });

    // Host starts the game
    socket.on('start_game', () => {
      const room = getRoomBySocket(socket.id);
      if (!room) return socket.emit('error', { message: 'Not in a room' });
      if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can start game' });
      if (room.phase !== 'submission') return socket.emit('error', { message: 'Wrong phase' });
      if (!allPlayersSubmitted(room)) return socket.emit('error', { message: 'Not all players submitted' });

      buildSongQueue(room);
      room.phase = 'playing';

      const entry = advanceSong(room);
      if (!entry) return socket.emit('error', { message: 'No songs in queue' });

      const playerOptions = Array.from(room.players.entries())
        .filter(([id]) => id !== room.host)
        .map(([id, p]) => ({ id, username: p.username }));

      io.to(room.code).emit('game_started');
      io.to(room.code).emit('song_changed', {
        song: {
          name: entry.track.name,
          artist: entry.track.artist,
          albumArt: entry.track.albumArt,
          previewUrl: entry.track.previewUrl,
          youtubeQuery: `${entry.track.name} ${entry.track.artist}`,
        },
        playerOptions,
        songIndex: room.currentSongIndex,
        totalSongs: room.songQueue.length,
      });
    });

    // Player submits a guess
    socket.on('submit_guess', ({ guessedPlayerId } = {}) => {
      if (!guessedPlayerId) return socket.emit('error', { message: 'guessedPlayerId required' });

      const result = recordGuess(socket.id, guessedPlayerId);
      if (result.error) return socket.emit('error', { message: result.error });

      socket.emit('guess_locked', { guessedPlayerId });
    });

    // Host reveals results for current song
    socket.on('next_song', () => {
      const room = getRoomBySocket(socket.id);
      if (!room) return socket.emit('error', { message: 'Not in a room' });
      if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can advance' });
      if (room.phase !== 'playing') return socket.emit('error', { message: 'Wrong phase' });

      const guessResults = scoreRound(room);
      const currentEntry = room.songQueue[room.currentSongIndex];
      const submitterUsername = room.players.get(currentEntry.submittedBy)?.username;

      const scores = Array.from(room.players.entries()).map(([id, p]) => ({
        id,
        username: p.username,
        score: room.scores.get(id) || 0,
        isHost: id === room.host,
      }));

      io.to(room.code).emit('round_result', {
        submittedBy: currentEntry.submittedBy,
        submittedByUsername: submitterUsername,
        song: {
          name: currentEntry.track.name,
          artist: currentEntry.track.artist,
          albumArt: currentEntry.track.albumArt,
        },
        guesses: guessResults,
        scores,
      });
    });

    // Host advances to next song (called automatically after overlay)
    socket.on('advance_song', () => {
      const room = getRoomBySocket(socket.id);
      if (!room) return socket.emit('error', { message: 'Not in a room' });
      if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can advance' });
      if (room.phase !== 'playing') return;

      const entry = advanceSong(room);

      if (!entry) {
        // Game over
        const finalScores = Array.from(room.players.entries())
          .map(([id, p]) => ({
            id,
            username: p.username,
            score: room.scores.get(id) || 0,
            isHost: id === room.host,
          }))
          .sort((a, b) => b.score - a.score);

        io.to(room.code).emit('game_ended', { finalScores });
        return;
      }

      const playerOptions = Array.from(room.players.entries())
        .filter(([id]) => id !== room.host)
        .map(([id, p]) => ({ id, username: p.username }));

      io.to(room.code).emit('song_changed', {
        song: {
          name: entry.track.name,
          artist: entry.track.artist,
          albumArt: entry.track.albumArt,
          previewUrl: entry.track.previewUrl,
          youtubeQuery: `${entry.track.name} ${entry.track.artist}`,
        },
        playerOptions,
        songIndex: room.currentSongIndex,
        totalSongs: room.songQueue.length,
      });
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const result = removePlayer(socket.id);
      if (!result || result.wasEmpty) return;

      const { room } = result;
      io.to(room.code).emit('room_update', getPublicRoomState(room));
    });
  });
}
