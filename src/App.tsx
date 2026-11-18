import { useState } from 'react';
import { MotionConfig, motion, useScroll, useSpring } from 'motion/react';
import { TopBar } from './components/TopBar';
import { HeroSection } from './components/HeroSection';
import { TactilePrivacyTwin } from './components/TactilePrivacyTwin';
import { ExplodedExplorer } from './components/ExplodedExplorer';
import { AutomationWorkbench } from './components/AutomationWorkbench';
import { CraftAndReserve } from './components/CraftAndReserve';
import { Footer } from './components/Footer';
import type { ChassisFinish, HardwareState } from './utils/aevoraEngine';

export default function App() {
  const [selectedFinish, setSelectedFinish] = useState<ChassisFinish>('silver');
  const [hardwareState, setHardwareState] = useState<HardwareState>({
    micEnabled: true,
    hidConnected: true,
    cordlessMode: false,
    lvglMode: 'inference',
    ringAccent: 'amber',
  });

  const [reservedCount, setReservedCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

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

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#f2f1ec] text-zinc-900">
        <TopBar onNavigate={scrollToSection} reservedCount={reservedCount} />
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
          <CraftAndReserve
            selectedFinish={selectedFinish}
            soundEnabled={soundEnabled}
            onSelectFinish={handleFinishChange}
            onReservationConfirmed={(qty) => setReservedCount((prev) => prev + qty)}
          />
        </main>
        <Footer onNavigate={scrollToSection} />
      </div>
    </MotionConfig>
  );
}
