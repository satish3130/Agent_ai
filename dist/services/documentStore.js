import { MDocument } from '@mastra/rag';
class DocumentStore {
    documents = new Map();
    /**
     * Chunk document text using Mastra RAG MDocument module and strategies
     */
    async chunkWithMastra(text, docId, docName, fileType) {
        const cleanText = text.trim();
        const ext = docName.split('.').pop()?.toLowerCase() || '';
        const metadata = { docId, documentName: docName, fileType };
        let mastraDoc;
        let mastraChunks = [];
        if (ext === 'md' || ext === 'markdown') {
            mastraDoc = MDocument.fromMarkdown(cleanText, metadata);
            mastraChunks = await mastraDoc.chunk({ strategy: 'markdown', maxSize: 500, overlap: 50 });
        }
        else if (ext === 'html' || ext === 'htm') {
            mastraDoc = MDocument.fromHTML(cleanText, metadata);
            mastraChunks = await mastraDoc.chunk({ strategy: 'recursive', maxSize: 500, overlap: 100 });
        }
        else if (ext === 'json') {
            mastraDoc = MDocument.fromJSON(cleanText, metadata);
            mastraChunks = await mastraDoc.chunk({ strategy: 'json', maxSize: 500, overlap: 50 });
        }
        else {
            mastraDoc = MDocument.fromText(cleanText, metadata);
            mastraChunks = await mastraDoc.chunk({ strategy: 'recursive', maxSize: 500, overlap: 100 });
        }
        const chunks = mastraChunks.map((c, idx) => ({
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
    async addDocument(id, name, size, type, rawText, pageCount) {
        const text = rawText.trim();
        const wordCount = text ? text.split(/\s+/).length : 0;
        const { mastraDoc, chunks } = await this.chunkWithMastra(text, id, name, type);
        const doc = {
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
    getAllDocuments() {
        return Array.from(this.documents.values()).map(({ text, mastraDoc, ...rest }) => rest);
    }
    /**
     * Get document by ID
     */
    getDocument(id) {
        return this.documents.get(id);
    }
    /**
     * Remove document by ID
     */
    removeDocument(id) {
        const existed = this.documents.has(id);
        this.documents.delete(id);
        return existed;
    }
    /**
     * Clear all documents
     */
    clearAll() {
        this.documents.clear();
    }
    /**
     * Search RAG document store for top matching passages matching user query
     */
    search(query, topK = 4, targetDocId) {
        if (!query || this.documents.size === 0)
            return [];
        const queryTokens = query
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter((t) => t.length > 2);
        if (queryTokens.length === 0)
            return [];
        const allChunks = [];
        for (const doc of this.documents.values()) {
            if (targetDocId && doc.id !== targetDocId)
                continue;
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
    getFullContext(maxChars = 4000) {
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
