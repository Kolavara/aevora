import React, { useRef } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { ArrowDownRight, ShieldCheck } from 'lucide-react';
import type { ChassisFinish } from '../utils/aevoraEngine';
import { playDetentClick } from '../utils/tactileAudio';
import { MagneticButton } from './MagneticButton';

interface HeroSectionProps {
  selectedFinish: ChassisFinish;
  soundEnabled: boolean;
  onSelectFinish: (finish: ChassisFinish) => void;
  onConfigure: () => void;
  onExploreCore: () => void;
}

const FINISH_ASSETS: Record<
  ChassisFinish,
  { src: string; alt: string; caption: string }
> = {
  silver: {
    src: '/src/assets/images/hero_aevora_studio_1794985690652.jpg',
    alt: 'AEVORA cylindrical anodized silver desktop AI hardware companion with glowing amber ring and 2.4-inch circular IPS display',
    caption: 'Raw Silver Aluminum · Amber Ring',
  },
  charcoal: {
    src: '/src/assets/images/aevora_charcoal_edition_1794985692642.jpg',
    alt: 'AEVORA matte charcoal-black anodized desktop AI companion with glowing electric neon-blue circular ring',
    caption: 'Matte Charcoal-Black · Neon Blue Ring',
  },
};

const HERO_SPECS = [
  {
    kicker: 'Main AI Compute',
    value: '1024-Core Ampere',
    sub: 'Jetson Orin Nano · 8 GB LPDDR5',
    highlight: false,
  },
  {
    kicker: 'Deterministic Bridge',
    value: 'XIAO RP2040',
    sub: 'Native USB HID + PWM Thermal',
    highlight: false,
  },
  {
    kicker: 'Cordless UPS Pack',
    value: '5000 mAh 2S',
    sub: '21700 Li-ion · Waveshare UPS HAT',
    highlight: false,
  },
  {
    kicker: 'Inference Routing',
    value: 'Local · LAN · API',
    sub: 'On-device default · Offline peer or BYOK',
    highlight: true,
  },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  selectedFinish,
  soundEnabled,
  onSelectFinish,
  onConfigure,
  onExploreCore,
}) => {
  const activeAsset = FINISH_ASSETS[selectedFinish];

  // Scroll-linked vertical depth parallax on the hero hardware frame
  const heroSectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroSectionRef,
    offset: ['start start', 'end start'],
  });
  const scrollImageY = useTransform(scrollYProgress, [0, 1], [0, -14]);

  // Interactive pointer tilt, depth shift & dynamic specular metallic sheen
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 160, damping: 22 });
  const smoothY = useSpring(pointerY, { stiffness: 160, damping: 22 });

  const tiltRotateX = useTransform(smoothY, [-0.5, 0.5], [3.5, -3.5]);
  const tiltRotateY = useTransform(smoothX, [-0.5, 0.5], [-3.5, 3.5]);
  const parallaxShiftX = useTransform(smoothX, [-0.5, 0.5], [-6, 6]);
  const parallaxShiftY = useTransform(smoothY, [-0.5, 0.5], [-5, 5]);
  const sheenX = useTransform(smoothX, [-0.5, 0.5], [15, 85]);
  const sheenY = useTransform(smoothY, [-0.5, 0.5], [15, 85]);
  const sheenColor = 'rgba(255, 255, 255, 0.14)';
  const specularSheen = useMotionTemplate`radial-gradient(420px circle at ${sheenX}% ${sheenY}%, ${sheenColor}, transparent 68%)`;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    pointerX.set(nx);
    pointerY.set(ny);
  };

  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <section ref={heroSectionRef} id="top" className="pt-6 pb-12 sm:pt-12 sm:pb-20">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <div className="grid grid-cols-1 items-stretch gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-8">
          {/* Left Editorial Pitch with Staggered Motion Entrance */}
          <motion.div
            initial={{ opacity: 0.92, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-between rounded-3xl bg-white p-6 sm:p-8 lg:p-9 border border-zinc-900/8 lg:col-span-6"
          >
            <div>
              <motion.div
                initial={{ opacity: 0.9, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500"
              >
                <span>Autonomous Desk Hardware</span>
                <span aria-hidden="true">·</span>
                <span>Local-First &amp; Hybrid-Ready</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0.92, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.44, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="mt-4 font-display text-[clamp(2.2rem,3.9vw,3.55rem)] font-semibold leading-[1.04] tracking-tight text-zinc-950 text-balance"
              >
                Own the agent. Zero cloud lock-in.
              </motion.h1>

              <motion.div
                initial={{ opacity: 0.92, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.11, ease: [0.16, 1, 0.3, 1] }}
                className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs font-medium text-zinc-700 tabular-nums"
              >
                <span className="font-semibold text-zinc-950">Starting at $649</span>
                <span aria-hidden="true" className="text-zinc-400">·</span>
                <span className="text-[#ff5500]">Early Access</span>
              </motion.div>

              <motion.p
                initial={{ opacity: 0.92, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.44, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                className="mt-3.5 max-w-xl text-[15px] leading-relaxed text-zinc-600"
              >
                AEVORA is a 100 mm cylindrical desktop companion powered by an NVIDIA Jetson Orin Nano and XIAO RP2040 coprocessor. Run quantized LLMs on-device, offload offline to another machine on your LAN, or connect to cloud models with your own API key—while keeping physical mic switches and native USB HID under your control.
              </motion.p>

              {/* Interactive Edition Preview Switcher with Fluid Shared Indicator */}
              <motion.div
                initial={{ opacity: 0.92, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="mt-5 flex flex-wrap items-center gap-3"
              >
                <span className="text-xs font-medium text-zinc-500">Preview Finish</span>
                <div className="inline-flex items-center gap-1 rounded-xl bg-[#f2f1ec] p-1 border border-zinc-900/8">
                  <button
                    type="button"
                    onClick={() => {
                      playDetentClick(soundEnabled, 1080);
                      onSelectFinish('silver');
                    }}
                    aria-pressed={selectedFinish === 'silver'}
                    className={`relative inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedFinish === 'silver'
                        ? 'text-zinc-950'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    {selectedFinish === 'silver' && (
                      <motion.span
                        layoutId="hero-finish-pill"
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                        className="absolute inset-0 rounded-lg bg-white shadow-sm"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10 h-2.5 w-2.5 rounded-full bg-[#c9c8c2] border border-zinc-400" aria-hidden="true" />
                    <span className="relative z-10">Silver</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playDetentClick(soundEnabled, 920);
                      onSelectFinish('charcoal');
                    }}
                    aria-pressed={selectedFinish === 'charcoal'}
                    className={`relative inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedFinish === 'charcoal'
                        ? 'text-white'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    {selectedFinish === 'charcoal' && (
                      <motion.span
                        layoutId="hero-finish-pill"
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                        className="absolute inset-0 rounded-lg bg-zinc-950 shadow-sm"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10 h-2.5 w-2.5 rounded-full bg-[#1c1c1e] border border-zinc-600" aria-hidden="true" />
                    <span className="relative z-10">Charcoal</span>
                  </button>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0.92, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 pt-5 border-t border-zinc-900/8"
            >
              <div className="flex flex-wrap items-center gap-3">
                <MagneticButton
                  type="button"
                  strength={7}
                  onClick={() => {
                    playDetentClick(soundEnabled, 1200);
                    onConfigure();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#ff5500] px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#e54d00] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                >
                  <span>Configure &amp; Reserve</span>
                  <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                </MagneticButton>

                <MagneticButton
                  type="button"
                  strength={5}
                  onClick={() => {
                    playDetentClick(soundEnabled, 1020);
                    onExploreCore();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-900/12 bg-[#f7f6f2] px-4 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-[#eceae3] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5500]"
                >
                  <span>Inspect Hardware Stack</span>
                </MagneticButton>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                <ShieldCheck className="h-4 w-4 text-zinc-700 shrink-0" aria-hidden="true" />
                <span>Physical SPST microphone kill switch &amp; DPDT host data isolation built into the chassis.</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Studio Hardware Focal Carrier with Pointer Tilt, Specular Sheen & Finish-Locked Optical Layers */}
          <motion.div
            initial={{ opacity: 0.92, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.52, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            style={{
              perspective: 1100,
              rotateX: tiltRotateX,
              rotateY: tiltRotateY,
            }}
            className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-[#141416] border border-zinc-900/12 lg:col-span-6 will-change-transform"
          >
            <div className="relative flex-1 w-full aspect-[4/3] lg:aspect-auto lg:min-h-[380px] overflow-hidden bg-[#c8c7c2]">
              <motion.div
                style={{
                  x: parallaxShiftX,
                  y: parallaxShiftY,
                  translateY: scrollImageY,
                }}
                className="relative h-full w-full scale-[1.015]"
              >
                {(['silver', 'charcoal'] as const).map((finishKey) => {
                  const finishAsset = FINISH_ASSETS[finishKey];
                  const isActive = selectedFinish === finishKey;
                  const layerBloom =
                    finishKey === 'charcoal'
                      ? 'radial-gradient(circle at 50% 45%, rgba(14, 165, 233, 0.16), transparent 68%)'
                      : 'radial-gradient(circle at 50% 45%, rgba(255, 85, 0, 0.16), transparent 68%)';

                  return (
                    <motion.div
                      key={finishKey}
                      aria-hidden={!isActive}
                      initial={false}
                      animate={{
                        opacity: isActive ? 1 : 0,
                        scale: isActive ? 1 : 1.01,
                      }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      style={{ zIndex: isActive ? 2 : 1 }}
                      className="absolute inset-0 h-full w-full will-change-[opacity,transform]"
                    >
                      <div
                        aria-hidden="true"
                        style={{ background: layerBloom }}
                        className="pointer-events-none absolute inset-0"
                      />
                      <img
                        src={finishAsset.src}
                        alt={finishAsset.alt}
                        referrerPolicy="no-referrer"
                        decoding="async"
                        className="h-full w-full object-cover object-center"
                      />
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Pointer-Reactive Neutral Metallic Specular Sheen (zero cross-color lag) */}
              <motion.div
                aria-hidden="true"
                style={{ background: specularSheen }}
                className="pointer-events-none absolute inset-0 z-10 mix-blend-screen"
              />
            </div>

            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#141416] px-5 py-3.5 sm:px-6">
              <div className="text-xs text-zinc-200">
                <span className="font-medium text-white">{activeAsset.caption}</span>
                <span className="mx-2 text-zinc-500" aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-zinc-300">100 × 95 mm</span>
              </div>
              <span className="font-mono text-[11px] text-zinc-400">CNC 6061 Aluminum</span>
            </div>
          </motion.div>
        </div>

        {/* 4-Column Hardware Spec Bar with Staggered Entrance */}
        <motion.div
          initial={{ opacity: 0.9, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.02 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 rounded-2xl bg-white p-3.5 sm:p-5 border border-zinc-900/8 lg:grid-cols-4"
        >
          {HERO_SPECS.map((spec, idx) => (
            <motion.div
              key={spec.kicker}
              initial={{ opacity: 0.9, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.02 }}
              transition={{ duration: 0.3, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-1 rounded-xl border border-transparent p-2.5 transition-colors hover:border-zinc-900/10 hover:bg-[#faf9f6]"
            >
              <span className="text-xs font-medium text-zinc-500">{spec.kicker}</span>
              <span
                className={`font-mono text-base sm:text-lg font-semibold tabular-nums ${
                  spec.highlight ? 'text-[#ff5500]' : 'text-zinc-950'
                }`}
              >
                {spec.value}
              </span>
              <span className="text-xs text-zinc-600">{spec.sub}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
