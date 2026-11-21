import { useEffect, useState } from 'react';
import { MotionConfig, motion, useScroll, useSpring } from 'motion/react';
import { TopBar } from './components/TopBar';
import { HeroSection } from './components/HeroSection';
import { TwoWaysSection } from './components/TwoWaysSection';
import { TactilePrivacyTwin } from './components/TactilePrivacyTwin';
import { ExplodedExplorer } from './components/ExplodedExplorer';
import { AutomationWorkbench } from './components/AutomationWorkbench';
import { TechSpecsSection } from './components/TechSpecsSection';
import { CraftAndReserve, type ConfirmedReservation } from './components/CraftAndReserve';
import { Footer } from './components/Footer';
import type { ChassisFinish, HardwareState } from './utils/aevoraEngine';

const RESERVATION_STORAGE_KEY = 'aevora_reservation_state_v1';

interface PersistedReservationState {
  reservedCount: number;
  latestReservation: ConfirmedReservation | null;
}

function loadPersistedReservations(): PersistedReservationState {
  try {
    const raw = window.localStorage.getItem(RESERVATION_STORAGE_KEY);
    if (!raw) return { reservedCount: 0, latestReservation: null };
    const parsed = JSON.parse(raw) as Partial<PersistedReservationState>;
    return {
      reservedCount: typeof parsed.reservedCount === 'number' && parsed.reservedCount >= 0 ? parsed.reservedCount : 0,
      latestReservation: parsed.latestReservation ?? null,
    };
  } catch {
    return { reservedCount: 0, latestReservation: null };
  }
}

export default function App() {
  const [selectedFinish, setSelectedFinish] = useState<ChassisFinish>('silver');
  const [hardwareState, setHardwareState] = useState<HardwareState>({
    micEnabled: true,
    hidConnected: true,
    cordlessMode: false,
    lvglMode: 'inference',
    ringAccent: 'amber',
  });

  const [reservationState, setReservationState] = useState<PersistedReservationState>(() =>
    loadPersistedReservations()
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  useEffect(() => {
    try {
      window.localStorage.setItem(RESERVATION_STORAGE_KEY, JSON.stringify(reservationState));
    } catch {
      // Ignore storage quota errors
    }
  }, [reservationState]);

  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 28,
    restDelta: 0.001,
  });

  const handleFinishChange = (finish: ChassisFinish) => {
    setSelectedFinish(finish);
    setHardwareState((prev) => ({
      ...prev,
      ringAccent: finish === 'charcoal' ? 'cobalt' : 'amber',
    }));
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const patchHardware = (patch: Partial<HardwareState>) => {
    setHardwareState((prev) => ({ ...prev, ...patch }));
  };

  const handleReservationConfirmed = (reservation: ConfirmedReservation) => {
    setReservationState((prev) => ({
      reservedCount: prev.reservedCount + reservation.qty,
      latestReservation: reservation,
    }));
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#f2f1ec] text-zinc-900">
        <TopBar onNavigate={scrollToSection} reservedCount={reservationState.reservedCount} />
        <motion.div
          aria-hidden="true"
          style={{ scaleX: smoothProgress }}
          className="fixed top-[61px] inset-x-0 z-30 h-[2px] origin-left bg-[#ff5500]"
        />
        <main>
          <HeroSection
            selectedFinish={selectedFinish}
            soundEnabled={soundEnabled}
            onSelectFinish={handleFinishChange}
            onConfigure={() => scrollToSection('reserve')}
            onExploreCore={() => scrollToSection('exploded-core')}
          />
          <TwoWaysSection
            soundEnabled={soundEnabled}
            onExploreWorkbench={() => scrollToSection('automation')}
            onInspectPrivacy={() => scrollToSection('privacy-twin')}
          />
          <TactilePrivacyTwin
            hardwareState={hardwareState}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((prev) => !prev)}
            onChange={setHardwareState}
          />
          <ExplodedExplorer
            soundEnabled={soundEnabled}
            selectedFinish={selectedFinish}
            hardwareState={hardwareState}
          />
          <AutomationWorkbench
            hardwareState={hardwareState}
            soundEnabled={soundEnabled}
            onPatchHardware={patchHardware}
          />
          <TechSpecsSection soundEnabled={soundEnabled} />
          <CraftAndReserve
            selectedFinish={selectedFinish}
            soundEnabled={soundEnabled}
            onSelectFinish={handleFinishChange}
            onReservationConfirmed={handleReservationConfirmed}
            latestReservation={reservationState.latestReservation}
          />
        </main>
        <Footer onNavigate={scrollToSection} />
      </div>
    </MotionConfig>
  );
}
