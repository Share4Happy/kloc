import ReactMarkdown from 'react-markdown';
import ChangelogAccordion from '@/components/changelog/ChangelogAccordion';

// Force runtime execution (don't cache at build time since system_docs is a volume)
export const dynamic = 'force-dynamic';

interface ReleaseData {
  version: string;
  date: string;
  title: string;
  content: string;
}

function parseFrontmatter(text: string): { data: Record<string, string>; content: string } {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { data: {}, content: text };

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

  return { data, content: match[2].trim() };
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

async function getReleases(): Promise<ReleaseData[]> {
  const fs = await import('fs');
  const path = await import('path');

  const changelogDir = path.join(process.cwd(), 'system_docs', 'changelog');

  if (!fs.existsSync(changelogDir)) return [];

  const files = fs.readdirSync(changelogDir).filter((f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'RULES.md');

  const releases: ReleaseData[] = [];

  for (const file of files) {
    const filePath = path.join(changelogDir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = parseFrontmatter(raw);

    releases.push({
      version: data.version || file.replace('.md', ''),
      date: data.date || '',
      title: data.title || '',
      content,
    });
  }

  // Sort by version descending (newest first)
  releases.sort((a, b) => compareVersions(a.version, b.version));

  return releases;
}

export default async function ChangelogPage() {
  const releases = await getReleases();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cập nhật Hệ thống</h1>
        <p className="text-gray-500">Lịch sử phiên bản, tính năng mới và fix bug.</p>
      </div>

      <ChangelogAccordion releases={releases} />
    </div>
  );
}
