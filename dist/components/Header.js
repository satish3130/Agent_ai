import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Zap } from 'lucide-react';
export const Header = ({ provider = 'ZHIPU AI', agentName = 'Agent satish', model = 'nvidia/nemotron-3.5-lightning:free', }) => {
    return (_jsxs("header", { className: "app-header", children: [_jsxs("div", { className: "brand", children: [_jsx("div", { className: "brand-icon", children: _jsx(Zap, { size: 22, color: "#ffffff" }) }), _jsxs("div", { className: "brand-title", children: [_jsx("h1", { children: agentName }), _jsxs("p", { children: ["Powered by Mastra AI (", model, ")"] })] })] }), _jsxs("div", { className: "badges", children: [_jsxs("div", { className: "badge", children: [_jsx("div", { className: "badge-dot" }), _jsxs("span", { children: ["Provider: ", provider.toUpperCase()] })] }), _jsx("div", { className: "badge", children: "Mastra v1.58" })] })] }));
};
