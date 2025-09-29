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
    console.error("Extraction error:", err);
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
- Be conversational and helpful.
- If any field is "Not Found", ask for it specifically.
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
    console.error("Chat error:", err);
    res.status(500).json({
      reply: "⚠️ Error talking to AI. Please try again.",
      state: req.body.extracted,
      verified: false,
    });
  }
});

// ---------------- AI Interview Questions ----------------  
app.post("/generate-questions", async (req, res) => {
  try {
    const { role = "fullstack developer" } = req.body;

    const systemInstruction = `
You are an interview question generator for a ${role} position.
Generate EXACTLY 6 questions with these EXACT time limits:

[
  { "id": 1, "text": "...", "level": "easy", "timeLimit": 20 },
  { "id": 2, "text": "...", "level": "easy", "timeLimit": 20 },
  { "id": 3, "text": "...", "level": "medium", "timeLimit": 60 },
  { "id": 4, "text": "...", "level": "medium", "timeLimit": 60 },
  { "id": 5, "text": "...", "level": "hard", "timeLimit": 120 },
  { "id": 6, "text": "...", "level": "hard", "timeLimit": 120 }
]

Rules:
- Return ONLY valid JSON array, no extra text
- Questions must be practical and role-relevant
- Easy: Basic concepts, syntax, definitions
- Medium: Problem-solving, architecture, best practices  
- Hard: Complex scenarios, optimization, system design
- MUST use exact timeLimit values: easy=20, medium=60, hard=120
    `;

    const payload = {
      contents: [{ parts: [{ text: `Generate 6 interview questions for ${role}` }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.7 
      },
    };

    const response = await axios.post(GEMINI_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const questions = JSON.parse(content);
    
    // Validate that we have exactly 6 questions with correct time limits
    if (!Array.isArray(questions) || questions.length !== 6) {
      throw new Error("Invalid questions format");
    }
    
    // Ensure correct time limits
    const validatedQuestions = questions.map((q, index) => {
      let timeLimit;
      if (index < 2) timeLimit = 20;      // Easy: 20s
      else if (index < 4) timeLimit = 60; // Medium: 60s  
      else timeLimit = 120;               // Hard: 120s
      
      return {
        ...q,
        timeLimit,
        level: index < 2 ? "easy" : index < 4 ? "medium" : "hard"
      };
    });

    res.json({ questions: validatedQuestions });
  } catch (err) {
    console.error("Question generation error:", err);
    
    // Fallback questions if AI fails
    const fallbackQuestions = [
      { id: 1, text: "What is the difference between let, const, and var in JavaScript?", level: "easy", timeLimit: 20 },
      { id: 2, text: "Explain what React hooks are and name three commonly used hooks.", level: "easy", timeLimit: 20 },
      { id: 3, text: "How would you optimize a React component that renders a large list?", level: "medium", timeLimit: 60 },
      { id: 4, text: "Explain the difference between SQL and NoSQL databases with examples.", level: "medium", timeLimit: 60 },
      { id: 5, text: "Design a real-time chat system. What technologies and architecture would you use?", level: "hard", timeLimit: 120 },
      { id: 6, text: "How would you handle authentication and authorization in a full-stack application?", level: "hard", timeLimit: 120 }
    ];
    
    res.json({ questions: fallbackQuestions });
  }
});

// ---------------- AI Scoring ----------------
app.post("/score", async (req, res) => {
  try {
    const { candidate, questions } = req.body;

    const systemInstruction = `
You are an experienced technical interviewer. Evaluate the candidate's performance.

Candidate Info: ${JSON.stringify(candidate)}
Questions & Answers: ${JSON.stringify(questions)}

Scoring criteria:
- Technical accuracy (40%)
- Problem-solving approach (25%) 
- Communication clarity (20%)
- Time management (15%)

Consider:
- Quality of answers vs difficulty level
- Completeness within time limits
- Practical understanding
- Areas of strength/weakness

Return ONLY valid JSON:
{
  "score": 85,
  "summary": "Strong technical foundation with good problem-solving skills. Excellent understanding of React fundamentals and database concepts. Could improve on system design complexity. Overall: Recommended for next round."
}

Score range: 0-100 (0-60: Poor, 61-75: Average, 76-85: Good, 86-100: Excellent)
    `;

    const payload = {
      contents: [{ parts: [{ text: "Evaluate this candidate's interview performance" }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.3 
      },
    };

    const response = await axios.post(GEMINI_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const result = JSON.parse(content);
    
    // Ensure we have valid score and summary
    if (!result.score || !result.summary) {
      throw new Error("Invalid scoring response");
    }
    
    // Ensure score is within valid range
    result.score = Math.min(100, Math.max(0, parseInt(result.score)));

    res.json(result);
  } catch (err) {
    console.error("Scoring error:", err);
    
    // Fallback scoring
    const answeredQuestions = questions.filter(q => q.answer && q.answer !== "[No Answer]").length;
    const completionRate = (answeredQuestions / questions.length) * 100;
    const fallbackScore = Math.max(20, Math.min(75, completionRate + Math.random() * 20));
    
    res.json({
      score: Math.round(fallbackScore),
      summary: `Completed ${answeredQuestions} out of ${questions.length} questions. Performance evaluation completed with basic metrics.`
    });
  }
});

// ---------------- Health Check ----------------
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    version: "1.1.0"
  });
});

// ---------------- Error handling middleware ----------------
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : "Something went wrong"
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);