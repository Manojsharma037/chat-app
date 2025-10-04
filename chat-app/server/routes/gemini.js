const express = require("express");
const axios = require("axios");
const router = express.Router();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // or directly paste for testing
const MODEL_NAME = "gemini-2.5-flash"; // works well, you can change later

// Helper function to call Gemini API with retry
const callGeminiAPI = async (payload, retries = 2) => {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GOOGLE_API_KEY,
        },
        timeout: 15000, // 15 seconds timeout
      }
    );
    return response.data;
  } catch (err) {
    if (retries > 0) {
      console.warn(
        `[Gemini Retry] Failed request, retrying... (${retries} retries left)`
      );
      return callGeminiAPI(payload, retries - 1);cls
    } else {
      throw err;
    }
  }
};

router.post("/generate", async (req, res) => {
  try {
    const message = req.body.prompt || req.body.message; // message from frontend
    if (!message)
      return res.status(400).json({ error: "Missing message in request" });

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: message }],
        },
      ],
    };

    const data = await callGeminiAPI(payload);

    // Safely extract AI text
    const aiText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't generate a response. Try rephrasing your question.";

    console.log("✅ Gemini AI Reply:", aiText);

    res.json({ reply: aiText });
  } catch (err) {
    console.error("Gemini error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Failed to get AI response",
      details: err.response?.data || err.message,
    });
  }
});

module.exports = router;
