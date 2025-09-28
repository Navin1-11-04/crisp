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

// Multer setup: store uploaded files in memory
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Helper: Extracts text content from uploaded PDF or DOCX file.
 * @param {object} file - The file object provided by Multer
 * @returns {Promise<string>} The extracted raw text content.
 */
async function extractText(file) {
  if (file.mimetype === "application/pdf") {
    const data = await pdfParse(file.buffer);
    console.log("Extracted text from PDF:", data.text); // DEBUG
    return data.text;
  } else if (
    file.mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    console.log("Extracted text from DOCX:", result.value); // DEBUG
    return result.value;
  } else {
    throw new Error("Unsupported file type. Please upload PDF or DOCX.");
  }
}

// JSON Schema Definition for structured output
const extractionSchema = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    email: { type: "STRING" },
    phone: { type: "STRING" }
  },
  propertyOrdering: ["name", "email", "phone"]
};

// Endpoint: upload file and extract structured info
app.post("/extract", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // 1. Extract text
    const text = await extractText(file);
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "No text found in the uploaded file. PDF might be scanned." });
    }

    // 2. Prepare Gemini API request
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment variables.");

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const systemInstruction = "You are an expert data extraction bot. Extract the fields name, email, phone number into JSON. Use 'Not Found' if missing.";

    const userQuery = `Extract contact information from the following text:\n\n"""${text}"""`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: extractionSchema
      },
    };

    console.log("Gemini payload:", JSON.stringify(payload, null, 2)); // DEBUG

    // 3. Call Gemini API
    const response = await axios.post(apiUrl, payload, { headers: { 'Content-Type': 'application/json' } });

    console.log("Gemini raw response:", response.data); // DEBUG

    const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("Gemini API did not return valid content.");
    }

    // 4. Parse JSON response
    let extracted;
    try {
      extracted = JSON.parse(content);
    } catch {
      // fallback if JSON parsing fails
      extracted = { raw: content };
    }

    res.json({ extracted });

  } catch (err) {
    const errorMessage = err.response?.data?.error?.message || err.message;
    const status = err.response?.status || 500;

    console.error(`Request failed (Status ${status}):`, errorMessage);
    res.status(status).json({ error: errorMessage });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

/*
OPTIONAL OCR for scanned PDFs:
- Install tesseract.js
- Convert PDF pages to images (pdf-poppler, pdf-lib, or pdf2img)
- Apply OCR on each image
- Replace extractText PDF path with OCR output
*/
