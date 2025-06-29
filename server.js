const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// { roomId: { offer: {}, answer: {}, candidates: { offerer: [], answerer: [] }, chats:[{senderId,receiverId,msg}] } }
const rooms = {};

io.on('connection', socket => {
  console.log('Socket connected:', socket.id);

  socket.on('join-room', (roomId) => {
    const room = rooms[roomId];

    if (room && room.users.size >= 2) {
      socket.emit('room-full'); 
      return;
    }

    socket.join(roomId);
    socket.roomId = roomId;
    console.log('Socket has joined the room:', roomId, 'socket id is ',socket.id);

    if (!room) {
      rooms[roomId] = { users: new Set() };
    } else {
      rooms[roomId].users.add(socket.id);
    }

    if (rooms[roomId].offer) {
      socket.emit('offer-available', rooms[roomId].offer);
    }
  });

  socket.on('send-offer', ({ roomId, offer }) => {
    console.log('send offer initiated');
    rooms[roomId] = {...rooms[roomId], candidates: { offerer: [], answerer: [] } };
    rooms[roomId].offer = offer;
    rooms[roomId].chats = []
    socket.to(roomId).emit('receive-offer', offer);
  });

  socket.on('send-answer', ({ roomId, answer }) => {
    rooms[roomId].answer = answer;
    socket.to(roomId).emit('receive-answer', answer);
  });

  socket.on('send-ice-candidate', ({ roomId, role, candidate }) => {
    if (rooms[roomId] && rooms[roomId].candidates) {
      rooms[roomId].candidates[role].push(candidate);
      socket.to(roomId).emit('receive-ice-candidate', { role, candidate });
    }
  });

  socket.on('update-video-toggle-on-peer', ({ roomId, isVideoEnabled }) => {
    socket.to(roomId).emit('update-video-toggle-on-peer', { isVideoEnabled });
  })

  socket.on('update-audio-toggle-on-peer', ({ roomId, isAudioEnabled }) => {
    socket.to(roomId).emit('update-audio-toggle-on-peer', { isAudioEnabled });
  })

  socket.on('send-chat-msg', ({ roomId, msg, timestamp }) => {
    if (rooms[roomId] && rooms[roomId].chats) {
      const chatMsg = { senderId: socket.id, receiverId: '', msg, timestamp };
      rooms[roomId].chats.push(chatMsg);
      io.to(roomId).emit('update-chat-box-with-new-msg', chatMsg);
    }
  });

  socket.on('get-chat-box-history', ({ roomId }, callback) => {
    if (rooms[roomId]) {
      callback(rooms[roomId].chats);
    } else {
      callback([]);
    }
  });

  socket.on('leave-room', ({ roomId }) => {
    console.log('leave room ...');
    if (rooms[roomId]) {
      rooms[roomId].chats = []
    }
    if(rooms[roomId] && rooms[roomId].users && rooms[roomId].users.has(socket.id)){
      rooms[roomId].users.delete(socket.id);
    }
    socket.to(roomId).emit('peer-leave-room');
  })

  socket.on('disconnect', () => {
    const { roomId } = socket;
    if (rooms[roomId]) {
      rooms[roomId].chats = []
    }
    if(rooms[roomId] && rooms[roomId].users && rooms[roomId].users.has(socket.id)){
      rooms[roomId].users.delete(socket.id);
    }
    console.log('Socket disconnected:', socket.id);
  });
});

server.listen(8081, () => {
  console.log('Signaling server running on port 8081');
});
