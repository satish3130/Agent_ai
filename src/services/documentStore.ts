import { MDocument } from '@mastra/rag';

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
  mastraDoc?: MDocument;
}

class DocumentStore {
  private documents: Map<string, UploadedDocument> = new Map();

  /**
   * Chunk document text using Mastra RAG MDocument module and strategies
   */
  private async chunkWithMastra(
    text: string,
    docId: string,
    docName: string,
    fileType: string
  ): Promise<{ mastraDoc: MDocument; chunks: DocumentChunk[] }> {
    const cleanText = text.trim();
    const ext = docName.split('.').pop()?.toLowerCase() || '';
    const metadata = { docId, documentName: docName, fileType };

    let mastraDoc: MDocument;
    let mastraChunks: any[] = [];

    if (ext === 'md' || ext === 'markdown') {
      mastraDoc = MDocument.fromMarkdown(cleanText, metadata);
      mastraChunks = await mastraDoc.chunk({ strategy: 'markdown', maxSize: 500, overlap: 50 });
    } else if (ext === 'html' || ext === 'htm') {
      mastraDoc = MDocument.fromHTML(cleanText, metadata);
      mastraChunks = await mastraDoc.chunk({ strategy: 'recursive', maxSize: 500, overlap: 100 });
    } else if (ext === 'json') {
      mastraDoc = MDocument.fromJSON(cleanText, metadata);
      mastraChunks = await mastraDoc.chunk({ strategy: 'json', maxSize: 500, overlap: 50 });
    } else {
      mastraDoc = MDocument.fromText(cleanText, metadata);
      mastraChunks = await mastraDoc.chunk({ strategy: 'recursive', maxSize: 500, overlap: 100 });
    }

    const chunks: DocumentChunk[] = mastraChunks.map((c: any, idx: number) => ({
      id: c.id_ || `${docId}-chunk-${idx}`,
      documentId: docId,
      documentName: docName,
      chunkIndex: idx,
      text: c.text,
      wordCount: c.text.trim().split(/\s+/).length,
    }));

    return { mastraDoc, chunks };
  }

  /**
   * Add a new parsed document to the Mastra RAG store
   */
  public async addDocument(
    id: string,
    name: string,
    size: number,
    type: string,
    rawText: string,
    pageCount?: number
  ): Promise<UploadedDocument> {
    const text = rawText.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    const { mastraDoc, chunks } = await this.chunkWithMastra(text, id, name, type);

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
      mastraDoc,
    };

    this.documents.set(id, doc);
    console.log(`[DocumentStore] Indexed doc "${name}" (${id}) with Mastra RAG MDocument: ${chunks.length} chunks, ${wordCount} words.`);
    return doc;
  }

  /**
   * Get all active uploaded documents
   */
  public getAllDocuments(): Omit<UploadedDocument, 'text' | 'mastraDoc'>[] {
    return Array.from(this.documents.values()).map(({ text, mastraDoc, ...rest }) => rest);
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
          const count = (chunkLower.match(new RegExp(`\\b${token}\\b`, 'g')) || []).length;
          score += 2 + count;
        }
      }

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

