import React from 'react';
import Link from 'next/link';
import { fetchUIConfigs } from '@/lib/api-server';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default async function PublicLayout({ children }: PublicLayoutProps) {
  const configs = await fetchUIConfigs();

  const navKolsLabel = configs.nav_kols_label || 'Khám phá KOL';
  const navAboutLabel = configs.nav_about_label || 'Về chúng tôi';
  const navContactLabel = configs.nav_contact_label || 'Liên hệ';

  const contactEmail = configs.contact_email || '';
  const contactPhone = configs.contact_phone || '';
  const contactAddress = configs.contact_address || '';
  const footerFacebook = configs.footer_facebook_url || '';
  const footerTiktok = configs.footer_tiktok_url || '';
  const footerCopyright = configs.footer_copyright || '© 2026 KLOC Platform. Bảo lưu mọi quyền.';

  return (
    <div className="relative flex min-h-screen flex-col text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-[#dce8ff]/80 to-transparent" />

      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-white/86 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold tracking-tight text-[var(--primary)]">
              KLOC<span className="text-[var(--foreground)]">Platform</span>
            </Link>
            <span className="hidden rounded-full border border-[var(--line)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)] lg:inline-flex">
              Booking KOL chuyên nghiệp
            </span>
          </div>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-[var(--text-soft)] md:flex">
            <Link href="/about" className="hover:text-[var(--primary)]">{navAboutLabel}</Link>
            <Link href="/kols" className="hover:text-[var(--primary)]">{navKolsLabel}</Link>
            <Link href="/contact" className="hover:text-[var(--primary)]">{navContactLabel}</Link>
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="/login"
              className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-soft)] hover:border-[var(--primary)] hover:text-[var(--primary)] md:px-4 md:text-sm"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_20px_-14px_rgba(33,79,159,0.9)] hover:bg-[var(--primary-strong)] md:px-4 md:text-sm"
            >
              Trở thành KOL
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-14 pt-6 md:px-6 md:pt-8">
        {children}
      </main>

      <footer className="border-t border-[var(--line)] bg-white/80 px-6 py-12 backdrop-blur-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <h3 className="mb-3 text-lg font-bold text-[var(--foreground)]">KLOC Platform</h3>
            <p className="max-w-sm text-sm leading-6 text-[var(--text-soft)]">
              Nền tảng kết nối thương hiệu và KOL/KOC theo tiêu chuẩn chuyên nghiệp, minh bạch và tập trung hiệu quả kinh doanh.
            </p>
            {(contactEmail || contactPhone || contactAddress) && (
              <div className="mt-4 space-y-1 text-sm text-[var(--text-soft)]">
                {contactEmail && (
                  <p>
                    Email:{' '}
                    <a href={`mailto:${contactEmail}`} className="font-medium text-[var(--primary)] hover:text-[var(--primary-strong)]">
                      {contactEmail}
                    </a>
                  </p>
                )}
                {contactPhone && <p>Điện thoại: {contactPhone}</p>}
                {contactAddress && <p>{contactAddress}</p>}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--foreground)]">Liên kết nhanh</h4>
            <ul className="space-y-2 text-sm text-[var(--text-soft)]">
              <li><Link href="/" className="hover:text-[var(--primary)]">Trang chủ</Link></li>
              <li><Link href="/privacy" className="hover:text-[var(--primary)]">Chính sách bảo mật</Link></li>
            </ul>
          </div>

          {(footerFacebook || footerTiktok) && (
            <div>
              <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--foreground)]">Mạng xã hội</h4>
              <ul className="space-y-2 text-sm text-[var(--text-soft)]">
                {footerFacebook && (
                  <li>
                    <a href={footerFacebook} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--primary)]">
                      Facebook
                    </a>
                  </li>
                )}
                {footerTiktok && (
                  <li>
                    <a href={footerTiktok} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--primary)]">
                      TikTok
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="mx-auto mt-8 max-w-7xl border-t border-[var(--line)] pt-5 text-center text-xs text-[var(--text-soft)]">
          {footerCopyright}
        </div>
      </footer>
    </div>
  );
}
