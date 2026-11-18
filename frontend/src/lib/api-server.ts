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

function resolveBackendBaseUrl(): string | null {
  const candidates = [process.env.API_URL, process.env.NEXT_PUBLIC_API_URL].filter(
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchUIConfigs(): Promise<Record<string, any>> {
  try {
    const base = resolveBackendBaseUrl();
    if (!base) {
      console.error('Missing API_URL/NEXT_PUBLIC_API_URL, or value is loopback in production');
      return {};
    }

    const res = await fetch(`${base}/configs`, {
      // Revalidate every 1 hour (3600 seconds) for ISR
      next: { revalidate: 3600 },
    });
    
    if (!res.ok) return {};
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch UI configs:', error);
    return {};
  }
}

export async function fetchPublicKOLs() {
  try {
    const base = resolveBackendBaseUrl();
    if (!base) {
      console.error('Missing API_URL/NEXT_PUBLIC_API_URL, or value is loopback in production');
      return [];
    }

    const res = await fetch(`${base}/kol/public/profiles`, {
      // Revalidate every hour
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch KOLs:', error);
    return [];
  }
}
