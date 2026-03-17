import jwt from "jsonwebtoken";

const onlineUsers = new Map();

const addUserSocket = (userId, socketId) => {
  const existing = onlineUsers.get(userId) || new Set();
  existing.add(socketId);
  onlineUsers.set(userId, existing);
};

const removeUserSocket = (userId, socketId) => {
  const existing = onlineUsers.get(userId);
  if (!existing) return;
  existing.delete(socketId);
  if (existing.size === 0) {
    onlineUsers.delete(userId);
  }
};

export const getOnlineUserIds = () => Array.from(onlineUsers.keys());

export const emitToUser = (io, userId, event, payload) => {
  const sockets = onlineUsers.get(userId?.toString());
  if (!sockets) return;
  sockets.forEach((socketId) => io.to(socketId).emit(event, payload));
};

const verifySocket = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    return next();
  } catch (error) {
    return next(new Error("Unauthorized"));
  }
};

export const initializeSocket = (io) => {
  io.use(verifySocket);

  io.on("connection", (socket) => {
    const userId = socket.userId.toString();
    addUserSocket(userId, socket.id);
    io.emit("presence:update", getOnlineUserIds());

    socket.on("typing:start", ({ to, fromName }) => {
      emitToUser(io, to, "typing:start", { from: userId, fromName });
    });

    socket.on("typing:stop", ({ to }) => {
      emitToUser(io, to, "typing:stop", { from: userId });
    });

    socket.on("call-user", (payload) => {
      emitToUser(io, payload.to, "call:incoming", {
        from: userId,
        caller: payload.caller,
        offer: payload.offer,
        callType: payload.callType
      });
    });

    socket.on("answer-call", (payload) => {
      emitToUser(io, payload.to, "call:answered", {
        from: userId,
        answer: payload.answer,
        callType: payload.callType
      });
    });

    socket.on("reject-call", (payload) => {
      emitToUser(io, payload.to, "call:rejected", {
        from: userId
      });
    });

    socket.on("end-call", (payload) => {
      emitToUser(io, payload.to, "call:ended", {
        from: userId
      });
    });

    socket.on("ice-candidate", (payload) => {
      emitToUser(io, payload.to, "call:ice-candidate", {
        from: userId,
        candidate: payload.candidate
      });
    });

    socket.on("disconnect", () => {
      removeUserSocket(userId, socket.id);
      io.emit("presence:update", getOnlineUserIds());
    });
  });
};
