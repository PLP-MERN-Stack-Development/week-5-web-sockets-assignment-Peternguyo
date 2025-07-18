const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://chatapp-hsmq.vercel.app"],
    methods: ["GET", "POST"],
  },
});

let users = {};

io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on("register-user", (username) => {
    users[username] = socket.id;
    socket.username = username;
    io.emit("online-users", Object.keys(users));
  });

  socket.on("join-room", ({ username, room }) => {
    socket.join(room);
    socket.room = room;
    io.to(room).emit("chat-message", {
      user: "System",
      message: `${username} joined ${room}`,
      timestamp: new Date().toLocaleTimeString(),
    });
  });

  socket.on("chat-message", (data, callback) => {
    io.to(socket.room).emit("chat-message", data);
    callback?.({ status: "ok" });
  });

  socket.on("load-messages", ({ room, page }, callback) => {
    const fakeMessages = Array.from({ length: 10 }, (_, i) => ({
      user: "System",
      message: `Old message ${page * 10 + i + 1}`,
      timestamp: new Date().toLocaleTimeString(),
    }));
    callback(fakeMessages);
  });

  socket.on("typing", (username) => {
    socket.broadcast.to(socket.room).emit("typing", username);
  });

  socket.on("private-message", ({ to, from, message }) => {
    const toSocketId = users[to];
    if (toSocketId) {
      io.to(toSocketId).emit("private-message", {
        from,
        message,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  });

  socket.on("message-read", ({ from, to }) => {
    const toSocketId = users[to];
    if (toSocketId) {
      io.to(toSocketId).emit("message-read", { from });
    }
  });

  socket.on("react-message", (reaction) => {
    io.to(socket.room).emit("message-reaction", reaction);
  });

  socket.on("disconnect", () => {
    delete users[socket.username];
    io.emit("online-users", Object.keys(users));
    const username = socket.username || "Unknown";
    const room = socket.room || "general";
    io.to(room).emit("chat-message", {
      user: "System",
      message: `${username} left the room`,
      timestamp: new Date().toLocaleTimeString(),
    });
  });
});

server.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});