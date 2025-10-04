const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// Route to get chat history between two users
router.get("/:userId/:recipientId", async (req, res) => {
  try {
    const { userId, recipientId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: recipientId },
        { sender: recipientId, recipient: userId },
      ],
    })
      .sort({ timestamp: 1 }) // chronological order
      .populate("sender", "username email") // populate sender's username and email
      .populate("recipient", "username email"); // populate recipient's username and email

    res.status(200).json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages." });
  }
});

module.exports = router;
