import React from 'react';
import { MagneticButton } from './MagneticButton';

interface TopBarProps {
  onNavigate: (sectionId: string) => void;
  reservedCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({ onNavigate, reservedCount }) => {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-900/8 bg-[#f2f1ec]/85 backdrop-blur-xl">
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
          <a
            href="#privacy-twin"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('privacy-twin');
            }}
            className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5500]"
          >
            Privacy Twin
          </a>
          <a
            href="#exploded-core"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('exploded-core');
            }}
            className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5500]"
          >
            Architecture
          </a>
          <a
            href="#automation"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('automation');
            }}
            className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5500]"
          >
            Automation
          </a>
          <a
            href="#craft"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('craft');
            }}
            className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5500]"
          >
            Dimensions
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <MagneticButton
            type="button"
            strength={5}
            onClick={() => onNavigate('reserve')}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-zinc-800 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5500] cursor-pointer"
          >
            {reservedCount > 0 ? `Reserved (${reservedCount})` : 'Reserve Unit'}
          </MagneticButton>
        </div>
      </div>
    </header>
  );
};
