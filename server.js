const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {}; // { roomId: { offer: {}, answer: {}, candidates: { offerer: [], answerer: [] } } }

io.on('connection', socket => {
  console.log('Socket connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;
    console.log('socket has joined the room')
    // Send existing offer if present
    const room = rooms[roomId];
    // console.log(rooms[roomId]);
    if (room?.offer) {
      socket.emit('offer-available', room.offer);
    }
  });

  socket.on('send-offer', ({ roomId, offer }) => {
    console.log('send offer initiated');
    rooms[roomId] = rooms[roomId] || { candidates: { offerer: [], answerer: [] } };
    rooms[roomId].offer = offer;
    socket.to(roomId).emit('receive-offer', offer);
  });

  socket.on('send-answer', ({ roomId, answer }) => {
    rooms[roomId].answer = answer;
    socket.to(roomId).emit('receive-answer', answer);
  });

  socket.on('send-ice-candidate', ({ roomId, role, candidate }) => {
    if (rooms[roomId]) {
      rooms[roomId].candidates[role].push(candidate);
      socket.to(roomId).emit('receive-ice-candidate', { role, candidate });
    }
  });

  socket.on('update-video-toggle-on-peer',({roomId,isVideoEnabled})=>{
    socket.to(roomId).emit('update-video-toggle-on-peer',{isVideoEnabled});
  })

  socket.on('update-audio-toggle-on-peer',({roomId,isAudioEnabled})=>{
    socket.to(roomId).emit('update-audio-toggle-on-peer',{isAudioEnabled});
  })

  socket.on('leave-room',({roomId})=>{
    console.log('leave room ...');
    socket.to(roomId).emit('peer-leave-room');
  })

  socket.on('disconnect', () => {
    const { roomId } = socket;
    console.log('Socket disconnected:', socket.id);
  });
});

server.listen(8081, () => {
  console.log('Signaling server running on port 8081');
});
