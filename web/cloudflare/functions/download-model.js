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

  const urlObj = new URL(request.url);
  const modelParam = urlObj.searchParams.get('model') || 'zipformer_p_arabic_v3.int8.onnx';

  // Direct source URL for the ONNX model (with fallback mirrors)
  const primaryUrl = `https://github.com/Recite-Quran/Natlu/releases/download/models-latest/${modelParam}`;
  const fallbackUrl = `https://github.com/Iam-Muslim/Natlu/releases/download/models-latest/${modelParam}`;
  const cdnMirrorUrl = `https://tathbeet.pythonanywhere.com/api/recitation/model/`;

  const requestHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  // Forward Range header if requested by client (critical for parallel chunk downloading)
  const rangeHeader = request.headers.get('Range');
  if (rangeHeader) {
    requestHeaders['Range'] = rangeHeader;
  }

  // Follow HTTP 301/302 redirects manually up to 3 hops to preserve request headers (Range & User-Agent)
  // across origins (e.g. github.com -> release-assets.githubusercontent.com / Azure Blob)
  async function fetchWithRedirects(initialUrl, method, headers, maxHops = 3) {
    let currentUrl = initialUrl;
    for (let i = 0; i < maxHops; i++) {
      const res = await fetch(currentUrl, {
        method,
        headers,
        redirect: 'manual',
      });
      if ([301, 302, 307, 308].includes(res.status)) {
        const location = res.headers.get('location');
        if (location) {
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }
      }
      return res;
    }
    return await fetch(currentUrl, { method, headers, redirect: 'follow' });
  }

  let fetchResponse;
  try {
    fetchResponse = await fetchWithRedirects(primaryUrl, request.method, requestHeaders);

    if (!fetchResponse.ok && fetchResponse.status !== 304 && fetchResponse.status !== 206) {
      console.warn(`[DownloadModel] Primary mirror failed (${fetchResponse.status}), trying fallback...`);
      fetchResponse = await fetchWithRedirects(fallbackUrl, request.method, requestHeaders);
    }

    if (!fetchResponse.ok && fetchResponse.status !== 304 && fetchResponse.status !== 206) {
      console.warn(`[DownloadModel] Fallback mirror failed (${fetchResponse.status}), trying CDN mirror...`);
      fetchResponse = await fetch(cdnMirrorUrl, {
        method: request.method,
        headers: requestHeaders,
        redirect: 'follow',
      });
    }
  } catch (err) {
    return new Response(`Upstream fetch failed: ${err.message}`, {
      status: 502,
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
  headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

  // Enforce no-caching on Cloudflare edge: prevents edge proxy buffer stalls on 72MB responses
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  const contentLength = fetchResponse.headers.get('content-length');
  if (contentLength) {
    headers.set('Content-Length', contentLength);
  }

  const contentRange = fetchResponse.headers.get('content-range');
  if (contentRange) {
    headers.set('Content-Range', contentRange);
  }

  return new Response(request.method === 'HEAD' ? null : fetchResponse.body, {
    status: fetchResponse.status,
    headers,
  });
}
