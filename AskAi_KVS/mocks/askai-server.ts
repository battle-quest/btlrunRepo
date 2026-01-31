/**
 * Mock AskAI Server for Local Development
 *
 * Simulates the AskAI Lambda endpoint with mock responses.
 * Run with: npx tsx mocks/askai-server.ts
 */

import http from 'http';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 9001;

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const request = JSON.parse(body);
      console.log(`\n${new Date().toISOString()} AI Request:`);
      console.log(`  System: ${request.systemPrompt?.slice(0, 60)}...`);
      console.log(`  Input: ${request.input?.slice(0, 60)}...`);
      console.log(`  Model: ${request.model || 'default'}`);

      // Generate mock response based on prompt content
      let output = '';

      // Check if JSON output is expected
      const expectsJson =
        request.systemPrompt?.toLowerCase().includes('json') ||
        request.systemPrompt?.toLowerCase().includes('output only');

      if (expectsJson) {
        // Try to generate mock JSON based on expected structure
        if (request.systemPrompt?.includes('answer')) {
          output = JSON.stringify({ answer: generateMockAnswer(request.input) });
        } else if (request.systemPrompt?.includes('narration')) {
          output = JSON.stringify({ narration: generateMockNarration() });
        } else {
          output = JSON.stringify({ response: 'Mock AI response', success: true });
        }
      } else {
        output = generateMockAnswer(request.input);
      }

      console.log(`  Response: ${output.slice(0, 100)}...`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ output, tokensUsed: 100 }));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  });
});

function generateMockAnswer(input: string): string {
  const answers = [
    'Based on my analysis, the answer is quite straightforward.',
    'This is a mock response for testing purposes.',
    'I understand your question. Here is my response.',
    'Let me help you with that query.',
    'That is an interesting question to consider.',
  ];

  // Add some context from the input
  const sanitizedInput = input?.slice(0, 50) || 'your question';
  const randomAnswer = answers[Math.floor(Math.random() * answers.length)];

  return `${randomAnswer} Regarding "${sanitizedInput}": This is simulated content from the mock server.`;
}

function generateMockNarration(): string {
  const narrations = [
    'The scene unfolds with dramatic tension.',
    'A moment of suspense fills the air.',
    'Events take an unexpected turn.',
    'The situation becomes more complex.',
    'A critical moment approaches.',
  ];

  return narrations[Math.floor(Math.random() * narrations.length)];
}

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                   Mock AskAI Server                       ║
╠═══════════════════════════════════════════════════════════╣
║  Running at: http://localhost:${PORT.toString().padEnd(5)}                     ║
║                                                           ║
║  Endpoint: POST /                                         ║
║                                                           ║
║  Request Body:                                            ║
║    {                                                      ║
║      "systemPrompt": "...",                               ║
║      "input": "...",                                      ║
║      "maxTokens": 500,                                    ║
║      "temperature": 0.7,                                  ║
║      "model": "gpt-4-turbo"                               ║
║    }                                                      ║
║                                                           ║
║  Response:                                                ║
║    { "output": "...", "tokensUsed": 100 }                 ║
║                                                           ║
║  Note: This is a MOCK server for testing only.            ║
║        No actual AI calls are made.                       ║
╚═══════════════════════════════════════════════════════════╝
`);
});
