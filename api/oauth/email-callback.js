function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildRequestUrl(request) {
  const host = normalizeString(request.headers.host) || 'localhost';
  const protocol = normalizeString(request.headers['x-forwarded-proto']) || 'https';
  return new URL(request.url || '/', `${protocol}://${host}`);
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const endpoint = normalizeString(process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1').replace(/\/+$/, '');
    const projectId = normalizeString(process.env.APPWRITE_PROJECT_ID);
    const apiKey = normalizeString(process.env.APPWRITE_API_KEY);
    const functionId = normalizeString(process.env.APPWRITE_EMAIL_OAUTH_CALLBACK_FUNCTION_ID || 'email-oauth-callback');
    if (!projectId || !apiKey) {
      response.status(500).json({
        error: 'APPWRITE_PROJECT_ID and server-side APPWRITE_API_KEY are required.',
      });
      return;
    }

    const inboundUrl = buildRequestUrl(request);
    const executionResponse = await fetch(`${endpoint}/functions/${encodeURIComponent(functionId)}/executions`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
      body: JSON.stringify({
        body: '',
        path: `/?${inboundUrl.searchParams.toString()}`,
        method: 'GET',
        async: false,
        headers: { Accept: 'text/html,application/json;q=0.9,*/*;q=0.8' },
      }),
    });

    const execution = await executionResponse.json().catch(() => ({}));
    const responseHeaders = execution?.responseHeaders || {};
    const redirectLocation = normalizeString(responseHeaders.location || responseHeaders.Location);
    if (redirectLocation) {
      response.setHeader('Cache-Control', 'no-store');
      response.redirect(302, redirectLocation);
      return;
    }

    const body = typeof execution?.responseBody === 'string' ? execution.responseBody : '';
    const contentType = normalizeString(responseHeaders['content-type'] || responseHeaders['Content-Type']) || 'text/plain; charset=utf-8';

    response.status(executionResponse.ok ? Number(execution?.responseStatusCode || 200) : executionResponse.status);
    response.setHeader('Content-Type', contentType);
    response.send(body || (executionResponse.ok ? 'OAuth callback completed.' : 'OAuth callback failed.'));
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected OAuth callback proxy error.',
    });
  }
}
