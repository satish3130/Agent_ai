import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import { zaiAgent } from './mastra/index.js';
import { documentStore } from './services/documentStore.js';

dotenv.config();

// Polyfill DOM globals for pdf-parse / pdfjs-dist if running on Node runtime
if (typeof (global as any).DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {};
}
if (typeof (global as any).ImageData === 'undefined') {
  (global as any).ImageData = class ImageData {};
}
if (typeof (global as any).Path2D === 'undefined') {
  (global as any).Path2D = class Path2D {};
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Multer for in-memory file uploads (max 20MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist-client')));

/**
 * GET /api/info
 * Returns metadata about the Mastra Agent & GLM-4.6v-flash configuration
 */
app.get('/api/info', (req, res) => {
  const docs = documentStore.getAllDocuments();
  res.json({
    status: 'online',
    agentName: zaiAgent.name,
    model: 'nvidia/nemotron-3.5-lightning:free',
    provider: process.env.MODEL_PROVIDER || 'zhipu',
    hasKeyConfigured: Boolean(
      process.env.ZHIPU_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
    ),
    activeDocumentsCount: docs.length,
    tools: [
      { id: 'document-search-tool', description: 'Searches uploaded PDF files & documents in RAG store' },
      { id: 'calculator-tool', description: 'Performs arithmetic and mathematical calculations' },
      { id: 'system-info-tool', description: 'Provides OS, memory, server uptime, and timestamp metrics' },
    ],
  });
});

/**
 * GET /api/documents
 * List all active uploaded documents in RAG store
 */
app.get('/api/documents', (req, res) => {
  const docs = documentStore.getAllDocuments();
  res.json({ success: true, documents: docs });
});

/**
 * DELETE /api/documents/:id
 * Remove uploaded document from RAG index
 */
app.delete('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const removed = documentStore.removeDocument(id);
  res.json({ success: removed, id });
});

/**
 * POST /api/upload
 * Accepts PDF, TXT, MD, JSON, CSV file upload, parses text, and indexes into Document Store RAG
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const filename = file.originalname;
    const fileExt = path.extname(filename).toLowerCase();
    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let extractedText = '';
    let pageCount: number | undefined = undefined;

    if (fileExt === '.pdf') {
      try {
        const pdfModule = await import('pdf-parse');
        let res: any;
        if (typeof pdfModule.pdf === 'function') {
          res = await pdfModule.pdf(file.buffer);
        } else if (typeof pdfModule.PDFParse === 'function') {
          const parser = new pdfModule.PDFParse({ data: file.buffer });
          res = await parser.getText();
        } else if (typeof (pdfModule as any).default === 'function') {
          res = await (pdfModule as any).default(file.buffer);
        } else {
          throw new Error('PDF parsing method not found in module');
        }

        extractedText = typeof res === 'string' ? res : res?.text || String(res || '');
        pageCount = res?.numpages || res?.numPages || (Array.isArray(res?.pages) ? res.pages.length : undefined);
      } catch (pdfErr: any) {
        console.error('[PDF Parse Error]', pdfErr);
        return res.status(500).json({
          success: false,
          error: `Failed to extract text from PDF "${filename}": ${pdfErr?.message || 'Invalid PDF format'}`,
        });
      }
    } else {
      // Text-based files (.txt, .md, .json, .csv, etc.)
      extractedText = file.buffer.toString('utf-8');
    }

    if (!extractedText || !extractedText.trim()) {
      return res.status(400).json({
        success: false,
        error: `Could not extract text from document "${filename}". File might be empty or image-only scanned PDF.`,
      });
    }

    const document = documentStore.addDocument(
      docId,
      filename,
      file.size,
      file.mimetype || fileExt,
      extractedText,
      pageCount
    );

    res.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        size: document.size,
        type: document.type,
        uploadedAt: document.uploadedAt,
        wordCount: document.wordCount,
        pageCount: document.pageCount,
        chunkCount: document.chunks.length,
      },
    });
  } catch (error: any) {
    console.error('[API Upload Error]', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'File processing failed.',
    });
  }
});

/**
 * POST /api/chat
 * Generates responses using the Mastra zaiAgent and RAG store
 */
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Field "message" is required and must be a string.' });
  }

  const startTime = Date.now();

  try {
    let finalPrompt = message;

    // Check if active documents exist in documentStore
    const activeDocs = documentStore.getAllDocuments();
    if (activeDocs.length > 0) {
      // Perform RAG retrieval for relevant passages matching the message
      const searchResults = documentStore.search(message, 3);
      if (searchResults.length > 0) {
        const ragContext = searchResults
          .map((r, i) => `Excerpt ${i + 1} [From "${r.chunk.documentName}"]: "${r.chunk.text}"`)
          .join('\n\n');

        finalPrompt = `[Uploaded Document RAG Context Available]:\n${ragContext}\n\nUser Question: ${message}`;
      } else {
        const docNames = activeDocs.map((d) => d.name).join(', ');
        finalPrompt = `[Note: User has uploaded document(s): ${docNames}]. User Question: ${message}`;
      }
    }

    let response: any;
    try {
      response = await zaiAgent.generate(finalPrompt);
    } catch (err: any) {
      if (err?.message?.includes('generateLegacy') && typeof (zaiAgent as any).generateLegacy === 'function') {
        response = await (zaiAgent as any).generateLegacy(finalPrompt);
      } else {
        throw err;
      }
    }
    const elapsedMs = Date.now() - startTime;

    res.json({
      success: true,
      text: response.text,
      toolCalls: response.toolCalls || [],
      toolResults: response.toolResults || [],
      elapsedMs,
      timestamp: new Date().toISOString(),
      provider: process.env.MODEL_PROVIDER || 'zhipu',
      model: 'nvidia/nemotron-3.5-lightning:free',
    });
  } catch (error: any) {
    console.error('[API Chat Error]', error);

    let errorMsg = error?.message || 'Agent execution failed';
    let hint = undefined;

    if (errorMsg.includes('令牌已过期') || errorMsg.includes('401')) {
      errorMsg = 'API Key is invalid or has expired (Zhipu AI Error 401).';
      hint = 'Please check your ZHIPU_API_KEY in .env or generate a new key at https://open.bigmodel.cn/usercenter/apikeys';
    } else if (errorMsg.includes('访问量过大') || errorMsg.includes('429')) {
      errorMsg = 'Model traffic limit reached on Zhipu AI (Error 429: Rate limit / high demand).';
      hint = 'Please wait 10-15 seconds and try again, or switch MODEL_PROVIDER=openrouter in .env';
    } else if (!process.env.ZHIPU_API_KEY && !process.env.OPENROUTER_API_KEY) {
      hint = 'No API Key set in .env file. Please configure ZHIPU_API_KEY or OPENROUTER_API_KEY.';
    }

    res.status(500).json({
      success: false,
      error: errorMsg,
      hint,
    });
  }
});

// React Single Page Application (SPA) catch-all route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist-client/index.html'));
});

function startServer(port: number | string) {
  const server = app.listen(port, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 Mastra AI Server running on http://localhost:${port}`);
    console.log(`🤖 Agent: ${zaiAgent.name} (Model: nvidia/nemotron-3.5-lightning:free via OpenRouter)`);
    console.log(`📄 RAG Document Q&A Enabled! Upload PDFs & files via /api/upload`);
    console.log(`=================================================\n`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = Number(port) + 1;
      console.warn(`⚠️ Port ${port} is in use. Trying fallback port ${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(PORT);
