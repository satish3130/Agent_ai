import { Workflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

/**
 * Step 1: Input Validation & Sanitization
 */
export const validateInputStep = createStep({
  id: 'validate-input',
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({ cleanedQuery: z.string(), length: z.number() }),
  execute: async ({ inputData }) => {
    const cleanedQuery = inputData.query.trim();
    return {
      cleanedQuery,
      length: cleanedQuery.length,
    };
  },
});

/**
 * Step 2: Content Classifier
 */
export const categorizeQueryStep = createStep({
  id: 'categorize-query',
  inputSchema: z.object({ cleanedQuery: z.string(), length: z.number() }),
  outputSchema: z.object({ category: z.string(), priority: z.string() }),
  execute: async ({ inputData }) => {
    const q = inputData.cleanedQuery.toLowerCase();
    let category = 'general';
    let priority = 'normal';

    if (q.includes('calc') || q.includes('math') || /\d+/.test(q)) {
      category = 'calculation';
    } else if (q.includes('system') || q.includes('time') || q.includes('memory')) {
      category = 'system-metrics';
      priority = 'high';
    }

    return { category, priority };
  },
});

/**
 * Mastra AI Sample Workflow Assembly
 */
export const agentWorkflow = new Workflow({
  id: 'agent-processing-workflow',
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({ category: z.string(), priority: z.string() }),
})
  .then(validateInputStep)
  .then(categorizeQueryStep)
  .commit();
