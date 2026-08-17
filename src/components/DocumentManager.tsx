import React from 'react';
import { FileText, Trash2, Layers, CheckCircle2 } from 'lucide-react';

export interface DocumentMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  wordCount: number;
  pageCount?: number;
  chunkCount: number;
}

interface DocumentManagerProps {
  documents: DocumentMeta[];
  onDeleteDocument: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ documents, onDeleteDocument }) => {
  if (documents.length === 0) return null;

  return (
    <div className="document-manager-card">
      <div className="doc-manager-header">
        <div className="doc-manager-title">
          <FileText size={16} className="doc-icon" />
          <span>Active RAG Knowledge Base ({documents.length})</span>
        </div>
        <span className="doc-badge">Indexed</span>
      </div>

      <div className="doc-list">
        {documents.map((doc) => (
          <div key={doc.id} className="doc-item">
            <div className="doc-item-icon">
              <FileText size={18} />
            </div>
            <div className="doc-item-details">
              <div className="doc-item-name" title={doc.name}>
                {doc.name}
              </div>
              <div className="doc-item-meta">
                <span>{formatBytes(doc.size)}</span>
                {doc.pageCount && <span>• {doc.pageCount} pages</span>}
                <span>• {doc.wordCount.toLocaleString()} words</span>
                <span>• {doc.chunkCount} RAG chunks</span>
              </div>
            </div>
            <button
              className="doc-delete-btn"
              onClick={() => onDeleteDocument(doc.id)}
              title="Remove document from RAG index"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
