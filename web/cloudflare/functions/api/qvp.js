export async function onRequest(context) {
  const { request } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const url = new URL(request.url);
  let file = url.searchParams.get('file');
  if (!file) {
    const lastPart = url.pathname.split('/').pop();
    if (lastPart && lastPart !== 'qvp' && lastPart.includes('.')) {
      file = lastPart;
    }
  }

  // Strictly sanitize filename: prevent path traversal or unexpected characters
  if (!file || !/^[a-zA-Z0-9_\-\.]+\.(qvp|qva|json|wasm|bin)$/.test(file) || file.includes('..')) {
    return new Response('Invalid or missing file parameter', {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain',
      },
    });
  }

  const upstreamUrl = `https://cdn.quran.ws/qvp/v0.4.0/${file}`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: request.method,
      headers: {
        'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0 (compatible; Natlu-Web/1.0)',
      },
    });

    if (!upstreamRes.ok) {
      return new Response(`Upstream asset error: ${upstreamRes.statusText}`, {
        status: upstreamRes.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/plain',
        },
      });
    }

    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new Response(upstreamRes.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    return new Response(`Proxy error: ${err.message}`, {
      status: 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain',
      },
    });
  }
}

