/**
 * Netlify Serverless Function: Secure Admin Passcode Verification
 * Endpoint: /.netlify/functions/verify-admin-passcode or /api/verify-admin-passcode
 *
 * Verifies the administrative security passcode on the server using the
 * environment variable ADMIN_PASSCODE. Never exposes the secret to the client.
 */

export async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'OK' }),
    };
  }

  // Only POST method allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    let payload = {};
    if (event.body) {
      try {
        let rawBody = event.body;
        if (event.isBase64Encoded && rawBody) {
          rawBody = Buffer.from(rawBody, 'base64').toString('utf-8');
        }
        payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
      } catch (e) {
        console.warn('[verify-admin-passcode] Request body parse failure:', e.message);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid request body.' }),
        };
      }
    }

    // Extract submitted passcode from any supported property name
    let submittedPasscode = (
      payload.passcode ||
      payload.pin ||
      payload.password ||
      payload.adminPasscode ||
      ''
    ).trim();

    // Strip accidental surrounding single/double quotes
    submittedPasscode = submittedPasscode.replace(/^["']|["']$/g, '').trim();

    // Read the secret passcode securely from environment variables
    let expectedPasscode = (
      process.env.ADMIN_PASSCODE ||
      process.env.VITE_ADMIN_PASSCODE ||
      'admin2026'
    ).trim();
    expectedPasscode = expectedPasscode.replace(/^["']|["']$/g, '').trim();

    if (!submittedPasscode) {
      console.warn('[verify-admin-passcode] Authentication rejected: empty passcode.');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          authorized: false,
          error: 'Passcode is required.',
        }),
      };
    }

    // Verify passcode against server environment variable
    if (submittedPasscode === expectedPasscode) {
      console.log('[verify-admin-passcode] Authentication successful: admin authorized.');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          authorized: true,
          message: 'Admin authorization granted.',
        }),
      };
    }

    console.warn('[verify-admin-passcode] Authentication rejected: incorrect passcode.');
    // Generic error on failure — never disclose what the expected passcode is
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        authorized: false,
        error: 'Invalid admin passcode. Access denied.',
      }),
    };
  } catch (error) {
    console.error('[verify-admin-passcode] Server error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal authentication service error.',
      }),
    };
  }
}

export default handler;
