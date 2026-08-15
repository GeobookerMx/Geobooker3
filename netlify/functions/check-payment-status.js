const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getCorsHeaders, handlePreflight, rejectUnauthorizedOrigin } = require('./_cors');
const { enforceRateLimit } = require('./_rate-limit');
const { validPaymentIntentId, verifyPaymentStatusToken } = require('./_payment-status-token');

exports.handler = async (event) => {
  const preflight = handlePreflight(event);
  if (preflight) return preflight;

  const headers = getCorsHeaders(event);
  const originError = rejectUnauthorizedOrigin(event);
  if (originError) return originError;

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const rateLimitError = await enforceRateLimit(event, {
    action: 'check_payment_status',
    maxCalls: 12,
    windowSeconds: 60,
    headers
  });
  if (rateLimitError) return rateLimitError;

  try {
    const paymentIntentId = event.queryStringParameters?.payment_intent;
    const statusToken = event.headers?.['x-geobooker-payment-status-token']
      || event.headers?.['X-Geobooker-Payment-Status-Token'];
    if (!validPaymentIntentId(paymentIntentId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'payment_intent is invalid' })
      };
    }
    if (!verifyPaymentStatusToken(paymentIntentId, statusToken)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'payment_status_token_invalid' })
      };
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: paymentIntent.id,
        status: paymentIntent.status
      })
    };
  } catch (error) {
    console.error('Error checking payment status:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to check payment status' })
    };
  }
};
