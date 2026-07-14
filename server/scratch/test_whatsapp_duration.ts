import { parseWhatsAppCallDuration } from '../src/controllers/whatsAppController';

const testCases = [
  { text: "Voice call (3 mins, 20 secs)", expected: 200 },
  { text: "Video call (00:04:12)", expected: 252 },
  { text: "Voice call (45 secs)", expected: 45 },
  { text: "Video call (1 hr, 2 mins)", expected: 3720 },
  { text: "Incoming voice call", expected: null },
  { text: "Missed voice call", expected: null },
  { text: "Hello, standard text message", expected: null },
  { text: "Voice call (1 hr, 5 mins, 20 secs)", expected: 3920 },
  { text: "Voice call (5m 20s)", expected: 320 }
];

console.log("=== RUNNING WHATSAPP DURATION PARSING TESTS ===");
let passed = 0;
for (const tc of testCases) {
  const result = parseWhatsAppCallDuration(tc.text);
  const status = result === tc.expected ? "✅ PASSED" : `❌ FAILED (Got: ${result})`;
  console.log(`Text: "${tc.text}" -> Resolved: ${result}s (Expected: ${tc.expected}s) | ${status}`);
  if (result === tc.expected) passed++;
}
console.log(`Passed ${passed}/${testCases.length} tests.`);
