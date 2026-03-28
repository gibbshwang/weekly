"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/history", label: "히스토리" },
  { href: "/guide", label: "가이드" },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur"
      style={{ background: 'color-mix(in srgb, var(--bg) 95%, transparent)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-display font-black tracking-tight" style={{ color: 'var(--text-1)' }}>Korea F&G</span>
          <span className="hidden sm:block text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Korea Fear & Greed Index</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors"
              style={{
                background: pathname === link.href ? 'var(--surface)' : 'transparent',
                color: pathname === link.href ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 transition-colors"
            style={{ color: 'var(--text-3)' }}
            aria-label="메뉴"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden px-4 py-3 flex flex-col gap-1"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors"
              style={{
                background: pathname === link.href ? 'var(--surface)' : 'transparent',
                color: pathname === link.href ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
