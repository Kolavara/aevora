import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  HARDWARE_LAYERS,
  type HardwareLayer,
  type SubsystemCategory,
} from '../data/hardwareLayers';
import {
  estimateTelemetry,
  type ChassisFinish,
  type HardwareState,
} from '../utils/aevoraEngine';
import { playDetentClick } from '../utils/tactileAudio';
import {
  AevoraExplodedStage,
  type StageOverlayMode,
} from './three/AevoraExplodedStage';

interface ExplodedExplorerProps {
  soundEnabled: boolean;
  selectedFinish: ChassisFinish;
  hardwareState: HardwareState;
}

const CATEGORIES: Array<{ id: SubsystemCategory; label: string }> = [
  { id: 'all', label: 'All Layers' },
  { id: 'compute', label: 'Compute' },
  { id: 'acoustic', label: 'Acoustic' },
  { id: 'privacy', label: 'Privacy & HID' },
  { id: 'power', label: 'Power' },
];

const OVERLAY_NOTES: Record<StageOverlayMode, string> = {
  inspect: 'Full 9-layer CAD assembly · Click any physical module in 3D or the index to inspect specs.',
  isolate: 'CAD X-Ray active · Non-selected layers ghosted so internal PCBs and interconnects stay clear.',
  thermal: '4-stage CFD path · Cool intake air rises through base slots, annular moat, Orin fins, and side Noctua exhaust.',
  acoustic: 'Acoustic isolation · 45 mm downward wavefronts decoupled from top ReSpeaker array by red silicone damper.',
};

export const ExplodedExplorer: React.FC<ExplodedExplorerProps> = ({
  soundEnabled,
  selectedFinish,
  hardwareState,
}) => {
  const [category, setCategory] = useState<SubsystemCategory>('all');
  const [selectedId, setSelectedId] = useState<string>('jetson');
  const [overlayMode, setOverlayMode] = useState<StageOverlayMode>('inspect');
  const [explodeAmount, setExplodeAmount] = useState<number>(0.34);

  const sectionRef = useRef<HTMLElement>(null);
  const userAdjustedExplodeRef = useRef(false);
  const autoExpandedRef = useRef(false);

  const telemetry = useMemo(
    () => estimateTelemetry(hardwareState),
    [hardwareState]
  );

  // Subtle one-way scroll entrance reveal: unpacks from 34% to 78% when entering viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry?.isIntersecting &&
          !autoExpandedRef.current &&
          !userAdjustedExplodeRef.current
        ) {
          autoExpandedRef.current = true;
          setExplodeAmount(0.78);
        }
      },
      { threshold: 0.22 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const matchingLayers = useMemo(() => {
    if (category === 'all') return HARDWARE_LAYERS;
    return HARDWARE_LAYERS.filter((layer) => layer.category === category);
  }, [category]);

  const activeLayer: HardwareLayer = useMemo(() => {
    return (
      HARDWARE_LAYERS.find((l) => l.id === selectedId) ??
      HARDWARE_LAYERS[0]
    );
  }, [selectedId]);

  const activeMatchingIdx = matchingLayers.findIndex((l) => l.id === activeLayer.id);

  const handleCategoryChange = (nextCategory: SubsystemCategory) => {
    playDetentClick(soundEnabled, 1000);
    setCategory(nextCategory);
    const matching =
      nextCategory === 'all'
        ? HARDWARE_LAYERS
        : HARDWARE_LAYERS.filter((l) => l.category === nextCategory);
    if (matching.length > 0 && !matching.some((l) => l.id === selectedId)) {
      setSelectedId(matching[0].id);
    }
  };

  const handleSelectLayer = (layerId: string) => {
    playDetentClick(soundEnabled, 1140);
    const matchingLayer = HARDWARE_LAYERS.find((l) => l.id === layerId);
    if (
      matchingLayer &&
      category !== 'all' &&
      matchingLayer.category !== category
    ) {
      setCategory('all');
    }
    setSelectedId(layerId);
  };

  const handleExplodeChange = (val: number) => {
    userAdjustedExplodeRef.current = true;
    setExplodeAmount(val);
  };

  const stepLayer = (delta: number) => {
    const list = matchingLayers.length > 0 ? matchingLayers : HARDWARE_LAYERS;
    playDetentClick(soundEnabled, delta > 0 ? 1140 : 960);
    const baseIdx = activeMatchingIdx === -1 ? 0 : activeMatchingIdx;
    const nextIndex = (baseIdx + delta + list.length) % list.length;
    setSelectedId(list[nextIndex].id);
  };

  return (
    <section
      ref={sectionRef}
      id="exploded-core"
      className="scroll-mt-16 my-8 sm:my-12 bg-[#111318] py-14 sm:py-20 text-white border-y border-white/8"
    >
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0.92, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.02 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"
        >
          <div className="max-w-xl">
            <div className="text-xs font-medium text-zinc-400">
              02. Exploded Architecture
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl text-balance">
              Nine precision-stacked layers inside 100 millimeters
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Filter hardware subsystems"
            className="flex flex-nowrap overflow-x-auto max-w-full shrink-0 items-center gap-1 rounded-xl bg-white/6 p-1 border border-white/10"
          >
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`relative rounded-lg px-2.5 sm:px-3 py-1.5 text-[11.5px] sm:text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'text-zinc-950'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="subsystem-tab-pill"
                      transition={{
                        type: 'spring',
                        stiffness: 450,
                        damping: 34,
                      }}
                      className="absolute inset-0 rounded-lg bg-white"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0.92, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.02 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-12"
        >
          {/* Left: Procedural Interactive Three.js 9-Layer CAD Viewport */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex-1 flex">
              <AevoraExplodedStage
                selectedLayerId={activeLayer.id}
                onSelectLayer={handleSelectLayer}
                activeCategory={category}
                overlayMode={overlayMode}
                onChangeOverlayMode={setOverlayMode}
                finish={selectedFinish}
                ringAccent={hardwareState.ringAccent}
                lvglMode={hardwareState.lvglMode}
                cordlessMode={hardwareState.cordlessMode}
                fanRpm={telemetry.fanRpm}
                tokensPerSec={telemetry.tokensPerSec}
                micEnabled={hardwareState.micEnabled}
                hidConnected={hardwareState.hidConnected}
                explodeAmount={explodeAmount}
                onChangeExplodeAmount={handleExplodeChange}
                soundEnabled={soundEnabled}
              />
            </div>

            {/* Contextual 1-Line Engineering Overlay Note */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-zinc-400">
              <span>{OVERLAY_NOTES[overlayMode]}</span>
              {category !== 'all' ? (
                <span className="font-mono tabular-nums text-[#ff7a33] whitespace-nowrap">
                  Filtering: {matchingLayers.length} of 9 layers
                </span>
              ) : (
                <span className="hidden sm:inline font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                  Drag to orbit · Click part
                </span>
              )}
            </div>
          </div>

          {/* Right: Subsystem Inspector & Complete 9-Layer Index */}
          <div className="flex flex-col justify-between gap-4 lg:col-span-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeLayer.id}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    stepLayer(1);
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    stepLayer(-1);
                  }
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                dragSnapToOrigin
                onDragEnd={(_, info) => {
                  if (info.offset.x < -50 || info.velocity.x < -350) {
                    stepLayer(1);
                  } else if (info.offset.x > 50 || info.velocity.x > 350) {
                    stepLayer(-1);
                  }
                }}
                whileDrag={{ scale: 0.99 }}
                style={{ touchAction: 'pan-y' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="cursor-grab active:cursor-grabbing rounded-2xl bg-[#181b22] p-5 sm:p-6 border border-white/10 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5500]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                    <span className="font-mono tabular-nums text-[#ff7a33]">
                      Layer {activeLayer.index}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{activeLayer.category}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline font-mono text-[11px] text-zinc-500">
                      Swipe or ← →
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => stepLayer(-1)}
                        aria-label="Previous hardware layer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-white/5 text-zinc-200 hover:bg-white/12 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => stepLayer(1)}
                        aria-label="Next hardware layer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-white/5 text-zinc-200 hover:bg-white/12 cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>

                <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                  {activeLayer.name}
                </h3>
                <div className="mt-1 text-sm font-medium text-zinc-300">
                  {activeLayer.component}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {activeLayer.summary}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
                  {activeLayer.specs.map((spec) => (
                    <div key={spec.label}>
                      <div className="text-xs text-zinc-400">{spec.label}</div>
                      <div className="mt-0.5 font-mono text-xs sm:text-sm font-semibold text-white tabular-nums">
                        {spec.value}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Full 9-Layer Index (Non-matching layers dim gracefully; Layer 09 spans full base width) */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {HARDWARE_LAYERS.map((layer) => {
                const isSelected = layer.id === activeLayer.id;
                const inCategory = category === 'all' || layer.category === category;
                const isBaseFoundation = layer.id === 'battery';
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => handleSelectLayer(layer.id)}
                    aria-pressed={isSelected}
                    className={`flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
                      isBaseFoundation ? 'sm:col-span-2' : ''
                    } ${
                      isSelected
                        ? 'border-[#ff5500] bg-[#ff5500] text-white'
                        : inCategory
                        ? 'border-white/10 bg-[#181b22] text-zinc-100 hover:border-white/25 hover:bg-[#1f232c]'
                        : 'border-white/5 bg-[#14171d] text-zinc-500 opacity-45 hover:opacity-80'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium leading-snug">
                        {layer.name}
                      </div>
                      <div
                        className={`truncate text-[11px] leading-snug ${
                          isSelected
                            ? 'text-orange-100'
                            : inCategory
                            ? 'text-zinc-400'
                            : 'text-zinc-500'
                        }`}
                      >
                        {layer.component}
                      </div>
                    </div>
                    <span
                      className={`font-mono text-xs tabular-nums shrink-0 ${
                        isSelected ? 'text-white font-semibold' : 'text-zinc-400'
                      }`}
                    >
                      {layer.index}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
