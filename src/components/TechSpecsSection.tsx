import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  LOCAL_VS_CLOUD_ROWS,
  TECHNICAL_SPECS,
  type SpecGroupId,
} from '../data/hardwareLayers';
import { playDetentClick } from '../utils/tactileAudio';

interface TechSpecsSectionProps {
  soundEnabled: boolean;
}

export const TechSpecsSection: React.FC<TechSpecsSectionProps> = ({
  soundEnabled,
}) => {
  const [activeGroup, setActiveGroup] = useState<SpecGroupId>('compute');

  const currentSpecGroup =
    TECHNICAL_SPECS.find((g) => g.id === activeGroup) ?? TECHNICAL_SPECS[0];

  return (
    <section id="specs" className="scroll-mt-20 py-12 sm:py-16">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8 space-y-12">
        {/* Local Ownership vs. Cloud Hardware Comparison */}
        <motion.div
          initial={{ opacity: 0.92, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.02 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="text-xs font-medium text-zinc-500">
                04. Local-First Proof &amp; Specifications
              </div>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl text-balance">
                Why own the silicon instead of renting a cloud mic
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-zinc-600">
              Every inference pass, wake-word buffer, and USB HID keystroke stays inside your anodized enclosure—verifiable with a multimeter.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl bg-white border border-zinc-900/8">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-900/8 text-xs font-medium text-zinc-500">
                  <th className="py-4 pl-6 pr-4 font-medium w-[24%]">Criterion</th>
                  <th className="py-4 px-4 font-semibold text-zinc-950 w-[40%]">
                    AEVORA (On-Device Silicon)
                  </th>
                  <th className="py-4 pl-4 pr-6 font-medium text-zinc-500 w-[36%]">
                    Typical Cloud AI Companion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/8 text-sm">
                {LOCAL_VS_CLOUD_ROWS.map((row) => (
                  <tr
                    key={row.criterion}
                    className="transition-colors hover:bg-[#faf9f6]"
                  >
                    <td className="py-4 pl-6 pr-4 font-medium text-zinc-900">
                      {row.criterion}
                    </td>
                    <td className="py-4 px-4 font-medium text-zinc-950">
                      <span className="text-[#ff5500] mr-2 font-mono" aria-hidden="true">
                        +
                      </span>
                      {row.aevora}
                    </td>
                    <td className="py-4 pl-4 pr-6 text-zinc-500">
                      {row.cloudDevice}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Full Engineering Spec Sheet & In-The-Box Tabs */}
        <motion.div
          initial={{ opacity: 0.92, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.02 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl bg-white p-5 sm:p-8 border border-zinc-900/8"
        >
          <div className="flex flex-col justify-between gap-4 border-b border-zinc-900/8 pb-5 lg:flex-row lg:items-center">
            <div>
              <h3 className="font-display text-xl font-semibold tracking-tight text-zinc-950">
                Complete Technical Specifications
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                Verified Rev-B mechanical, thermal, acoustic, and compute specifications.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Specification categories"
              className="flex flex-wrap items-center gap-1 rounded-xl bg-[#f2f1ec] p-1 border border-zinc-900/8"
            >
              {TECHNICAL_SPECS.map((group) => {
                const active = group.id === activeGroup;
                return (
                  <button
                    key={group.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      playDetentClick(soundEnabled, 1040);
                      setActiveGroup(group.id);
                    }}
                    className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'text-white'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="tech-spec-tab"
                        transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                        className="absolute inset-0 rounded-lg bg-zinc-900"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">{group.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <dl className="mt-2 divide-y divide-zinc-900/8">
            {currentSpecGroup.rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-1 gap-1.5 py-4 sm:grid-cols-12 sm:items-baseline sm:gap-4"
              >
                <dt className="text-xs font-medium text-zinc-500 sm:col-span-3">
                  {row.label}
                </dt>
                <dd className="font-mono text-sm font-semibold text-zinc-950 tabular-nums sm:col-span-4">
                  {row.value}
                </dd>
                <dd className="text-xs leading-relaxed text-zinc-600 sm:col-span-5">
                  {row.note}
                </dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>
    </section>
  );
};
