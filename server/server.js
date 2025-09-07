const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Allow the React app to connect
    methods: ["GET", "POST"]
  }
});

const onlinePlayers = [];

const PORT = process.env.PORT || 3001;

// Middleware to handle username registration
io.use((socket, next) => {
  const username = socket.handshake.auth.username;
  if (!username) {
    return next(new Error("invalid username"));
  }
  socket.username = username;
  next();
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id} as ${socket.username}`);

  // Add player to the list
  onlinePlayers.push({ id: socket.id, username: socket.username, status: 'available' });

  // Broadcast the updated player list to all clients
  io.emit('update-player-list', onlinePlayers);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Remove player from the list
    const index = onlinePlayers.findIndex(player => player.id === socket.id);
    if (index !== -1) {
      onlinePlayers.splice(index, 1);
    }
    // Broadcast the updated player list
    io.emit('update-player-list', onlinePlayers);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
