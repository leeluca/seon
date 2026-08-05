interface FunctionEnvironment {
  API_ORIGIN?: string;
}

interface FunctionContext {
  request: Request;
  env: FunctionEnvironment;
}

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'CDN-Cache-Control': 'no-store',
  'Cloudflare-CDN-Cache-Control': 'no-store',
} as const;

function errorResponse(status: number, error: string) {
  return Response.json(
    { error },
    {
      status,
      headers: NO_STORE_HEADERS,
    },
  );
}

function parseApiOrigin(value: string | undefined) {
  if (!value) {
    throw new Error('API_ORIGIN is not configured');
  }

  const origin = new URL(value);
  const hasUnexpectedUrlParts =
    origin.username ||
    origin.password ||
    (origin.pathname !== '/' && origin.pathname !== '') ||
    origin.search ||
    origin.hash;

  if (
    (origin.protocol !== 'https:' && origin.protocol !== 'http:') ||
    hasUnexpectedUrlParts
  ) {
    throw new Error('API_ORIGIN must be an HTTP(S) origin without a path');
  }

  return origin;
}

function createUpstreamRequest(
  request: Request,
  publicUrl: URL,
  apiOrigin: URL,
) {
  const upstreamUrl = new URL(
    `${publicUrl.pathname}${publicUrl.search}`,
    apiOrigin,
  );
  const headers = new Headers(request.headers);

  headers.delete('host');
  headers.set('x-forwarded-host', publicUrl.host);
  headers.set('x-forwarded-proto', publicUrl.protocol.slice(0, -1));
  headers.set(
    'x-forwarded-port',
    publicUrl.port || (publicUrl.protocol === 'https:' ? '443' : '80'),
  );
  headers.set(
    'forwarded',
    `host="${publicUrl.host}";proto=${publicUrl.protocol.slice(0, -1)}`,
  );
  headers.set('cache-control', 'no-store');

  const connectingIp = request.headers.get('cf-connecting-ip');
  if (connectingIp) {
    headers.set('x-forwarded-for', connectingIp);
  } else {
    headers.delete('x-forwarded-for');
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
    signal: request.signal,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  return { init, upstreamUrl };
}

function createProxyResponse(
  upstreamResponse: Response,
  apiOrigin: URL,
  publicUrl: URL,
) {
  const headers = new Headers(upstreamResponse.headers);
  const location = headers.get('location');

  if (location) {
    try {
      const redirectUrl = new URL(location, apiOrigin);
      if (redirectUrl.origin === apiOrigin.origin) {
        redirectUrl.protocol = publicUrl.protocol;
        redirectUrl.host = publicUrl.host;
        headers.set('location', redirectUrl.toString());
      }
    } catch {
      // Preserve malformed upstream redirects instead of replacing the response.
    }
  }

  for (const [name, value] of Object.entries(NO_STORE_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}

export async function onRequest({
  request,
  env,
}: FunctionContext): Promise<Response> {
  const publicUrl = new URL(request.url);
  let apiOrigin: URL;

  try {
    apiOrigin = parseApiOrigin(env.API_ORIGIN);
  } catch {
    return errorResponse(500, 'API proxy is not configured');
  }

  if (apiOrigin.origin === publicUrl.origin) {
    return errorResponse(500, 'API proxy origin is invalid');
  }

  const { init, upstreamUrl } = createUpstreamRequest(
    request,
    publicUrl,
    apiOrigin,
  );

  try {
    const upstreamResponse = await fetch(upstreamUrl, init);
    return createProxyResponse(upstreamResponse, apiOrigin, publicUrl);
  } catch {
    return errorResponse(502, 'API server is unavailable');
  }
}
