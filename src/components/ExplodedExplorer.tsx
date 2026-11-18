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

export const ExplodedExplorer: React.FC<ExplodedExplorerProps> = ({
  soundEnabled,
  selectedFinish,
  hardwareState,
}) => {
  const [category, setCategory] = useState<SubsystemCategory>('all');
  const [selectedId, setSelectedId] = useState<string>('jetson');
  const [overlayMode, setOverlayMode] = useState<StageOverlayMode>('pins');
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

  const visibleLayers = useMemo(() => {
    if (category === 'all') return HARDWARE_LAYERS;
    return HARDWARE_LAYERS.filter((layer) => layer.category === category);
  }, [category]);

  const activeLayer: HardwareLayer = useMemo(() => {
    return (
      visibleLayers.find((l) => l.id === selectedId) ??
      visibleLayers[0] ??
      HARDWARE_LAYERS[0]
    );
  }, [visibleLayers, selectedId]);

  const activeIdx = visibleLayers.findIndex((l) => l.id === activeLayer.id);

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

  const handleSelectFrom3D = (layerId: string) => {
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
    if (visibleLayers.length === 0) return;
    playDetentClick(soundEnabled, delta > 0 ? 1140 : 960);
    const nextIndex =
      (activeIdx + delta + visibleLayers.length) % visibleLayers.length;
    setSelectedId(visibleLayers[nextIndex].id);
  };

  return (
    <section
      ref={sectionRef}
      id="exploded-core"
      className="scroll-mt-20 py-10 sm:py-14"
    >
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0.92, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.02 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"
        >
          <div className="max-w-lg">
            <div className="text-xs font-medium text-zinc-500">
              02. Exploded Architecture
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl text-balance">
              Nine precision-stacked layers inside 100 millimeters
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Filter hardware subsystems"
            className="flex flex-wrap lg:flex-nowrap shrink-0 items-center gap-1 rounded-xl bg-white p-1 border border-zinc-900/8"
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
                  className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'text-white'
                      : 'text-zinc-600 hover:text-zinc-950'
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
                      className="absolute inset-0 rounded-lg bg-zinc-900"
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
          className="grid grid-cols-1 gap-6 sm:gap-7 rounded-3xl bg-white p-4 sm:p-7 lg:p-8 border border-zinc-900/8 lg:grid-cols-12"
        >
          {/* Left: Procedural Interactive Three.js 9-Layer CAD Viewport */}
          <div className="lg:col-span-6 flex">
            <AevoraExplodedStage
              selectedLayerId={activeLayer.id}
              onSelectLayer={handleSelectFrom3D}
              overlayMode={overlayMode}
              onChangeOverlayMode={setOverlayMode}
              finish={selectedFinish}
              ringAccent={hardwareState.ringAccent}
              fanRpm={telemetry.fanRpm}
              micEnabled={hardwareState.micEnabled}
              hidConnected={hardwareState.hidConnected}
              explodeAmount={explodeAmount}
              onChangeExplodeAmount={handleExplodeChange}
              soundEnabled={soundEnabled}
            />
          </div>

          {/* Right: Subsystem Inspector & Layer Quick Index */}
          <div className="flex flex-col justify-between gap-4 lg:col-span-6">
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
                className="cursor-grab active:cursor-grabbing rounded-2xl bg-[#faf9f6] p-5 sm:p-6 border border-zinc-900/8 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5500]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                    <span className="font-mono tabular-nums text-[#ff5500]">
                      Layer {activeLayer.index}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{activeLayer.category}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline font-mono text-[11px] text-zinc-400">
                      Swipe or ← →
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => stepLayer(-1)}
                        aria-label="Previous hardware layer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-900/12 bg-white text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => stepLayer(1)}
                        aria-label="Next hardware layer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-900/12 bg-white text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>

                <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-zinc-950">
                  {activeLayer.name}
                </h3>
                <div className="mt-1 text-sm font-medium text-zinc-700">
                  {activeLayer.component}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  {activeLayer.summary}
                </p>

                <div className="mt-6 grid grid-cols-1 gap-3 border-t border-zinc-900/8 pt-5 sm:grid-cols-3">
                  {activeLayer.specs.map((spec) => (
                    <div key={spec.label}>
                      <div className="text-xs text-zinc-500">{spec.label}</div>
                      <div className="mt-0.5 font-mono text-sm font-semibold text-zinc-950 tabular-nums">
                        {spec.value}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Layer Quick Index Grid */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {visibleLayers.map((layer, cardIdx) => {
                const isSelected = layer.id === activeLayer.id;
                return (
                  <motion.button
                    key={layer.id}
                    type="button"
                    initial={{ opacity: 0.85, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.05 }}
                    transition={{
                      duration: 0.28,
                      delay: cardIdx * 0.03,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    onClick={() => {
                      playDetentClick(soundEnabled, 1120);
                      setOverlayMode('pins');
                      setSelectedId(layer.id);
                    }}
                    aria-pressed={isSelected}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-900/8 bg-[#faf9f6] text-zinc-800 hover:bg-[#f0efe9]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {layer.name}
                      </div>
                      <div
                        className={`truncate text-xs ${
                          isSelected ? 'text-zinc-300' : 'text-zinc-500'
                        }`}
                      >
                        {layer.component}
                      </div>
                    </div>
                    <span
                      className={`font-mono text-xs tabular-nums shrink-0 ${
                        isSelected ? 'text-[#ff7a33]' : 'text-zinc-400'
                      }`}
                    >
                      {layer.index}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
