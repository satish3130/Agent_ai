import { zaiAgent } from './mastra/index.js';
import readline from 'readline';
import dotenv from 'dotenv';
dotenv.config();
async function startCLI() {
    console.log('\n=================================================');
    console.log('🤖  Mastra AI Agent with zai/glm-4.7-flash');
    console.log('=================================================');
    console.log(`Provider: ${process.env.MODEL_PROVIDER || 'zhipu'}`);
    console.log('Available Tools: calculator-tool, system-info-tool');
    console.log('Type your prompt below. Type "exit" or "quit" to stop.\n');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const promptUser = () => {
        rl.question('\n💬 You: ', async (userInput) => {
            const query = userInput.trim();
            if (!query) {
                promptUser();
                return;
            }
            if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit') {
                console.log('👋 Goodbye!');
                rl.close();
                process.exit(0);
            }
            console.log('🤖 Agent thinking...');
            const startTime = Date.now();
            try {
                let response;
                try {
                    response = await zaiAgent.generate(query);
                }
                catch (err) {
                    if (err?.message?.includes('generateLegacy') && typeof zaiAgent.generateLegacy === 'function') {
                        response = await zaiAgent.generateLegacy(query);
                    }
                    else {
                        throw err;
                    }
                }
                const elapsedMs = Date.now() - startTime;
                console.log(`\n🤖 GLM-4.6V-Flash (${elapsedMs}ms):`);
                console.log('-------------------------------------------------');
                console.log(response.text);
                console.log('-------------------------------------------------');
                if (response.toolCalls && response.toolCalls.length > 0) {
                    console.log('\n🛠️ Tool Calls Executed:');
                    response.toolCalls.forEach((tc, index) => {
                        console.log(`   ${index + 1}. Tool: ${tc.toolName}`);
                        console.log(`      Args: ${JSON.stringify(tc.args)}`);
                    });
                }
            }
            catch (error) {
                console.error('\n❌ Agent Execution Error:');
                console.error(error.message || error);
                if (!process.env.ZHIPU_API_KEY && !process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
                    console.log('\n💡 Note: Make sure to add your API key to .env file!');
                }
            }
            promptUser();
        });
    };
    promptUser();
}
startCLI();
