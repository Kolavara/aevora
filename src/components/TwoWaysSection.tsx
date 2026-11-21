import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Code2, ShieldCheck } from 'lucide-react';
import { playDetentClick } from '../utils/tactileAudio';

interface TwoWaysSectionProps {
  soundEnabled: boolean;
  onExploreWorkbench: () => void;
  onInspectPrivacy: () => void;
}

export const TwoWaysSection: React.FC<TwoWaysSectionProps> = ({
  soundEnabled,
  onExploreWorkbench,
  onInspectPrivacy,
}) => {
  return (
    <section
      id="audiences"
      aria-labelledby="two-ways-heading"
      className="scroll-mt-20 py-8 sm:py-12"
    >
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0.92, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"
        >
          <div>
            <h2
              id="two-ways-heading"
              className="font-display text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl text-balance"
            >
              Two ways to own AEVORA
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-zinc-600">
            Engineered for builders who tinker and users who just want privacy that works.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Card 1: Creators & Builders (Higher-Contrast Dark Architectural Card) */}
          <motion.div
            initial={{ opacity: 0.92, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-between rounded-3xl bg-[#18181b] p-6 sm:p-8 text-white border border-zinc-900/15"
          >
            <div>
              <div className="flex items-center gap-2.5 text-xs font-mono font-medium tracking-wide text-[#ff7a33]">
                <Code2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>FOR CREATORS &amp; BUILDERS</span>
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold tracking-tight text-white">
                Full local compute &amp; hybrid routing
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-zinc-300">
                Run local LLMs, script custom PC and mobile automations, and route workloads across on-device Orin, offline LAN GPU rigs, or BYOK cloud APIs.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  playDetentClick(soundEnabled, 1120);
                  onExploreWorkbench();
                }}
                className="group inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-[#ff7a33] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5500]"
              >
                <span>Explore the Workbench</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          </motion.div>

          {/* Card 2: Privacy-First Users (Calm Light Card) */}
          <motion.div
            initial={{ opacity: 0.92, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.38, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-between rounded-3xl bg-white p-6 sm:p-8 text-zinc-950 border border-zinc-900/10"
          >
            <div>
              <div className="flex items-center gap-2.5 text-xs font-mono font-medium tracking-wide text-zinc-600">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#ff5500]" aria-hidden="true" />
                <span>FOR PRIVACY-FIRST USERS</span>
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold tracking-tight text-zinc-950">
                Physical switches, zero cloud tracking
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-zinc-600">
                On-device voice processing by default, zero cloud tracking, and physical hardware kill switches. Set up in minutes and stay offline whenever you want.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-zinc-900/8">
              <button
                type="button"
                onClick={() => {
                  playDetentClick(soundEnabled, 1020);
                  onInspectPrivacy();
                }}
                className="group inline-flex items-center gap-2 text-sm font-semibold text-zinc-950 transition-colors hover:text-[#ff5500] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5500]"
              >
                <span>Inspect Hardware Privacy</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
