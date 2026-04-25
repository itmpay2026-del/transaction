const socketIO = require('socket.io');

module.exports = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user room for notifications
    socket.on('joinUserRoom', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Join dispute room for real-time updates
    socket.on('joinDisputeRoom', (disputeId) => {
      socket.join(`dispute_${disputeId}`);
      console.log(`Joined dispute room: ${disputeId}`);
    });

    // Join admin room
    socket.on('joinAdminRoom', () => {
      socket.join('admins');
      console.log('Admin joined admin room');
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};