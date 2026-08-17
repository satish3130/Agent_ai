import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ChatHistorySidebar, ChatSession } from './components/Sidebar';
import { ChatContainer } from './components/ChatContainer';
import { SuggestionPills } from './components/SuggestionPills';
import { InputForm } from './components/InputForm';
import { DocumentManager, DocumentMeta } from './components/DocumentManager';
import { MessageItem } from './components/MessageBubble';

const STORAGE_KEY = 'mastra_chat_sessions';
const WELCOME_TEXT =
  'Hello! I am your AI agent powered by Mastra AI with RAG Document Q&A capabilities.\n\nUpload any PDF or document using the paperclip button 📎 to ask questions about it, or click a suggestion below to get started!';

/* ── localStorage helpers ─────────────────────────────── */
function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function makeWelcomeMsg(): MessageItem {
  return { id: 'welcome-' + Date.now(), role: 'agent', text: WELCOME_TEXT };
}

function makeSession(firstMsg?: MessageItem): ChatSession {
  const welcome = makeWelcomeMsg();
  return {
    id: Date.now().toString(),
    title: 'New Chat',
    createdAt: Date.now(),
    messages: firstMsg ? [welcome, firstMsg] : [welcome],
  };
}

function truncate(text: string, max = 40) {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/* ── App ─────────────────────────────────────────────── */
export const App: React.FC = () => {
  const [info, setInfo] = useState<{ provider?: string; agentName?: string; model?: string }>({});
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = loadSessions();
    if (saved.length === 0) {
      const initial = makeSession();
      return [initial];
    }
    return saved;
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
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
    } catch {}
  }, []);

  useEffect(() => {
    fetch('/api/info')
      .then((r) => r.json())
      .then((data) =>
        setInfo({ provider: data.provider, agentName: 'Agent satish', model: data.model })
      )
      .catch(() => {});

    fetchDocuments();
  }, [fetchDocuments]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages: MessageItem[] = activeSession?.messages ?? [makeWelcomeMsg()];

  /* ── Mutate sessions helper ── */
  const updateSession = useCallback(
    (id: string, updater: (s: ChatSession) => ChatSession) => {
      setSessions((prev) => prev.map((s) => (s.id === id ? updater(s) : s)));
    },
    []
  );

  /* ── Document Upload Handler ── */
  const handleFileUpload = async (file: File): Promise<boolean> => {
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
        const uploadNotice: MessageItem = {
          id: Date.now().toString(),
          role: 'agent',
          text: `📄 **Document Uploaded & Indexed in RAG Store**:\n- **Name**: \`${data.document.name}\`\n- **Word Count**: ${data.document.wordCount.toLocaleString()} words\n- **RAG Chunks**: ${data.document.chunkCount} indexed passages\n\n*You can now ask me any question about this document!*`,
        };

        if (targetId) {
          updateSession(targetId, (s) => ({ ...s, messages: [...s.messages, uploadNotice] }));
        }
        return true;
      } else {
        alert(data.error || 'Failed to parse document.');
        return false;
      }
    } catch (err: any) {
      setIsUploading(false);
      alert('Upload failed — please make sure the server is running.');
      return false;
    }
  };

  /* ── Delete Document Handler ── */
  const handleDeleteDocument = async (id: string) => {
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      await fetchDocuments();
    } catch {}
  };

  /* ── Send message ── */
  const handleSend = async (userText: string) => {
    const userMsg: MessageItem = {
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
    } else {
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

      const agentMsg: MessageItem = data.success
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
    } catch {
      setIsThinking(false);
      const errMsg: MessageItem = {
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
  const handleDeleteSession = (id: string) => {
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

  return (
    <div className="app-container">
      <Header provider={info.provider} agentName={info.agentName} model={info.model} />

      <div className="app-body">
        <ChatHistorySidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          agentName={info.agentName}
          model={info.model}
          provider={info.provider}
          onNewChat={handleNewChat}
          onSelectSession={setActiveSessionId}
          onDeleteSession={handleDeleteSession}
        />

        <main className="app-main">
          <div className="status-banner">
            <div className="status-info">
              <p>
                <strong>Model Active:</strong>{' '}
                <code>{info.model || 'nvidia/nemotron-3.5-lightning:free'}</code> (via OpenRouter)
                {documents.length > 0 && (
                  <span className="rag-status-tag">
                    • RAG Active ({documents.length} doc{documents.length > 1 ? 's' : ''})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="chat-box">
            <DocumentManager documents={documents} onDeleteDocument={handleDeleteDocument} />
            <ChatContainer messages={messages} isThinking={isThinking} />
            <SuggestionPills onSelect={handleSend} disabled={isThinking} />
            <InputForm
              onSend={handleSend}
              onFileUpload={handleFileUpload}
              isUploading={isUploading}
              disabled={isThinking}
              activeDocNames={activeDocNames}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
