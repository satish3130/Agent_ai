import { Mastra } from '@mastra/core/mastra';
import { zaiAgent } from './agents/zai-agent.js';
import { agentWorkflow } from './workflows/sample-workflow.js';

export const mastra = new Mastra({
  agents: {
    zaiAgent,
  },
  workflows: {
    agentWorkflow,
  },
});

export { zaiAgent, agentWorkflow };
