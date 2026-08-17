import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, Bot, ChevronRight } from 'lucide-react';
import { MessageItem } from './MessageBubble';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: MessageItem[];
}

interface ChatHistorySidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  agentName?: string;
  model?: string;
  provider?: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

function groupByDate(sessions: ChatSession[]) {
  const now = Date.now();
  const DAY = 86_400_000;
  const groups: Record<string, ChatSession[]> = {
    Today: [],
    Yesterday: [],
    'Last 7 days': [],
    Older: [],
  };
  for (const s of [...sessions].sort((a, b) => b.createdAt - a.createdAt)) {
    const diff = now - s.createdAt;
    if (diff < DAY) groups['Today'].push(s);
    else if (diff < 2 * DAY) groups['Yesterday'].push(s);
    else if (diff < 7 * DAY) groups['Last 7 days'].push(s);
    else groups['Older'].push(s);
  }
  return groups;
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  sessions,
  activeSessionId,
  agentName = 'AI Agent',
  model = 'nvidia/nemotron-3.5-lightning:free',
  provider = 'openrouter',
  onNewChat,
  onSelectSession,
  onDeleteSession,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const grouped = groupByDate(sessions);

  return (
    <aside className="chat-history-sidebar">
      {/* Branding */}
      <div className="chs-header">
        <div className="chs-brand">
          <div className="chs-brand-icon">
            <Bot size={18} />
          </div>
          <div className="chs-brand-text">
            <span className="chs-brand-name">{agentName || 'AI Agent'}</span>
            <span className="chs-brand-model">{model}</span>
          </div>
        </div>
        <button className="chs-new-btn" onClick={onNewChat} title="New Chat">
          <Plus size={16} />
          <span>New Chat</span>
        </button>
      </div>

      {/* History list */}
      <div className="chs-list">
        {sessions.length === 0 ? (
          <div className="chs-empty">
            <MessageSquare size={28} />
            <p>No conversations yet</p>
            <span>Start a new chat to begin</span>
          </div>
        ) : (
          Object.entries(grouped).map(([group, items]) =>
            items.length === 0 ? null : (
              <div key={group} className="chs-group">
                <p className="chs-group-label">{group}</p>
                {items.map((session) => {
                  const isActive = session.id === activeSessionId;
                  const isHovered = hoveredId === session.id;
                  return (
                    <div
                      key={session.id}
                      className={`chs-item ${isActive ? 'chs-item--active' : ''}`}
                      onClick={() => onSelectSession(session.id)}
                      onMouseEnter={() => setHoveredId(session.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <MessageSquare size={13} className="chs-item-icon" />
                      <span className="chs-item-title">{session.title}</span>
                      {(isHovered || isActive) && (
                        <button
                          className="chs-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )
        )}
      </div>

      {/* Footer */}
      <div className="chs-footer">
        <div className="chs-footer-model">
          <span className="chs-footer-provider">{provider.toUpperCase()}</span>
          <code className="chs-footer-model-id">{model}</code>
        </div>
        <div className="chs-footer-stats">
          {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
        </div>
      </div>
    </aside>
  );
};
