function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveSupabaseCallbackBaseUrl() {
  const explicitBaseUrl = normalizeString(process.env.SUPABASE_EMAIL_OAUTH_CALLBACK_URL);
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  const supabaseUrl = normalizeString(process.env.SUPABASE_URL);
  if (!supabaseUrl) {
    return '';
  }

  return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/email-oauth-callback`;
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
    const supabaseCallbackBaseUrl = resolveSupabaseCallbackBaseUrl();
    if (!supabaseCallbackBaseUrl) {
      response.status(500).json({
        error: 'SUPABASE_URL (or SUPABASE_EMAIL_OAUTH_CALLBACK_URL) is required.',
      });
      return;
    }

    const inboundUrl = buildRequestUrl(request);
    const upstreamUrl = new URL(supabaseCallbackBaseUrl);
    upstreamUrl.search = inboundUrl.search;

    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
      },
    });

    const redirectLocation = normalizeString(upstreamResponse.headers.get('location'));
    if (redirectLocation) {
      response.setHeader('Cache-Control', 'no-store');
      response.redirect(upstreamResponse.status, redirectLocation);
      return;
    }

    const body = await upstreamResponse.text();
    const contentType = normalizeString(upstreamResponse.headers.get('content-type')) || 'text/plain; charset=utf-8';

    response.status(upstreamResponse.status);
    response.setHeader('Content-Type', contentType);
    response.send(body || 'OAuth callback failed.');
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected OAuth callback proxy error.',
    });
  }
}
