import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { MagneticButton } from './MagneticButton';

interface TopBarProps {
  onNavigate: (sectionId: string) => void;
  reservedCount: number;
}

const NAV_LINKS = [
  { id: 'privacy-twin', label: 'Privacy Twin' },
  { id: 'exploded-core', label: 'Architecture' },
  { id: 'automation', label: 'Automation' },
  { id: 'specs', label: 'Specs' },
  { id: 'craft', label: 'Dimensions' },
];

export const TopBar: React.FC<TopBarProps> = ({ onNavigate, reservedCount }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleJump = (sectionId: string) => {
    setMobileOpen(false);
    onNavigate(sectionId);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-900/8 bg-[#f2f1ec]/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-8 px-5 py-3.5 sm:px-8">
        <a
          href="#top"
          className="font-display text-lg font-semibold tracking-tight text-zinc-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5500]"
        >
          AEVORA
        </a>

        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => {
                e.preventDefault();
                handleJump(link.id);
              }}
              className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5500]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <MagneticButton
            type="button"
            strength={5}
            onClick={() => handleJump('reserve')}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-zinc-800 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5500] cursor-pointer"
          >
            {reservedCount > 0 ? `Reserved (${reservedCount})` : 'Reserve Unit'}
          </MagneticButton>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-900/12 bg-white text-zinc-900 md:hidden cursor-pointer"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Mobile"
          className="border-t border-zinc-900/8 bg-[#f2f1ec] px-5 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => handleJump(link.id)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-800 hover:bg-white cursor-pointer"
              >
                <span>{link.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};
