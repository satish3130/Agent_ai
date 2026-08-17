import React from 'react';
import { Calculator, Cpu, Info, Zap } from 'lucide-react';

interface SuggestionPillsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export const SuggestionPills: React.FC<SuggestionPillsProps> = ({ onSelect, disabled }) => {
  const suggestions = [
    {
      label: 'Calculate 128 × 45',
      icon: <Calculator size={14} />,
      prompt: 'Calculate 128 * 45',
    },
    {
      label: 'System Metrics',
      icon: <Cpu size={14} />,
      prompt: 'What is the current server time and system memory?',
    },
    {
      label: 'About this Agent',
      icon: <Info size={14} />,
      prompt: 'What model are you? What tools do you have?',
    },
    {
      label: 'Quick Math',
      icon: <Zap size={14} />,
      prompt: 'What is 15% of 2400?',
    },
  ];

  return (
    <div className="suggestions">
      {suggestions.map((item, index) => (
        <button
          key={index}
          className="suggestion-btn"
          disabled={disabled}
          onClick={() => onSelect(item.prompt)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};
