import fs from 'fs';
import path from 'path';

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  text: string;
  wordCount: number;
}

export interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  text: string;
  wordCount: number;
  pageCount?: number;
  chunks: DocumentChunk[];
}

class DocumentStore {
  private documents: Map<string, UploadedDocument> = new Map();

  /**
   * Split text into RAG text chunks (~500 chars with ~100 char overlap)
   */
  private chunkText(text: string, docId: string, docName: string, chunkSize = 500, overlap = 100): DocumentChunk[] {
    const cleanText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    const paragraphs = cleanText.split(/\n\n+/);
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let chunkIdx = 0;

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      if ((currentChunk + '\n\n' + trimmed).length > chunkSize && currentChunk.length > 0) {
        chunks.push({
          id: `${docId}-chunk-${chunkIdx}`,
          documentId: docId,
          documentName: docName,
          chunkIndex: chunkIdx,
          text: currentChunk.trim(),
          wordCount: currentChunk.trim().split(/\s+/).length,
        });
        chunkIdx++;
        // Keep overlap from end of current chunk
        currentChunk = currentChunk.slice(-overlap) + '\n\n' + trimmed;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + trimmed : trimmed;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `${docId}-chunk-${chunkIdx}`,
        documentId: docId,
        documentName: docName,
        chunkIndex: chunkIdx,
        text: currentChunk.trim(),
        wordCount: currentChunk.trim().split(/\s+/).length,
      });
    }

    return chunks;
  }

  /**
   * Add a new parsed document to the RAG store
   */
  public addDocument(
    id: string,
    name: string,
    size: number,
    type: string,
    rawText: string,
    pageCount?: number
  ): UploadedDocument {
    const text = rawText.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    const chunks = this.chunkText(text, id, name);

    const doc: UploadedDocument = {
      id,
      name,
      size,
      type,
      uploadedAt: new Date().toISOString(),
      text,
      wordCount,
      pageCount,
      chunks,
    };

    this.documents.set(id, doc);
    console.log(`[DocumentStore] Indexed doc "${name}" (${id}): ${chunks.length} chunks, ${wordCount} words.`);
    return doc;
  }

  /**
   * Get all active uploaded documents
   */
  public getAllDocuments(): Omit<UploadedDocument, 'text'>[] {
    return Array.from(this.documents.values()).map(({ text, ...rest }) => rest);
  }

  /**
   * Get document by ID
   */
  public getDocument(id: string): UploadedDocument | undefined {
    return this.documents.get(id);
  }

  /**
   * Remove document by ID
   */
  public removeDocument(id: string): boolean {
    const existed = this.documents.has(id);
    this.documents.delete(id);
    return existed;
  }

  /**
   * Clear all documents
   */
  public clearAll(): void {
    this.documents.clear();
  }

  /**
   * Search RAG document store for top matching passages matching user query
   */
  public search(query: string, topK = 4, targetDocId?: string): { chunk: DocumentChunk; score: number }[] {
    if (!query || this.documents.size === 0) return [];

    const queryTokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (queryTokens.length === 0) return [];

    const allChunks: DocumentChunk[] = [];
    for (const doc of this.documents.values()) {
      if (targetDocId && doc.id !== targetDocId) continue;
      allChunks.push(...doc.chunks);
    }

    const scored = allChunks.map((chunk) => {
      const chunkLower = chunk.text.toLowerCase();
      let score = 0;

      for (const token of queryTokens) {
        if (chunkLower.includes(token)) {
          // Boost exact match
          const count = (chunkLower.match(new RegExp(`\\b${token}\\b`, 'g')) || []).length;
          score += 2 + count;
        }
      }

      // Bonus score if full query phrase appears
      if (chunkLower.includes(query.toLowerCase())) {
        score += 10;
      }

      return { chunk, score };
    });

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Get full combined text context of active documents (for quick full context)
   */
  public getFullContext(maxChars = 4000): string {
    let combined = '';
    for (const doc of this.documents.values()) {
      const header = `--- DOCUMENT: ${doc.name} (${doc.wordCount} words) ---\n`;
      if ((combined + header + doc.text).length > maxChars) {
        combined += header + doc.text.slice(0, maxChars - combined.length - header.length) + '\n[Truncated...]';
        break;
      }
      combined += header + doc.text + '\n\n';
    }
    return combined.trim();
  }
}

export const documentStore = new DocumentStore();
