export type SubstanceCategory = 'acid' | 'base' | 'neutral';
export type StationTab = 'hibiscus' | 'litmus' | 'compare';
export type HibiscusStage = 'A0' | 'A1' | 'A2' | 'A3' | 'A4';
export type LangMode = 'both' | 'en' | 'kn';
export type StationATool = 'dropper' | 'paper';
export type StationBTool = 'bluePaper' | 'redPaper' | 'solution';

export interface Substance {
  id: number;
  nameEn: string;
  nameKn: string;
  typeEn: string;
  typeKn: string;
  category: SubstanceCategory;
  initialColorHex: string;
  initialNameEn: string;
  initialNameKn: string;
  hibiscusColorHex: string;
  hibiscusResultEn: string;
  hibiscusResultKn: string;
  hibiscusPaperResultEn: string;
  hibiscusPaperResultKn: string;
  litmusPaperRedEn: string;
  litmusPaperRedKn: string;
  litmusPaperBlueEn: string;
  litmusPaperBlueKn: string;
  litmusSolutionHex: string;
  litmusSolutionResultEn: string;
  litmusSolutionResultKn: string;
}

export interface SubstanceTestRecord {
  hibiscusTested: boolean;
  hibiscusMix: number;
  hibiscusPaperTested: boolean;
  litmusPaperRedTested: boolean;
  litmusPaperBlueTested: boolean;
  litmusSolutionTested: boolean;
  litmusSolutionMix: number;
}

export interface LabSnapshot {
  tab: StationTab;
  mortarOnTable: boolean;
  petalsPlucked: number;
  totalPetals: number;
  crushCount: number;
  waterAdded: boolean;
  isFiltered: boolean;
  hibiscusPaperPrepared: boolean;
  litmusPrepared: boolean;
  hibiscusStage: HibiscusStage;
  stationATool: StationATool;
  stationBTool: StationBTool;
  animating: boolean;
  batchRunning: boolean;
  animatingLabelEn: string;
  animatingLabelKn: string;
  isExpandedRoster: boolean;
  hibiscusTestedCount: number;
  hibiscusPaperTestedCount: number;
  litmusTestedCount: number;
  litmusSolutionTestedCount: number;
  totalSamples: number;
  activeTubeIds: number[];
  testRecords: Record<number, SubstanceTestRecord>;
}

export const ALL_SUBSTANCES: Substance[] = [
  {
    id: 0,
    nameEn: 'Lemon Juice',
    nameKn: 'ನಿಂಬೆ ರಸ',
    typeEn: 'Acid',
    typeKn: 'ಆಮ್ಲ',
    category: 'acid',
    initialColorHex: '#fef08a',
    initialNameEn: 'Pale Straw',
    initialNameKn: 'ತಿಳಿ ಹಳದಿ',
    hibiscusColorHex: '#e11d48',
    hibiscusResultEn: 'Magenta / Dark Pink',
    hibiscusResultKn: 'ಗಾಢ ಗುಲಾಬಿ (ಮೆಜೆಂಟಾ)',
    hibiscusPaperResultEn: 'Turns Dark Pink',
    hibiscusPaperResultKn: 'ಗಾಢ ಗುಲಾಬಿಯಾಗುತ್ತದೆ',
    litmusPaperRedEn: 'Stays Red',
    litmusPaperRedKn: 'ಕೆಂಪಾಗಿಯೇ ಉಳಿಯುತ್ತದೆ',
    litmusPaperBlueEn: 'Turns Red',
    litmusPaperBlueKn: 'ಕೆಂಪಾಗುತ್ತದೆ',
    litmusSolutionHex: '#dc2626',
    litmusSolutionResultEn: 'Red',
    litmusSolutionResultKn: 'ಕೆಂಪು ಬಣ್ಣ',
  },
  {
    id: 1,
    nameEn: 'Vinegar',
    nameKn: 'ವಿನೆಗರ್',
    typeEn: 'Acid',
    typeKn: 'ಆಮ್ಲ',
    category: 'acid',
    initialColorHex: '#f8fafc',
    initialNameEn: 'Clear',
    initialNameKn: 'ಸ್ಪಷ್ಟ ನೀರು',
    hibiscusColorHex: '#ec4899',
    hibiscusResultEn: 'Bright Magenta',
    hibiscusResultKn: 'ಗಾಢ ಗುಲಾಬಿ ಬಣ್ಣ',
    hibiscusPaperResultEn: 'Turns Bright Pink',
    hibiscusPaperResultKn: 'ಗಾಢ ಗುಲಾಬಿಯಾಗುತ್ತದೆ',
    litmusPaperRedEn: 'Stays Red',
    litmusPaperRedKn: 'ಕೆಂಪಾಗಿಯೇ ಉಳಿಯುತ್ತದೆ',
    litmusPaperBlueEn: 'Turns Red',
    litmusPaperBlueKn: 'ಕೆಂಪಾಗುತ್ತದೆ',
    litmusSolutionHex: '#e11d48',
    litmusSolutionResultEn: 'Red',
    litmusSolutionResultKn: 'ಕೆಂಪು ಬಣ್ಣ',
  },
  {
    id: 2,
    nameEn: 'Dilute HCl',
    nameKn: 'ಸಾರರಿಕ್ತ HCl',
    typeEn: 'Strong Acid',
    typeKn: 'ಪ್ರಬಲ ಆಮ್ಲ',
    category: 'acid',
    initialColorHex: '#f1f5f9',
    initialNameEn: 'Colorless',
    initialNameKn: 'ಬಣ್ಣರಹಿತ',
    hibiscusColorHex: '#be123c',
    hibiscusResultEn: 'Intense Magenta',
    hibiscusResultKn: 'ತೀವ್ರ ಗುಲಾಬಿ ಬಣ್ಣ',
    hibiscusPaperResultEn: 'Turns Deep Pink',
    hibiscusPaperResultKn: 'ತೀವ್ರ ಗುಲಾಬಿಯಾಗುತ್ತದೆ',
    litmusPaperRedEn: 'Stays Red',
    litmusPaperRedKn: 'ಕೆಂಪಾಗಿಯೇ ಉಳಿಯುತ್ತದೆ',
    litmusPaperBlueEn: 'Turns Red',
    litmusPaperBlueKn: 'ಕೆಂಪಾಗುತ್ತದೆ',
    litmusSolutionHex: '#b91c1c',
    litmusSolutionResultEn: 'Bright Red',
    litmusSolutionResultKn: 'ಪ್ರಕಾಶಮಾನ ಕೆಂಪು',
  },
  {
    id: 3,
    nameEn: 'Baking Soda',
    nameKn: 'ಅಡುಗೆ ಸೋಡಾ ದ್ರಾವಣ',
    typeEn: 'Base',
    typeKn: 'ಪ್ರತ್ಯಾಮ್ಲ',
    category: 'base',
    initialColorHex: '#f8fafc',
    initialNameEn: 'Hazy White',
    initialNameKn: 'ತಿಳಿ ಬಿಳಿ',
    hibiscusColorHex: '#059669',
    hibiscusResultEn: 'Deep Green',
    hibiscusResultKn: 'ಗಾಢ ಹಸಿರು',
    hibiscusPaperResultEn: 'Turns Green',
    hibiscusPaperResultKn: 'ಹಸಿರು ಬಣ್ಣಕ್ಕೆ ತಿರುಗುತ್ತದೆ',
    litmusPaperRedEn: 'Turns Blue',
    litmusPaperRedKn: 'ನೀಲಿಯಾಗುತ್ತದೆ',
    litmusPaperBlueEn: 'Stays Blue',
    litmusPaperBlueKn: 'ನೀಲಿಯಾಗಿಯೇ ಉಳಿಯುತ್ತದೆ',
    litmusSolutionHex: '#2563eb',
    litmusSolutionResultEn: 'Blue',
    litmusSolutionResultKn: 'ನೀಲಿ ಬಣ್ಣ',
  },
  {
    id: 4,
    nameEn: 'Soap Solution',
    nameKn: 'ಸೋಪು ದ್ರಾವಣ',
    typeEn: 'Base',
    typeKn: 'ಪ್ರತ್ಯಾಮ್ಲ',
    category: 'base',
    initialColorHex: '#e2e8f0',
    initialNameEn: 'Cloudy White',
    initialNameKn: 'ಮಂದ ಬಿಳಿ',
    hibiscusColorHex: '#10b981',
    hibiscusResultEn: 'Emerald Green',
    hibiscusResultKn: 'ಹಸಿರು ಬಣ್ಣ',
    hibiscusPaperResultEn: 'Turns Green',
    hibiscusPaperResultKn: 'ಹಸಿರು ಬಣ್ಣಕ್ಕೆ ತಿರುಗುತ್ತದೆ',
    litmusPaperRedEn: 'Turns Blue',
    litmusPaperRedKn: 'ನೀಲಿಯಾಗುತ್ತದೆ',
    litmusPaperBlueEn: 'Stays Blue',
    litmusPaperBlueKn: 'ನೀಲಿಯಾಗಿಯೇ ಉಳಿಯುತ್ತದೆ',
    litmusSolutionHex: '#1d4ed8',
    litmusSolutionResultEn: 'Blue',
    litmusSolutionResultKn: 'ನೀಲಿ ಬಣ್ಣ',
  },
  {
    id: 5,
    nameEn: 'Dilute NaOH',
    nameKn: 'ಸಾರರಿಕ್ತ NaOH',
    typeEn: 'Strong Base',
    typeKn: 'ಪ್ರಬಲ ಪ್ರತ್ಯಾಮ್ಲ',
    category: 'base',
    initialColorHex: '#f8fafc',
    initialNameEn: 'Clear',
    initialNameKn: 'ಸ್ಪಷ್ಟ ನೀರು',
    hibiscusColorHex: '#047857',
    hibiscusResultEn: 'Dark Forest Green',
    hibiscusResultKn: 'ಗಾಢ ಹಸಿರು',
    hibiscusPaperResultEn: 'Turns Dark Green',
    hibiscusPaperResultKn: 'ಗಾಢ ಹಸಿರಾಗುತ್ತದೆ',
    litmusPaperRedEn: 'Turns Blue',
    litmusPaperRedKn: 'ನೀಲಿಯಾಗುತ್ತದೆ',
    litmusPaperBlueEn: 'Stays Blue',
    litmusPaperBlueKn: 'ನೀಲಿಯಾಗಿಯೇ ಉಳಿಯುತ್ತದೆ',
    litmusSolutionHex: '#1e40af',
    litmusSolutionResultEn: 'Royal Blue',
    litmusSolutionResultKn: 'ಗಾಢ ರಾಜನೀಲಿ',
  },
  {
    id: 6,
    nameEn: 'Pure Water',
    nameKn: 'ಶುದ್ಧ ನೀರು',
    typeEn: 'Neutral',
    typeKn: 'ತಟಸ್ಥ',
    category: 'neutral',
    initialColorHex: '#f0f9ff',
    initialNameEn: 'Colorless',
    initialNameKn: 'ಬಣ್ಣರಹಿತ',
    hibiscusColorHex: '#881337',
    hibiscusResultEn: 'Reddish-Purple (No Change)',
    hibiscusResultKn: 'ಬದಲಾವಣೆಯಿಲ್ಲ (ನೇರಳೆ-ಕೆಂಪು)',
    hibiscusPaperResultEn: 'No Change',
    hibiscusPaperResultKn: 'ಬದಲಾವಣೆಯಿಲ್ಲ',
    litmusPaperRedEn: 'No Change (Red)',
    litmusPaperRedKn: 'ಬದಲಾವಣೆಯಿಲ್ಲ',
    litmusPaperBlueEn: 'No Change (Blue)',
    litmusPaperBlueKn: 'ಬದಲಾವಣೆಯಿಲ್ಲ',
    litmusSolutionHex: '#7c3aed',
    litmusSolutionResultEn: 'Purple (No Change)',
    litmusSolutionResultKn: 'ನೇರಳೆ (ಬದಲಾವಣೆಯಿಲ್ಲ)',
  },
  {
    id: 7,
    nameEn: 'Milk',
    nameKn: 'ಹಾಲು',
    typeEn: 'Mild Acid',
    typeKn: 'ಸೌಮ್ಯ ಆಮ್ಲ',
    category: 'acid',
    initialColorHex: '#ffffff',
    initialNameEn: 'Opaque White',
    initialNameKn: 'ಹಾಲು ಬಿಳಿ',
    hibiscusColorHex: '#f472b6',
    hibiscusResultEn: 'Light Pink Tint',
    hibiscusResultKn: 'ತಿಳಿ ಗುಲಾಬಿ ಬಣ್ಣ',
    hibiscusPaperResultEn: 'Turns Light Pink',
    hibiscusPaperResultKn: 'ತಿಳಿ ಗುಲಾಬಿಯಾಗುತ್ತದೆ',
    litmusPaperRedEn: 'Stays Red',
    litmusPaperRedKn: 'ಕೆಂಪಾಗಿಯೇ ಉಳಿಯುತ್ತದೆ',
    litmusPaperBlueEn: 'Turns Pinkish-Red',
    litmusPaperBlueKn: 'ತಿಳಿ ಕೆಂಪಾಗುತ್ತದೆ',
    litmusSolutionHex: '#c084fc',
    litmusSolutionResultEn: 'Faint Reddish',
    litmusSolutionResultKn: 'ತಿಳಿ ಕೆಂಪು',
  },
  {
    id: 8,
    nameEn: 'Tamarind Water',
    nameKn: 'ಹುಣಸೆಹಣ್ಣಿನ ನೀರು',
    typeEn: 'Acid',
    typeKn: 'ಆಮ್ಲ',
    category: 'acid',
    initialColorHex: '#fef3c7',
    initialNameEn: 'Amber Brown',
    initialNameKn: 'ತಿಳಿ ಕಂದು',
    hibiscusColorHex: '#e11d48',
    hibiscusResultEn: 'Dark Pink / Magenta',
    hibiscusResultKn: 'ಗಾಢ ಗುಲಾಬಿ ಬಣ್ಣ',
    hibiscusPaperResultEn: 'Turns Dark Pink',
    hibiscusPaperResultKn: 'ಗಾಢ ಗುಲಾಬಿಯಾಗುತ್ತದೆ',
    litmusPaperRedEn: 'Stays Red',
    litmusPaperRedKn: 'ಕೆಂಪಾಗಿಯೇ ಉಳಿಯುತ್ತದೆ',
    litmusPaperBlueEn: 'Turns Red',
    litmusPaperBlueKn: 'ಕೆಂಪಾಗುತ್ತದೆ',
    litmusSolutionHex: '#dc2626',
    litmusSolutionResultEn: 'Red',
    litmusSolutionResultKn: 'ಕೆಂಪು ಬಣ್ಣ',
  },
  {
    id: 9,
    nameEn: 'Lime Water',
    nameKn: 'ಸುಣ್ಣದ ತಿಳಿನೀರು',
    typeEn: 'Base',
    typeKn: 'ಪ್ರತ್ಯಾಮ್ಲ',
    category: 'base',
    initialColorHex: '#f8fafc',
    initialNameEn: 'Clear Liquid',
    initialNameKn: 'ತಿಳಿನೀರು',
    hibiscusColorHex: '#059669',
    hibiscusResultEn: 'Emerald Green',
    hibiscusResultKn: 'ಹಸಿರು ಬಣ್ಣ',
    hibiscusPaperResultEn: 'Turns Green',
    hibiscusPaperResultKn: 'ಹಸಿರು ಬಣ್ಣಕ್ಕೆ ತಿರುಗುತ್ತದೆ',
    litmusPaperRedEn: 'Turns Blue',
    litmusPaperRedKn: 'ನೀಲಿಯಾಗುತ್ತದೆ',
    litmusPaperBlueEn: 'Stays Blue',
    litmusPaperBlueKn: 'ನೀಲಿಯಾಗಿಯೇ ಉಳಿಯುತ್ತದೆ',
    litmusSolutionHex: '#2563eb',
    litmusSolutionResultEn: 'Blue',
    litmusSolutionResultKn: 'ನೀಲಿ ಬಣ್ಣ',
  },
  {
    id: 10,
    nameEn: 'Salt Water',
    nameKn: 'ಉಪ್ಪು ನೀರು',
    typeEn: 'Neutral',
    typeKn: 'ತಟಸ್ಥ',
    category: 'neutral',
    initialColorHex: '#f0fdf4',
    initialNameEn: 'Clear',
    initialNameKn: 'ಸ್ಪಷ್ಟ ನೀರು',
    hibiscusColorHex: '#881337',
    hibiscusResultEn: 'Reddish-Purple (No Change)',
    hibiscusResultKn: 'ಬದಲಾವಣೆಯಿಲ್ಲ',
    hibiscusPaperResultEn: 'No Change',
    hibiscusPaperResultKn: 'ಬದಲಾವಣೆಯಿಲ್ಲ',
    litmusPaperRedEn: 'No Change (Red)',
    litmusPaperRedKn: 'ಬದಲಾವಣೆಯಿಲ್ಲ',
    litmusPaperBlueEn: 'No Change (Blue)',
    litmusPaperBlueKn: 'ಬದಲಾವಣೆಯಿಲ್ಲ',
    litmusSolutionHex: '#7c3aed',
    litmusSolutionResultEn: 'Purple (No Change)',
    litmusSolutionResultKn: 'ನೇರಳೆ (ಬದಲಾವಣೆಯಿಲ್ಲ)',
  },
  {
    id: 11,
    nameEn: 'Tomato Juice',
    nameKn: 'ಟೊಮೆಟೊ ರಸ',
    typeEn: 'Acid',
    typeKn: 'ಆಮ್ಲ',
    category: 'acid',
    initialColorHex: '#fee2e2',
    initialNameEn: 'Light Red',
    initialNameKn: 'ತಿಳಿ ಕೆಂಪು',
    hibiscusColorHex: '#e11d48',
    hibiscusResultEn: 'Magenta / Dark Pink',
    hibiscusResultKn: 'ಗಾಢ ಗುಲಾಬಿ ಬಣ್ಣ',
    hibiscusPaperResultEn: 'Turns Dark Pink',
    hibiscusPaperResultKn: 'ಗಾಢ ಗುಲಾಬಿಯಾಗುತ್ತದೆ',
    litmusPaperRedEn: 'Stays Red',
    litmusPaperRedKn: 'ಕೆಂಪಾಗಿಯೇ ಉಳಿಯುತ್ತದೆ',
    litmusPaperBlueEn: 'Turns Red',
    litmusPaperBlueKn: 'ಕೆಂಪಾಗುತ್ತದೆ',
    litmusSolutionHex: '#dc2626',
    litmusSolutionResultEn: 'Red',
    litmusSolutionResultKn: 'ಕೆಂಪು ಬಣ್ಣ',
  },
  {
    id: 12,
    nameEn: 'Toothpaste',
    nameKn: 'ಟೂತ್‌ಪೇಸ್ಟ್ ದ್ರಾವಣ',
    typeEn: 'Base',
    typeKn: 'ಪ್ರತ್ಯಾಮ್ಲ',
    category: 'base',
    initialColorHex: '#f1f5f9',
    initialNameEn: 'Chalky White',
    initialNameKn: 'ಸೀಮೆಸುಣ್ಣದ ಬಿಳಿ',
    hibiscusColorHex: '#10b981',
    hibiscusResultEn: 'Green',
    hibiscusResultKn: 'ಹಸಿರು ಬಣ್ಣ',
    hibiscusPaperResultEn: 'Turns Green',
    hibiscusPaperResultKn: 'ಹಸಿರು ಬಣ್ಣಕ್ಕೆ ತಿರುಗುತ್ತದೆ',
    litmusPaperRedEn: 'Turns Blue',
    litmusPaperRedKn: 'ನೀಲಿಯಾಗುತ್ತದೆ',
    litmusPaperBlueEn: 'Stays Blue',
    litmusPaperBlueKn: 'ನೀಲಿಯಾಗಿಯೇ ಉಳಿಯುತ್ತದೆ',
    litmusSolutionHex: '#2563eb',
    litmusSolutionResultEn: 'Blue',
    litmusSolutionResultKn: 'ನೀಲಿ ಬಣ್ಣ',
  },
];

export function createInitialTestRecords(): Record<number, SubstanceTestRecord> {
  const map: Record<number, SubstanceTestRecord> = {};
  ALL_SUBSTANCES.forEach((s) => {
    map[s.id] = {
      hibiscusTested: false,
      hibiscusMix: 0,
      hibiscusPaperTested: false,
      litmusPaperRedTested: false,
      litmusPaperBlueTested: false,
      litmusSolutionTested: false,
      litmusSolutionMix: 0,
    };
  });
  return map;
}
