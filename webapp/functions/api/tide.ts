import { handleTideProxyRequest } from '../../shared/tideParser';

interface PagesContext {
  request: Request;
}

export async function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  }

  const reqUrl = new URL(context.request.url);
  const targetUrl = reqUrl.searchParams.get('url');
  const result = await handleTideProxyRequest(targetUrl);

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: result.headers,
  });
}
