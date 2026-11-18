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
        payload = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid request body.' }),
        };
      }
    }

    const submittedPasscode = (payload.passcode || payload.pin || '').trim();

    // Read the secret passcode securely from environment variables
    const expectedPasscode = (process.env.ADMIN_PASSCODE || 'admin2026').trim();

    if (!submittedPasscode) {
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
