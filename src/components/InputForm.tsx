import React, { useState, useRef } from 'react';
import { Send, Paperclip, FileText, X, Loader2 } from 'lucide-react';

interface InputFormProps {
  onSend: (text: string) => void;
  onFileUpload: (file: File) => Promise<boolean>;
  isUploading?: boolean;
  disabled?: boolean;
  activeDocNames?: string[];
}

export const InputForm: React.FC<InputFormProps> = ({
  onSend,
  onFileUpload,
  isUploading = false,
  disabled = false,
  activeDocNames = [],
}) => {
  const [text, setText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && activeDocNames.length === 0) || disabled || isUploading) return;

    let sendText = text.trim();
    if (!sendText && activeDocNames.length > 0) {
      sendText = `Summarize the uploaded document ${activeDocNames[0]}`;
    }

    onSend(sendText);
    setText('');
    setUploadError(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadError(null);

    const success = await onFileUpload(file);
    if (!success) {
      setUploadError('Failed to parse or upload document.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="input-container-wrapper">
      {activeDocNames.length > 0 && (
        <div className="active-doc-chips">
          <span className="chips-label">Attached to RAG Index:</span>
          {activeDocNames.map((name, idx) => (
            <span key={idx} className="doc-chip">
              <FileText size={12} />
              <span>{name}</span>
            </span>
          ))}
        </div>
      )}

      {uploadError && <div className="upload-error-banner">{uploadError}</div>}

      <form className="input-form" onSubmit={handleSubmit}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt,.md,.json,.csv"
          style={{ display: 'none' }}
        />

        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          title="Upload PDF or document for Q&A (.pdf, .txt, .md, .csv, .json)"
        >
          {isUploading ? <Loader2 size={18} className="spin-icon" /> : <Paperclip size={18} />}
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            activeDocNames.length > 0
              ? 'Ask any question about your uploaded document...'
              : 'Ask a question or upload a PDF/document...'
          }
          disabled={disabled || isUploading}
          autoComplete="off"
        />

        <button type="submit" className="send-btn" disabled={disabled || isUploading || (!text.trim() && activeDocNames.length === 0)}>
          <Send size={16} />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
