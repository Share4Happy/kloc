'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown } from 'lucide-react';

interface ReleaseData {
  version: string;
  date: string;
  title: string;
  content: string;
}

export default function ChangelogAccordion({ releases }: { releases: ReleaseData[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (releases.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-gray-500">
        Chưa có ghi nhận cập nhật nào.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {releases.map((release) => {
        const isLatest = release.version === releases[0]?.version;
        const isOpen = expanded === release.version;

        return (
          <div
            key={release.version}
            className="rounded-2xl border bg-white shadow-sm overflow-hidden"
          >
            {/* Clickable Header */}
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : release.version)}
              className={`w-full px-6 py-4 text-left transition ${
                isLatest
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                  : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold">Phiên bản {release.version}</h3>
                    {isLatest && (
                      <span className="inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
                        Latest
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${isLatest ? 'text-blue-100' : 'text-gray-500'}`}>
                    {release.title} · {new Date(release.date).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <ChevronDown
                  size={20}
                  className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
                    isLatest ? 'text-white' : 'text-gray-400'
                  }`}
                />
              </div>
            </button>

            {/* Content - Markdown (only when expanded) */}
            {isOpen && (
              <div className="prose prose-sm max-w-none p-6 prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 border-t">
                <ReactMarkdown>{release.content}</ReactMarkdown>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
