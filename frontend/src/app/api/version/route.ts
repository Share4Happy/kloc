import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function parseFrontmatter(text: string): Record<string, string> {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return {};
  const data: Record<string, string> = {};
  match[1].split('\n').forEach((line) => {
    const eqIndex = line.indexOf(':');
    if (eqIndex > 0) {
      const key = line.slice(0, eqIndex).trim();
      let value = line.slice(eqIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  });
  return data;
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA !== numB) return numB - numA;
  }
  return 0;
}

export async function GET() {
  const changelogDir = path.join(process.cwd(), 'system_docs', 'changelog');

  if (!fs.existsSync(changelogDir)) {
    return NextResponse.json({ version: 'unknown' });
  }

  const files = fs.readdirSync(changelogDir).filter((f) => f.endsWith('.md') && f[0] !== '_' && f !== 'RULES.md');
  const versions = files.map((f) => {
    const raw = fs.readFileSync(path.join(changelogDir, f), 'utf-8');
    const data = parseFrontmatter(raw);
    return data.version || f.replace('.md', '');
  });

  versions.sort(compareVersions);
  const latest = versions[versions.length - 1] || 'unknown';

  return NextResponse.json({ version: latest });
}
