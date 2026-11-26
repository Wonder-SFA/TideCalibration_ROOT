import { handleTideProxyRequest } from '../../shared/tideParser';

interface NetlifyEvent {
  httpMethod: string;
  queryStringParameters?: Record<string, string | undefined>;
}

export async function handler(event: NetlifyEvent) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: '',
    };
  }

  const targetUrl = event.queryStringParameters?.url ?? null;
  const result = await handleTideProxyRequest(targetUrl);

  return {
    statusCode: result.status,
    headers: result.headers,
    body: JSON.stringify(result.body),
  };
}
