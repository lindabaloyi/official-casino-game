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
const activeGames = {}; // Track active game rooms

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
    console.log(`[ACCEPT_INVITE] Received from ${socket.username} for ${senderId}`);
    const sender = onlinePlayers[senderId];
    const recipient = onlinePlayers[socket.id];

    // Validate invitation state before accepting
    if (!sender || !recipient || sender.status !== 'pending-invite' || recipient.status !== 'pending-invite') {
      console.log(`[ACCEPT_INVITE] Invalid accept attempt from ${recipient?.username || 'unknown'} to ${sender?.username || 'unknown'}`);
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
    console.log(`[ACCEPT_INVITE] Sockets for ${sender.username} and ${recipient.username} joined room ${gameId}`);


    // Store the game in activeGames to track it
    activeGames[gameId] = {
      gameId,
      players: [sender, recipient],
      sockets: [sender.id, recipient.id],
      status: 'navigating', // Players are being sent to the game screen
      readyPlayers: [], // To track clients that have loaded the game screen
    };
    console.log(`[ACCEPT_INVITE] Active game created for ${gameId}`);

    // 3. Tell both clients to navigate to the game screen.
    const navigationPayload = { gameId, players: [sender, recipient] };
    console.log(`[ACCEPT_INVITE] Emitting 'server:navigate-to-game' to room ${gameId}`);
    io.to(gameId).emit('server:navigate-to-game', navigationPayload);

    io.emit('update-player-list', Object.values(onlinePlayers));
    console.log(`[ACCEPT_INVITE] Flow completed for ${gameId}.`);
  });

  socket.on('client:game-state-initialized', ({ gameId, gameState }) => {
    console.log(`[GAME_INIT] Received from host for game ${gameId}`);
    const game = activeGames[gameId];
    if (!game || game.status !== 'initializing') {
      console.error(`[GAME_INIT] Error: Game ${gameId} not found or not in 'initializing' state.`);
      socket.emit('server:error', { message: 'Cannot initialize game state. Game not found or already started.' });
      return;
    }

    // The client sends the full state, including player hands.
    // We trust this as the source of truth.
    game.gameState = gameState;
    game.status = 'running';
    console.log(`[GAME_INIT] Game state stored for ${gameId}. Status -> 'running'.`);

    // Broadcast the complete, initial game state to everyone in the room.
    console.log(`[GAME_INIT] Broadcasting 'game-update' to room ${gameId}.`);
    io.to(gameId).emit('game-update', game.gameState);
  });

  socket.on('client:player-ready', ({ gameId }) => {
    const game = activeGames[gameId];
    if (!game) {
      console.error(`[PLAYER_READY] Error: Game not found for gameId: ${gameId}`);
      return;
    }

    console.log(`[PLAYER_READY] Received from ${socket.username} for game ${gameId}`);

    // Add player to the ready list if they aren't already on it
    if (!game.readyPlayers.includes(socket.id)) {
      game.readyPlayers.push(socket.id);
    }

    // If both players are now ready, start the initialization process
    if (game.readyPlayers.length === 2) {
      console.log(`[PLAYER_READY] Both players are ready for game ${gameId}. Initializing...`);
      game.status = 'initializing';

      // The recipient of the invite is the host. They were the second player in the initial array.
      const hostId = game.sockets[1];
      const otherId = game.sockets[0];
      
      const hostSocket = io.sockets.sockets.get(hostId);
      const otherSocket = io.sockets.sockets.get(otherId);
      const hostUser = game.players.find(p => p.id === hostId);

      if (!hostSocket || !otherSocket || !hostUser) {
        console.error(`[PLAYER_READY] Error: Could not find sockets or user for game ${gameId}`);
        return;
      }

      // 1. Tell the host to initialize the game.
      console.log(`[PLAYER_READY] Emitting 'server:initialize-game' to host ${hostUser.username}`);
      hostSocket.emit('server:initialize-game', {
        gameId,
        players: game.players,
        hostId: hostId,
      });

      // 2. Tell the other player to wait.
      console.log(`[PLAYER_READY] Emitting 'server:waiting-for-initialization' to non-host ${otherSocket.username}`);
      otherSocket.emit('server:waiting-for-initialization', {
        gameId,
        hostUsername: hostUser.username,
      });
    }
  });

  // Handle joining an existing game room
  socket.on('join-game', ({ gameId }) => {
    console.log(`Player ${socket.username} (${socket.id}) joining game ${gameId}`);

    // Check if game exists
    if (!activeGames[gameId]) {
      console.log(`Game ${gameId} not found, creating basic game state`);
      // Create basic game state for now
      activeGames[gameId] = {
        gameId,
        players: [],
        status: 'waiting',
        created: new Date().toISOString()
      };
    }

    const game = activeGames[gameId];

    // Add player to game if not already present
    const existingPlayerIndex = game.players.findIndex(p => p.id === socket.id);
    if (existingPlayerIndex === -1) {
      game.players.push({
        id: socket.id,
        username: socket.username,
        status: 'connected',
        hand: [] // Initialize with empty hand
      });
    }

    // Join the socket room
    socket.join(gameId);

    // Send current game state to the joining player
    socket.emit('game-update', {
      gameId: game.gameId,
      players: game.players,
      status: game.status,
      playerCount: game.players.length
    });

    // Notify other players in the room
    socket.to(gameId).emit('player-joined', {
      player: {
        id: socket.id,
        username: socket.username,
        status: 'connected'
      },
      totalPlayers: game.players.length
    });

    console.log(`Player ${socket.username} successfully joined game ${gameId}. Total players: ${game.players.length}`);
  });

  // Handle card play events
  socket.on('play-card', ({ card, gameId }) => {
    console.log(`Player ${socket.username} playing card:`, card, `in game ${gameId}`);

    const game = activeGames[gameId];
    if (!game) {
      console.log(`Game ${gameId} not found`);
      socket.emit('game-error', { message: 'Game not found' });
      return;
    }

    // Find the player making the move
    const player = game.players.find(p => p.id === socket.id);
    if (!player) {
      console.log(`Player ${socket.username} not found in game ${gameId}`);
      socket.emit('game-error', { message: 'Player not in game' });
      return;
    }

    // Basic validation - check if it's player's turn
    if (game.currentTurn !== socket.id) {
      console.log(`Not ${socket.username}'s turn in game ${gameId}`);
      socket.emit('game-error', { message: 'Not your turn' });
      return;
    }

    // For now, just acknowledge the move and switch turns
    console.log(`${socket.username} played ${card.rank} of ${card.suit}`);

    // Switch turns to the other player
    const otherPlayer = game.players.find(p => p.id !== socket.id);
    if (otherPlayer) {
      game.currentTurn = otherPlayer.id;
    }

    // Broadcast the updated game state to all players in the room
    io.to(gameId).emit('game-update', {
      gameId: game.gameId,
      players: game.players,
      status: game.status,
      currentTurn: game.currentTurn,
      lastMove: {
        playerId: socket.id,
        playerName: socket.username,
        card: card,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`Turn switched to ${otherPlayer?.username || 'unknown'} in game ${gameId}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
