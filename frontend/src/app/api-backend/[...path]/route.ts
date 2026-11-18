import { NextRequest, NextResponse } from 'next/server';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function isLoopbackUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return LOOPBACK_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function resolveBackendUrl(): string | null {
  const candidates = [process.env.API_URL, process.env.BACKEND_URL].filter(
    (value): value is string => Boolean(value && value.trim()),
  );

  for (const candidate of candidates) {
    const normalized = normalizeBaseUrl(candidate.trim());
    if (process.env.NODE_ENV === 'production' && isLoopbackUrl(normalized)) {
      continue;
    }
    return normalized;
  }

  return null;
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const backendUrl = resolveBackendUrl();
  if (!backendUrl) {
    return NextResponse.json(
      {
        detail: 'Backend URL is not configured',
        required_env: ['API_URL', 'BACKEND_URL'],
      },
      { status: 500 },
    );
  }

  const { path } = await params;
  const targetUrl = `${backendUrl}/${path.join('/')}${req.nextUrl.search}`;

  // Forward headers, bỏ host để tránh conflict
  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    if (!['host', 'content-length'].includes(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  });

  let body: BodyInit | null = null;
  if (!['GET', 'HEAD'].includes(req.method)) {
    body = await req.arrayBuffer();
  }

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      cache: 'no-store',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upstream error';
    return NextResponse.json(
      {
        detail: 'Proxy cannot reach backend service',
        upstream: targetUrl,
        error: message,
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    responseHeaders.set(key, value);
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
