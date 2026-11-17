import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ALL_SUBSTANCES,
  createInitialTestRecords,
  HibiscusStage,
  LabSnapshot,
  LangMode,
  StationATool,
  StationBTool,
  StationTab,
  Substance,
} from './data/substances';
import { LabAudioEngine } from './audio/labAudio';
import { HoverTooltipInfo, LabSceneController, ToastEvent } from './three/LabSceneController';
import { ComparisonModal } from './components/ComparisonModal';

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  vr: number;
}

const LANG_MODES: LangMode[] = ['both', 'en', 'kn'];

const INITIAL_SNAPSHOT: LabSnapshot = {
  tab: 'hibiscus',
  mortarOnTable: false,
  petalsPlucked: 0,
  totalPetals: 5,
  crushCount: 0,
  waterAdded: false,
  isFiltered: false,
  hibiscusPaperPrepared: false,
  litmusPrepared: false,
  hibiscusStage: 'A0',
  stationATool: 'dropper',
  stationBTool: 'bluePaper',
  animating: false,
  batchRunning: false,
  animatingLabelEn: '',
  animatingLabelKn: '',
  isExpandedRoster: false,
  hibiscusTestedCount: 0,
  hibiscusPaperTestedCount: 0,
  litmusTestedCount: 0,
  litmusSolutionTestedCount: 0,
  totalSamples: 8,
  activeTubeIds: [0, 1, 2],
  testRecords: createInitialTestRecords(),
};

const HIBISCUS_STEPS: Array<{ stage: HibiscusStage; en: string; kn: string }> = [
  { stage: 'A0', en: '1. Pick 5', kn: '1. 5 ದಳ' },
  { stage: 'A1', en: '2. Crush', kn: '2. ಅರೆ' },
  { stage: 'A2', en: '3. Water', kn: '3. ನೀರು' },
  { stage: 'A3', en: '4. Filter', kn: '4. ಸೋಸು' },
  { stage: 'A4', en: '5. Dropper Test', kn: '5. ಡ್ರಾಪರ್ ಪರೀಕ್ಷೆ' },
];

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const css2dRef = useRef<HTMLDivElement | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const controllerRef = useRef<LabSceneController | null>(null);
  const audioRef = useRef<LabAudioEngine | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const confettiParticlesRef = useRef<ConfettiParticle[]>([]);
  const confettiRafRef = useRef<number>(0);

  const [snapshot, setSnapshot] = useState<LabSnapshot>(INITIAL_SNAPSHOT);
  const [langMode, setLangMode] = useState<LangMode>('both');
  const [labelsClean, setLabelsClean] = useState<boolean>(true);
  const [hideAllText, setHideAllText] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [hudCollapsed, setHudCollapsed] = useState<boolean>(false);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [toast, setToast] = useState<(ToastEvent & { id: number }) | null>(null);
  const [tooltip, setTooltip] = useState<HoverTooltipInfo>({
    visible: false,
    x: 0,
    y: 0,
    titleEn: '',
    titleKn: '',
    subtitleEn: '',
    subtitleKn: '',
  });

  // Sync body classes used by CSS2D label rules, hide-all-text mode, and bilingual visibility
  useEffect(() => {
    const body = document.body;
    body.classList.remove('lang-both', 'lang-en', 'lang-kn', 'labels-clean', 'labels-full');
    body.classList.add(`lang-${langMode}`);
    body.classList.add(labelsClean ? 'labels-clean' : 'labels-full');
    body.classList.toggle('hide-all-text', hideAllText);
  }, [langMode, labelsClean, hideAllText]);

  const spawnConfetti = useCallback((colors?: string[]) => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const palette =
      colors && colors.length > 0
        ? colors
        : ['#fbbf24', '#e11d48', '#10b981', '#3b82f6', '#a855f7'];

    for (let i = 0; i < 65; i++) {
      confettiParticlesRef.current.push({
        x: window.innerWidth * (0.25 + Math.random() * 0.5),
        y: window.innerHeight * 0.35 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 11,
        vy: -Math.random() * 8 - 2,
        size: 5 + Math.random() * 5,
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.25,
      });
    }

    if (confettiRafRef.current) return;

    const animateConfetti = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        confettiRafRef.current = 0;
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const list = confettiParticlesRef.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.26;
        p.rotation += p.vr;
        p.alpha -= 0.014;
        if (p.alpha <= 0 || p.y > canvas.height + 20) {
          list.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * 0.5, -p.size * 0.3, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (list.length > 0) {
        confettiRafRef.current = requestAnimationFrame(animateConfetti);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        confettiRafRef.current = 0;
      }
    };

    confettiRafRef.current = requestAnimationFrame(animateConfetti);
  }, []);

  const showToast = useCallback((event: ToastEvent) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    const id = Date.now();
    setToast({ ...event, id });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => (prev && prev.id === id ? null : prev));
    }, event.duration ?? 2400);
  }, []);

  // Mount Three.js scene controller once
  useEffect(() => {
    const mount = canvasMountRef.current;
    const css2d = css2dRef.current;
    if (!mount || !css2d) return;

    const audio = new LabAudioEngine();
    audio.setMute(true);
    audioRef.current = audio;

    const controller = new LabSceneController(mount, css2d, audio, {
      onSnapshot: (next) => setSnapshot(next),
      onToast: (event) => showToast(event),
      onCelebrate: (colors) => spawnConfetti(colors),
      onTooltip: (info) => setTooltip(info),
      onContextLost: (lost) => setContextLost(lost),
    });
    controllerRef.current = controller;

    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (confettiRafRef.current) cancelAnimationFrame(confettiRafRef.current);
      controller.dispose();
      audio.dispose();
      controllerRef.current = null;
      audioRef.current = null;
    };
  }, [showToast, spawnConfetti]);

  const handleSelectTab = useCallback((tab: StationTab) => {
    setMobileMenuOpen(false);
    controllerRef.current?.setTab(tab);
    if (tab === 'compare') {
      setModalOpen(true);
    } else {
      setModalOpen(false);
    }
  }, []);

  const handleToggleAudio = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      const audio = audioRef.current;
      if (audio) {
        audio.init();
        audio.setMute(!next);
      }
      return next;
    });
  }, []);

  const handleResetAll = useCallback(() => {
    setModalOpen(false);
    setMobileMenuOpen(false);
    controllerRef.current?.resetAll();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const key = e.key.toLowerCase();
      if (key === '1') {
        handleSelectTab('hibiscus');
      } else if (key === '2') {
        handleSelectTab('litmus');
      } else if (key === '3') {
        handleSelectTab('compare');
      } else if (key === 'r') {
        handleResetAll();
      } else if (key === 'm') {
        handleToggleAudio();
      } else if (key === 'l') {
        setLangMode((cur) => LANG_MODES[(LANG_MODES.indexOf(cur) + 1) % LANG_MODES.length]);
      } else if (key === 'h') {
        setHudCollapsed((v) => !v);
      } else if (key === 't') {
        setHideAllText((v) => !v);
      } else if (key === 'escape') {
        setModalOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleResetAll, handleSelectTab, handleToggleAudio]);

  const activeSubstances: Substance[] = useMemo(() => {
    return snapshot.isExpandedRoster ? ALL_SUBSTANCES : ALL_SUBSTANCES.slice(0, 8);
  }, [snapshot.isExpandedRoster]);

  const guidance = useMemo(() => {
    if (snapshot.tab === 'hibiscus') {
      if (snapshot.stationATool === 'paper') {
        if (!snapshot.hibiscusPaperPrepared) {
          return {
            counterEn: 'Petal Paper',
            counterKn: 'ದಳ ಕಾಗದ',
            en: 'Click the Rubbing Petal pad on the Center Table to rub red Hibiscus petal onto white filter paper.',
            kn: 'ಮಧ್ಯದ ಮೇಜಿನ ಮೇಲಿರುವ ಕಾಗದದ ತಟ್ಟೆಯನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ ಬಿಳಿ ಕಾಗದದ ಮೇಲೆ ದಳ ಉಜ್ಜಿ.',
            ctaEn: 'Rub Petal on Paper',
            ctaKn: 'ಕಾಗದಕ್ಕೆ ದಳ ಉಜ್ಜಿ',
          };
        }
        return {
          counterEn: `${snapshot.hibiscusPaperTestedCount}/${snapshot.totalSamples} strips`,
          counterKn: `${snapshot.hibiscusPaperTestedCount}/${snapshot.totalSamples} ಕಾಗದ`,
          en: 'Hibiscus paper is ready on the Center Table! Tap the 3 tubes beside it, or pick more from the Right Stand.',
          kn: 'ದಾಸವಾಳ ಕಾಗದ ಮೇಜಿನ ಮೇಲೆ ಸಿದ್ಧ! ಪಕ್ಕದ 3 ಟ್ಯೂಬ್ ಒತ್ತಿ ಅಥವಾ ಬಲ ಸ್ಟ್ಯಾಂಡ್‌ನಿಂದ ಆಯ್ಕೆ ಮಾಡಿ.',
          ctaEn: 'Dip Next Tube',
          ctaKn: 'ಮುಂದಿನ ಟ್ಯೂಬ್',
        };
      }

      switch (snapshot.hibiscusStage) {
        case 'A0':
          if (!snapshot.mortarOnTable) {
            return {
              counterEn: 'Step 1 of 5',
              counterKn: 'ಹಂತ 1 / 5',
              en: 'Click the Mortar & Pestle on the Left Stand to place it onto the Center Table.',
              kn: 'ಮಧ್ಯದ ಪರೀಕ್ಷಾ ಮೇಜಿನ ಮೇಲೆ ಇಡಲು ಎಡ ಸ್ಟ್ಯಾಂಡ್‌ನ ಖರಲ್ ಮತ್ತು ಒನಕೆ ಕ್ಲಿಕ್ ಮಾಡಿ.',
              ctaEn: 'Place Mortar on Table',
              ctaKn: 'ಖರಲ್ ಮೇಜಿಗೆ ಇಡಿ',
            };
          }
          return {
            counterEn: `${snapshot.petalsPlucked}/${snapshot.totalPetals} petals`,
            counterKn: `${snapshot.petalsPlucked}/${snapshot.totalPetals} ದಳಗಳು`,
            en: `Pluck ${snapshot.totalPetals} hibiscus petals from the Left Stand into the mortar on the Center Table.`,
            kn: `ಎಡ ಸ್ಟ್ಯಾಂಡ್‌ನ ಹೂವಿನಿಂದ ${snapshot.totalPetals} ದಾಸವಾಳ ದಳಗಳನ್ನು ಮೇಜಿನ ಮೇಲಿನ ಕುಟ್ಟಾಣಿಗೆ ಹಾಕಿ.`,
            ctaEn: 'Pick Next Petal',
            ctaKn: 'ದಳ ಕೀಳಿ',
          };
        case 'A1':
          return {
            counterEn: `${snapshot.crushCount}/3 crushes`,
            counterKn: `${snapshot.crushCount}/3 ಅರೆಯುವಿಕೆ`,
            en: 'Click the Mortar or Pestle on the Center Table 3 times to crush all 5 petals.',
            kn: '5 ದಳಗಳನ್ನು ನುಣ್ಣಗೆ ಅರೆಯಲು ಮೇಜಿನ ಮೇಲಿನ ಒನಕೆ ಅಥವಾ ಕುಟ್ಟಾಣಿಯನ್ನು 3 ಬಾರಿ ಕ್ಲಿಕ್ ಮಾಡಿ.',
            ctaEn: 'Crush Petals',
            ctaKn: 'ದಳ ಅರೆಯಿರಿ',
          };
        case 'A2':
          return {
            counterEn: 'Step 3 of 5',
            counterKn: 'ಹಂತ 3 / 5',
            en: 'Click the steaming Warm Water beaker on the Left Stand to pour water into the mortar (beaker returns to stand).',
            kn: 'ಎಡ ಸ್ಟ್ಯಾಂಡ್‌ನ ಬಿಸಿ ನೀರಿನ ಬೀಕರ್ ಕ್ಲಿಕ್ ಮಾಡಿ ಮೇಜಿನ ಕುಟ್ಟಾಣಿಗೆ ನೀರು ಹಾಕಿ (ಬೀಕರ್ ಮರಳಿ ಸ್ಟ್ಯಾಂಡ್‌ಗೆ ಹೋಗುತ್ತದೆ).',
            ctaEn: 'Pour Warm Water',
            ctaKn: 'ಬಿಸಿ ನೀರು ಸುರಿಯಿರಿ',
          };
        case 'A3':
          return {
            counterEn: 'Step 4 of 5',
            counterKn: 'ಹಂತ 4 / 5',
            en: 'Click Filter Funnel on the Left Stand to filter extract; all prep tools return to stand leaving ONLY the Indicator on the table!',
            kn: 'ಎಡ ಸ್ಟ್ಯಾಂಡ್‌ನ ಫನೆಲ್ ಕ್ಲಿಕ್ ಮಾಡಿ ದ್ರಾವಣ ಸೋಸಿ; ಎಲ್ಲಾ ಸಲಕರಣೆ ಸ್ಟ್ಯಾಂಡ್‌ಗೆ ಮರಳಿ ಮೇಜಿನ ಮೇಲೆ ಸೂಚಕ ಮಾತ್ರ ಉಳಿಯುತ್ತದೆ!',
            ctaEn: 'Filter & Clear Table',
            ctaKn: 'ಸೋಸಿ ಮೇಜು ಸಿದ್ಧಪಡಿಸಿ',
          };
        case 'A4':
          return {
            counterEn: `${snapshot.hibiscusTestedCount}/${snapshot.totalSamples} tested`,
            counterKn: `${snapshot.hibiscusTestedCount}/${snapshot.totalSamples} ಪರೀಕ್ಷಿತ`,
            en: 'Only the Hibiscus Indicator & 3 Test Tubes are on the Center Table! Tap a tube on the table or pick from the Right Stand.',
            kn: 'ಮೇಜಿನ ಮೇಲೆ ಸೂಚಕ ಮತ್ತು 3 ಟ್ಯೂಬ್‌ಗಳು ಮಾತ್ರ ಇವೆ! ಟ್ಯೂಬ್ ಒತ್ತಿ ಪರೀಕ್ಷಿಸಿ ಅಥವಾ ಬಲ ಸ್ಟ್ಯಾಂಡ್‌ನಿಂದ ಆಯ್ಕೆ ಮಾಡಿ.',
            ctaEn: 'Drop in Next Tube',
            ctaKn: 'ಮುಂದಿನ ಟ್ಯೂಬ್‌ಗೆ ಹನಿ',
          };
      }
    }

    if (snapshot.tab === 'litmus') {
      if (!snapshot.litmusPrepared && snapshot.stationBTool === 'solution') {
        return {
          counterEn: 'Step 1 of 2',
          counterKn: 'ಹಂತ 1 / 2',
          en: 'Click Lichen Powder on the Left Stand to extract Litmus and place ONLY the Indicator bottle on the Center Table.',
          kn: 'ಲಿಟ್ಮಸ್ ದ್ರಾವಣ ತಯಾರಿಸಿ ಮಧ್ಯದ ಮೇಜಿನ ಮೇಲೆ ಸೂಚಕ ಬಾಟಲಿ ಇಡಲು ಎಡ ಸ್ಟ್ಯಾಂಡ್‌ನ ಕಲ್ಲುಹೂವು ಪುಡಿ ಕ್ಲಿಕ್ ಮಾಡಿ.',
          ctaEn: 'Extract Litmus',
          ctaKn: 'ಲಿಟ್ಮಸ್ ತಯಾರಿಸಿ',
        };
      }
      return {
        counterEn: `${snapshot.litmusTestedCount}/${snapshot.totalSamples} tested`,
        counterKn: `${snapshot.litmusTestedCount}/${snapshot.totalSamples} ಪರೀಕ್ಷಿತ`,
        en: 'Tap the 3 test tubes on the Center Table beside your indicator, or pick more tubes from the Right Stand!',
        kn: 'ಸೂಚಕದ ಪಕ್ಕ ಮಧ್ಯದ ಮೇಜಿನ ಮೇಲಿರುವ 3 ಟ್ಯೂಬ್‌ಗಳನ್ನು ಪರೀಕ್ಷಿಸಿ, ಅಥವಾ ಬಲ ಸ್ಟ್ಯಾಂಡ್‌ನಿಂದ ಆಯ್ಕೆ ಮಾಡಿ!',
        ctaEn: 'Test Next Sample',
        ctaKn: 'ಮುಂದಿನ ಪರೀಕ್ಷೆ',
      };
    }

    return {
      counterEn: `${snapshot.hibiscusTestedCount + snapshot.litmusTestedCount} tests`,
      counterKn: `${snapshot.hibiscusTestedCount + snapshot.litmusTestedCount} ಪರೀಕ್ಷೆಗಳು`,
      en: 'Compare results across Acids, Bases, and Neutral solutions in the Results Table.',
      kn: 'ಆಮ್ಲಗಳು, ಪ್ರತ್ಯಾಮ್ಲಗಳು ಮತ್ತು ತಟಸ್ಥ ದ್ರಾವಣಗಳ ಫಲಿತಾಂಶಗಳನ್ನು ಪಟ್ಟಿಯಲ್ಲಿ ಹೋಲಿಸಿ ನೋಡಿ.',
      ctaEn: 'Open Results Table',
      ctaKn: 'ಫಲಿತಾಂಶ ಪಟ್ಟಿ ತೆರೆಯಿರಿ',
    };
  }, [snapshot]);

  const stageOrder: HibiscusStage[] = ['A0', 'A1', 'A2', 'A3', 'A4'];
  const currentStageIndex = stageOrder.indexOf(snapshot.hibiscusStage);

  const toastStyles =
    toast?.type === 'acid'
      ? 'border-rose-400/50 bg-[#2a0a18]/95 text-rose-100'
      : toast?.type === 'base'
        ? 'border-emerald-400/50 bg-[#07261c]/95 text-emerald-100'
        : toast?.type === 'neutral'
          ? 'border-purple-400/50 bg-[#1c0c2b]/95 text-purple-100'
          : 'border-amber-400/50 bg-[#1e1708]/95 text-amber-100';

  const clampedTooltipX = Math.min(tooltip.x + 14, window.innerWidth - 260);
  const clampedTooltipY = Math.max(12, Math.min(tooltip.y - 12, window.innerHeight - 95));

  const busy = snapshot.animating || snapshot.batchRunning;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#06090e] text-slate-50">
      {/* Three.js WebGL Mount */}
      <div ref={canvasMountRef} className="absolute inset-0 z-1" />

      {/* Three.js CSS2D Labels Overlay */}
      <div
        ref={css2dRef}
        id="css2d-container"
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      />

      {/* Celebratory Confetti Overlay */}
      <canvas ref={confettiCanvasRef} className="pointer-events-none fixed inset-0 z-40" />

      {/* WebGL Context Lost Banner */}
      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06090e]/95 p-4 sm:p-6">
          <div className="max-w-md rounded-2xl border border-amber-400/40 bg-[#0d1424] p-5 text-center shadow-2xl">
            <h2 className="text-base font-semibold text-amber-200">
              <span className="en-text">3D Graphics Context Paused</span>
              <span className="both-sep"> · </span>
              <span className="kn-text">3D ಗ್ರಾಫಿಕ್ಸ್ ತಾತ್ಕಾಲಿಕವಾಗಿ ನಿಂತಿದೆ</span>
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              <span className="en-text">
                Your browser reclaimed the WebGL context. Click below to restore the chemistry bench.
              </span>
              <span className="both-sep"> · </span>
              <span className="kn-text">
                ಪ್ರಯೋಗಾಲಯವನ್ನು ಪುನಃ ತೆರೆಯಲು ಕೆಳಗಿನ ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ.
              </span>
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              <span className="en-text">Restore Lab</span>
              <span className="both-sep"> / </span>
              <span className="kn-text">ಮರುಸ್ಥಾಪಿಸಿ</span>
            </button>
          </div>
        </div>
      )}

      {/* PURE ACTIVITY MODE (Hide All Text = ON): Minimal Icon-Only Floating Bar */}
      {hideAllText ? (
        <div className="pointer-events-none fixed inset-x-0 top-2.5 z-30 flex items-center justify-between px-3 sm:px-5">
          <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/15 bg-[#0d1424]/92 p-1 shadow-xl">
            <button
              type="button"
              aria-label="Hibiscus Station"
              onClick={() => handleSelectTab('hibiscus')}
              className={`rounded-lg px-2.5 py-1.5 text-sm transition ${
                snapshot.tab === 'hibiscus' ? 'bg-rose-600' : 'hover:bg-white/10'
              }`}
            >
              🌺
            </button>
            <button
              type="button"
              aria-label="Litmus Station"
              onClick={() => handleSelectTab('litmus')}
              className={`rounded-lg px-2.5 py-1.5 text-sm transition ${
                snapshot.tab === 'litmus' ? 'bg-indigo-600' : 'hover:bg-white/10'
              }`}
            >
              📜
            </button>
            <button
              type="button"
              aria-label="Results Matrix"
              onClick={() => handleSelectTab('compare')}
              className={`rounded-lg px-2.5 py-1.5 text-sm transition ${
                snapshot.tab === 'compare' ? 'bg-emerald-600' : 'hover:bg-white/10'
              }`}
            >
              📊
            </button>
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0d1424]/92 p-1 shadow-xl">
            {snapshot.tab !== 'compare' && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  aria-label="Next 3 Shelf Tubes"
                  title="Bring next 3 tubes from Shelf 1"
                  onClick={() => controllerRef.current?.cycleNextTubeBatch()}
                  className="rounded-lg border border-sky-400/35 bg-sky-500/15 px-2.5 py-1.5 text-xs transition hover:bg-sky-500/25 disabled:opacity-50"
                >
                  🔄
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-label="Do Next Step"
                  onClick={() => controllerRef.current?.runAutoStep()}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
                >
                  ▶
                </button>
              </>
            )}
            <button
              type="button"
              aria-label="Reset Camera"
              onClick={() => controllerRef.current?.resetCameraView()}
              className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs transition hover:bg-white/15"
            >
              🎥
            </button>
            <button
              type="button"
              aria-label="Reset Lab"
              onClick={handleResetAll}
              className="rounded-lg border border-rose-400/35 bg-rose-500/15 px-2.5 py-1.5 text-xs transition hover:bg-rose-500/25"
            >
              ↺
            </button>
            <button
              type="button"
              onClick={() => setHideAllText(false)}
              title="Show All Text (T)"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 transition hover:bg-emerald-400"
            >
              <span>👁️</span>
              <span className="en-text">Show Text</span>
              <span className="both-sep">/</span>
              <span className="kn-text">ಪಠ್ಯ ತೋರಿಸಿ</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Top Navigation & Utility Bar (Mobile + Desktop Responsive) */}
          <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
              {/* Brand Title (Compact icon on mobile, full bilingual on md+) */}
              <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/12 bg-[#0d1424]/94 px-2.5 py-1.5 shadow-lg sm:px-3.5 sm:py-2">
                <span className="text-base leading-none sm:text-lg" aria-hidden="true">
                  🧪
                </span>
                <div className="hidden leading-tight md:block">
                  <div className="en-text text-xs font-bold tracking-tight text-slate-50 sm:text-sm">
                    Natural Indicators Lab
                  </div>
                  <div className="kn-text text-[11px] font-semibold text-amber-300/95">
                    ನೈಸರ್ಗಿಕ ಸೂಚಕಗಳ ಪ್ರಯೋಗಾಲಯ
                  </div>
                </div>
              </div>

              {/* Station Switcher */}
              <nav
                aria-label="Laboratory Stations"
                className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-white/12 bg-[#0d1424]/94 p-1 shadow-lg sm:gap-1"
              >
                {(
                  [
                    { id: 'hibiscus', icon: '🌺', en: 'Hibiscus', kn: 'ದಾಸವಾಳ' },
                    { id: 'litmus', icon: '📜', en: 'Litmus', kn: 'ಲಿಟ್ಮಸ್' },
                    { id: 'compare', icon: '📊', en: 'Compare', kn: 'ತುಲನೆ' },
                  ] as const
                ).map((item) => {
                  const active = snapshot.tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      className={`flex items-center gap-1 whitespace-nowrap shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold transition sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs ${
                        active
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      <span className="en-text">{item.en}</span>
                      <span className="both-sep hidden opacity-70 sm:inline">/</span>
                      <span className="kn-text hidden sm:inline">{item.kn}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Right Bar: Language Shift + Hide All Text + Desktop Utilities / Mobile Menu Button */}
              <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/12 bg-[#0d1424]/94 p-1 shadow-lg sm:gap-1.5 sm:p-1.5">
                {/* English & Kannada Language Shift Control */}
                <div
                  role="group"
                  aria-label="Language Switcher"
                  className="flex items-center rounded-lg border border-amber-400/35 bg-amber-500/10 p-0.5"
                >
                  {(
                    [
                      { mode: 'en', label: 'EN' },
                      { mode: 'kn', label: 'ಕನ್ನಡ' },
                      { mode: 'both', label: 'Both' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() => setLangMode(opt.mode)}
                      title="Shift language between English, Kannada, or Both (Shortcut: L)"
                      className={`whitespace-nowrap shrink-0 rounded-md px-1.5 py-1 text-[10.5px] font-bold transition sm:px-2 sm:text-[11px] ${
                        langMode === opt.mode
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'text-amber-100/80 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Hide All Text Button (Always accessible on Mobile + Desktop) */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setHideAllText(true);
                  }}
                  title="Hide all text overlays for unobstructed 3D activity (Shortcut: T)"
                  className="flex items-center gap-1 whitespace-nowrap shrink-0 rounded-lg border border-emerald-400/45 bg-emerald-500/15 px-2 py-1 text-[10.5px] font-bold text-emerald-200 transition hover:bg-emerald-500/25 sm:px-2.5 sm:py-1.5 sm:text-[11px]"
                >
                  <span>🙈</span>
                  <span className="en-text">Hide Text</span>
                  <span className="both-sep hidden lg:inline">/</span>
                  <span className="kn-text hidden lg:inline">ಪಠ್ಯ ಮರೆಮಾಡಿ</span>
                </button>

                {/* Desktop Inline Secondary Utilities */}
                <div className="hidden items-center gap-1.5 xl:flex">
                  <button
                    type="button"
                    onClick={() => setLabelsClean((v) => !v)}
                    className={`whitespace-nowrap shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                      labelsClean
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                        : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <span className="en-text">{labelsClean ? 'Labels: Clean' : 'Labels: Full'}</span>
                    <span className="both-sep"> / </span>
                    <span className="kn-text">{labelsClean ? 'ಹೆಸರು: ಸರಳ' : 'ಹೆಸರು: ಪೂರ್ಣ'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => controllerRef.current?.toggleRoster()}
                    className="whitespace-nowrap shrink-0 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold tabular-nums text-slate-200 transition hover:bg-white/10"
                  >
                    <span className="en-text">
                      {snapshot.isExpandedRoster ? '13 Samples' : '8 Samples'}
                    </span>
                    <span className="both-sep"> / </span>
                    <span className="kn-text">
                      {snapshot.isExpandedRoster ? '13 ಮಾದರಿಗಳು' : '8 ಮಾದರಿಗಳು'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => controllerRef.current?.resetCameraView()}
                    className="whitespace-nowrap shrink-0 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    <span className="en-text">View</span>
                    <span className="both-sep"> / </span>
                    <span className="kn-text">ನೋಟ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleAudio}
                    className={`whitespace-nowrap shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                      soundEnabled
                        ? 'border-sky-400/40 bg-sky-500/15 text-sky-200'
                        : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{soundEnabled ? '🔊 ' : '🔇 '}</span>
                    <span className="en-text">{soundEnabled ? 'Sound' : 'Muted'}</span>
                    <span className="both-sep">/</span>
                    <span className="kn-text">{soundEnabled ? 'ಶಬ್ದ' : 'ಮ್ಯೂಟ್'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="whitespace-nowrap shrink-0 rounded-lg border border-rose-500/35 bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-500/25"
                  >
                    <span className="en-text">Reset</span>
                    <span className="both-sep"> / </span>
                    <span className="kn-text">ಮರುಹೊಂದಿಸಿ</span>
                  </button>
                </div>

                {/* Compact More Menu Trigger for Mobile / Tablet (< xl) */}
                <button
                  type="button"
                  aria-label="More Lab Settings"
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  className="flex items-center gap-1 whitespace-nowrap shrink-0 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-100 transition hover:bg-white/20 xl:hidden"
                >
                  <span>⚙️</span>
                </button>
              </div>
            </div>

            {/* Collapsible Mobile / Tablet Utility Drawer */}
            {mobileMenuOpen && (
              <div className="pointer-events-auto ml-auto flex flex-wrap items-center justify-end gap-1.5 rounded-xl border border-white/15 bg-[#0d1424]/98 p-2 shadow-2xl xl:hidden">
                <button
                  type="button"
                  onClick={() => setLabelsClean((v) => !v)}
                  className={`whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                    labelsClean
                      ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                      : 'border-white/15 bg-white/5 text-slate-200'
                  }`}
                >
                  <span className="en-text">{labelsClean ? 'Labels: Clean' : 'Labels: Full'}</span>
                  <span className="both-sep"> / </span>
                  <span className="kn-text">{labelsClean ? 'ಹೆಸರು: ಸರಳ' : 'ಹೆಸರು: ಪೂರ್ಣ'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => controllerRef.current?.toggleRoster()}
                  className="whitespace-nowrap rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold tabular-nums text-slate-200"
                >
                  <span className="en-text">
                    {snapshot.isExpandedRoster ? '13 Samples' : '8 Samples'}
                  </span>
                  <span className="both-sep"> / </span>
                  <span className="kn-text">
                    {snapshot.isExpandedRoster ? '13 ಮಾದರಿಗಳು' : '8 ಮಾದರಿಗಳು'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    controllerRef.current?.resetCameraView();
                    setMobileMenuOpen(false);
                  }}
                  className="whitespace-nowrap rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200"
                >
                  <span className="en-text">Reset View</span>
                  <span className="both-sep"> / </span>
                  <span className="kn-text">ನೋಟ</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleAudio}
                  className={`whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                    soundEnabled
                      ? 'border-sky-400/40 bg-sky-500/15 text-sky-200'
                      : 'border-white/15 bg-white/5 text-slate-300'
                  }`}
                >
                  <span>{soundEnabled ? '🔊 ' : '🔇 '}</span>
                  <span className="en-text">{soundEnabled ? 'Sound' : 'Muted'}</span>
                  <span className="both-sep">/</span>
                  <span className="kn-text">{soundEnabled ? 'ಶಬ್ದ' : 'ಮ್ಯೂಟ್'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetAll}
                  className="whitespace-nowrap rounded-lg border border-rose-500/35 bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-rose-200"
                >
                  <span className="en-text">Reset Lab</span>
                  <span className="both-sep"> / </span>
                  <span className="kn-text">ಮರುಹೊಂದಿಸಿ</span>
                </button>
              </div>
            )}
          </header>

          {/* Auto-Fading Activity Toast */}
          {toast && (
            <div className="pointer-events-none fixed inset-x-0 top-14 z-30 flex justify-center px-3 sm:top-16 sm:px-4">
              <div
                key={toast.id}
                className={`animate-toast-pop max-w-md rounded-xl border px-3 py-1.5 text-center text-[11px] font-semibold shadow-2xl sm:px-4 sm:py-2 sm:text-xs ${toastStyles}`}
              >
                <span className="en-text">{toast.textEn}</span>
                <span className="both-sep"> · </span>
                <span className="kn-text">{toast.textKn}</span>
              </div>
            </div>
          )}

          {/* Pointer Hover Tooltip (Hidden on touch / when text hidden) */}
          {tooltip.visible && !modalOpen && (
            <div
              className="pointer-events-none fixed z-30 hidden max-w-[250px] rounded-xl border border-white/15 bg-[#0b1120]/95 px-3 py-2 shadow-xl sm:block"
              style={{
                left: `${clampedTooltipX}px`,
                top: `${clampedTooltipY}px`,
              }}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                {tooltip.accentColor && (
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/60"
                    style={{ backgroundColor: tooltip.accentColor }}
                  />
                )}
                <span className="truncate">
                  <span className="en-text">{tooltip.titleEn}</span>
                  <span className="both-sep"> · </span>
                  <span className="kn-text">{tooltip.titleKn}</span>
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-300">
                <div className="en-text">{tooltip.subtitleEn}</div>
                <div className="kn-text">{tooltip.subtitleKn}</div>
              </div>
            </div>
          )}

          {/* Collapsible Bottom Activity Dock (Mobile + Desktop Responsive) */}
          <div className="pointer-events-none fixed inset-x-0 bottom-2 z-20 flex flex-col items-center px-2 sm:bottom-3 sm:px-6">
            {hudCollapsed ? (
              <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0d1424]/94 p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={() => setHudCollapsed(false)}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/20"
                >
                  <span className="en-text">Show Controls</span>
                  <span className="both-sep">/</span>
                  <span className="kn-text">ನಿಯಂತ್ರಣ ತೋರಿಸಿ</span>
                </button>
                {snapshot.tab !== 'compare' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => controllerRef.current?.runAutoStep()}
                    className="whitespace-nowrap rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
                  >
                    <span>▶ </span>
                    <span className="en-text">{guidance.ctaEn}</span>
                    <span className="both-sep">/</span>
                    <span className="kn-text">{guidance.ctaKn}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="pointer-events-auto w-full max-w-5xl rounded-2xl border border-white/12 bg-[#0d1424]/94 px-3 py-2 shadow-2xl sm:px-4 sm:py-3">
                {/* Step Progress & Tool Mode Row (Horizontally scrollable on narrow phones) */}
                <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 sm:pb-2">
                  <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto">
                    {snapshot.tab === 'hibiscus' && (
                      <>
                        {HIBISCUS_STEPS.map((step, idx) => {
                          const isDone = idx < currentStageIndex;
                          const isCurrent =
                            idx === currentStageIndex && snapshot.stationATool === 'dropper';
                          return (
                            <span
                              key={step.stage}
                              className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-0.5 text-[10.5px] font-semibold tabular-nums transition sm:py-1 sm:text-[11px] ${
                                isDone
                                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                                  : isCurrent
                                    ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                                    : 'border-white/10 bg-white/5 text-slate-400'
                              }`}
                            >
                              {isDone && <span aria-hidden="true">✓</span>}
                              <span className="en-text">{step.en}</span>
                              <span className="both-sep">/</span>
                              <span className="kn-text">{step.kn}</span>
                            </span>
                          );
                        })}

                        {/* Station A Tool Switcher: Dropper vs Petal-Rubbed Paper */}
                        <div className="ml-1 flex shrink-0 items-center gap-1 rounded-lg border border-white/12 bg-slate-900/80 p-0.5">
                          {(
                            [
                              { id: 'dropper', icon: '💧', en: 'Dropper', kn: 'ಡ್ರಾಪರ್' },
                              { id: 'paper', icon: '🌺📄', en: 'Petal Paper', kn: 'ದಳ ಕಾಗದ' },
                            ] as Array<{ id: StationATool; icon: string; en: string; kn: string }>
                          ).map((tool) => (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={() => controllerRef.current?.setStationATool(tool.id)}
                              className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[10.5px] font-semibold transition sm:text-[11px] ${
                                snapshot.stationATool === tool.id
                                  ? 'bg-rose-600 text-white'
                                  : 'text-slate-300 hover:text-white'
                              }`}
                            >
                              {tool.icon}{' '}
                              <span className="en-text">{tool.en}</span>
                              <span className="both-sep">/</span>
                              <span className="kn-text">{tool.kn}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {snapshot.tab === 'litmus' && (
                      <>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-0.5 text-[10.5px] font-semibold sm:py-1 sm:text-[11px] ${
                            snapshot.litmusPrepared
                              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                              : 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                          }`}
                        >
                          {snapshot.litmusPrepared && <span aria-hidden="true">✓</span>}
                          <span className="en-text">1. Lichen Extract</span>
                          <span className="both-sep">/</span>
                          <span className="kn-text">1. ಲಿಟ್ಮಸ್ ಸಾರ</span>
                        </span>

                        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/12 bg-slate-900/80 p-0.5">
                          {(
                            [
                              { id: 'bluePaper', icon: '🔵', en: 'Blue Paper', kn: 'ನೀಲಿ ಕಾಗದ' },
                              { id: 'redPaper', icon: '🔴', en: 'Red Paper', kn: 'ಕೆಂಪು ಕಾಗದ' },
                              { id: 'solution', icon: '💧', en: 'Dropper', kn: 'ಡ್ರಾಪರ್' },
                            ] as Array<{ id: StationBTool; icon: string; en: string; kn: string }>
                          ).map((tool) => (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={() => controllerRef.current?.setStationBTool(tool.id)}
                              className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[10.5px] font-semibold transition sm:text-[11px] ${
                                snapshot.stationBTool === tool.id
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-slate-300 hover:text-white'
                              }`}
                            >
                              {tool.icon}{' '}
                              <span className="en-text">{tool.en}</span>
                              <span className="both-sep">/</span>
                              <span className="kn-text">{tool.kn}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {snapshot.tab === 'compare' && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-400/50 bg-indigo-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-100 sm:py-1">
                        <span className="en-text">Compare Both Indicators</span>
                        <span className="both-sep">/</span>
                        <span className="kn-text">ಸೂಚಕಗಳ ತುಲನಾತ್ಮಕ ಅಧ್ಯಯನ</span>
                      </span>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <span className="hidden font-mono text-[11px] font-semibold tabular-nums text-slate-300 md:inline">
                      💧 {snapshot.hibiscusTestedCount}/{snapshot.totalSamples} · 📄{' '}
                      {snapshot.hibiscusPaperTestedCount}/{snapshot.totalSamples} · 📜{' '}
                      {snapshot.litmusTestedCount}/{snapshot.totalSamples}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHudCollapsed(true)}
                      className="whitespace-nowrap rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10.5px] font-semibold text-slate-300 transition hover:bg-white/10 sm:text-[11px]"
                    >
                      <span className="en-text">Minimize</span>
                      <span className="both-sep hidden sm:inline"> / </span>
                      <span className="kn-text hidden sm:inline">ಕುಗ್ಗಿಸಿ</span>
                    </button>
                  </div>
                </div>

                {/* Guidance Text & Actions (Compact & scrollable buttons on mobile) */}
                <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-center lg:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-amber-200">
                        <span className="en-text">{guidance.counterEn}</span>
                        <span className="both-sep"> · </span>
                        <span className="kn-text">{guidance.counterKn}</span>
                      </span>
                      <span className="rounded bg-sky-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-sky-200">
                        <span className="en-text">
                          Table: {snapshot.activeTubeIds.map((id) => `#${id + 1}`).join(', ')}
                        </span>
                        <span className="both-sep"> · </span>
                        <span className="kn-text">
                          ಮೇಜು: {snapshot.activeTubeIds.map((id) => `#${id + 1}`).join(', ')}
                        </span>
                      </span>
                      <span className="font-mono text-[10px] font-semibold tabular-nums text-slate-400 md:hidden">
                        💧{snapshot.hibiscusTestedCount}/{snapshot.totalSamples} · 📄
                        {snapshot.hibiscusPaperTestedCount}/{snapshot.totalSamples} · 📜
                        {snapshot.litmusTestedCount}/{snapshot.totalSamples}
                      </span>
                      {snapshot.animating &&
                        (snapshot.animatingLabelEn || snapshot.animatingLabelKn) && (
                          <span className="text-[10.5px] font-semibold text-amber-300 sm:text-[11px]">
                            <span className="en-text">{snapshot.animatingLabelEn}</span>
                            <span className="both-sep"> · </span>
                            <span className="kn-text">{snapshot.animatingLabelKn}</span>
                          </span>
                        )}
                    </div>
                    <p className="en-text text-[11px] font-medium leading-snug text-slate-100 sm:text-xs">
                      {guidance.en}
                    </p>
                    <p className="kn-text mt-0.5 text-[10.5px] leading-snug text-slate-300 sm:text-[11px]">
                      {guidance.kn}
                    </p>
                  </div>

                  <div className="no-scrollbar flex shrink-0 items-center gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:gap-2 sm:pb-0">
                    {snapshot.tab !== 'compare' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => controllerRef.current?.cycleNextTubeBatch()}
                        title="Swap next 3 sample tubes from the Right Stand onto the Center Table"
                        className="whitespace-nowrap shrink-0 rounded-xl border border-sky-400/40 bg-sky-500/15 px-2.5 py-1.5 text-[10.5px] font-semibold text-sky-100 transition hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-45 sm:px-3 sm:py-2 sm:text-[11px]"
                      >
                        🔄{' '}
                        <span className="en-text">Next 3</span>
                        <span className="both-sep"> / </span>
                        <span className="kn-text">ಮುಂದಿನ 3</span>
                      </button>
                    )}

                    {snapshot.tab === 'hibiscus' && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => controllerRef.current?.testAll('hibiscusDropper')}
                          className="whitespace-nowrap shrink-0 rounded-xl border border-rose-400/40 bg-rose-500/15 px-2.5 py-1.5 text-[10.5px] font-semibold text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-45 sm:px-3 sm:py-2 sm:text-[11px]"
                        >
                          💧{' '}
                          <span className="en-text">Test All (Dropper)</span>
                          <span className="both-sep"> / </span>
                          <span className="kn-text">ಎಲ್ಲಾ (ಡ್ರಾಪರ್)</span>
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => controllerRef.current?.testAll('hibiscusPaper')}
                          className="whitespace-nowrap shrink-0 rounded-xl border border-pink-400/40 bg-pink-500/15 px-2.5 py-1.5 text-[10.5px] font-semibold text-pink-100 transition hover:bg-pink-500/25 disabled:cursor-not-allowed disabled:opacity-45 sm:px-3 sm:py-2 sm:text-[11px]"
                        >
                          📄{' '}
                          <span className="en-text">Test All (Paper)</span>
                          <span className="both-sep"> / </span>
                          <span className="kn-text">ಎಲ್ಲಾ (ದಳ ಕಾಗದ)</span>
                        </button>
                      </>
                    )}

                    {snapshot.tab === 'litmus' && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => controllerRef.current?.testAll('litmusBlue')}
                          className="whitespace-nowrap shrink-0 rounded-xl border border-blue-400/40 bg-blue-500/15 px-2.5 py-1.5 text-[10.5px] font-semibold text-blue-100 transition hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-45 sm:py-2 sm:text-[11px]"
                        >
                          🔵{' '}
                          <span className="en-text">All Blue</span>
                          <span className="both-sep">/</span>
                          <span className="kn-text">ಎಲ್ಲಾ ನೀಲಿ</span>
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => controllerRef.current?.testAll('litmusRed')}
                          className="whitespace-nowrap shrink-0 rounded-xl border border-red-400/40 bg-red-500/15 px-2.5 py-1.5 text-[10.5px] font-semibold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-45 sm:py-2 sm:text-[11px]"
                        >
                          🔴{' '}
                          <span className="en-text">All Red</span>
                          <span className="both-sep">/</span>
                          <span className="kn-text">ಎಲ್ಲಾ ಕೆಂಪು</span>
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => controllerRef.current?.testAll('litmusSolution')}
                          className="whitespace-nowrap shrink-0 rounded-xl border border-purple-400/40 bg-purple-500/15 px-2.5 py-1.5 text-[10.5px] font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-45 sm:py-2 sm:text-[11px]"
                        >
                          💧{' '}
                          <span className="en-text">All Solution</span>
                          <span className="both-sep">/</span>
                          <span className="kn-text">ಎಲ್ಲಾ ದ್ರಾವಣ</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="whitespace-nowrap shrink-0 rounded-xl border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-slate-100 transition hover:bg-white/15 sm:px-3 sm:py-2 sm:text-xs"
                    >
                      <span className="en-text">Results</span>
                      <span className="both-sep"> / </span>
                      <span className="kn-text">ಫಲಿತಾಂಶ</span>
                    </button>

                    {snapshot.tab === 'compare' ? (
                      <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className="whitespace-nowrap shrink-0 rounded-xl bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-md transition hover:bg-indigo-500 sm:px-4 sm:py-2 sm:text-xs"
                      >
                        <span className="en-text">{guidance.ctaEn}</span>
                        <span className="both-sep"> / </span>
                        <span className="kn-text">{guidance.ctaKn}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => controllerRef.current?.runAutoStep()}
                        className="whitespace-nowrap shrink-0 rounded-xl bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 shadow-md transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-2 sm:text-xs"
                      >
                        {busy ? (
                          <>
                            <span className="en-text">Running...</span>
                            <span className="both-sep"> / </span>
                            <span className="kn-text">ನಡೆಯುತ್ತಿದೆ...</span>
                          </>
                        ) : (
                          <>
                            <span>▶ </span>
                            <span className="en-text">{guidance.ctaEn}</span>
                            <span className="both-sep"> / </span>
                            <span className="kn-text">{guidance.ctaKn}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Comparison Matrix Modal */}
      <ComparisonModal
        open={modalOpen}
        substances={activeSubstances}
        testRecords={snapshot.testRecords}
        onClose={() => setModalOpen(false)}
        onFocusTube={(index) => controllerRef.current?.focusTube(index)}
        onReset={handleResetAll}
      />
    </div>
  );
}
