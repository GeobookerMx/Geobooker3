// Minimal liveness diagnostic. Never disclose environment or dependency details.
exports.handler = async (event) => {
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json', 'Allow': 'GET, HEAD' },
            body: JSON.stringify({ error: 'method_not_allowed' })
        };
    }

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        },
        body: event.httpMethod === 'HEAD' ? '' : JSON.stringify({ status: 'ok' })
    };
};
