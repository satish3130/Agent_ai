import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
export const calculatorTool = createTool({
    id: 'calculator-tool',
    description: 'Performs basic mathematical operations like addition, subtraction, multiplication, division, powers, and square roots.',
    inputSchema: z.object({
        expression: z.string().describe('Math expression to evaluate, e.g. "12 * 8", "Math.sqrt(144)", "250 / 5"'),
    }),
    execute: async ({ expression }) => {
        console.log(`[Tool Call: calculator] Evaluating: "${expression}"`);
        try {
            // Safe evaluation for basic math expressions
            const sanitized = expression.replace(/[^0-9+\-*/().%\s Math.powsqrtabs]/g, '');
            const fn = new Function(`return (${sanitized});`);
            const result = fn();
            return {
                success: true,
                expression,
                result: String(result),
            };
        }
        catch (err) {
            return {
                success: false,
                expression,
                error: err?.message || 'Invalid expression',
            };
        }
    },
});
