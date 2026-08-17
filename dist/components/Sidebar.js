import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Plus, MessageSquare, Trash2, Bot } from 'lucide-react';
function groupByDate(sessions) {
    const now = Date.now();
    const DAY = 86_400_000;
    const groups = {
        Today: [],
        Yesterday: [],
        'Last 7 days': [],
        Older: [],
    };
    for (const s of [...sessions].sort((a, b) => b.createdAt - a.createdAt)) {
        const diff = now - s.createdAt;
        if (diff < DAY)
            groups['Today'].push(s);
        else if (diff < 2 * DAY)
            groups['Yesterday'].push(s);
        else if (diff < 7 * DAY)
            groups['Last 7 days'].push(s);
        else
            groups['Older'].push(s);
    }
    return groups;
}
export const ChatHistorySidebar = ({ sessions, activeSessionId, agentName = 'AI Agent', model = 'nvidia/nemotron-3.5-lightning:free', provider = 'openrouter', onNewChat, onSelectSession, onDeleteSession, }) => {
    const [hoveredId, setHoveredId] = useState(null);
    const grouped = groupByDate(sessions);
    return (_jsxs("aside", { className: "chat-history-sidebar", children: [_jsxs("div", { className: "chs-header", children: [_jsxs("div", { className: "chs-brand", children: [_jsx("div", { className: "chs-brand-icon", children: _jsx(Bot, { size: 18 }) }), _jsxs("div", { className: "chs-brand-text", children: [_jsx("span", { className: "chs-brand-name", children: agentName || 'AI Agent' }), _jsx("span", { className: "chs-brand-model", children: model })] })] }), _jsxs("button", { className: "chs-new-btn", onClick: onNewChat, title: "New Chat", children: [_jsx(Plus, { size: 16 }), _jsx("span", { children: "New Chat" })] })] }), _jsx("div", { className: "chs-list", children: sessions.length === 0 ? (_jsxs("div", { className: "chs-empty", children: [_jsx(MessageSquare, { size: 28 }), _jsx("p", { children: "No conversations yet" }), _jsx("span", { children: "Start a new chat to begin" })] })) : (Object.entries(grouped).map(([group, items]) => items.length === 0 ? null : (_jsxs("div", { className: "chs-group", children: [_jsx("p", { className: "chs-group-label", children: group }), items.map((session) => {
                            const isActive = session.id === activeSessionId;
                            const isHovered = hoveredId === session.id;
                            return (_jsxs("div", { className: `chs-item ${isActive ? 'chs-item--active' : ''}`, onClick: () => onSelectSession(session.id), onMouseEnter: () => setHoveredId(session.id), onMouseLeave: () => setHoveredId(null), children: [_jsx(MessageSquare, { size: 13, className: "chs-item-icon" }), _jsx("span", { className: "chs-item-title", children: session.title }), (isHovered || isActive) && (_jsx("button", { className: "chs-delete-btn", onClick: (e) => {
                                            e.stopPropagation();
                                            onDeleteSession(session.id);
                                        }, title: "Delete", children: _jsx(Trash2, { size: 12 }) }))] }, session.id));
                        })] }, group)))) }), _jsxs("div", { className: "chs-footer", children: [_jsxs("div", { className: "chs-footer-model", children: [_jsx("span", { className: "chs-footer-provider", children: provider.toUpperCase() }), _jsx("code", { className: "chs-footer-model-id", children: model })] }), _jsxs("div", { className: "chs-footer-stats", children: [sessions.length, " conversation", sessions.length !== 1 ? 's' : ''] })] })] }));
};
