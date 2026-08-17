import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { Zap } from 'lucide-react';
export const ChatContainer = ({ messages, isThinking }) => {
    const scrollRef = useRef(null);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isThinking]);
    return (_jsxs("div", { className: "messages", ref: scrollRef, children: [messages.map((msg) => (_jsx(MessageBubble, { message: msg }, msg.id))), isThinking && (_jsxs("div", { className: "message agent", children: [_jsx("div", { className: "avatar", children: _jsx(Zap, { size: 18 }) }), _jsx("div", { className: "bubble", children: _jsxs("div", { className: "typing-dots", children: [_jsx("div", { className: "typing-dot" }), _jsx("div", { className: "typing-dot" }), _jsx("div", { className: "typing-dot" })] }) })] }))] }));
};
