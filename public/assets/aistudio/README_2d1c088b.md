# Natural Indicators: Hibiscus & Litmus (ಆಮ್ಲಗಳು ಮತ್ತು ಪ್ರತ್ಯಾಮ್ಲಗಳು: ದಾಸವಾಳ ಮತ್ತು ಲಿಟ್ಮಸ್ ನೈಸರ್ಗಿಕ ಸೂಚಕಗಳು)

An interactive, tactile, gamified 3D WebGL laboratory simulation designed for **STEM Mysore** and science students/educators. Built using **Three.js (v0.160+)**, custom GLSL shaders, procedural geometries, CSS2DRenderer for crisp bilingual 3D labels, and synthesized WebAudio.

---

## 🌺 Overview & Science Background (ವಿಜ್ಞಾನದ ಹಿನ್ನೆಲೆ)

Natural indicators are substances obtained from plant extracts or lichens that change color in acidic and basic solutions, enabling students to classify household items and chemical reagents.

### 1. **Hibiscus Indicator (ದಾಸವಾಳ ಸೂಚಕ - *Hibiscus rosa-sinensis*)**
Hibiscus petals contain water-soluble vacuolar pigments called **anthocyanins**. In solution, anthocyanins undergo structural equilibria in response to pH:
- **Acidic Solutions (ಆಮ್ಲಗಳು, pH < 7)**:
  - Turns vivid **Magenta / Dark Pink (ಗಾಢ ಗುಲಾಬಿ ಬಣ್ಣ)** due to the formation of the flavylium cation species.
  - *Examples*: Lemon Juice (Citric acid), Vinegar (Acetic acid), Dilute HCl.
- **Basic Solutions (ಪ್ರತ್ಯಾಮ್ಲಗಳು, pH > 7)**:
  - Turns **Emerald Green / Dark Green (ಹಸಿರು ಬಣ್ಣ)** as anthocyanins transform into quinonoidal anhydrobase species.
  - *Examples*: Soap Solution, Baking Soda Solution, Dilute NaOH.
- **Neutral Solutions (ತಟಸ್ಥ, pH = 7)**:
  - **No Change / ಬದಲಾವಣೆಯಿಲ್ಲ** (retains the natural reddish-purple indicator tea color).
  - *Examples*: Pure Distilled Water, Salt Water (NaCl).

### 2. **Litmus Indicator (ಲಿಟ್ಮಸ್ ಸೂಚಕ - *Roccella tinctoria / Parmelia*)**
Litmus is a naturally occurring water-soluble dye mixture extracted from various species of lichens (especially *Roccella tinctoria*):
- **Blue Litmus Paper (ನೀಲಿ ಲಿಟ್ಮಸ್ ಕಾಗದ)**:
  - Turns **Red (ಕೆಂಪು ಬಣ್ಣ)** in **Acidic solutions (ಆಮ್ಲಗಳಲ್ಲಿ)**.
  - Remains **Blue (ಬದಲಾವಣೆಯಿಲ್ಲ)** in basic or neutral solutions.
- **Red Litmus Paper (ಕೆಂಪು ಲಿಟ್ಮಸ್ ಕಾಗದ)**:
  - Turns **Blue (ನೀಲಿ ಬಣ್ಣ)** in **Basic solutions (ಪ್ರತ್ಯಾಮ್ಲಗಳಲ್ಲಿ)**.
  - Remains **Red (ಬದಲಾವಣೆಯಿಲ್ಲ)** in acidic or neutral solutions.
- **Litmus Solution (ಲಿಟ್ಮಸ್ ದ್ರಾವಣ)**:
  - Acidic solutions turn **Red (ಕೆಂಪು)**.
  - Basic solutions turn **Blue (ನೀಲಿ)**.
  - Neutral solutions remain **Purple (ನೇರಳೆ ಬಣ್ಣ)**.

---

## 🔬 Simulation Features & Two-Station Layout

The laboratory bench is divided into two clearly separated, interactive zones with a central glowing divider and top navigation tabs:

```
+---------------------------------------------------------------------------------------+
|  [🌺 Hibiscus Station]       [🧪 Litmus Station]        [📊 Compare Both Matrix]       |
+---------------------------------------------------------------------------------------+
|  STATION A: HIBISCUS (Left Half)           |  STATION B: LITMUS (Right Half)           |
|  - Mortar & Pestle + Petals                |  - Dried Lichen Dish & Grinder            |
|  - Warm Water Beaker + Steam               |  - Amber Litmus Bottle & Beaker           |
|  - Filter Funnel + Dropper Bottle          |  - Ceramic Pad with Red & Blue Papers     |
|  - Wooden Test Tube Rack A (8-13 tubes)    |  - Wooden Results Pinboard + Pins         |
|                                            |  - Wooden Test Tube Rack B (8-13 tubes)   |
+---------------------------------------------------------------------------------------+
```

---

## 🧪 Interactive Workflow (ಹಂತ-ಹಂತದ ವಿಧಾನ)

### **Station A: Hibiscus Indicator (ಹಂತ A1 ರಿಂದ A4)**
1. **Stage A1 — Crush Petals (ದಳಗಳನ್ನು ಪುಡಿಮಾಡಿ)**:
   - Click the hibiscus petals in the porcelain mortar 3 times.
   - Animated pestle squash-and-stretch motion with synthesized procedural crunch sound and red particle bursts.
   - Petals darken to crushed crimson.
2. **Stage A2 — Add Warm Water (ಬೆಚ್ಚಗಿನ ನೀರು ಸುರಿಯಿರಿ)**:
   - Click the warm water beaker (with gentle rising steam particles).
   - Beaker animates and tilts, pouring water with realistic trickle audio into the mortar.
   - Crushed petals dissolve into a swirling dark red-purple anthocyanin extract.
3. **Stage A3 — Filter & Bottle (ಶೋಧಿಸಿ ಡ್ರಾಪರ್ ತುಂಬಿಸಿ)**:
   - Click the glass filter funnel.
   - Mortar tilts and filters the extract through conical filter paper into the amber dropper bottle.
4. **Stage A4 — Test Sample Tubes (ಮಾದರಿಗಳ ಪರೀಕ್ಷೆ)**:
   - Click any test tube on Rack A.
   - Dropper positions itself above the tube, releasing 3 sequential drops with gravity acceleration, plink audio, and meniscus ripple wave pulses:
     - Drop 1: 33% tint mix.
     - Drop 2: 66% color shift.
     - Drop 3: Final saturated color + splash particles + victory chime!

---

### **Station B: Litmus Indicator (ಹಂತ B1 ರಿಂದ B3)**
1. **Stage B1 — Prepare Litmus Solution (ಲಿಟ್ಮಸ್ ದ್ರಾವಣ ತಯಾರಿಸಿ)**:
   - Click the shallow Petri dish containing purple lichen powder.
   - Pestle grinds the powder with violet dust bursts and pours solvent, producing royal purple Litmus solution.
2. **Stage B2 — Litmus Paper Dipping (ಕಾಗದ ಪಟ್ಟಿ ಅದ್ದಿ ಪರೀಕ್ಷಿಸಿ)**:
   - Click **RED** or **BLUE** litmus paper on the glossy ceramic pad.
   - Click any test tube on Rack B.
   - Paper strip glides into the tube mouth and dips into the liquid:
     - **Custom GLSL Paper Shader**: Renders authentic capillary action rising along the cellulose fibers with a ragged meniscus edge.
     - **Blue Litmus + Acid** $\rightarrow$ Turns bright **Red**.
     - **Red Litmus + Base** $\rightarrow$ Turns royal **Blue**.
     - **Neutral** $\rightarrow$ No chemical color shift; shows realistic damp paper sheen.
   - The dipped strip automatically rises and glides to the **Results Pinboard**, pinning itself with a brass tack and displaying a pinned summary card!
3. **Stage B3 — Litmus Solution Dropper Test (ದ್ರಾವಣ ಹನಿ ಪರೀಕ್ಷೆ)**:
   - Click the Litmus Solution dropper to add drops directly to any test tube on Rack B.
   - Acids turn **Red**, bases turn **Blue**, and neutrals stay **Purple**.

---

### **Stage C: Dynamic Comparison Matrix (ಫಲಿತಾಂಶ ಕೋಷ್ಟಕ)**
- Unlocks the interactive bilingual HTML overlay table with 7 detailed columns:
  1. `#`
  2. `Substance / ಮಾದರಿ ಪದಾರ್ಥ`
  3. `Initial Color / ಆರಂಭಿಕ ಬಣ್ಣ`
  4. `Hibiscus Result / ದಾಸವಾಳ`
  5. `Litmus Paper (Red) / ಕೆಂಪು ಲಿಟ್ಮಸ್`
  6. `Litmus Paper (Blue) / ನೀಲಿ ಲಿಟ್ಮಸ್`
  7. `Litmus Solution / ಲಿಟ್ಮಸ್ ದ್ರಾವಣ`
  8. `Classification / ವರ್ಗ (Acid / Base / Neutral)`
- **Interactive Row Focus**: Click any row in the table to smoothly zoom and focus that specific 3D test tube on the lab bench.
- **Category Filter Chips**: Filter by `All`, `Acids`, `Bases`, or `Neutral`.
- **Textbook Scientific Principles Displayed**:
  > 🌺 **Hibiscus Result Box**:  
  > *"Hibiscus turns dark pink/magenta in acidic solutions and green in basic solutions, making it an excellent natural indicator!"*  
  > *(ದಾಸವಾಳದ ರಸವು ಆಮ್ಲದಲ್ಲಿ ಗುಲಾಬಿ ಮತ್ತು ಪ್ರತ್ಯಾಮ್ಲದಲ್ಲಿ ಹಸಿರು ಬಣ್ಣಕ್ಕೆ ಬದಲಾಗುತ್ತದೆ — ಇದು ಅತ್ಯುತ್ತಮ ನೈಸರ್ಗಿಕ ಸೂಚಕವಾಗಿದೆ!)*  
  >  
  > 🧪 **Litmus Result Box**:  
  > *"Blue litmus paper turns red in acids; red litmus paper turns blue in bases. Litmus stays unchanged in neutral solutions — a classic natural indicator!"*  
  > *(ನೀಲಿ ಲಿಟ್ಮಸ್ ಕಾಗದವು ಆಮ್ಲದಲ್ಲಿ ಕೆಂಪಾಗುತ್ತದೆ; ಕೆಂಪು ಲಿಟ್ಮಸ್ ಕಾಗದವು ಪ್ರತ್ಯಾಮ್ಲದಲ್ಲಿ ನೀಲಿಯಾಗುತ್ತದೆ. ತಟಸ್ಥ ದ್ರಾವಣಗಳಲ್ಲಿ ಲಿಟ್ಮಸ್ ಬದಲಾಗುವುದಿಲ್ಲ — ಇದು ಶ್ರೇಷ್ಠ ನೈಸರ್ಗಿಕ ಸೂಚಕ!)*

---

## 📋 Comprehensive Substance Roster (ಪದಾರ್ಥಗಳ ಪಟ್ಟಿ)

| # | Substance / ಪದಾರ್ಥ | Category / ವರ್ಗ | Hibiscus / ದಾಸವಾಳ | Litmus Paper (Red) | Litmus Paper (Blue) | Litmus Solution |
|---|---|---|---|---|---|---|
| 1 | **Lemon Juice (ನಿಂಬೆ ರಸ)** | Acid (ಆಮ್ಲ) | Magenta (ಗುಲಾಬಿ) | Stays Red | Turns Red (ಕೆಂಪು) | Red (ಕೆಂಪು) |
| 2 | **Vinegar (ವಿನೆಗರ್)** | Acid (ಆಮ್ಲ) | Bright Magenta (ಗುಲಾಬಿ) | Stays Red | Turns Red (ಕೆಂಪು) | Red (ಕೆಂಪು) |
| 3 | **Dilute HCl (ಸಾರರಿಕ್ತ HCl)** | Strong Acid (ಪ್ರಬಲ ಆಮ್ಲ) | Deep Crimson Pink (ತೀವ್ರ ಗುಲಾಬಿ) | Stays Red | Turns Instant Red (ಕೆಂಪು) | Vivid Red (ಪ್ರಖರ ಕೆಂಪು) |
| 4 | **Baking Soda Sol. (ಅಡುಗೆ ಸೋಡಾ)** | Base (ಪ್ರತ್ಯಾಮ್ಲ) | Deep Green (ಗಾಢ ಹಸಿರು) | Turns Blue (ನೀಲಿ) | Stays Blue | Blue (ನೀಲಿ) |
| 5 | **Soap Solution (ಸೋಪು ದ್ರಾವಣ)** | Base (ಪ್ರತ್ಯಾಮ್ಲ) | Emerald Green (ಹಸಿರು) | Turns Blue (ನೀಲಿ) | Stays Blue | Blue (ನೀಲಿ) |
| 6 | **Dilute NaOH (ಸಾರರಿಕ್ತ NaOH)** | Strong Base (ಪ್ರಬಲ ಪ್ರತ್ಯಾಮ್ಲ) | Dark Yellow-Green (ಗಾಢ ಹಸಿರು) | Turns Royal Blue (ನೀಲಿ) | Stays Blue | Deep Blue (ಗಾಢ ನೀಲಿ) |
| 7 | **Pure Water (ಶುದ್ಧ ನೀರು)** | Neutral (ತಟಸ್ಥ) | Reddish-Purple (ಬದಲಾವಣೆಯಿಲ್ಲ) | Stays Red (ಬದಲಾವಣೆಯಿಲ್ಲ) | Stays Blue (ಬದಲಾವಣೆಯಿಲ್ಲ) | Purple (ಬದಲಾವಣೆಯಿಲ್ಲ) |
| 8 | **Milk (ಹಾಲು)** | Mild Acid (ಸೌಮ್ಯ ಆಮ್ಲ) | Faint Mauve-Pink (ತಿಳಿ ಗುಲಾಬಿ) | Stays Red | Turns Faint Red / Pink | Faint Red-Purple |

### *Expandable Extra Substances (+5 via Toggle)*:
- **Tamarind Water (ಹುಣಸೆ ರಸ)** — Acid (Tartaric acid)
- **Lime Water / Ca(OH)₂ (ಸುಣ್ಣದ ತಿಳಿನೀರು)** — Strong Base
- **Salt Water / NaCl (ಉಪ್ಪು ನೀರು)** — Neutral
- **Tomato Juice (ಟೊಮ್ಯಾಟೊ ರಸ)** — Acid (Oxalic / Citric acid)
- **Toothpaste Slurry (ಟೂತ್‌ಪೇಸ್ಟ್ ದ್ರಾವಣ)** — Mild Base

---

## ⌨️ Keyboard Shortcuts & Quick Controls

- `1`: Switch view to **Station A: Hibiscus Indicator**
- `2`: Switch view to **Station B: Litmus Indicator**
- `3`: Open **Comparison Matrix & Result Principles**
- `R`: **Reset Lab** (resets both stations, liquids, papers, and HUD)
- `M`: Toggle **Sound** (WebAudio FX + Lab Ambient Hum)
- `L`: Cycle **Language** (`EN + ಕನ್ನಡ` $\rightarrow$ `English Only` $\rightarrow$ `ಕನ್ನಡ ಮಾತ್ರ`)
- `Esc`: Close comparison matrix modal

---

## 💻 Technical Stack & Implementation

- **Three.js v0.160+**: Modern ES modules via CDN importmap.
- **CSS2DRenderer**: Overlay HTML layer mapping crisp bilingual 3D labels with flawless typography rendering for Kannada (`Noto Sans Kannada`) and English (`Inter`).
- **Custom GLSL Liquid Shader**: Meniscus radial ripple displacement physics, Fresnel highlights, internal depth gradient, and smooth color lerping.
- **Custom GLSL Litmus Paper Shader**: Procedural cellulose fiber noise, capillary upward fluid propagation, meniscus boundary concentration darkening, and pH color shifting.
- **WebAudio API Synthesis**: Procedural real-time synthesis of crushing, grinding, pouring, water droplets, bell chime plinks, paper rustles, pinboard tack taps, and victory fanfare.
- **Self-Contained Single File**: Zero npm installs or build steps needed.

---

## 🚀 How to Run

1. Open `index.html` directly in any modern browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari).
2. Or serve locally with any static HTTP server:
   ```bash
   npx serve .
   ```
   or
   ```bash
   python -m http.server 8000
   ```
