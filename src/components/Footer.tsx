import React from 'react';

interface FooterProps {
  onNavigate: (id: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-zinc-900/8 bg-[#eceae3] py-10">
      <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-6 px-5 sm:flex-row sm:items-center sm:px-8">
        <div>
          <div className="font-display text-base font-semibold tracking-tight text-zinc-950">
            AEVORA
          </div>
          <p className="mt-1 text-xs text-zinc-600">
            Autonomous Privacy-First Edge AI Desk Companion
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-6 text-xs font-medium text-zinc-600">
          <button
            type="button"
            onClick={() => onNavigate('privacy-twin')}
            className="hover:text-zinc-950 cursor-pointer"
          >
            Privacy Twin
          </button>
          <button
            type="button"
            onClick={() => onNavigate('exploded-core')}
            className="hover:text-zinc-950 cursor-pointer"
          >
            Architecture
          </button>
          <button
            type="button"
            onClick={() => onNavigate('automation')}
            className="hover:text-zinc-950 cursor-pointer"
          >
            Automation
          </button>
          <button
            type="button"
            onClick={() => onNavigate('specs')}
            className="hover:text-zinc-950 cursor-pointer"
          >
            Specs
          </button>
          <button
            type="button"
            onClick={() => onNavigate('reserve')}
            className="hover:text-zinc-950 cursor-pointer"
          >
            Reserve
          </button>
        </nav>

        <div className="text-xs text-zinc-500">
          © 2026 AEVORA. Local-first architecture.
        </div>
      </div>
    </footer>
  );
};
