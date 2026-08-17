import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ChatHistorySidebar } from './components/Sidebar';
import { ChatContainer } from './components/ChatContainer';
import { SuggestionPills } from './components/SuggestionPills';
import { InputForm } from './components/InputForm';
import { DocumentManager } from './components/DocumentManager';
const STORAGE_KEY = 'mastra_chat_sessions';
const WELCOME_TEXT = 'Hello! I am your AI agent powered by Mastra AI with RAG Document Q&A capabilities.\n\nUpload any PDF or document using the paperclip button 📎 to ask questions about it, or click a suggestion below to get started!';
/* ── localStorage helpers ─────────────────────────────── */
function loadSessions() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    }
    catch {
        return [];
    }
}
function saveSessions(sessions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}
function makeWelcomeMsg() {
    return { id: 'welcome-' + Date.now(), role: 'agent', text: WELCOME_TEXT };
}
function makeSession(firstMsg) {
    const welcome = makeWelcomeMsg();
    return {
        id: Date.now().toString(),
        title: 'New Chat',
        createdAt: Date.now(),
        messages: firstMsg ? [welcome, firstMsg] : [welcome],
    };
}
function truncate(text, max = 40) {
    return text.length > max ? text.slice(0, max) + '…' : text;
}
/* ── App ─────────────────────────────────────────────── */
export const App = () => {
    const [info, setInfo] = useState({});
    const [documents, setDocuments] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [sessions, setSessions] = useState(() => {
        const saved = loadSessions();
        if (saved.length === 0) {
            const initial = makeSession();
            return [initial];
        }
        return saved;
    });
    const [activeSessionId, setActiveSessionId] = useState(() => {
        const saved = loadSessions();
        return saved.length > 0 ? saved[saved.length - 1].id : '';
    });
    const [isThinking, setIsThinking] = useState(false);
    // Sync to localStorage on every change
    useEffect(() => {
        saveSessions(sessions);
    }, [sessions]);
    // Fix activeSessionId to point to a real session
    useEffect(() => {
        if (!sessions.find((s) => s.id === activeSessionId) && sessions.length > 0) {
            setActiveSessionId(sessions[sessions.length - 1].id);
        }
    }, [sessions, activeSessionId]);
    // Fetch agent info & active documents
    const fetchDocuments = useCallback(async () => {
        try {
            const r = await fetch('/api/documents');
            const data = await r.json();
            if (data.success && Array.isArray(data.documents)) {
                setDocuments(data.documents);
            }
        }
        catch { }
    }, []);
    useEffect(() => {
        fetch('/api/info')
            .then((r) => r.json())
            .then((data) => setInfo({ provider: data.provider, agentName: 'Agent satish', model: data.model }))
            .catch(() => { });
        fetchDocuments();
    }, [fetchDocuments]);
    const activeSession = sessions.find((s) => s.id === activeSessionId);
    const messages = activeSession?.messages ?? [makeWelcomeMsg()];
    /* ── Mutate sessions helper ── */
    const updateSession = useCallback((id, updater) => {
        setSessions((prev) => prev.map((s) => (s.id === id ? updater(s) : s)));
    }, []);
    /* ── Document Upload Handler ── */
    const handleFileUpload = async (file) => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            setIsUploading(false);
            if (data.success && data.document) {
                await fetchDocuments();
                // System notification message in chat
                const targetId = activeSessionId || sessions[0]?.id;
                const uploadNotice = {
                    id: Date.now().toString(),
                    role: 'agent',
                    text: `📄 **Document Uploaded & Indexed in RAG Store**:\n- **Name**: \`${data.document.name}\`\n- **Word Count**: ${data.document.wordCount.toLocaleString()} words\n- **RAG Chunks**: ${data.document.chunkCount} indexed passages\n\n*You can now ask me any question about this document!*`,
                };
                if (targetId) {
                    updateSession(targetId, (s) => ({ ...s, messages: [...s.messages, uploadNotice] }));
                }
                return true;
            }
            else {
                alert(data.error || 'Failed to parse document.');
                return false;
            }
        }
        catch (err) {
            setIsUploading(false);
            alert('Upload failed — please make sure the server is running.');
            return false;
        }
    };
    /* ── Delete Document Handler ── */
    const handleDeleteDocument = async (id) => {
        try {
            await fetch(`/api/documents/${id}`, { method: 'DELETE' });
            await fetchDocuments();
        }
        catch { }
    };
    /* ── Send message ── */
    const handleSend = async (userText) => {
        const userMsg = {
            id: Date.now().toString(),
            role: 'user',
            text: userText,
        };
        // Ensure we have an active session
        let targetId = activeSessionId;
        if (!activeSession) {
            const newSess = makeSession(userMsg);
            newSess.title = truncate(userText);
            setSessions((prev) => [...prev, newSess]);
            setActiveSessionId(newSess.id);
            targetId = newSess.id;
        }
        else {
            // Push user message
            updateSession(targetId, (s) => {
                const isFirstUserMsg = !s.messages.some((m) => m.role === 'user');
                return {
                    ...s,
                    title: isFirstUserMsg ? truncate(userText) : s.title,
                    messages: [...s.messages, userMsg],
                };
            });
        }
        setIsThinking(true);
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText }),
            });
            const data = await res.json();
            setIsThinking(false);
            const agentMsg = data.success
                ? {
                    id: (Date.now() + 1).toString(),
                    role: 'agent',
                    text: data.text,
                    toolCalls: data.toolCalls,
                    elapsedMs: data.elapsedMs,
                }
                : {
                    id: (Date.now() + 1).toString(),
                    role: 'agent',
                    text: `❌ Error: ${data.error || 'Request failed'}`,
                    hint: data.hint,
                };
            updateSession(targetId, (s) => ({ ...s, messages: [...s.messages, agentMsg] }));
        }
        catch {
            setIsThinking(false);
            const errMsg = {
                id: (Date.now() + 1).toString(),
                role: 'agent',
                text: '❌ Network error — make sure the server is running on port 3000.',
            };
            updateSession(targetId, (s) => ({ ...s, messages: [...s.messages, errMsg] }));
        }
    };
    /* ── New chat ── */
    const handleNewChat = () => {
        const newSess = makeSession();
        setSessions((prev) => [...prev, newSess]);
        setActiveSessionId(newSess.id);
    };
    /* ── Delete session ── */
    const handleDeleteSession = (id) => {
        setSessions((prev) => {
            const next = prev.filter((s) => s.id !== id);
            if (next.length === 0) {
                const fresh = makeSession();
                setActiveSessionId(fresh.id);
                return [fresh];
            }
            if (id === activeSessionId) {
                setActiveSessionId(next[next.length - 1].id);
            }
            return next;
        });
    };
    const activeDocNames = documents.map((d) => d.name);
    return (_jsxs("div", { className: "app-container", children: [_jsx(Header, { provider: info.provider, agentName: info.agentName, model: info.model }), _jsxs("div", { className: "app-body", children: [_jsx(ChatHistorySidebar, { sessions: sessions, activeSessionId: activeSessionId, agentName: info.agentName, model: info.model, provider: info.provider, onNewChat: handleNewChat, onSelectSession: setActiveSessionId, onDeleteSession: handleDeleteSession }), _jsxs("main", { className: "app-main", children: [_jsx("div", { className: "status-banner", children: _jsx("div", { className: "status-info", children: _jsxs("p", { children: [_jsx("strong", { children: "Model Active:" }), ' ', _jsx("code", { children: info.model || 'nvidia/nemotron-3.5-lightning:free' }), " (via OpenRouter)", documents.length > 0 && (_jsxs("span", { className: "rag-status-tag", children: ["\u2022 RAG Active (", documents.length, " doc", documents.length > 1 ? 's' : '', ")"] }))] }) }) }), _jsxs("div", { className: "chat-box", children: [_jsx(DocumentManager, { documents: documents, onDeleteDocument: handleDeleteDocument }), _jsx(ChatContainer, { messages: messages, isThinking: isThinking }), _jsx(SuggestionPills, { onSelect: handleSend, disabled: isThinking }), _jsx(InputForm, { onSend: handleSend, onFileUpload: handleFileUpload, isUploading: isUploading, disabled: isThinking, activeDocNames: activeDocNames })] })] })] })] }));
};
export default App;
