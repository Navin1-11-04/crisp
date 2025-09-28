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

// Helper: Extract all text from PDF or DOCX
async function extractText(file) {
  if (file.mimetype === "application/pdf") {
    try {
      const data = await pdfParse(file.buffer);
      let text = data.text;

      if (!text || text.trim().length < 5) {
        console.log("pdf-parse returned empty text, using buffer fallback...");
        text = file.buffer.toString("utf8").replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
      }

      if (!text || text.trim().length === 0) {
        throw new Error("PDF appears empty or scanned.");
      }

      return text;
    } catch (err) {
      throw new Error("Failed to extract text from PDF: " + err.message);
    }
  } else if (
    file.mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      if (!result.value || result.value.trim().length < 5) {
        throw new Error("DOCX appears empty or contains very little text.");
      }
      return result.value;
    } catch (err) {
      throw new Error("Failed to extract text from DOCX: " + err.message);
    }
  } else {
    throw new Error("Unsupported file type. Only PDF and DOCX are allowed.");
  }
}

// JSON schema for Gemini response
const extractionSchema = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    email: { type: "STRING" },
    phone: { type: "STRING" },
  },
  propertyOrdering: ["name", "email", "phone"],
};

// Endpoint: upload file and extract structured info
app.post("/extract", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "File size exceeds 10MB limit" });
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: "Only PDF and DOCX are supported" });
    }

    // Extract text
    const text = await extractText(file);

    // Gemini setup
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not found in environment");

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const systemInstruction = `
You are an expert resume parser. Your task:
1. Extract ONLY the fields: name, email, phone.
2. Use the text exactly as it appears in the resume.
3. If a field is missing, return "Not Found".
4. Return output in valid JSON only. Do NOT add extra text.
5. Always include all three fields: name, email, phone.
`;

    const payload = {
      contents: [{ parts: [{ text }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: extractionSchema,
        temperature: 0.1,
      },
    };

    const response = await axios.post(apiUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });

    let content =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      response.data?.candidates?.[0]?.content?.parts?.[0] ||
      null;

    let extracted;
    try {
      extracted = JSON.parse(content);
    } catch {
      extracted = { name: "Not Found", email: "Not Found", phone: "Not Found" };
    }

    res.json({ extracted });
  } catch (err) {
    res.status(500).json({ error: err.message, timestamp: new Date().toISOString() });
  }
});

// Chat verification endpoint
app.post("/chat", async (req, res) => {
  try {
    const { messages, extracted } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not found");

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const systemInstruction = `
You are a chatbot that verifies resume details.

Always respond in **valid JSON** with exactly this shape:
{
  "reply": "Natural language reply",
  "state": {
    "name": "...",
    "email": "...",
    "phone": "..."
  }
}

- "reply" = conversational assistant response.
- "state" = the latest known values of name, email, phone.
- Never output extra text outside JSON.
- If user corrects a field, update "state" accordingly.
- If user confirms, keep "state" as is.
- If data is missing, leave as "Not Found".
Current extracted data: ${JSON.stringify(extracted)}
`;

    const convo = messages.map(m => `${m.role}: ${m.content}`).join("\n");

    const payload = {
      contents: [{ parts: [{ text: convo }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const response = await axios.post(apiUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });

    const content =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        reply: "⚠️ Sorry, I couldn’t parse that.",
        state: extracted,
      };
    }

    res.json(parsed);

  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ reply: "⚠️ Error talking to AI", state: req.body.extracted });
  }
});



// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server running", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
