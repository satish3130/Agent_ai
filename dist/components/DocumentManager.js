import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FileText, Trash2 } from 'lucide-react';
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
export const DocumentManager = ({ documents, onDeleteDocument }) => {
    if (documents.length === 0)
        return null;
    return (_jsxs("div", { className: "document-manager-card", children: [_jsxs("div", { className: "doc-manager-header", children: [_jsxs("div", { className: "doc-manager-title", children: [_jsx(FileText, { size: 16, className: "doc-icon" }), _jsxs("span", { children: ["Active RAG Knowledge Base (", documents.length, ")"] })] }), _jsx("span", { className: "doc-badge", children: "Indexed" })] }), _jsx("div", { className: "doc-list", children: documents.map((doc) => (_jsxs("div", { className: "doc-item", children: [_jsx("div", { className: "doc-item-icon", children: _jsx(FileText, { size: 18 }) }), _jsxs("div", { className: "doc-item-details", children: [_jsx("div", { className: "doc-item-name", title: doc.name, children: doc.name }), _jsxs("div", { className: "doc-item-meta", children: [_jsx("span", { children: formatBytes(doc.size) }), doc.pageCount && _jsxs("span", { children: ["\u2022 ", doc.pageCount, " pages"] }), _jsxs("span", { children: ["\u2022 ", doc.wordCount.toLocaleString(), " words"] }), _jsxs("span", { children: ["\u2022 ", doc.chunkCount, " RAG chunks"] })] })] }), _jsx("button", { className: "doc-delete-btn", onClick: () => onDeleteDocument(doc.id), title: "Remove document from RAG index", children: _jsx(Trash2, { size: 14 }) })] }, doc.id))) })] }));
};
