import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { documentStore } from '../../services/documentStore.js';

export const documentSearchTool = createTool({
  id: 'document-search-tool',
  description: 'Searches uploaded documents processed via Mastra RAG (MDocument) to retrieve relevant text excerpts, facts, and passages.',
  inputSchema: z.object({
    query: z.string().describe('Search query or question to find relevant document passages'),
    documentId: z.string().optional().describe('Optional ID of a specific document to search inside'),
  }),
  execute: async ({ query, documentId }) => {
    console.log(`[Tool Call: document-search] Querying Mastra RAG store: "${query}"`);
    try {
      const activeDocs = documentStore.getAllDocuments();

      if (activeDocs.length === 0) {
        return {
          success: false,
          query,
          message: 'No documents have been uploaded yet. Please upload a PDF or text document first.',
          results: [],
        };
      }

      const results = documentStore.search(query, 4, documentId);

      if (results.length === 0) {
        // Fallback: Return summary context if specific term match wasn't found
        const fullContext = documentStore.getFullContext(2000);
        return {
          success: true,
          query,
          message: 'No direct matches found, returning available Mastra document context excerpts.',
          documentsCount: activeDocs.length,
          results: [
            {
              documentName: activeDocs[0].name,
              excerpt: fullContext,
              score: 0.5,
            },
          ],
        };
      }

      return {
        success: true,
        query,
        documentsCount: activeDocs.length,
        results: results.map((r) => ({
          documentId: r.chunk.documentId,
          documentName: r.chunk.documentName,
          chunkIndex: r.chunk.chunkIndex,
          excerpt: r.chunk.text,
          score: r.score,
        })),
      };
    } catch (err: any) {
      return {
        success: false,
        query,
        error: err?.message || 'Error searching Mastra RAG document store',
      };
    }
  },
});
