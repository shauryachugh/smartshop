/**
 * Verification Test: Admin Passcode Security & Serverless Verification
 *
 * Tests:
 * 1. Serverless Netlify function `verify-admin-passcode.mjs`
 * 2. Proper authorization with valid passcode (`admin2026`)
 * 3. Proper rejection & generic error with invalid passcode
 * 4. Session management (setAdminSession, clearAdminSession, logout)
 * 5. Role-based access preservation (Supabase profile admin role)
 * 6. Zero hardcoded passcode references in frontend client code (`src/`)
 */

import { handler } from '../netlify/functions/verify-admin-passcode.mjs';
import { adminService } from '../src/services/adminService.js';
import fs from 'fs';
import path from 'path';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

console.log('=== TEST SUITE 1: NETLIFY SERVERLESS FUNCTION VERIFICATION ===');

async function runServerlessTests() {
  // Ensure ADMIN_PASSCODE is set for testing
  process.env.ADMIN_PASSCODE = 'admin2026';

  // 1. Valid passcode
  const validEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({ passcode: 'admin2026' }),
  };
  const validRes = await handler(validEvent);
  assert(validRes.statusCode === 200, 'Valid passcode returns HTTP 200');
  const validBody = JSON.parse(validRes.body);
  assert(validBody.authorized === true, 'Valid passcode returns authorized: true');
  assert(validBody.success === true, 'Valid passcode returns success: true');

  // 2. Invalid passcode
  const invalidEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({ passcode: 'wrongpassword' }),
  };
  const invalidRes = await handler(invalidEvent);
  assert(invalidRes.statusCode === 401, 'Invalid passcode returns HTTP 401');
  const invalidBody = JSON.parse(invalidRes.body);
  assert(invalidBody.authorized === false, 'Invalid passcode returns authorized: false');
  assert(
    invalidBody.error === 'Invalid admin passcode. Access denied.',
    'Invalid passcode returns generic error message without exposing secret'
  );

  // 3. Empty passcode
  const emptyEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({ passcode: '' }),
  };
  const emptyRes = await handler(emptyEvent);
  assert(emptyRes.statusCode === 401, 'Empty passcode returns HTTP 401');

  // 4. Accidental whitespace & quotes resilience
  const whitespaceEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({ passcode: '  admin2026  ' }),
  };
  const wsRes = await handler(whitespaceEvent);
  assert(wsRes.statusCode === 200, 'Passcode with accidental whitespace is trimmed and verified (HTTP 200)');

  const quotesEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({ passcode: '"admin2026"' }),
  };
  const qRes = await handler(quotesEvent);
  assert(qRes.statusCode === 200, 'Passcode with accidental quotes is normalized and verified (HTTP 200)');

  // 5. Alternate field names (pin, password)
  const pinEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({ pin: 'admin2026' }),
  };
  const pinRes = await handler(pinEvent);
  assert(pinRes.statusCode === 200, 'Accepts { pin: "admin2026" } payload (HTTP 200)');

  const pwdEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({ password: 'admin2026' }),
  };
  const pwdRes = await handler(pwdEvent);
  assert(pwdRes.statusCode === 200, 'Accepts { password: "admin2026" } payload (HTTP 200)');

  // 6. Base64 encoded payload support
  const b64Body = Buffer.from(JSON.stringify({ passcode: 'admin2026' })).toString('base64');
  const b64Event = {
    httpMethod: 'POST',
    isBase64Encoded: true,
    body: b64Body,
  };
  const b64Res = await handler(b64Event);
  assert(b64Res.statusCode === 200, 'Accepts base64 encoded payload from Netlify CDN (HTTP 200)');

  // 7. Custom environment variable override
  process.env.ADMIN_PASSCODE = 'custom_secret_key_2026';
  const customEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({ passcode: 'custom_secret_key_2026' }),
  };
  const customRes = await handler(customEvent);
  assert(customRes.statusCode === 200, 'Custom ADMIN_PASSCODE environment variable verified dynamically');

  // Reset back to admin2026
  process.env.ADMIN_PASSCODE = 'admin2026';
}

console.log('\n=== TEST SUITE 2: ADMIN SESSION & ROLE PRESERVATION ===');

async function runSessionTests() {
  // Mock localStorage for Node environment if not present
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (key) => store.get(key) || null,
      setItem: (key, val) => store.set(key, String(val)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    };
  }

  // 1. Supabase profile admin role check
  const adminUser = { user_metadata: { role: 'admin' } };
  const adminProfile = { role: 'admin' };
  assert(adminService.isAdmin(adminUser, adminProfile) === true, 'Supabase admin profile is authorized');

  // 2. Supabase customer role check (unauthorized)
  localStorage.clear();
  const customerUser = { user_metadata: { role: 'customer' } };
  const customerProfile = { role: 'customer' };
  assert(adminService.isAdmin(customerUser, customerProfile) === false, 'Supabase customer profile is denied access');

  // 3. Passcode session setting and clearing
  adminService.setAdminSession(true);
  assert(adminService.isAdmin() === true, 'setAdminSession(true) authorizes session in localStorage');

  adminService.clearAdminSession();
  assert(adminService.isAdmin() === false, 'clearAdminSession() revokes session in localStorage');

  // 4. Test verifyPasscode method directly
  // A. Valid passcode sets session
  globalThis.fetch = async (url, opts) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({ authorized: true, success: true }),
    };
  };
  const loginRes = await adminService.verifyPasscode('admin2026');
  assert(loginRes.success === true, 'adminService.verifyPasscode("admin2026") succeeds');
  assert(adminService.isAdmin() === true, 'adminService.isAdmin() is true after successful login');

  // B. Logout
  adminService.clearAdminSession();
  assert(adminService.isAdmin() === false, 'adminService.isAdmin() is false after logout');

  // C. Invalid passcode fails and does not set session
  globalThis.fetch = async (url, opts) => {
    return {
      ok: false,
      status: 401,
      json: async () => ({ authorized: false, error: 'Invalid admin passcode. Access denied.' }),
    };
  };
  const invalidLoginRes = await adminService.verifyPasscode('wrongpass');
  assert(invalidLoginRes.success === false, 'adminService.verifyPasscode("wrongpass") fails');
  assert(invalidLoginRes.error === 'Invalid admin passcode. Access denied.', 'Returns generic error on failure');
  assert(adminService.isAdmin() === false, 'adminService.isAdmin() remains false on failed login');
}

console.log('\n=== TEST SUITE 3: FRONTEND HARDCODING & LEAK SCAN ===');

function runLeakScan() {
  function scanDir(dir) {
    let leaks = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        leaks = leaks.concat(scanDir(fullPath));
      } else if (/\.(jsx?|tsx?|html)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('admin2026')) {
          leaks.push({ file: fullPath, match: 'admin2026' });
        }
        if (content.includes('adminn2026')) {
          leaks.push({ file: fullPath, match: 'adminn2026' });
        }
      }
    }
    return leaks;
  }

  const srcLeaks = scanDir(path.resolve('./src'));
  assert(
    srcLeaks.length === 0,
    `No hardcoded 'admin2026' or 'adminn2026' in client source code src/ (found: ${srcLeaks.length})`
  );
}

async function main() {
  await runServerlessTests();
  await runSessionTests();
  runLeakScan();

  console.log('\n======================================================');
  console.log(`TOTAL TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log('======================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
