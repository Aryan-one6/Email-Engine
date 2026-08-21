function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export default async function handler(_request, response) {
  try {
    const endpoint = normalizeString(process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1').replace(/\/+$/, '');
    const projectId = normalizeString(process.env.APPWRITE_PROJECT_ID);
    const apiKey = normalizeString(process.env.APPWRITE_API_KEY);
    const functionId = normalizeString(process.env.APPWRITE_EMAIL_MANUAL_DISPATCH_FUNCTION_ID || 'email-manual-dispatch');

    if (!projectId || !apiKey) {
      response.status(500).json({
        error: 'APPWRITE_PROJECT_ID and server-side APPWRITE_API_KEY are required.',
      });
      return;
    }

    const dispatchResponse = await fetch(`${endpoint}/functions/${encodeURIComponent(functionId)}/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
      body: JSON.stringify({
        body: JSON.stringify({ source: 'vercel-cron' }),
        method: 'POST',
        async: false,
      }),
    });

    const result = await dispatchResponse.json().catch(() => ({}));

    response.status(dispatchResponse.status).json(result);
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected cron dispatch error.',
    });
  }
}
