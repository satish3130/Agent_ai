import React, { useEffect, useRef } from 'react';
import { MessageBubble, MessageItem } from './MessageBubble';
import { Zap } from 'lucide-react';

interface ChatContainerProps {
  messages: MessageItem[];
  isThinking?: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ messages, isThinking }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  return (
    <div className="messages" ref={scrollRef}>
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {isThinking && (
        <div className="message agent">
          <div className="avatar">
            <Zap size={18} />
          </div>
          <div className="bubble">
            <div className="typing-dots">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
