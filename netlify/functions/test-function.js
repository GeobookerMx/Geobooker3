// Simple test function to verify Netlify functions work
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    // Test 1: Basic response
    const tests = {
        basic: 'OK',
        timestamp: new Date().toISOString(),
        method: event.httpMethod,
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10) + '...',
        nodeVersion: process.version
    };

    // Test 2: Try to require stripe
    try {
        const Stripe = require('stripe');
        tests.stripeImport = 'OK';
        tests.stripeVersion = Stripe.VERSION || 'unknown';
    } catch (error) {
        tests.stripeImport = 'FAILED';
        tests.stripeError = error.message;
    }

    // Test 3: Try to initialize stripe
    try {
        if (process.env.STRIPE_SECRET_KEY) {
            const Stripe = require('stripe');
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            tests.stripeInit = 'OK';
        } else {
            tests.stripeInit = 'NO_KEY';
        }
    } catch (error) {
        tests.stripeInit = 'FAILED';
        tests.stripeInitError = error.message;
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(tests, null, 2)
    };
};
