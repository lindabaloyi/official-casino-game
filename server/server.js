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

const onlinePlayers = {};

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
  onlinePlayers[socket.id] = { id: socket.id, username: socket.username, status: 'available' };

  // Broadcast the updated player list to all clients
  io.emit('update-player-list', Object.values(onlinePlayers));

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    const disconnectedPlayer = onlinePlayers[socket.id];

    // Clear any pending invitation timeouts
    if (disconnectedPlayer?.inviteTimeout) {
      clearTimeout(disconnectedPlayer.inviteTimeout);
    }

    // If player was in pending-invite state, notify the other party
    if (disconnectedPlayer?.status === 'pending-invite') {
      // Find the other player in the invitation
      const otherPlayer = Object.values(onlinePlayers).find(player =>
        player.status === 'pending-invite' &&
        player.inviteTimeout === disconnectedPlayer.inviteTimeout &&
        player.id !== socket.id
      );

      if (otherPlayer) {
        otherPlayer.status = 'available';
        if (otherPlayer.inviteTimeout) {
          clearTimeout(otherPlayer.inviteTimeout);
          delete otherPlayer.inviteTimeout;
        }
        io.to(otherPlayer.id).emit('server:invite-declined', {
          declinerUsername: disconnectedPlayer.username,
          reason: 'Player disconnected'
        });
      }
    }

    // Remove player from the list
    delete onlinePlayers[socket.id];

    // Broadcast the updated player list
    io.emit('update-player-list', Object.values(onlinePlayers));
  });

  socket.on('client:send-invite', ({ recipientId }) => {
    const recipient = onlinePlayers[recipientId];
    const sender = onlinePlayers[socket.id];

    if (!recipient || !sender || recipient.status !== 'available' || sender.status !== 'available') {
      // Handle error: user not found, not available, or sender is not available
      // Optionally, send an error message back to the sender
      console.log(`Invite failed: ${sender?.username} to ${recipient?.username}`);
      socket.emit('server:error', { message: 'Player is not available to be invited.' });
      return;
    }

    // Update statuses
    recipient.status = 'pending-invite';
    sender.status = 'pending-invite';

    // Notify the recipient
    console.log(`Attempting to send invite to recipient ID: ${recipient.id} (${recipient.username}) from sender ID: ${sender.id} (${sender.username})`);
    io.to(recipient.id).emit('server:receive-invite', { 
      senderId: sender.id, 
      senderUsername: sender.username 
    });

    // Broadcast the updated player list to everyone
    io.emit('update-player-list', Object.values(onlinePlayers));
    console.log(`Sent invite from ${sender.username} to ${recipient.username}`);
    
    // Set timeout to auto-decline after 30 seconds
    const inviteTimeout = setTimeout(() => {
      if (sender.status === 'pending-invite' && recipient.status === 'pending-invite') {
        sender.status = 'available';
        recipient.status = 'available';
        io.emit('update-player-list', Object.values(onlinePlayers));
        io.to(sender.id).emit('server:invite-declined', {
          declinerUsername: recipient.username,
          reason: 'Invitation timed out'
        });
        console.log(`Invite from ${sender.username} to ${recipient.username} timed out`);
      }
    }, 30000);

    // Store timeout references
    sender.inviteTimeout = inviteTimeout;
    recipient.inviteTimeout = inviteTimeout;
  });

  socket.on('client:decline-invite', ({ senderId }) => {
    console.log(`Server: Received client:decline-invite from ${socket.id} for sender ${senderId}`);
    const sender = onlinePlayers[senderId];
    const recipient = onlinePlayers[socket.id];

    // Only process if both parties are in pending-invite state
    if (sender?.status === 'pending-invite' && recipient?.status === 'pending-invite') {
      // Clear timeout
      if (sender.inviteTimeout) {
        clearTimeout(sender.inviteTimeout);
        delete sender.inviteTimeout;
      }
      if (recipient.inviteTimeout) {
        clearTimeout(recipient.inviteTimeout);
        delete recipient.inviteTimeout;
      }

      sender.status = 'available';
      recipient.status = 'available';

      // Notify the original sender
      io.to(senderId).emit('server:invite-declined', { declinerUsername: recipient.username });
      console.log(`${recipient.username} declined invite from ${sender.username}`);
    } else {
      console.log(`Invalid decline attempt from ${recipient?.username || 'unknown'} to ${sender?.username || 'unknown'}`);
      socket.emit('server:error', { message: 'No active invitation to decline' });
    }

    // Broadcast updated player list
    io.emit('update-player-list', Object.values(onlinePlayers));
  });

  socket.on('client:accept-invite', ({ senderId }) => {
    console.log(`Server: Received client:accept-invite from ${socket.id} for sender ${senderId}`);
    const sender = onlinePlayers[senderId];
    const recipient = onlinePlayers[socket.id];

    // Validate invitation state before accepting
    if (!sender || !recipient || sender.status !== 'pending-invite' || recipient.status !== 'pending-invite') {
      console.log(`Invalid accept attempt from ${recipient?.username || 'unknown'} to ${sender?.username || 'unknown'}`);
      socket.emit('server:error', { message: 'No active invitation to accept' });

      // Reset statuses if one party is invalid
      if(sender) sender.status = 'available';
      if(recipient) recipient.status = 'available';
      io.emit('update-player-list', Object.values(onlinePlayers));
      return;
    }

    // Clear timeout since invitation was accepted
    if (sender.inviteTimeout) {
      clearTimeout(sender.inviteTimeout);
      delete sender.inviteTimeout;
    }
    if (recipient.inviteTimeout) {
      clearTimeout(recipient.inviteTimeout);
      delete recipient.inviteTimeout;
    }

    sender.status = 'in-game';
    recipient.status = 'in-game';

    const gameId = `game_${sender.id}_${recipient.id}`;
    
    const senderSocket = io.sockets.sockets.get(sender.id);
    const recipientSocket = io.sockets.sockets.get(recipient.id);

    if (!senderSocket || !recipientSocket) {
        // One of the players disconnected just before joining the room
        if(sender) sender.status = 'available';
        if(recipient) recipient.status = 'available';
        io.emit('update-player-list', Object.values(onlinePlayers));
        return;
    }
    
    senderSocket.join(gameId);
    recipientSocket.join(gameId);

    const gameStartPayload = {
      gameId,
      players: [sender, recipient]
    };

    io.to(gameId).emit('server:game-starting', gameStartPayload);

    io.emit('update-player-list', Object.values(onlinePlayers));
    console.log(`Game starting between ${sender.username} and ${recipient.username} in room ${gameId}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
