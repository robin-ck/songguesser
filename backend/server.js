import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import spotifyRouter from './routes/spotify.js';
import youtubeRouter from './routes/youtube.js';
import { registerSocketHandlers } from './game/socketHandlers.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(express.json());
app.use('/api/spotify', spotifyRouter);
app.use('/api/youtube', youtubeRouter);

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`SongGuesser running on port ${PORT}`));
