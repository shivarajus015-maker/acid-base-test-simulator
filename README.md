# Natural Indicators Lab: Hibiscus & Litmus
**ನೈಸರ್ಗಿಕ ಸೂಚಕಗಳ ಪ್ರಯೋಗಾಲಯ: ದಾಸವಾಳ ಮತ್ತು ಲಿಟ್ಮಸ್**

An interactive, tactile, bilingual (English & Kannada) 3D WebGL chemistry laboratory simulation for exploring natural acid-base indicators (**Hibiscus** and **Litmus**). Built with **React**, **TypeScript**, **Tailwind CSS**, **Three.js**, custom GLSL shaders, CSS2D labels, and procedural WebAudio synthesis.

---

## Science Background (ವಿಜ್ಞಾನದ ಹಿನ್ನೆಲೆ)

Natural indicators are pigments extracted from plants and lichens that undergo visible color changes in acidic, basic, and neutral solutions.

### 1. Hibiscus Indicator (*Hibiscus rosa-sinensis* / ದಾಸವಾಳ ಸೂಚಕ)
Hibiscus petals contain water-soluble **anthocyanin** pigments that respond to pH:
- **Acidic Solutions (ಆಮ್ಲಗಳು, pH < 7)** -> Turns **Magenta / Dark Pink (ಗಾಢ ಗುಲಾಬಿ)**
  - *Examples*: Lemon Juice, Vinegar, Dilute HCl, Milk, Tamarind Water, Tomato Juice
- **Basic Solutions (ಪ್ರತ್ಯಾಮ್ಲಗಳು, pH > 7)** -> Turns **Emerald Green / Dark Green (ಹಸಿರು ಬಣ್ಣ)**
  - *Examples*: Baking Soda Solution, Soap Solution, Dilute NaOH, Lime Water, Toothpaste
- **Neutral Solutions (ತಟಸ್ಥ, pH = 7)** -> **No Change (ಬದಲಾವಣೆಯಿಲ್ಲ)** (retains reddish-purple tint)
  - *Examples*: Pure Water, Salt Water

### 2. Litmus Indicator (*Roccella* Lichen / ಲಿಟ್ಮಸ್ ಸೂಚಕ)
Litmus is extracted from lichens and used as paper strips or indicator solution:
- **Blue Litmus Paper (ನೀಲಿ ಲಿಟ್ಮಸ್ ಕಾಗದ)** -> Turns **Red** in acids; stays blue in bases and neutral solutions.
- **Red Litmus Paper (ಕೆಂಪು ಲಿಟ್ಮಸ್ ಕಾಗದ)** -> Turns **Blue** in bases; stays red in acids and neutral solutions.
- **Litmus Solution (ಲಿಟ್ಮಸ್ ದ್ರಾವಣ)** -> Turns **Red** in acids, **Blue** in bases, and stays **Purple** in neutral solutions.

---

## 3-Zone 3D Laboratory Layout

The virtual laboratory uses a clean three-zone spatial workflow so the central workspace stays clutter-free during testing:

```text
+---------------------------+------------------------------+---------------------------+
|  LEFT PREPARATION STAND   |   CENTER TESTING TABLE       |   RIGHT TESTING STAND     |
|  (3-Tier Prep Shelf)      |   (Active Workbench)         |   (3-Tier Storage Shelf)  |
|                           |                              |                           |
| - Hibiscus Flower (5 Pet.)| Left Zone:                   | - Sample Tubes Storage    |
| - Warm Water Beaker       |   Mortar/Pestle (during prep)|   (click any tube to swap |
| - Mortar & Pestle         |   -> Indicator Bottle / Pad  |    onto Center Table)     |
| - Filter Funnel & Flask   |   only after filtering       | - Graduated Cylinder      |
| - Petal-Rub Paper Pad     |                              | - Rinse Beaker & Wash Bot.|
| - Lichen Dish & Litmus    | Right Zone:                  | - Hibiscus & Litmus       |
|   Bottle / Paper Pads     |   3 Active Sample Test Tubes |   Pinned Results Boards   |
+---------------------------+------------------------------+---------------------------+
```

---

## Interactive Workflow (ಹಂತ-ಹಂತದ ವಿಧಾನ)

### Station A: Hibiscus Indicator (`1`)
1. **Dropper Extract Mode (`Dropper / ಡ್ರಾಪರ್`)**:
   - **Place Mortar on Table**: Click the **Mortar & Pestle** on the Left Stand to move it onto the Center Table.
   - **Pick 5 Petals**: Click the **Hibiscus Flower** 5 times to pluck petals into the mortar.
   - **Crush Petals**: Click the mortar/pestle 3 times to crush the petals into paste.
   - **Pour Warm Water**: Click the steaming **Warm Water Beaker** on the Left Stand to pour water into the mortar (beaker automatically returns to the stand).
   - **Filter & Clear Table**: Click the **Filter Funnel** on the Left Stand to filter the extract; prep tools return cleanly to the stand, leaving **only the Hibiscus Indicator Bottle and 3 Active Test Tubes** on the Center Table.
   - **Dropper Test**: Click any of the 3 active test tubes on the Center Table to dispense drops and observe color change, or click stored tubes on the Right Stand (or **Next 3 Tubes**) to swap samples onto the table.
2. **Petal-Rubbed Paper Mode (`Petal Paper / ದಳ ಕಾಗದ`)**:
   - Switch to **Petal Paper**, click the rubbing pad to coat white filter paper with fresh red hibiscus petal pigment, and dip test tubes to inspect paper color shifts.

### Station B: Litmus Indicator (`2`)
1. **Litmus Paper Dipping (`Blue Litmus` / `Red Litmus`)**:
   - Pick **Blue** or **Red** litmus paper from the Left Stand and click any active tube on the Center Table.
   - Capillary absorption animates upward on the paper strip before pinning results onto the Litmus Pinboard on the Right Stand.
2. **Litmus Solution (`Litmus Sol.`)**:
   - Click **Lichen Powder** on the Left Stand to extract purple Litmus solution and place only the indicator bottle on the Center Table for dropper testing.

### Station C: Dynamic Comparison Matrix (`3`)
- Compare all tested samples side-by-side across **Initial Color**, **Hibiscus Dropper**, **Hibiscus Paper**, **Red Litmus**, **Blue Litmus**, **Litmus Solution**, and **Classification**.
- Filter by `All`, `Acids`, `Bases`, or `Neutral`.
- Click any table row to focus the camera on that sample test tube in 3D.

---

## Substance Roster (ಪದಾರ್ಥಗಳ ಪಟ್ಟಿ)

### Default 8 Samples
| # | Substance (English / ಕನ್ನಡ) | Category | Hibiscus | Red Litmus | Blue Litmus | Litmus Sol. |
|---|---|---|---|---|---|---|
| 1 | Lemon Juice / ನಿಂಬೆ ರಸ | Acid | Magenta / Dark Pink | Stays Red | Turns Red | Red |
| 2 | Vinegar / ವಿನೆಗರ್ | Acid | Bright Magenta | Stays Red | Turns Red | Red |
| 3 | Dilute HCl / ಸಾರರಿಕ್ತ HCl | Strong Acid | Intense Magenta | Stays Red | Turns Red | Bright Red |
| 4 | Baking Soda / ಅಡುಗೆ ಸೋಡಾ ದ್ರಾವಣ | Base | Deep Green | Turns Blue | Stays Blue | Blue |
| 5 | Soap Solution / ಸೋಪು ದ್ರಾವಣ | Base | Emerald Green | Turns Blue | Stays Blue | Blue |
| 6 | Dilute NaOH / ಸಾರರಿಕ್ತ NaOH | Strong Base | Dark Forest Green | Turns Blue | Stays Blue | Royal Blue |
| 7 | Pure Water / ಶುದ್ಧ ನೀರು | Neutral | Reddish-Purple (No Change) | No Change | No Change | Purple |
| 8 | Milk / ಹಾಲು | Mild Acid | Light Pink Tint | Stays Red | Turns Pinkish-Red | Faint Reddish |

### Expandable Extra 5 Samples (`8 Samples` -> `13 Samples` Toggle)
9. **Tamarind Water (ಹುಣಸೆಹಣ್ಣಿನ ನೀರು)** — Acid
10. **Lime Water (ಸುಣ್ಣದ ತಿಳಿನೀರು)** — Base
11. **Salt Water (ಉಪ್ಪು ನೀರು)** — Neutral
12. **Tomato Juice (ಟೊಮೆಟೊ ರಸ)** — Acid
13. **Toothpaste (ಟೂತ್‌ಪೇಸ್ಟ್ ದ್ರಾವಣ)** — Base

---

## Key Features & Controls

- **Bilingual Switcher (`L`)**: Toggle instantly between `EN`, `ಕನ್ನಡ`, and `Both` across all HUD panels, tooltips, 3D labels, and comparison tables.
- **Hide All Text (`T`)**: Switch to unobstructed icon-only **Pure Activity Mode** so students can focus directly on the 3D apparatus without text overlays.
- **Mobile & Tablet Responsive**: Collapsible HUD dock, responsive top toolbar, touch-friendly controls, and compact secondary drawer.
- **Audio Synthesis (`M`)**: Procedural WebAudio sound effects for petal plucking, crushing, water pouring, filtering, droplet plinks, paper dips, and completion chimes.
- **Keyboard Shortcuts**:
  - `1` / `2` / `3`: Switch to Hibiscus, Litmus, or Comparison Matrix
  - `L`: Cycle language (`Both` -> `EN` -> `ಕನ್ನಡ`)
  - `T`: Toggle Hide All Text mode
  - `H`: Collapse / expand bottom control dock
  - `M`: Toggle WebAudio sound
  - `R`: Reset the entire lab
  - `Esc`: Close open modals / mobile drawer

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4
- **3D Graphics**: Three.js (`WebGLRenderer`, `OrbitControls`, `CSS2DRenderer`, custom GLSL shaders for liquid menisci and capillary paper absorption)
- **Audio**: Native WebAudio API synthesizer (`src/audio/labAudio.ts`)

---

## Local Development

```bash
# Install dependencies
npm install

# Start development server on http://localhost:3000
npm run dev

# Type-check with TypeScript
npm run lint

# Build production bundle
npm run build
```

---

## Credits & Attribution

- **Developed with an AI Assistant**: Interactive 3D scene architecture, bilingual English/Kannada UI, GLSL shaders, procedural WebAudio synthesis, and documentation were developed in collaboration with an AI coding assistant.

---

## License

This project is licensed under the **Apache License, Version 2.0** — see the [LICENSE](./LICENSE) file for details.
