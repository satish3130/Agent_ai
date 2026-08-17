import React from 'react';
import { User, Zap, Wrench, Clock } from 'lucide-react';

export interface ToolCallItem {
  toolName?: string;
  name?: string;
  args?: Record<string, any>;
}

export interface MessageItem {
  id: string;
  role: 'user' | 'agent';
  text: string;
  toolCalls?: ToolCallItem[];
  elapsedMs?: number;
  hint?: string;
}

interface MessageBubbleProps {
  message: MessageItem;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`message ${isUser ? 'user' : 'agent'}`}>
      <div className="avatar">
        {isUser ? <User size={18} /> : <Zap size={18} />}
      </div>
      <div className="bubble">
        <div>{message.text}</div>

        {message.hint && (
          <div style={{ marginTop: '0.5rem', color: '#fcd34d', fontSize: '0.85rem' }}>
            💡 Hint: {message.hint}
          </div>
        )}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="tool-calls-list">
            {message.toolCalls.map((tc, index) => (
              <div key={index} className="tool-badge">
                <Wrench size={13} />
                <span>
                  Tool: <strong>{tc.toolName || tc.name || 'tool'}</strong>
                </span>
                {tc.args && <code>args: {JSON.stringify(tc.args)}</code>}
              </div>
            ))}
          </div>
        )}

        {message.elapsedMs && (
          <div className="latency-tag">
            <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Latency: {message.elapsedMs}ms
          </div>
        )}
      </div>
    </div>
  );
};
