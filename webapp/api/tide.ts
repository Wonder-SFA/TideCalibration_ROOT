import { handleTideProxyRequest } from '../shared/tideParser';

interface VercelReq {
  method?: string;
  query: Record<string, string | string[] | undefined>;
}

interface VercelRes {
  status(code: number): VercelRes;
  setHeader(name: string, value: string): void;
  send(body: unknown): void;
  end(): void;
}

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.status(204).end();
    return;
  }

  const rawUrl = req.query.url;
  const targetUrl = Array.isArray(rawUrl) ? rawUrl[0] ?? null : rawUrl ?? null;
  const result = await handleTideProxyRequest(targetUrl);

  for (const [k, v] of Object.entries(result.headers)) {
    res.setHeader(k, v);
  }
  res.status(result.status).send(result.body);
}
