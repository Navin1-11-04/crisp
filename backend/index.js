import express from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("❌ GEMINI_API_KEY missing in .env");

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

// ---------------- Extract text from files ----------------
async function extractText(file) {
  if (file.mimetype === "application/pdf") {
    const data = await pdfParse(file.buffer);
    return data.text || file.buffer.toString("utf8");
  } else if (
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }
  throw new Error("Unsupported file type.");
}

// ---------------- Resume Extraction ----------------
app.post("/extract", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const text = await extractText(file);

    const systemInstruction = `
You are a resume parser. Extract only:
- name
- email
- phone
Always return valid JSON { "name": "...", "email": "...", "phone": "..." }.
If missing, use "Not Found".
    `;

    const payload = {
      contents: [{ parts: [{ text }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { responseMimeType: "application/json" },
    };

    const response = await axios.post(GEMINI_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    const content =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    res.json({ extracted: JSON.parse(content) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- Chat Verification ----------------
app.post("/chat", async (req, res) => {
  try {
    const { messages, extracted } = req.body;

    const systemInstruction = `
You verify resume details.

Return JSON:
{
  "reply": "bot response",
  "state": { "name": "...", "email": "...", "phone": "..." },
  "userConfirmed": false
}

Rules:
- Keep "state" updated with corrections.
- userConfirmed = true only if user explicitly confirms all details are correct.
Current data: ${JSON.stringify(extracted)}
    `;

    const convo = messages.map((m) => `${m.role}: ${m.content}`).join("\n");

    const payload = {
      contents: [{ parts: [{ text: convo }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { responseMimeType: "application/json" },
    };

    const response = await axios.post(GEMINI_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    const content =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(content);

    const allFieldsFilled =
      parsed.state.name !== "Not Found" &&
      parsed.state.email !== "Not Found" &&
      parsed.state.phone !== "Not Found";

    const verified = allFieldsFilled && parsed.userConfirmed === true;

    res.json({ reply: parsed.reply, state: parsed.state, verified });
  } catch (err) {
    res.status(500).json({
      reply: "⚠️ Error talking to AI",
      state: req.body.extracted,
      verified: false,
    });
  }
});

// ---------------- AI Interview Questions ----------------
app.post("/generate-questions", async (req, res) => {
  try {
    const { role = "software developer" } = req.body;

    const systemInstruction = `
You are an interview question generator.
Generate EXACTLY 6 questions for role: ${role}.
Format as valid JSON array:
[
  { "id": 1, "text": "...", "level": "easy", "timeLimit": 30 },
  { "id": 2, "text": "...", "level": "easy", "timeLimit": 30 },
  { "id": 3, "text": "...", "level": "medium", "timeLimit": 45 },
  { "id": 4, "text": "...", "level": "medium", "timeLimit": 45 },
  { "id": 5, "text": "...", "level": "hard", "timeLimit": 60 },
  { "id": 6, "text": "...", "level": "hard", "timeLimit": 60 }
]
Rules:
- JSON only.
- 2 easy, 2 medium, 2 hard.
- Questions must be practical and role-relevant.
    `;

    const payload = {
      contents: [{ parts: [{ text: "Generate questions" }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { responseMimeType: "application/json" },
    };

    const response = await axios.post(GEMINI_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    const content =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    res.json({ questions: JSON.parse(content) });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

// ---------------- AI Scoring ----------------
app.post("/score", async (req, res) => {
  try {
    const { candidate, questions } = req.body;

    const systemInstruction = `
You are an interviewer. Evaluate answers.

Input:
Candidate: ${JSON.stringify(candidate)}
Questions & Answers: ${JSON.stringify(questions)}

Output JSON only:
{
  "score": "0-100",
  "summary": "short performance summary"
}
    `;

    const payload = {
      contents: [{ parts: [{ text: "Evaluate candidate" }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { responseMimeType: "application/json" },
    };

    const response = await axios.post(GEMINI_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    const content =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    res.json(JSON.parse(content));
  } catch (err) {
    res.status(500).json({ error: "Failed to score candidate" });
  }
});

// ---------------- Health ----------------
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
