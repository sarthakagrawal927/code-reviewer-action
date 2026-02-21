import { IncomingMessage } from 'http';

export type HttpContext = {
  method: string;
  pathname: string;
  query: URLSearchParams;
  body: unknown;
  headers: IncomingMessage['headers'];
};

export type HttpResponse = {
  status: number;
  body: unknown;
};

export async function toHttpContext(request: IncomingMessage): Promise<HttpContext> {
  const base = 'http://localhost';
  const url = new URL(request.url || '/', base);

  return {
    method: (request.method || 'GET').toUpperCase(),
    pathname: url.pathname,
    query: url.searchParams,
    body: await readJsonBody(request),
    headers: request.headers,
  };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  if ((request.method || 'GET').toUpperCase() === 'GET') {
    return undefined;
  }

  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}
