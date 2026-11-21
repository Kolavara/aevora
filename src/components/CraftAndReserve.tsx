import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import { Check, ChevronLeft, ChevronRight, Copy, Maximize2, Minus, Plus, X } from 'lucide-react';
import {
  calculateBuildSummary,
  estimateStorageCapacity,
  validateReservationForm,
  type BuildConfig,
  type ChassisFinish,
  type ModelBundle,
  type StorageTier,
} from '../utils/aevoraEngine';
import { playDetentClick, playWakeChime } from '../utils/tactileAudio';
import { MagneticButton } from './MagneticButton';

export interface ConfirmedReservation {
  orderCode: string;
  total: number;
  qty: number;
  summary: ReturnType<typeof calculateBuildSummary>;
  email: string;
}

interface CraftAndReserveProps {
  selectedFinish: ChassisFinish;
  soundEnabled: boolean;
  onSelectFinish: (finish: ChassisFinish) => void;
  onReservationConfirmed: (reservation: ConfirmedReservation) => void;
  latestReservation: ConfirmedReservation | null;
}

type BlueprintZone = 'diameter' | 'height' | 'display' | 'intake';

const BLUEPRINT_TOLERANCES: Record<BlueprintZone, { label: string; spec: string }> = {
  diameter: {
    label: '100.0 mm Outer Cylinder',
    spec: 'CNC 6061 Aluminum · ±0.05 mm wall concentricity',
  },
  display: {
    label: '2.4" Optical Glass Crown',
    spec: '360° optical diffuser + top alignment notch',
  },
  height: {
    label: '95.0 mm Standing Profile',
    spec: '450 g bottom-weighted 2S 21700 battery stability',
  },
  intake: {
    label: '360° Slotted Intake Channels',
    spec: 'Lower perimeter CNC vents feeding Noctua NF-A4x10 exhaust',
  },
};

const GALLERY_ITEMS = [
  {
    src: '/src/assets/images/aevora_macro_detail_1794985692088.jpg',
    title: 'Precision Light Ring & Notch',
    detail: 'Diffused 360° optical channel seated flush in CNC-chamfered 6061 aluminum.',
  },
  {
    src: '/src/assets/images/aevora_macro_vents_1795193371131.jpg',
    title: '360° Slotted Thermal Intake',
    detail: 'Precision-milled vertical perimeter intake slots drawing cool air past the battery bay.',
  },
  {
    src: '/src/assets/images/aevora_macro_usbc_1795193371488.jpg',
    title: 'Recessed USB-C PD & Host Bus',
    detail: 'Flush-machined USB-C boss with recessed alignment bevel and braided cable clearance.',
  },
  {
    src: '/src/assets/images/aevora_desk_setup_1794985692176.jpg',
    title: 'Architectural Desk Footprint',
    detail: 'Compact 100 mm cylindrical silhouette sitting naturally beside any workstation.',
  },
];

const FINISH_OPTIONS: Array<{ id: ChassisFinish; label: string; note: string; img: string }> = [
  {
    id: 'silver',
    label: 'Anodized Raw Silver',
    note: 'Bead-blasted aluminum',
    img: '/src/assets/images/hero_aevora_studio_1794985690652.jpg',
  },
  {
    id: 'charcoal',
    label: 'Matte Charcoal-Black',
    note: 'Stealth anodized (+$20)',
    img: '/src/assets/images/aevora_charcoal_edition_1794985692642.jpg',
  },
];

const STORAGE_OPTIONS: Array<{ id: StorageTier; label: string }> = [
  { id: '512gb', label: '512 GB NVMe' },
  { id: '1tb', label: '1 TB NVMe (+$70)' },
  { id: '2tb', label: '2 TB NVMe (+$160)' },
];

const BUNDLE_OPTIONS: Array<{ id: ModelBundle; label: string }> = [
  { id: 'qwen-coder', label: 'Qwen-2.5 7B Coder' },
  { id: 'llama-general', label: 'Llama-3.2 8B + FastAPI' },
  { id: 'voice-suite', label: 'Whisper + Android Bridge' },
];

export const CraftAndReserve: React.FC<CraftAndReserveProps> = ({
  selectedFinish,
  soundEnabled,
  onSelectFinish,
  onReservationConfirmed,
  latestReservation,
}) => {
  const [storage, setStorage] = useState<StorageTier>('1tb');
  const [bundle, setBundle] = useState<ModelBundle>('qwen-coder');
  const [quantity, setQuantity] = useState<number>(1);
  const [blueprintZone, setBlueprintZone] = useState<BlueprintZone>('diameter');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [copiedSpec, setCopiedSpec] = useState(false);

  const config: BuildConfig = {
    finish: selectedFinish,
    storage,
    bundle,
    quantity,
  };

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('North America');
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; region?: string }>({});
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedReservation | null>(latestReservation);

  useEffect(() => {
    setConfirmedOrder(latestReservation);
  }, [latestReservation]);

  // Keyboard support for Gallery Lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIdx(null);
      } else if (e.key === 'ArrowRight') {
        setLightboxIdx((i) => (i === null ? null : (i + 1) % GALLERY_ITEMS.length));
      } else if (e.key === 'ArrowLeft') {
        setLightboxIdx((i) =>
          i === null ? null : (i - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIdx]);

  const summary = calculateBuildSummary(config);
  const storageCapacity = estimateStorageCapacity(storage, bundle);
  const activeFinishMeta = FINISH_OPTIONS.find((f) => f.id === selectedFinish) ?? FINISH_OPTIONS[0];

  const craftRef = useRef<HTMLElement>(null);
  const { scrollYProgress: craftScroll } = useScroll({
    target: craftRef,
    offset: ['start end', 'end start'],
  });
  const orthoParallaxY = useTransform(craftScroll, [0, 1], [14, -14]);

  const selectBlueprintZone = (zone: BlueprintZone) => {
    playDetentClick(soundEnabled, 1080);
    setBlueprintZone(zone);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateReservationForm({ fullName, email, region });
    if (!validation.valid) {
      playDetentClick(soundEnabled, 420);
      setErrors(validation.errors);
      return;
    }

    playWakeChime(soundEnabled);
    setErrors({});
    const orderCode = `AEV-${Math.floor(1040 + ((config.quantity * 17 + fullName.length * 13) % 8900))}`;
    const order: ConfirmedReservation = {
      orderCode,
      total: summary.totalPrice,
      qty: config.quantity,
      summary,
      email: email.trim(),
    };
    setConfirmedOrder(order);
    onReservationConfirmed(order);
  };

  const handleCopySpec = async () => {
    if (!confirmedOrder) return;
    playDetentClick(soundEnabled, 1180);
    const text = [
      `AEVORA Reservation #${confirmedOrder.orderCode}`,
      `Enclosure: ${confirmedOrder.summary.finishLabel}`,
      `Storage: ${confirmedOrder.summary.storageLabel}`,
      `Pre-Flashed Suite: ${confirmedOrder.summary.bundleLabel}`,
      `Quantity: ${confirmedOrder.qty}`,
      `Reserved Total: $${confirmedOrder.total}`,
    ].join('\n');
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // Clipboard may be restricted in headless contexts; still provide confirmation state
    }
    setCopiedSpec(true);
    window.setTimeout(() => setCopiedSpec(false), 2000);
  };

  return (
    <>
      {/* Craftsmanship & Dimensions Section */}
      <section ref={craftRef} id="craft" className="scroll-mt-20 py-12 sm:py-16">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
          <motion.div
            initial={{ opacity: 0.92, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.02 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
          >
            <div>
              <div className="text-xs font-medium text-zinc-500">05. Industrial Craftsmanship</div>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl text-balance">
                Small footprint. Machined to acoustic tolerances.
              </h2>
            </div>
            <div className="font-mono text-xs tabular-nums text-zinc-600">
              100 mm Ø × 95 mm H · 0.1 L Sealed Chamber
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Interactive Directly-Clickable Vector Orthographic Blueprint Card */}
            <motion.div
              style={{ y: orthoParallaxY }}
              initial={{ opacity: 0.92, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.02 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col justify-between gap-5 rounded-3xl bg-white p-4 sm:p-6 border border-zinc-900/8 lg:col-span-4 will-change-transform"
            >
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-[#f3f2ee] p-6">
                <svg
                  viewBox="0 0 260 310"
                  className="w-full max-w-[240px] h-auto"
                  role="img"
                  aria-label="Interactive orthographic blueprint of AEVORA measuring 100mm diameter by 95mm height"
                >
                  {/* Top View */}
                  <text x="16" y="20" fontSize="9" fontFamily="JetBrains Mono, monospace" fill="#71717a">
                    TOP VIEW
                  </text>
                  <circle
                    cx="110"
                    cy="92"
                    r="68"
                    fill="#d6d5d0"
                    stroke={blueprintZone === 'diameter' ? '#ff5500' : '#18181b'}
                    strokeWidth={blueprintZone === 'diameter' ? '2.5' : '1.5'}
                    className="cursor-pointer transition-all"
                    onClick={() => selectBlueprintZone('diameter')}
                  />
                  <circle
                    cx="110"
                    cy="92"
                    r="56"
                    fill="none"
                    stroke="#ff5500"
                    strokeWidth={blueprintZone === 'display' ? '6.5' : '5'}
                    className="cursor-pointer transition-all"
                    onClick={() => selectBlueprintZone('display')}
                  />
                  <circle
                    cx="110"
                    cy="92"
                    r="46"
                    fill="#141416"
                    className="cursor-pointer"
                    onClick={() => selectBlueprintZone('display')}
                  />
                  <text
                    x="110"
                    y="96"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fontFamily="Outfit, sans-serif"
                    fill="#ffffff"
                    className="pointer-events-none"
                  >
                    Aevora
                  </text>
                  {/* Diameter Callout */}
                  <line x1="194" y1="24" x2="194" y2="160" stroke={blueprintZone === 'diameter' ? '#ff5500' : '#71717a'} strokeWidth="1.25" />
                  <line x1="184" y1="24" x2="198" y2="24" stroke={blueprintZone === 'diameter' ? '#ff5500' : '#71717a'} strokeWidth="1.25" />
                  <line x1="184" y1="160" x2="198" y2="160" stroke={blueprintZone === 'diameter' ? '#ff5500' : '#71717a'} strokeWidth="1.25" />
                  <text x="202" y="90" fontSize="11" fontWeight="600" fontFamily="JetBrains Mono, monospace" fill="#18181b">
                    100 mm
                  </text>
                  <text x="202" y="103" fontSize="8" fontFamily="JetBrains Mono, monospace" fill="#71717a">
                    DIAMETER
                  </text>

                  {/* Front View */}
                  <text x="16" y="192" fontSize="9" fontFamily="JetBrains Mono, monospace" fill="#71717a">
                    FRONT VIEW
                  </text>
                  <rect
                    x="42"
                    y="208"
                    width="136"
                    height="82"
                    rx="10"
                    fill="#d6d5d0"
                    stroke={blueprintZone === 'height' ? '#ff5500' : '#18181b'}
                    strokeWidth={blueprintZone === 'height' ? '2.5' : '1.5'}
                    className="cursor-pointer transition-all"
                    onClick={() => selectBlueprintZone('height')}
                  />
                  <rect
                    x="64"
                    y="202"
                    width="92"
                    height="6"
                    rx="2"
                    fill="#141416"
                    className="cursor-pointer"
                    onClick={() => selectBlueprintZone('display')}
                  />
                  <line x1="42" y1="242" x2="178" y2="242" stroke="#71717a" strokeWidth="1" />
                  <rect x="108" y="208" width="4" height="12" fill="#ff5500" />
                  {/* Clickable Thermal Vent Slots Zone */}
                  <g
                    className="cursor-pointer"
                    onClick={() => selectBlueprintZone('intake')}
                  >
                    <rect x="48" y="260" width="124" height="24" fill="transparent" />
                    {[52, 62, 72, 82, 92, 102, 112, 122, 132, 142, 152, 162].map((vx) => (
                      <rect
                        key={vx}
                        x={vx}
                        y="264"
                        width="4"
                        height="16"
                        rx="2"
                        fill="#ff5500"
                        opacity={blueprintZone === 'intake' ? '1' : '0.72'}
                      />
                    ))}
                  </g>
                  {/* Height Callout */}
                  <line x1="194" y1="204" x2="194" y2="290" stroke={blueprintZone === 'height' ? '#ff5500' : '#71717a'} strokeWidth="1.25" />
                  <line x1="184" y1="204" x2="198" y2="204" stroke={blueprintZone === 'height' ? '#ff5500' : '#71717a'} strokeWidth="1.25" />
                  <line x1="184" y1="290" x2="198" y2="290" stroke={blueprintZone === 'height' ? '#ff5500' : '#71717a'} strokeWidth="1.25" />
                  <text x="202" y="246" fontSize="11" fontWeight="600" fontFamily="JetBrains Mono, monospace" fill="#18181b">
                    95 mm
                  </text>
                  <text x="202" y="259" fontSize="8" fontFamily="JetBrains Mono, monospace" fill="#71717a">
                    HEIGHT
                  </text>
                </svg>

                {/* Interactive Zone Buttons */}
                <div className="mt-4 grid w-full grid-cols-4 gap-1 rounded-xl bg-white p-1 border border-zinc-900/8">
                  {(
                    [
                      { id: 'diameter', label: '100mm Ø' },
                      { id: 'display', label: '2.4" IPS' },
                      { id: 'height', label: '95mm H' },
                      { id: 'intake', label: 'Intake' },
                    ] as Array<{ id: BlueprintZone; label: string }>
                  ).map((z) => {
                    const active = blueprintZone === z.id;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => selectBlueprintZone(z.id)}
                        aria-pressed={active}
                        className={`rounded-lg px-1.5 py-1.5 font-mono text-[10.5px] font-medium transition-colors whitespace-nowrap text-center cursor-pointer ${
                          active
                            ? 'bg-zinc-900 text-white'
                            : 'text-zinc-600 hover:text-zinc-950'
                        }`}
                      >
                        {z.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-zinc-950">
                  {BLUEPRINT_TOLERANCES[blueprintZone].label}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                  {BLUEPRINT_TOLERANCES[blueprintZone].spec}
                </p>
              </div>
            </motion.div>

            {/* 2x2 Unique High-Res Studio Macro Details Grid with Lightbox Inspection */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-8">
              {GALLERY_ITEMS.map((item, idx) => (
                <motion.button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    playDetentClick(soundEnabled, 1120);
                    setLightboxIdx(idx);
                  }}
                  aria-label={`Inspect ${item.title} full size`}
                  initial={{ opacity: 0.92, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.02 }}
                  transition={{ duration: 0.38, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="group flex flex-col overflow-hidden rounded-3xl bg-white border border-zinc-900/8 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-900/20 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5500]"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#eae8e1]">
                    <img
                      src={item.src}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950/75 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-base font-semibold text-zinc-950">
                        {item.title}
                      </h3>
                      <span className="font-mono text-[11px] tabular-nums text-zinc-400 group-hover:text-[#ff5500] transition-colors">
                        0{idx + 1}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                      {item.detail}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Accessible Full-Resolution Gallery Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={GALLERY_ITEMS[lightboxIdx].title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxIdx(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-[#16181e] border border-white/12 text-white shadow-2xl"
            >
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-zinc-400 tabular-nums">
                    0{lightboxIdx + 1} / 0{GALLERY_ITEMS.length} · Macro Inspection
                  </div>
                  <div className="truncate font-display text-base font-semibold text-white">
                    {GALLERY_ITEMS[lightboxIdx].title}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      playDetentClick(soundEnabled, 980);
                      setLightboxIdx(
                        (lightboxIdx - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length
                      );
                    }}
                    aria-label="Previous gallery photo"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/6 text-white hover:bg-white/14 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playDetentClick(soundEnabled, 1140);
                      setLightboxIdx((lightboxIdx + 1) % GALLERY_ITEMS.length);
                    }}
                    aria-label="Next gallery photo"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/6 text-white hover:bg-white/14 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxIdx(null)}
                    aria-label="Close gallery lightbox"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/6 text-white hover:bg-white/14 cursor-pointer"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="aspect-[16/10] w-full bg-black">
                <img
                  src={GALLERY_ITEMS[lightboxIdx].src}
                  alt={GALLERY_ITEMS[lightboxIdx].title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="px-5 py-4 text-xs leading-relaxed text-zinc-300 border-t border-white/10">
                {GALLERY_ITEMS[lightboxIdx].detail}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hardware Configurator & Pre-Order Reservation Section */}
      <section id="reserve" className="scroll-mt-20 py-12 sm:py-16">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
          <div className="rounded-3xl bg-white p-5 sm:p-10 border border-zinc-900/8">
            <div className="grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-12">
              {/* Left: Spec Configurator Controls */}
              <div className="lg:col-span-7">
                <div className="text-xs font-medium text-zinc-500">06. Hardware Reservation</div>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-950 text-balance">
                  Configure your AEVORA build
                </h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Includes Jetson Orin Nano 8GB, XIAO RP2040, ReSpeaker array, Noctua PWM fan, and 5000mAh 2S UPS pack pre-flashed with Ubuntu 22.04.
                </p>

                <div className="mt-7 space-y-6">
                  {/* Finish */}
                  <div>
                    <div className="text-xs font-semibold text-zinc-900">Enclosure Finish</div>
                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {FINISH_OPTIONS.map((opt) => {
                        const active = selectedFinish === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              playDetentClick(soundEnabled, 1080);
                              onSelectFinish(opt.id);
                            }}
                            aria-pressed={active}
                            className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-all active:scale-[0.99] cursor-pointer ${
                              active
                                ? 'border-zinc-950 bg-zinc-950 text-white'
                                : 'border-zinc-900/12 bg-[#faf9f6] text-zinc-900 hover:bg-[#f0efe9]'
                            }`}
                          >
                            <div>
                              <div className="text-sm font-semibold">{opt.label}</div>
                              <div className={`text-xs ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                {opt.note}
                              </div>
                            </div>
                            <span
                              className={`h-5 w-5 rounded-full border ${
                                opt.id === 'charcoal'
                                  ? 'bg-[#1c1c1e] border-zinc-500'
                                  : 'bg-[#d4d4d0] border-zinc-400'
                              }`}
                              aria-hidden="true"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* NVMe Storage + Live Local LLM Headroom Estimator */}
                  <div>
                    <div className="text-xs font-semibold text-zinc-900">Samsung M.2 NVMe Storage</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {STORAGE_OPTIONS.map((opt) => {
                        const active = storage === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              playDetentClick(soundEnabled, 1140);
                              setStorage(opt.id);
                            }}
                            aria-pressed={active}
                            className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer ${
                              active
                                ? 'border-zinc-950 bg-zinc-950 text-white'
                                : 'border-zinc-900/12 bg-[#faf9f6] text-zinc-800 hover:bg-[#f0efe9]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <p
                      data-testid="storage-capacity-readout"
                      className="mt-2.5 font-mono text-xs text-zinc-600 tabular-nums"
                    >
                      {storageCapacity.summaryLine}
                    </p>
                  </div>

                  {/* Pre-loaded Local Model Stack */}
                  <div>
                    <div className="text-xs font-semibold text-zinc-900">Pre-Flashed Local Model Suite</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {BUNDLE_OPTIONS.map((opt) => {
                        const active = bundle === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              playDetentClick(soundEnabled, 1200);
                              setBundle(opt.id);
                            }}
                            aria-pressed={active}
                            className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer ${
                              active
                                ? 'border-[#ff5500] bg-[#ff5500] text-white'
                                : 'border-zinc-900/12 bg-[#faf9f6] text-zinc-800 hover:bg-[#f0efe9]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Live Preview + Summary & Validated Reservation Form */}
              <div className="rounded-2xl bg-[#f5f4ef] p-6 sm:p-7 border border-zinc-900/8 lg:col-span-5">
                {confirmedOrder ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex h-full flex-col justify-between"
                  >
                    <div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <Check className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <h3 className="mt-4 font-display text-2xl font-semibold text-zinc-950">
                        Order #{confirmedOrder.orderCode} Confirmed
                      </h3>
                      <p className="mt-2 text-sm text-zinc-600">
                        Allocation confirmation saved for{' '}
                        <span className="font-medium text-zinc-900">{confirmedOrder.email}</span>.
                      </p>

                      <dl className="mt-6 space-y-2.5 border-t border-zinc-900/10 pt-4 text-xs">
                        <div className="flex justify-between gap-4">
                          <dt className="text-zinc-500">Enclosure</dt>
                          <dd className="font-medium text-zinc-900">{confirmedOrder.summary.finishLabel}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-zinc-500">Storage</dt>
                          <dd className="font-medium text-zinc-900">{confirmedOrder.summary.storageLabel}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-zinc-500">Quantity</dt>
                          <dd className="font-mono tabular-nums font-medium text-zinc-900">
                            {confirmedOrder.qty} unit(s)
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-zinc-900/10 pt-2.5 text-sm font-semibold text-zinc-950">
                          <dt>Reserved Total</dt>
                          <dd className="font-mono tabular-nums">${confirmedOrder.total}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="mt-6 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleCopySpec}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{copiedSpec ? 'Build Spec Copied' : 'Copy Build Specification'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmedOrder(null)}
                        className="w-full rounded-xl border border-zinc-900/15 bg-white py-2.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 cursor-pointer"
                      >
                        Configure Another Build
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                    {/* Live Finish Preview Header */}
                    <div className="flex items-center gap-4 border-b border-zinc-900/10 pb-4">
                      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-zinc-900/10">
                        <AnimatePresence mode="wait">
                          <motion.img
                            key={activeFinishMeta.id}
                            src={activeFinishMeta.img}
                            alt={activeFinishMeta.label}
                            referrerPolicy="no-referrer"
                            initial={{ opacity: 0.4 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0.4 }}
                            transition={{ duration: 0.2 }}
                            className="h-full w-full object-cover"
                          />
                        </AnimatePresence>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-zinc-500">
                          {summary.estimatedShipWindow}
                        </div>
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.div
                            key={summary.totalPrice}
                            initial={{ opacity: 0.4, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                            className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-zinc-950"
                          >
                            ${summary.totalPrice}
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      <div className="flex items-center gap-1.5 rounded-xl border border-zinc-900/12 bg-white p-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            playDetentClick(soundEnabled, 940);
                            setQuantity((q) => Math.max(1, q - 1));
                          }}
                          aria-label="Decrease quantity"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <span className="w-5 text-center font-mono text-sm font-semibold tabular-nums text-zinc-950">
                          {config.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            playDetentClick(soundEnabled, 1180);
                            setQuantity((q) => Math.min(10, q + 1));
                          }}
                          aria-label="Increase quantity"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-zinc-600">
                      <div className="font-medium text-zinc-900">{summary.finishLabel}</div>
                      <div>{summary.storageLabel}</div>
                      <div>{summary.bundleLabel}</div>
                    </div>

                    <div className="space-y-3.5">
                      <div>
                        <label htmlFor="res-name" className="block text-xs font-medium text-zinc-700">
                          Full Name
                        </label>
                        <input
                          id="res-name"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Alex Rivera"
                          className="mt-1 w-full rounded-xl border border-zinc-900/15 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
                        />
                        {errors.fullName && (
                          <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="res-email" className="block text-xs font-medium text-zinc-700">
                          Email Address
                        </label>
                        <input
                          id="res-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@domain.com"
                          className="mt-1 w-full rounded-xl border border-zinc-900/15 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
                        />
                        {errors.email && (
                          <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="res-region" className="block text-xs font-medium text-zinc-700">
                          Shipping Region
                        </label>
                        <select
                          id="res-region"
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-zinc-900/15 bg-white px-3.5 py-2.5 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none"
                        >
                          <option value="North America">North America</option>
                          <option value="Europe & UK">Europe &amp; UK</option>
                          <option value="Asia-Pacific">Asia-Pacific</option>
                        </select>
                        {errors.region && (
                          <p className="mt-1 text-xs text-red-600">{errors.region}</p>
                        )}
                      </div>
                    </div>

                    <MagneticButton
                      type="submit"
                      strength={6}
                      className="w-full rounded-xl bg-zinc-950 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-zinc-800 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5500]"
                    >
                      Reserve AEVORA · ${summary.totalPrice}
                    </MagneticButton>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
