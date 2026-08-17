import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { Send, Paperclip, FileText, Loader2 } from 'lucide-react';
export const InputForm = ({ onSend, onFileUpload, isUploading = false, disabled = false, activeDocNames = [], }) => {
    const [text, setText] = useState('');
    const [uploadError, setUploadError] = useState(null);
    const fileInputRef = useRef(null);
    const handleSubmit = (e) => {
        e.preventDefault();
        if ((!text.trim() && activeDocNames.length === 0) || disabled || isUploading)
            return;
        let sendText = text.trim();
        if (!sendText && activeDocNames.length > 0) {
            sendText = `Summarize the uploaded document ${activeDocNames[0]}`;
        }
        onSend(sendText);
        setText('');
        setUploadError(null);
    };
    const handleFileChange = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0)
            return;
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
    return (_jsxs("div", { className: "input-container-wrapper", children: [activeDocNames.length > 0 && (_jsxs("div", { className: "active-doc-chips", children: [_jsx("span", { className: "chips-label", children: "Attached to RAG Index:" }), activeDocNames.map((name, idx) => (_jsxs("span", { className: "doc-chip", children: [_jsx(FileText, { size: 12 }), _jsx("span", { children: name })] }, idx)))] })), uploadError && _jsx("div", { className: "upload-error-banner", children: uploadError }), _jsxs("form", { className: "input-form", onSubmit: handleSubmit, children: [_jsx("input", { type: "file", ref: fileInputRef, onChange: handleFileChange, accept: ".pdf,.txt,.md,.json,.csv", style: { display: 'none' } }), _jsx("button", { type: "button", className: "attach-btn", onClick: () => fileInputRef.current?.click(), disabled: disabled || isUploading, title: "Upload PDF or document for Q&A (.pdf, .txt, .md, .csv, .json)", children: isUploading ? _jsx(Loader2, { size: 18, className: "spin-icon" }) : _jsx(Paperclip, { size: 18 }) }), _jsx("input", { type: "text", value: text, onChange: (e) => setText(e.target.value), placeholder: activeDocNames.length > 0
                            ? 'Ask any question about your uploaded document...'
                            : 'Ask a question or upload a PDF/document...', disabled: disabled || isUploading, autoComplete: "off" }), _jsxs("button", { type: "submit", className: "send-btn", disabled: disabled || isUploading || (!text.trim() && activeDocNames.length === 0), children: [_jsx(Send, { size: 16 }), _jsx("span", { children: "Send" })] })] })] }));
};
