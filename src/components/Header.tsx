import React from 'react';
import { Zap } from 'lucide-react';

interface HeaderProps {
  provider?: string;
  agentName?: string;
  model?: string;
}

export const Header: React.FC<HeaderProps> = ({
  provider = 'ZHIPU AI',
  agentName = 'Agent satish',
  model = 'nvidia/nemotron-3.5-lightning:free',
}) => {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-icon">
          <Zap size={22} color="#ffffff" />
        </div>
        <div className="brand-title">
          <h1>{agentName}</h1>
          <p>Powered by Mastra AI ({model})</p>
        </div>
      </div>
      <div className="badges">
        <div className="badge">
          <div className="badge-dot"></div>
          <span>Provider: {provider.toUpperCase()}</span>
        </div>
        <div className="badge">Mastra v1.58</div>
      </div>
    </header>
  );
};
