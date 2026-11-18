import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret');
  if (secret !== (process.env.REVALIDATE_SECRET || 'kloc-revalidate-secret')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const defaultPaths = ['/', '/kols', '/about', '/contact', '/privacy'];
  let paths = defaultPaths;

  try {
    const body = (await req.json()) as { paths?: unknown };
    if (Array.isArray(body?.paths)) {
      const parsed = body.paths
        .filter((p): p is string => typeof p === 'string' && p.startsWith('/'));
      if (parsed.length > 0) {
        paths = Array.from(new Set(parsed));
      }
    }
  } catch {
    // no-op: keep default paths when body is empty or invalid JSON
  }

  // Invalidate public layout + each page path explicitly.
  revalidatePath('/', 'layout');
  for (const path of paths) {
    revalidatePath(path);
  }

  return NextResponse.json({ revalidated: true, paths });
}
