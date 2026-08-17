import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Calculator, Cpu, Info, Zap } from 'lucide-react';
export const SuggestionPills = ({ onSelect, disabled }) => {
    const suggestions = [
        {
            label: 'Calculate 128 × 45',
            icon: _jsx(Calculator, { size: 14 }),
            prompt: 'Calculate 128 * 45',
        },
        {
            label: 'System Metrics',
            icon: _jsx(Cpu, { size: 14 }),
            prompt: 'What is the current server time and system memory?',
        },
        {
            label: 'About this Agent',
            icon: _jsx(Info, { size: 14 }),
            prompt: 'What model are you? What tools do you have?',
        },
        {
            label: 'Quick Math',
            icon: _jsx(Zap, { size: 14 }),
            prompt: 'What is 15% of 2400?',
        },
    ];
    return (_jsx("div", { className: "suggestions", children: suggestions.map((item, index) => (_jsxs("button", { className: "suggestion-btn", disabled: disabled, onClick: () => onSelect(item.prompt), children: [item.icon, _jsx("span", { children: item.label })] }, index))) }));
};
