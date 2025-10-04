// chat-app/server/index.js

require("dotenv").config();
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY);
console.log('GEMINI_MODEL:', process.env.GEMINI_MODEL);

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const messageRoutes = require("./routes/messages");
const geminiRoutes = require("./routes/gemini");

const Message = require("./models/Message");

const app = express();
const httpServer = http.createServer(app);

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/gemini", geminiRoutes);

// existing clear-messages route if you added it earlier
app.delete("/api/clear-messages", async (req, res) => {
  try {
    await Message.deleteMany({});
    res.json({ success: true, message: "All messages deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------- ONLINE USERS TRACKING -----------------
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log(`[SOCKET] User connected: ${socket.id}`);

  // ✅ userId should be passed when connecting from frontend (query params)
  const userId = socket.handshake.query.userId;
  if (userId) {
    onlineUsers.set(userId, socket.id);
    console.log(`[ONLINE] User ${userId} is online`);
    io.emit("onlineUsers", Array.from(onlineUsers.keys())); // broadcast all online users
  }

  socket.on("join_room", (data) => {
    console.log(
      `[SOCKET] Join room request: Socket ${socket.id} for room ${data.chatRoomId}`
    );
    socket.join(data.chatRoomId);
    console.log(
      `[SOCKET] Socket ${socket.id} rooms after join:`,
      Array.from(socket.rooms)
    );
  });

  socket.on("send_message", async (data) => {
    try {
      let { sender, recipient, content, chatRoomId, timestamp } = data;

      // --- ENFORCE canonical chatRoomId on server ---
      const enforcedRoomId = [sender, recipient].sort().join("-");
      chatRoomId = enforcedRoomId;

      console.log(
        `[SOCKET] Received send_message (server-enforced room): Sender=${sender}, Recipient=${recipient}, Room=${chatRoomId}, Content="${content}"`
      );

      // Validate IDs
      if (
        !mongoose.Types.ObjectId.isValid(recipient) ||
        !mongoose.Types.ObjectId.isValid(sender)
      ) {
        console.error("[ERROR] Invalid sender/recipient ID:", { sender, recipient });
        return;
      }

      const newMessage = new Message({
        sender,
        recipient,
        content,
        chatRoomId,
        timestamp: timestamp || new Date().toISOString(),
      });
      const savedMessage = await newMessage.save();

      const populatedMessage = await Message.findById(savedMessage._id)
        .populate("sender", "username email")
        .populate("recipient", "username email");

      console.log(`[SERVER DB] Message saved and populated:`, populatedMessage);

      populatedMessage.chatRoomId = chatRoomId;

      io.to(chatRoomId).emit("receive_message", populatedMessage);
      console.log(`[SERVER EMIT] Emitted message to room ${chatRoomId}`);
    } catch (err) {
      console.error("[ERROR] Error saving or emitting message:", err);
      socket.emit("message_error", {
        message: "Failed to send message",
        details: err.message,
      });
    }
  });

  socket.on("typing", (data) => {
    if (data && data.chatRoomId) {
      socket.to(data.chatRoomId).emit("typing", data);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[SOCKET] User disconnected: ${socket.id}`);

    // Remove user from onlineUsers
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`[ONLINE] User ${userId} went offline`);
        break;
      }
    }
    io.emit("onlineUsers", Array.from(onlineUsers.keys())); // broadcast updated list
  });
});
// ----------------- END ONLINE USERS TRACKING -----------------

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[DB] MongoDB connected successfully!");
  } catch (err) {
    console.error("[DB ERROR] MongoDB connection error:", err.message);
    process.exit(1);
  }
};

connectDB();

app.get("/", (req, res) => {
  res.send("Chat API is running...");
});

httpServer.listen(PORT, () =>
  console.log(`[SERVER] Running on port ${PORT}`)
);