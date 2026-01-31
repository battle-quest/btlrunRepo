/**
 * Basic Usage Examples
 *
 * Demonstrates how to use the KVS and AI clients.
 * Run with: npx tsx examples/basic-usage.ts
 */

import { KVSClient, AIClient } from '../shared/clients';

// Initialize clients (use your endpoints in production)
const kvs = new KVSClient({
  endpoint: process.env.KVS_ENDPOINT || 'http://localhost:9002',
  timeout: 5000,
});

const ai = new AIClient(
  process.env.ASKAI_ENDPOINT || 'http://localhost:9001',
  10000
);

async function main() {
  console.log('=== KVS Examples ===\n');

  // Store a user
  console.log('1. Storing a user...');
  await kvs.put('user:john', {
    name: 'John Doe',
    email: 'john@example.com',
    score: 100,
    createdAt: new Date().toISOString(),
  });
  console.log('   User stored!\n');

  // Retrieve the user
  console.log('2. Retrieving user...');
  const user = await kvs.get<{
    name: string;
    email: string;
    score: number;
  }>('user:john');
  console.log('   User:', user);
  console.log();

  // Update score with PATCH
  console.log('3. Updating score with PATCH...');
  await kvs.patch('user:john', { score: 150 });
  const updatedUser = await kvs.get<{ score: number }>('user:john');
  console.log('   New score:', updatedUser?.score);
  console.log();

  // Check if key exists
  console.log('4. Checking if keys exist...');
  console.log('   user:john exists:', await kvs.exists('user:john'));
  console.log('   user:jane exists:', await kvs.exists('user:jane'));
  console.log();

  // Get multiple keys
  console.log('5. Getting multiple keys...');
  await kvs.put('user:jane', { name: 'Jane Smith', score: 200 });
  const users = await kvs.getMany<{ name: string; score: number }>([
    'user:john',
    'user:jane',
    'user:missing',
  ]);
  console.log('   Found users:');
  users.forEach((value, key) => {
    console.log(`     ${key}: ${value.name} (${value.score})`);
  });
  console.log();

  // Clean up
  console.log('6. Cleaning up...');
  await kvs.delete('user:john');
  await kvs.delete('user:jane');
  console.log('   Users deleted!\n');

  // =========================================

  console.log('=== AI Examples ===\n');

  // Simple question
  console.log('1. Simple question...');
  try {
    const answer = await ai.ask({
      systemPrompt: 'You are a helpful assistant. Be concise.',
      input: 'What is the capital of France?',
      maxTokens: 50,
    });
    console.log('   Answer:', answer);
    console.log();
  } catch (error) {
    console.log('   (AI not available - using mock server?)');
    console.log();
  }

  // JSON response
  console.log('2. JSON response...');
  try {
    const result = await ai.askJsonWithFallback<{ answer: string }>(
      {
        systemPrompt: 'You are a helpful assistant.',
        input: 'What is 2+2?',
        maxTokens: 50,
      },
      { answer: 'fallback answer' }
    );
    console.log('   JSON result:', result);
    console.log();
  } catch (error) {
    console.log('   (AI not available - using mock server?)');
    console.log();
  }

  // Chat conversation
  console.log('3. Chat conversation...');
  try {
    const response = await ai.chat(
      [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi there! How can I help you today?' },
        { role: 'user', content: 'What can you do?' },
      ],
      { maxTokens: 100 }
    );
    console.log('   Response:', response.slice(0, 200) + '...');
    console.log();
  } catch (error) {
    console.log('   (AI not available - using mock server?)');
    console.log();
  }

  console.log('=== Done! ===');
}

main().catch(console.error);
