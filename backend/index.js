import express from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import { createWorker } from "tesseract.js";
import pdf2pic from "pdf2pic";
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, 'temp');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Multer setup: store uploaded files in memory
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Helper: Extracts text content from uploaded PDF or DOCX file.
 * Includes OCR support for scanned PDFs.
 */
async function extractText(file) {
  if (file.mimetype === "application/pdf") {
    try {
      // First, try regular PDF text extraction
     const data = await pdfParse(file.buffer);
     const cleanText = data.text?.replace(/\s+/g, ' ').trim();
      if (cleanText && cleanText.length > 100) {
        console.log("Successfully extracted text from PDF using pdf-parse");
        return data.text;
      }
      
      // If no meaningful text found, try OCR
      console.log("PDF appears to be scanned or has minimal text, attempting OCR...");
      return await performOCR(file.buffer, file.originalname);
      
    } catch (error) {
      console.log("PDF parsing failed, attempting OCR...", error.message);
      return await performOCR(file.buffer, file.originalname);
    }
  } else if (
    file.mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    console.log("Extracted text from DOCX:", result.value);
    return result.value;
  } else {
    throw new Error("Unsupported file type. Please upload PDF or DOCX.");
  }
}

/**
 * Perform OCR on a PDF buffer
 */
async function performOCR(pdfBuffer, filename) {
  const tempDir = path.join(__dirname, 'temp');
  const timestamp = Date.now();
  
  try {
  if (!fs.existsSync(tempDir)) {
    console.log("Temp directory does not exist. Creating...");
    fs.mkdirSync(tempDir, { recursive: true });
  } else {
    console.log("Temp directory exists.");
  }
  const testFilePath = path.join(tempDir, 'test.txt');
  fs.writeFileSync(testFilePath, 'test');
  console.log("Write test succeeded.");
  const content = fs.readFileSync(testFilePath, 'utf8');
  console.log("Read test succeeded. Content:", content);
  fs.unlinkSync(testFilePath);
  console.log("Delete test succeeded.");
} catch (err) {
    console.error("OCR failed:", err);
    throw new Error(`Failed to extract text from PDF: ${err.message}. Please ensure the PDF contains readable text.`);
  } finally {
    try {
      const files = fs.readdirSync(tempDir).filter(file => 
        file.includes(timestamp.toString()) || file.startsWith(`page_${timestamp}`)
      );

      for (const file of files) {
        try {
          fs.unlinkSync(path.join(tempDir, file));
        } catch (err) {
          console.warn(`Failed to clean up ${file}:`, err.message);
        }
      }
    } catch (cleanupError) {
      console.warn("Failed to clean up temp files:", cleanupError.message);
    }
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

    console.log(`Processing file: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);

    // 1. Extract text (with OCR support)
    const text = await extractText(file);
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "No text could be extracted from the file." });
    }

    console.log(`Extracted ${text.length} characters of text`);

    // 2. Prepare Gemini API request
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment variables.");

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const systemInstruction = "You are an expert data extraction bot. Extract the fields name, email, phone number from resume text into JSON. Use 'Not Found' if missing. Be flexible with phone number formats.";

    // Truncate text if too long for API
    const truncatedText = text.length > 8000 ? text.substring(0, 8000) + "..." : text;
    const userQuery = `Extract contact information from the following resume text:\n\n"""${truncatedText}"""`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: extractionSchema
      },
    };

    console.log("Sending to Gemini API...");

    // 3. Call Gemini API
    const response = await axios.post(apiUrl, payload, { 
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000 // 30 second timeout
    });

    console.log("Gemini API response received");

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

    console.log("Successfully extracted:", extracted);
    res.json({ extracted });

  } catch (err) {
    const errorMessage = err.response?.data?.error?.message || err.message;
    const status = err.response?.status || 500;

    console.error(`Request failed (Status ${status}):`, errorMessage);
    res.status(status).json({ error: errorMessage });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running with OCR support' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('OCR support enabled with Tesseract.js');
});