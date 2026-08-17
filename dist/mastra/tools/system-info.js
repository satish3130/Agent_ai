import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import os from 'os';
export const systemInfoTool = createTool({
    id: 'system-info-tool',
    description: 'Retrieves server environment details, current date/time, OS metrics, uptime, and system status.',
    inputSchema: z.object({
        category: z.enum(['all', 'time', 'os', 'memory']).default('all').describe('Filter category for system information'),
    }),
    execute: async ({ category }) => {
        console.log(`[Tool Call: systemInfo] Querying category: "${category}"`);
        const now = new Date();
        const data = {
            timestamp: now.toISOString(),
            localTime: now.toLocaleString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        if (category === 'all' || category === 'os') {
            data.platform = os.platform();
            data.arch = os.arch();
            data.cpus = os.cpus().length;
            data.nodeVersion = process.version;
            data.uptimeSeconds = Math.floor(os.uptime());
        }
        if (category === 'all' || category === 'memory') {
            const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
            const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
            data.totalMemory = `${totalMemMb} MB`;
            data.freeMemory = `${freeMemMb} MB`;
            data.usedMemory = `${totalMemMb - freeMemMb} MB`;
        }
        return {
            success: true,
            data,
        };
    },
});
