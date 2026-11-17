import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ALL_SUBSTANCES,
  createInitialTestRecords,
  HibiscusStage,
  LabSnapshot,
  StationATool,
  StationBTool,
  StationTab,
  Substance,
  SubstanceTestRecord,
} from '../data/substances';
import { LabAudioEngine } from '../audio/labAudio';
import { createLiquidShaderMaterial, createPaperShaderMaterial } from './shaders';

const TOTAL_PETALS = 5;
const ACTIVE_FRONT_SLOTS = 3;

export interface ToastEvent {
  textEn: string;
  textKn: string;
  type: 'success' | 'acid' | 'base' | 'neutral';
  duration?: number;
}

export interface HoverTooltipInfo {
  visible: boolean;
  x: number;
  y: number;
  titleEn: string;
  titleKn: string;
  subtitleEn: string;
  subtitleKn: string;
  accentColor?: string;
}

interface LabCallbacks {
  onSnapshot: (snapshot: LabSnapshot) => void;
  onToast: (toast: ToastEvent) => void;
  onCelebrate: (colors?: string[]) => void;
  onTooltip: (info: HoverTooltipInfo) => void;
  onContextLost?: (lost: boolean) => void;
}

interface TubeEntry {
  substance: Substance;
  container: THREE.Group;
  mesh: THREE.Mesh;
  liquidMesh: THREE.Mesh;
  liquidMat: THREE.ShaderMaterial;
  labelDiv: HTMLDivElement;
  labelObj: CSS2DObject;
  slotIndex: number;
}

interface InteractiveUserData {
  isPetal?: boolean;
  petalIndex?: number;
  plucked?: boolean;
  isMortar?: boolean;
  isPestle?: boolean;
  isBeaker?: boolean;
  isFunnel?: boolean;
  isHibiscusDropper?: boolean;
  isHibiscusPaperPad?: boolean;
  isLichenDish?: boolean;
  isRedLitmusStack?: boolean;
  isBlueLitmusStack?: boolean;
  isLitmusDropper?: boolean;
  isTubeA?: boolean;
  isTubeB?: boolean;
  isShelfTubeA?: boolean;
  isShelfTubeB?: boolean;
  substanceId?: number;
  index?: number;
}

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class LabSceneController {
  private container: HTMLElement;
  private css2dContainer: HTMLElement;
  private callbacks: LabCallbacks;
  private audio: LabAudioEngine;

  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private envRenderTarget: THREE.WebGLRenderTarget;

  private cameraTargets: Record<StationTab, { pos: THREE.Vector3; lookAt: THREE.Vector3 }>;
  private targetCamPos = new THREE.Vector3();
  private targetControlsTarget = new THREE.Vector3();
  private cameraTransitionActive = false;

  private currentTab: StationTab = 'hibiscus';
  private isExpandedRoster = false;
  private activeSubstances: Substance[] = ALL_SUBSTANCES.slice(0, 8);
  private activeTubeIds: number[] = [0, 1, 2];
  private nextSwapCursor = 0;
  private testRecords: Record<number, SubstanceTestRecord> = createInitialTestRecords();

  private mortarOnTable = false;
  private petalsPlucked = 0;
  private crushCount = 0;
  private waterAdded = false;
  private isFiltered = false;
  private hibiscusPaperPrepared = false;
  private litmusPrepared = false;
  private hibiscusStage: HibiscusStage = 'A0';
  private stationATool: StationATool = 'dropper';
  private stationBTool: StationBTool = 'bluePaper';
  private animating = false;
  private batchRunning = false;
  private batchCancelled = false;
  private animatingLabelEn = '';
  private animatingLabelKn = '';

  // Scene groups (Left Stand + Center Workbench Table + Right Stand)
  private leftStandGroup = new THREE.Group();
  private rightStandGroup = new THREE.Group();
  private centerTableGroup = new THREE.Group();
  private stationAGroup = new THREE.Group();
  private stationBGroup = new THREE.Group();
  private flowerGroup = new THREE.Group();
  private mortarGroup = new THREE.Group();
  private pestleGroup = new THREE.Group();
  private beakerGroup = new THREE.Group();
  private filterUnitGroup = new THREE.Group();
  private hibiscusBottleGroup = new THREE.Group();
  private hibiscusPipetteGroup = new THREE.Group();
  private hibiscusBulbMesh!: THREE.Mesh;
  private hibiscusPipetteLiquid!: THREE.Mesh;
  private hibiscusBottleLabelObj!: CSS2DObject;
  private hibiscusBottleDiv!: HTMLDivElement;
  private filterLabelObj!: CSS2DObject;
  private hibiscusPaperPadGroup = new THREE.Group();
  private hibiscusPaperStackMat!: THREE.MeshStandardMaterial;
  private rubbingPetalMesh!: THREE.Mesh;
  private stationAPinboardGroup = new THREE.Group();
  private pinnedHibiscusGroup = new THREE.Group();
  private pinnedHibiscusStrips: THREE.Mesh[] = [];

  private activeRackGroup = new THREE.Group();
  private storageRackGroup = new THREE.Group();

  private lichenDishGroup = new THREE.Group();
  private litmusLiquidGroup = new THREE.Group();
  private litmusPadGroup = new THREE.Group();
  private litmusPipetteGroup = new THREE.Group();
  private litmusBulbMesh!: THREE.Mesh;
  private litmusPipetteLiquid!: THREE.Mesh;
  private litmusPinboardGroup = new THREE.Group();
  private pinnedItemsGroup = new THREE.Group();

  // Exact world-space home positions on Left Stand & active slots on Center Table
  private homeMortarPos = new THREE.Vector3();
  private homePestlePos = new THREE.Vector3();
  private homeBeakerPos = new THREE.Vector3();
  private homeFilterPos = new THREE.Vector3();
  private homeHibPadPos = new THREE.Vector3();
  private homeLitmusBottlePos = new THREE.Vector3();
  private homeLitmusPadPos = new THREE.Vector3();
  private readonly leftStandRotY = 0.24;

  // Center Table work zone world positions (Tabletop y = 1.48)
  private readonly tableIndicatorPos = new THREE.Vector3(-1.38, 1.5, 0.78);
  private readonly tableMortarFilterPos = new THREE.Vector3(-1.62, 1.5, 0.78);
  private readonly tableFilterPos = new THREE.Vector3(-0.42, 1.5, 0.78);
  private readonly tablePestleOffset = new THREE.Vector3(0.18, 0.34, 0.06);

  private pluckablePetals: THREE.Mesh[] = [];
  private mortarPetalMeshes: THREE.Mesh[] = [];
  private mortarLiquidMat: THREE.ShaderMaterial;
  private bottleLiquidMat: THREE.ShaderMaterial;
  private litmusBottleLiquidMat: THREE.ShaderMaterial;
  private beakerWater: THREE.Mesh;
  private pourStreamMesh: THREE.Mesh;
  private lichenPestle: THREE.Mesh;
  private activePaperStrip: THREE.Mesh;
  private activeStripGeo: THREE.PlaneGeometry;
  private pinnedStrips: THREE.Mesh[] = [];
  private dropMesh: THREE.Mesh;
  private guideRing: THREE.Mesh;
  private glassMaterial: THREE.MeshPhysicalMaterial;

  private steamGeo: THREE.BufferGeometry;
  private steamParticleCount = 35;

  private activeTubes: TubeEntry[] = [];
  private shelfTubes: TubeEntry[] = [];
  private interactiveMeshes: THREE.Object3D[] = [];

  // Label refs for highlight & station filtering
  private flowerDiv!: HTMLDivElement;
  private mortarDiv!: HTMLDivElement;
  private beakerDiv!: HTMLDivElement;
  private bottleDiv!: HTMLDivElement;
  private hibiscusPadDiv!: HTMLDivElement;
  private hibiscusBoardDiv!: HTMLDivElement;
  private lichenDiv!: HTMLDivElement;
  private litmusDropperDiv!: HTMLDivElement;
  private litmusPadDiv!: HTMLDivElement;
  private litmusBoardDiv!: HTMLDivElement;

  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private pointerDownPos = { x: 0, y: 0 };
  private clock = new THREE.Clock();
  private frameId = 0;
  private activeAnimTimers: number[] = [];
  private disposed = false;

  // Reusable scratch vectors (zero GC in render loop)
  private readonly _worldPos = new THREE.Vector3();

  constructor(
    container: HTMLElement,
    css2dContainer: HTMLElement,
    audio: LabAudioEngine,
    callbacks: LabCallbacks
  ) {
    this.container = container;
    this.css2dContainer = css2dContainer;
    this.audio = audio;
    this.callbacks = callbacks;

    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer({ element: this.css2dContainer });
    this.labelRenderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#09111f');
    this.scene.fog = new THREE.FogExp2('#09111f', 0.016);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRenderTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    pmremGenerator.dispose();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.updateResponsiveCamera(width / height);

    this.cameraTargets = {
      hibiscus: {
        pos: new THREE.Vector3(-0.6, 6.45, 13.8),
        lookAt: new THREE.Vector3(0, 2.05, 0.1),
      },
      litmus: {
        pos: new THREE.Vector3(0.6, 6.45, 13.8),
        lookAt: new THREE.Vector3(0, 2.05, 0.1),
      },
      compare: {
        pos: new THREE.Vector3(0, 6.8, 14.5),
        lookAt: new THREE.Vector3(0, 2.05, 0.1),
      },
    };

    this.camera.position.copy(this.cameraTargets.hibiscus.pos);
    this.targetCamPos.copy(this.cameraTargets.hibiscus.pos);
    this.targetControlsTarget.copy(this.cameraTargets.hibiscus.lookAt);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.cameraTargets.hibiscus.lookAt);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 24.0;
    this.controls.minPolarAngle = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.controls.addEventListener('start', this.onControlsStart);

    // Materials
    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      transmission: this.isSoftwareGl ? 0 : 0.92,
      opacity: this.isSoftwareGl ? 0.36 : 1.0,
      transparent: true,
      depthWrite: false,
      roughness: 0.06,
      ior: 1.52,
      thickness: 0.12,
      clearcoat: 1.0,
    });

    this.mortarLiquidMat = createLiquidShaderMaterial('#f43f5e', '#6b0520');
    this.mortarLiquidMat.uniforms.uOpacity.value = 0.0;
    this.bottleLiquidMat = createLiquidShaderMaterial('#881337', '#9f1239');
    this.bottleLiquidMat.uniforms.uOpacity.value = 0.0;
    this.litmusBottleLiquidMat = createLiquidShaderMaterial('#6d28d9', '#5b21b6');
    this.litmusBottleLiquidMat.uniforms.uOpacity.value = 0.0;

    this.beakerWater = new THREE.Mesh();
    this.lichenPestle = new THREE.Mesh();
    this.steamGeo = new THREE.BufferGeometry();

    this.pourStreamMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.075, 1.35, 14),
      new THREE.MeshBasicMaterial({
        color: '#bae6fd',
        transparent: true,
        opacity: 0.78,
      })
    );
    this.pourStreamMesh.visible = false;

    this.activeStripGeo = new THREE.PlaneGeometry(0.24, 1.05, 16, 24);
    this.activePaperStrip = new THREE.Mesh(
      this.activeStripGeo,
      createPaperShaderMaterial('#ef4444', '#2563eb')
    );
    this.activePaperStrip.visible = false;
    this.scene.add(this.activePaperStrip);

    this.dropMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 12, 12),
      new THREE.MeshBasicMaterial({ color: '#e11d48' })
    );
    this.dropMesh.visible = false;
    this.scene.add(this.dropMesh);

    this.guideRing = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 0.95, 48),
      new THREE.MeshBasicMaterial({
        color: '#fbbf24',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      })
    );
    this.guideRing.rotation.x = -Math.PI / 2;
    this.scene.add(this.guideRing);

    this.setupLighting();
    this.setupCleanBlueFloorAndIdenticalShelves();
    this.setupCenterWorkingTable();
    this.setupLeftPreparationStand();
    this.setupRightTestingStand();
    this.buildTestTubes();
    this.rebuildInteractiveList();
    this.syncCenterTableApparatus();
    this.updateLabelStationVisibility();
    this.updateGuideRing();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitSnapshot();
    this.startLoop();
  }

  private onControlsStart = (): void => {
    this.cameraTransitionActive = false;
  };

  private setupLighting(): void {
    this.scene.add(new THREE.AmbientLight('#ffffff', 0.95));
    this.scene.add(new THREE.HemisphereLight('#f8fafc', '#1e3a8a', 0.9));

    const dirLight = new THREE.DirectionalLight('#fff8eb', 1.55);
    dirLight.position.set(2.5, 13, 8);
    dirLight.castShadow = !this.isSoftwareGl;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.left = -11;
    dirLight.shadow.camera.right = 11;
    dirLight.shadow.camera.top = 8;
    dirLight.shadow.camera.bottom = -8;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.02;
    this.scene.add(dirLight);

    const prepFill = new THREE.PointLight('#fb923c', 1.7, 14);
    prepFill.position.set(-4.2, 4.8, 3.0);
    this.scene.add(prepFill);

    const testFill = new THREE.PointLight('#60a5fa', 1.7, 14);
    testFill.position.set(4.2, 4.8, 3.0);
    this.scene.add(testFill);
  }

  private buildIdenticalShelfUnit(
    standGroup: THREE.Group,
    titleEn: string,
    titleKn: string,
    accentHex: string
  ): void {
    const shelfWoodMat = new THREE.MeshStandardMaterial({
      color: '#7c4a26',
      roughness: 0.48,
      metalness: 0.06,
    });
    const frameSteelMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      roughness: 0.28,
      metalness: 0.84,
    });
    const orangeBoardMat = new THREE.MeshStandardMaterial({
      color: '#d95d1e',
      roughness: 0.74,
      metalness: 0.04,
    });

    const shelfWidth = 5.6;
    const shelfDepth = 1.35;
    const tierHeights = [0.28, 2.18, 4.18];

    // Orange Backdrop Board cleanly mounted behind each identical 3-tier shelving unit
    const backdropBoard = new THREE.Mesh(new THREE.BoxGeometry(5.85, 4.75, 0.1), orangeBoardMat);
    backdropBoard.position.set(0, 2.45, -0.82);
    backdropBoard.receiveShadow = true;
    standGroup.add(backdropBoard);

    const backdropFrame = new THREE.Mesh(
      new THREE.BoxGeometry(6.0, 4.9, 0.06),
      frameSteelMat
    );
    backdropFrame.position.set(0, 2.45, -0.88);
    standGroup.add(backdropFrame);

    // 3 identical wooden shelf tiers with front trim & rear guard rails
    tierHeights.forEach((tierY, idx) => {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(shelfWidth, 0.12, shelfDepth), shelfWoodMat);
      plank.position.set(0, tierY - 0.06, 0);
      plank.castShadow = !this.isSoftwareGl;
      plank.receiveShadow = true;
      standGroup.add(plank);

      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(shelfWidth, 0.03, 0.03),
        new THREE.MeshBasicMaterial({ color: idx === 1 ? accentHex : '#cbd5e1' })
      );
      trim.position.set(0, tierY - 0.06, shelfDepth * 0.5 + 0.01);
      standGroup.add(trim);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(shelfWidth, 0.06, 0.045), frameSteelMat);
      rail.position.set(0, tierY + 0.08, -shelfDepth * 0.5 + 0.04);
      standGroup.add(rail);
    });

    // 4 brushed-steel vertical corner posts + grounded foot pads
    const postGeo = new THREE.CylinderGeometry(0.065, 0.072, 4.65, 16);
    const postOffsets: Array<[number, number]> = [
      [-shelfWidth * 0.5 + 0.08, -shelfDepth * 0.5 + 0.08],
      [-shelfWidth * 0.5 + 0.08, shelfDepth * 0.5 - 0.08],
      [shelfWidth * 0.5 - 0.08, -shelfDepth * 0.5 + 0.08],
      [shelfWidth * 0.5 - 0.08, shelfDepth * 0.5 - 0.08],
    ];
    postOffsets.forEach(([px, pz]) => {
      const post = new THREE.Mesh(postGeo, frameSteelMat);
      post.position.set(px, 2.325, pz);
      standGroup.add(post);

      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.04, 16), frameSteelMat);
      foot.position.set(px, 0.02, pz);
      standGroup.add(foot);
    });

    // Stand Header Label mounted at top of orange backdrop
    const headerDiv = document.createElement('div');
    headerDiv.className = 'label-3d apparatus-label';
    headerDiv.innerHTML = `
      <div class="label-title">
        <span class="en-text">${titleEn}</span>
        <span class="both-sep"> · </span>
        <span class="kn-text">${titleKn}</span>
      </div>
    `;
    const headerObj = new CSS2DObject(headerDiv);
    headerObj.position.set(0, 5.15, -0.78);
    standGroup.add(headerObj);
  }

  private setupCleanBlueFloorAndIdenticalShelves(): void {
    // Clean Blue Laboratory Floor & Grid
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#0d1b34',
      roughness: 0.42,
      metalness: 0.12,
    });
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(36, 26), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    const gridHelper = new THREE.GridHelper(30, 44, '#3b82f6', '#1e3a8a');
    gridHelper.position.y = 0.015;
    this.scene.add(gridHelper);

    // Dark Slate Studio Back Wall
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(38, 18),
      new THREE.MeshStandardMaterial({ color: '#0b1220', roughness: 0.9 })
    );
    wall.position.set(0, 8, -4.0);
    this.scene.add(wall);

    // Two Large, Identical, 3-Tier Shelving Units positioned cleanly on the Left & Right sides
    this.leftStandGroup.position.set(-5.45, 0, -0.85);
    this.leftStandGroup.rotation.y = this.leftStandRotY;
    this.buildIdenticalShelfUnit(
      this.leftStandGroup,
      '🧪 PREPARATION STAND',
      'ತಯಾರಿ ಸ್ಟ್ಯಾಂಡ್',
      '#fb7185'
    );
    this.leftStandGroup.updateMatrixWorld(true);
    this.scene.add(this.leftStandGroup);

    this.rightStandGroup.position.set(5.45, 0, -0.85);
    this.rightStandGroup.rotation.y = -this.leftStandRotY;
    this.buildIdenticalShelfUnit(
      this.rightStandGroup,
      '🔬 TESTING STAND',
      'ಪರೀಕ್ಷಾ ಸ್ಟ್ಯಾಂಡ್',
      '#60a5fa'
    );
    this.rightStandGroup.updateMatrixWorld(true);
    this.scene.add(this.rightStandGroup);

    // Scene-level pour stream & movable station groups for seamless Stand <-> Center Table animation
    this.scene.add(this.pourStreamMesh);
    this.scene.add(this.stationAGroup);
    this.scene.add(this.stationBGroup);
  }

  private setupCenterWorkingTable(): void {
    // One clean central working & testing table in the middle between the Left and Right Stands
    this.centerTableGroup.position.set(0, 0, 0.72);

    const frameSteelMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.28,
      metalness: 0.84,
    });
    const woodTrimMat = new THREE.MeshStandardMaterial({
      color: '#7c4a26',
      roughness: 0.45,
      metalness: 0.06,
    });
    const ceramicTopMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.24,
      metalness: 0.05,
    });

    const tableW = 5.4;
    const tableD = 2.35;
    const tableY = 1.48;

    // 4 steel legs + lower cross braces
    const legGeo = new THREE.CylinderGeometry(0.075, 0.085, tableY - 0.1, 16);
    const legOffsets: Array<[number, number]> = [
      [-tableW * 0.5 + 0.22, -tableD * 0.5 + 0.2],
      [-tableW * 0.5 + 0.22, tableD * 0.5 - 0.2],
      [tableW * 0.5 - 0.22, -tableD * 0.5 + 0.2],
      [tableW * 0.5 - 0.22, tableD * 0.5 - 0.2],
    ];
    legOffsets.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, frameSteelMat);
      leg.position.set(lx, (tableY - 0.1) * 0.5, lz);
      leg.castShadow = !this.isSoftwareGl;
      this.centerTableGroup.add(leg);

      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.04, 16), frameSteelMat);
      foot.position.set(lx, 0.02, lz);
      this.centerTableGroup.add(foot);
    });

    // Side & rear support rails
    const frontApron = new THREE.Mesh(new THREE.BoxGeometry(tableW - 0.3, 0.1, 0.08), frameSteelMat);
    frontApron.position.set(0, tableY - 0.14, tableD * 0.5 - 0.2);
    const backApron = frontApron.clone();
    backApron.position.z = -tableD * 0.5 + 0.2;
    this.centerTableGroup.add(frontApron, backApron);

    // Solid wooden table core + recessed lab ceramic tabletop
    const woodCore = new THREE.Mesh(new THREE.BoxGeometry(tableW, 0.12, tableD), woodTrimMat);
    woodCore.position.set(0, tableY - 0.06, 0);
    woodCore.castShadow = !this.isSoftwareGl;
    woodCore.receiveShadow = true;
    this.centerTableGroup.add(woodCore);

    const ceramicTop = new THREE.Mesh(
      new THREE.BoxGeometry(tableW - 0.18, 0.03, tableD - 0.18),
      ceramicTopMat
    );
    ceramicTop.position.set(0, tableY + 0.005, 0);
    ceramicTop.receiveShadow = true;
    this.centerTableGroup.add(ceramicTop);

    // Left Zone Silicone Prep / Indicator Pad (x = -1.38 relative to centerTable)
    const prepMat = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.018, 1.55),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.65 })
    );
    prepMat.position.set(-1.38, tableY + 0.02, 0.06);
    prepMat.receiveShadow = true;
    this.centerTableGroup.add(prepMat);

    const prepBorder = new THREE.Mesh(
      new THREE.BoxGeometry(2.14, 0.01, 1.59),
      new THREE.MeshBasicMaterial({ color: '#fb7185' })
    );
    prepBorder.position.set(-1.38, tableY + 0.014, 0.06);
    this.centerTableGroup.add(prepBorder);

    // Right Zone Silicone Testing Mat (x = +1.22 relative to centerTable, under Active 3 Tubes)
    const testMat = new THREE.Mesh(
      new THREE.BoxGeometry(2.55, 0.018, 1.55),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.65 })
    );
    testMat.position.set(1.22, tableY + 0.02, 0.06);
    testMat.receiveShadow = true;
    this.centerTableGroup.add(testMat);

    const testBorder = new THREE.Mesh(
      new THREE.BoxGeometry(2.59, 0.01, 1.59),
      new THREE.MeshBasicMaterial({ color: '#38bdf8' })
    );
    testBorder.position.set(1.22, tableY + 0.014, 0.06);
    this.centerTableGroup.add(testBorder);

    // Center Workbench Title Sign mounted subtly along front edge
    const tableLabelDiv = document.createElement('div');
    tableLabelDiv.className = 'label-3d apparatus-label';
    tableLabelDiv.innerHTML = `
      <div class="label-title">
        <span class="en-text">🧪 WORKBENCH & TESTING TABLE</span>
        <span class="both-sep"> · </span>
        <span class="kn-text">ಕಾರ್ಯ ಮತ್ತು ಪರೀಕ್ಷಾ ಮೇಜು</span>
      </div>
    `;
    const tableLabelObj = new CSS2DObject(tableLabelDiv);
    tableLabelObj.position.set(0, 0.62, tableD * 0.5 + 0.18);
    this.centerTableGroup.add(tableLabelObj);

    this.scene.add(this.centerTableGroup);
  }

  private createApparatusLabel(
    titleEn: string,
    titleKn: string,
    subEn: string,
    subKn: string,
    yOffset: number
  ): {
    div: HTMLDivElement;
    obj: CSS2DObject;
  } {
    const div = document.createElement('div');
    div.className = 'label-3d apparatus-label';
    div.innerHTML = `
      <div class="label-title">
        <span class="en-text">${titleEn}</span>
        <span class="both-sep"> · </span>
        <span class="kn-text">${titleKn}</span>
      </div>
      <div class="label-sub">
        <span class="en-text">${subEn}</span>
        <span class="both-sep"> · </span>
        <span class="kn-text">${subKn}</span>
      </div>
    `;
    const obj = new CSS2DObject(div);
    obj.position.set(0, yOffset, 0);
    return { div, obj };
  }

  private setupLeftPreparationStand(): void {
    // -----------------------------------------------------------------------
    // TIER 3 (Top Shelf, y = 4.18): Raw Materials — Hibiscus, Warm Water, Lichen
    // -----------------------------------------------------------------------

    // Helper: compute world coordinate on Left Stand from local shelf coordinates
    const shelfToWorld = (lx: number, ly: number, lz: number) =>
      this.leftStandGroup.localToWorld(new THREE.Vector3(lx, ly, lz));

    // 1. Fresh 5-Petal Hibiscus Flower (-1.85, 4.18, 0) anchored on Left Stand Tier 3
    this.flowerGroup.position.set(-1.85, 4.18, 0);
    const saucerMesh = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.72, 0),
          new THREE.Vector2(0.92, 0.08),
          new THREE.Vector2(0.98, 0.16),
          new THREE.Vector2(0.9, 0.16),
          new THREE.Vector2(0.75, 0.06),
          new THREE.Vector2(0, 0.04),
        ],
        32
      ),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 })
    );
    saucerMesh.receiveShadow = true;
    this.flowerGroup.add(saucerMesh);

    const leafMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    for (let l = 0; l < TOTAL_PETALS; l++) {
      const leafMesh = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.62, 4), leafMat);
      leafMesh.rotation.z = Math.PI / 2;
      leafMesh.rotation.y = (l / TOTAL_PETALS) * Math.PI * 2;
      leafMesh.position.set(0, 0.11, 0);
      this.flowerGroup.add(leafMesh);
    }

    const stamen = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.62, 12),
      new THREE.MeshStandardMaterial({ color: '#e11d48', roughness: 0.3 })
    );
    stamen.position.set(0, 0.35, 0);
    this.flowerGroup.add(stamen);

    const antherMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.2 });
    for (let a = 0; a < 10; a++) {
      const anther = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), antherMat);
      const angle = (a / 10) * Math.PI * 2;
      anther.position.set(Math.cos(angle) * 0.065, 0.56 + (a % 3) * 0.035, Math.sin(angle) * 0.065);
      this.flowerGroup.add(anther);
    }

    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.quadraticCurveTo(0.32, 0.32, 0.19, 0.76);
    petalShape.quadraticCurveTo(0, 0.92, -0.19, 0.76);
    petalShape.quadraticCurveTo(-0.32, 0.32, 0, 0);
    const flowerPetalGeo = new THREE.ShapeGeometry(petalShape, 12);

    for (let i = 0; i < TOTAL_PETALS; i++) {
      const petalMesh = new THREE.Mesh(
        flowerPetalGeo,
        new THREE.MeshStandardMaterial({
          color: '#e11d48',
          roughness: 0.4,
          side: THREE.DoubleSide,
        })
      );
      petalMesh.userData = { isPetal: true, petalIndex: i, plucked: false } as InteractiveUserData;
      this.flowerGroup.add(petalMesh);
      this.pluckablePetals.push(petalMesh);
    }
    this.resetFlowerPetals();

    const flowerLabel = this.createApparatusLabel(
      '🌺 5-Petal Hibiscus',
      '5 ದಳಗಳ ದಾಸವಾಳ',
      'Pick 5 Petals',
      '5 ದಳ ಕೀಳಿ',
      1.05
    );
    this.flowerDiv = flowerLabel.div;
    this.flowerGroup.add(flowerLabel.obj);
    this.leftStandGroup.add(this.flowerGroup);

    // 2. Warm Water Beaker (0.0, 4.18, 0 on Left Stand Tier 3 -> moves to Center Table to pour)
    this.homeBeakerPos = shelfToWorld(0.0, 4.18, 0);
    this.beakerGroup.position.copy(this.homeBeakerPos);
    this.beakerGroup.rotation.y = this.leftStandRotY;
    const beakerMesh = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.58, 0),
          new THREE.Vector2(0.62, 0.07),
          new THREE.Vector2(0.62, 1.25),
          new THREE.Vector2(0.68, 1.3),
          new THREE.Vector2(0.64, 1.3),
          new THREE.Vector2(0.58, 1.25),
          new THREE.Vector2(0.58, 0.08),
          new THREE.Vector2(0, 0.08),
        ],
        36
      ),
      this.glassMaterial
    );
    beakerMesh.castShadow = !this.isSoftwareGl;
    beakerMesh.renderOrder = 2;
    beakerMesh.userData = { isBeaker: true } as InteractiveUserData;
    this.beakerGroup.add(beakerMesh);

    this.beakerWater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.56, 0.88, 28),
      new THREE.MeshStandardMaterial({
        color: '#e0f2fe',
        transparent: true,
        opacity: 0.68,
        roughness: 0.1,
      })
    );
    this.beakerWater.position.y = 0.52;
    this.beakerGroup.add(this.beakerWater);

    const steamPositions = new Float32Array(this.steamParticleCount * 3);
    for (let s = 0; s < this.steamParticleCount; s++) {
      steamPositions[s * 3] = (Math.random() - 0.5) * 0.55;
      steamPositions[s * 3 + 1] = 0.95 + Math.random() * 1.0;
      steamPositions[s * 3 + 2] = (Math.random() - 0.5) * 0.55;
    }
    this.steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3));
    const steamParticles = new THREE.Points(
      this.steamGeo,
      new THREE.PointsMaterial({
        color: '#f8fafc',
        size: 0.1,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      })
    );
    this.beakerGroup.add(steamParticles);

    const beakerLabel = this.createApparatusLabel(
      '♨️ Warm Water',
      'ಬೆಚ್ಚಗಿನ ನೀರು',
      'Pour into Mortar',
      'ಕುಟ್ಟಾಣಿಗೆ ಹಾಕಿ',
      1.58
    );
    this.beakerDiv = beakerLabel.div;
    this.beakerGroup.add(beakerLabel.obj);
    this.stationAGroup.add(this.beakerGroup);

    // 3. Dried Lichen Powder Dish (1.85, 4.18, 0 on Left Stand Tier 3)
    this.lichenDishGroup.position.set(1.85, 4.18, 0);
    const lichenDish = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.68, 0),
          new THREE.Vector2(0.84, 0.12),
          new THREE.Vector2(0.88, 0.32),
          new THREE.Vector2(0.8, 0.32),
          new THREE.Vector2(0.7, 0.12),
          new THREE.Vector2(0, 0.08),
        ],
        30
      ),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.55 })
    );
    lichenDish.userData = { isLichenDish: true } as InteractiveUserData;
    this.lichenDishGroup.add(lichenDish);

    const lichenPowder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.66, 0.66, 0.12, 28),
      new THREE.MeshStandardMaterial({ color: '#581c87', roughness: 0.9 })
    );
    lichenPowder.position.y = 0.14;
    lichenPowder.userData = { isLichenDish: true } as InteractiveUserData;
    this.lichenDishGroup.add(lichenPowder);

    const mortarMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 });
    this.lichenPestle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.85, 16), mortarMat);
    this.lichenPestle.rotation.set(-0.35, 0, 0.45);
    this.lichenPestle.position.set(0.24, 0.34, 0.14);
    this.lichenPestle.userData = { isLichenDish: true } as InteractiveUserData;
    this.lichenDishGroup.add(this.lichenPestle);

    const lichenLabel = this.createApparatusLabel(
      '🧫 Lichen Powder',
      'ಕಲ್ಲುಹೂವು ಪುಡಿ',
      'Extract Litmus',
      'ಲಿಟ್ಮಸ್ ತಯಾರಿಸಿ',
      1.25
    );
    this.lichenDiv = lichenLabel.div;
    this.lichenDishGroup.add(lichenLabel.obj);
    this.leftStandGroup.add(this.lichenDishGroup);

    // -----------------------------------------------------------------------
    // TIER 2 (Middle Shelf, y = 2.18): Mortar & Pestle, Filter & Dropper, Petal Paper Pad
    // -----------------------------------------------------------------------
    // 1. Mortar & Pestle (Starts on Left Stand Tier 2, moves to Center Table when picked)
    this.homeMortarPos = shelfToWorld(-1.85, 2.18, 0.12);
    this.mortarGroup.position.copy(this.homeMortarPos);
    this.mortarGroup.rotation.y = this.leftStandRotY;

    const mortarMesh = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.45, 0),
          new THREE.Vector2(0.84, 0.04),
          new THREE.Vector2(1.02, 0.3),
          new THREE.Vector2(1.06, 0.72),
          new THREE.Vector2(0.96, 0.76),
          new THREE.Vector2(0.86, 0.72),
          new THREE.Vector2(0.75, 0.34),
          new THREE.Vector2(0.28, 0.18),
          new THREE.Vector2(0.0, 0.16),
        ],
        40
      ),
      mortarMat
    );
    mortarMesh.castShadow = !this.isSoftwareGl;
    mortarMesh.receiveShadow = true;
    mortarMesh.userData = { isMortar: true } as InteractiveUserData;
    this.mortarGroup.add(mortarMesh);

    const pestleMesh = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.22, 0.1),
          new THREE.Vector2(0.24, 0.26),
          new THREE.Vector2(0.16, 0.54),
          new THREE.Vector2(0.12, 1.05),
          new THREE.Vector2(0.15, 1.28),
          new THREE.Vector2(0.12, 1.4),
          new THREE.Vector2(0, 1.44),
        ],
        28
      ),
      mortarMat
    );
    pestleMesh.castShadow = !this.isSoftwareGl;
    pestleMesh.userData = { isPestle: true } as InteractiveUserData;
    this.pestleGroup.add(pestleMesh);

    this.homePestlePos = shelfToWorld(-1.68, 2.48, 0.18);
    this.pestleGroup.position.copy(this.homePestlePos);
    this.pestleGroup.rotation.set(-0.22, this.leftStandRotY, 0.34);
    this.stationAGroup.add(this.pestleGroup);

    for (let m = 0; m < TOTAL_PETALS; m++) {
      const pMesh = new THREE.Mesh(
        flowerPetalGeo,
        new THREE.MeshStandardMaterial({ color: '#e11d48', roughness: 0.5, side: THREE.DoubleSide })
      );
      const a = (m / TOTAL_PETALS) * Math.PI * 2;
      pMesh.position.set(Math.cos(a) * 0.2, 0.22, Math.sin(a) * 0.2);
      pMesh.rotation.set(-Math.PI / 2, 0, a);
      pMesh.scale.setScalar(0.38);
      pMesh.visible = false;
      this.mortarGroup.add(pMesh);
      this.mortarPetalMeshes.push(pMesh);
    }

    const mortarLiquidMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.5, 0.26, 28),
      this.mortarLiquidMat
    );
    mortarLiquidMesh.position.set(0, 0.32, 0);
    this.mortarGroup.add(mortarLiquidMesh);

    const mortarLabel = this.createApparatusLabel(
      '🥣 Mortar & Pestle',
      'ಖರಲ್ ಮತ್ತು ಒನಕೆ',
      'Place on Center Table',
      'ಪರೀಕ್ಷಾ ಮೇಜಿಗೆ ಇಡಿ',
      1.35
    );
    this.mortarDiv = mortarLabel.div;
    this.mortarGroup.add(mortarLabel.obj);
    this.stationAGroup.add(this.mortarGroup);

    // 2. Filter Funnel & Detachable Hibiscus Dropper Bottle (Starts on Left Stand Tier 2)
    this.homeFilterPos = shelfToWorld(0.0, 2.18, 0.12);
    this.filterUnitGroup.position.copy(this.homeFilterPos);
    this.filterUnitGroup.rotation.y = this.leftStandRotY;

    const standMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.35,
      metalness: 0.72,
    });
    const standBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 1.05), standMat);
    standBase.position.y = 0.04;
    this.filterUnitGroup.add(standBase);

    const standRod = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.78, 14), standMat);
    standRod.position.set(0.42, 0.92, -0.35);
    this.filterUnitGroup.add(standRod);

    const clampRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.024, 10, 28), standMat);
    clampRing.rotation.x = Math.PI / 2;
    clampRing.position.set(0, 1.24, 0);
    this.filterUnitGroup.add(clampRing);

    const funnelMesh = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.38, 1.66),
          new THREE.Vector2(0.09, 1.12),
          new THREE.Vector2(0.065, 0.74),
          new THREE.Vector2(0.045, 0.74),
          new THREE.Vector2(0.065, 1.12),
          new THREE.Vector2(0.35, 1.66),
        ],
        28
      ),
      this.glassMaterial
    );
    funnelMesh.renderOrder = 2;
    funnelMesh.userData = { isFunnel: true } as InteractiveUserData;
    this.filterUnitGroup.add(funnelMesh);

    const paperConeMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 0.5, 22, 1, true),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, side: THREE.DoubleSide })
    );
    paperConeMesh.position.set(0, 1.38, 0);
    this.filterUnitGroup.add(paperConeMesh);

    const bottleMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.76, 28),
      this.glassMaterial
    );
    bottleMesh.position.y = 0.44;
    bottleMesh.renderOrder = 2;
    bottleMesh.userData = { isHibiscusDropper: true } as InteractiveUserData;
    this.hibiscusBottleGroup.add(bottleMesh);

    const bottleLiquidMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.31, 0.31, 0.58, 28),
      this.bottleLiquidMat
    );
    bottleLiquidMesh.position.y = 0.38;
    this.hibiscusBottleGroup.add(bottleLiquidMesh);

    this.hibiscusPipetteGroup.position.set(0, 0, 0);
    this.hibiscusBulbMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 14, 14),
      new THREE.MeshStandardMaterial({ color: '#be123c', roughness: 0.55 })
    );
    this.hibiscusBulbMesh.scale.set(1, 1.28, 1);
    this.hibiscusBulbMesh.position.y = 1.02;
    this.hibiscusBulbMesh.userData = { isHibiscusDropper: true } as InteractiveUserData;
    this.hibiscusPipetteGroup.add(this.hibiscusBulbMesh);

    const pipetteTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.016, 0.88, 14),
      this.glassMaterial
    );
    pipetteTube.position.y = 0.56;
    pipetteTube.userData = { isHibiscusDropper: true } as InteractiveUserData;
    this.hibiscusPipetteGroup.add(pipetteTube);

    this.hibiscusPipetteLiquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.012, 0.5, 12),
      new THREE.MeshStandardMaterial({
        color: '#be123c',
        transparent: true,
        opacity: 0.9,
        roughness: 0.2,
      })
    );
    this.hibiscusPipetteLiquid.position.y = 0.38;
    this.hibiscusPipetteLiquid.visible = false;
    this.hibiscusPipetteGroup.add(this.hibiscusPipetteLiquid);

    const indBottleLabel = this.createApparatusLabel(
      '💧 Hibiscus Indicator',
      'ದಾಸವಾಳ ಸೂಚಕ',
      'Tap Tubes to Test',
      'ಪರೀಕ್ಷಿಸಲು ಟ್ಯೂಬ್ ಒತ್ತಿ',
      1.48
    );
    this.hibiscusBottleDiv = indBottleLabel.div;
    this.hibiscusBottleLabelObj = indBottleLabel.obj;
    this.hibiscusBottleLabelObj.visible = false;
    this.hibiscusBottleGroup.add(this.hibiscusBottleLabelObj);

    this.hibiscusBottleGroup.add(this.hibiscusPipetteGroup);
    this.filterUnitGroup.add(this.hibiscusBottleGroup);

    const bottleLabel = this.createApparatusLabel(
      '🧪 Filter Funnel',
      'ಸೋಸುವ ಫನೆಲ್',
      'Filter onto Table',
      'ಮೇಜಿಗೆ ಸೋಸಿ ತೆಗೆಯಿರಿ',
      1.84
    );
    this.bottleDiv = bottleLabel.div;
    this.filterLabelObj = bottleLabel.obj;
    this.filterUnitGroup.add(this.filterLabelObj);
    this.stationAGroup.add(this.filterUnitGroup);

    // 3. Hibiscus Petal-Rubbing Paper Pad (Starts on Left Stand Tier 2)
    this.homeHibPadPos = shelfToWorld(1.85, 2.18, 0.12);
    this.hibiscusPaperPadGroup.position.copy(this.homeHibPadPos);
    this.hibiscusPaperPadGroup.rotation.y = this.leftStandRotY;

    const hibTile = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.08, 1.05),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.16 })
    );
    hibTile.position.y = 0.04;
    hibTile.receiveShadow = true;
    hibTile.userData = { isHibiscusPaperPad: true } as InteractiveUserData;
    this.hibiscusPaperPadGroup.add(hibTile);

    this.hibiscusPaperStackMat = new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      roughness: 0.72,
    });
    const hibPaperStack = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.07, 0.84),
      this.hibiscusPaperStackMat
    );
    hibPaperStack.position.set(0.24, 0.11, 0);
    hibPaperStack.userData = { isHibiscusPaperPad: true } as InteractiveUserData;
    this.hibiscusPaperPadGroup.add(hibPaperStack);

    this.rubbingPetalMesh = new THREE.Mesh(
      flowerPetalGeo,
      new THREE.MeshStandardMaterial({
        color: '#e11d48',
        roughness: 0.42,
        side: THREE.DoubleSide,
      })
    );
    this.rubbingPetalMesh.position.set(-0.34, 0.12, 0.28);
    this.rubbingPetalMesh.rotation.set(-Math.PI / 2, 0, 0.2);
    this.rubbingPetalMesh.scale.setScalar(0.68);
    this.rubbingPetalMesh.userData = { isHibiscusPaperPad: true } as InteractiveUserData;
    this.hibiscusPaperPadGroup.add(this.rubbingPetalMesh);

    const hibPadLabel = this.createApparatusLabel(
      '🌺📄 Rub Petal on Paper',
      'ದಳ ಉಜ್ಜಿದ ಕಾಗದ',
      'Rub & Dip Strips',
      'ದಳ ಉಜ್ಜಿ ಪರೀಕ್ಷಿಸಿ',
      1.08
    );
    this.hibiscusPadDiv = hibPadLabel.div;
    this.hibiscusPaperPadGroup.add(hibPadLabel.obj);
    this.stationAGroup.add(this.hibiscusPaperPadGroup);

    // -----------------------------------------------------------------------
    // TIER 1 (Bottom Shelf, y = 0.28): Litmus Dropper, Litmus Papers, Stock Flask
    // -----------------------------------------------------------------------
    // 1. Amber Litmus Solution Dropper Bottle (Starts on Left Stand Tier 1)
    this.homeLitmusBottlePos = shelfToWorld(-1.85, 0.28, 0.1);
    this.litmusLiquidGroup.position.copy(this.homeLitmusBottlePos);
    this.litmusLiquidGroup.rotation.y = this.leftStandRotY;

    const amberGlass = new THREE.MeshPhysicalMaterial({
      color: '#78350f',
      transmission: this.isSoftwareGl ? 0 : 0.72,
      opacity: this.isSoftwareGl ? 0.55 : 1.0,
      transparent: true,
      depthWrite: false,
      roughness: 0.12,
      ior: 1.54,
    });
    const litmusBottleMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.88, 28),
      amberGlass
    );
    litmusBottleMesh.position.y = 0.46;
    litmusBottleMesh.renderOrder = 2;
    litmusBottleMesh.userData = { isLitmusDropper: true } as InteractiveUserData;
    this.litmusLiquidGroup.add(litmusBottleMesh);

    const litmusBottleLiquidMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.68, 28),
      this.litmusBottleLiquidMat
    );
    litmusBottleLiquidMesh.position.y = 0.4;
    this.litmusLiquidGroup.add(litmusBottleLiquidMesh);

    this.litmusPipetteGroup.position.set(0, 0, 0);
    this.litmusBulbMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 14, 14),
      new THREE.MeshStandardMaterial({ color: '#312e81', roughness: 0.55 })
    );
    this.litmusBulbMesh.scale.set(1, 1.28, 1);
    this.litmusBulbMesh.position.y = 1.12;
    this.litmusBulbMesh.userData = { isLitmusDropper: true } as InteractiveUserData;
    this.litmusPipetteGroup.add(this.litmusBulbMesh);

    const litmusPipette = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.016, 0.94, 14),
      this.glassMaterial
    );
    litmusPipette.position.y = 0.6;
    litmusPipette.userData = { isLitmusDropper: true } as InteractiveUserData;
    this.litmusPipetteGroup.add(litmusPipette);

    this.litmusPipetteLiquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.012, 0.55, 12),
      new THREE.MeshStandardMaterial({
        color: '#7c3aed',
        transparent: true,
        opacity: 0.9,
        roughness: 0.2,
      })
    );
    this.litmusPipetteLiquid.position.y = 0.42;
    this.litmusPipetteLiquid.visible = false;
    this.litmusPipetteGroup.add(this.litmusPipetteLiquid);

    this.litmusLiquidGroup.add(this.litmusPipetteGroup);

    const litmusSolLabel = this.createApparatusLabel(
      '💧 Litmus Dropper',
      'ಲಿಟ್ಮಸ್ ಡ್ರಾಪರ್',
      'Click to Add Drops',
      'ಹನಿ ಹಾಕಲು ಕ್ಲಿಕ್ ಮಾಡಿ',
      1.48
    );
    this.litmusDropperDiv = litmusSolLabel.div;
    this.litmusLiquidGroup.add(litmusSolLabel.obj);
    this.stationBGroup.add(this.litmusLiquidGroup);

    // 2. Red & Blue Litmus Paper Ceramic Tray (Starts on Left Stand Tier 1)
    this.homeLitmusPadPos = shelfToWorld(0.0, 0.28, 0.1);
    this.litmusPadGroup.position.copy(this.homeLitmusPadPos);
    this.litmusPadGroup.rotation.y = this.leftStandRotY;

    const tileMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.08, 1.05),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.15 })
    );
    tileMesh.position.y = 0.04;
    tileMesh.receiveShadow = true;
    this.litmusPadGroup.add(tileMesh);

    const redLitmusStack = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.07, 0.84),
      new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.7 })
    );
    redLitmusStack.position.set(-0.46, 0.1, 0);
    redLitmusStack.userData = { isRedLitmusStack: true } as InteractiveUserData;
    this.litmusPadGroup.add(redLitmusStack);

    const blueLitmusStack = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.07, 0.84),
      new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.7 })
    );
    blueLitmusStack.position.set(0.46, 0.1, 0);
    blueLitmusStack.userData = { isBlueLitmusStack: true } as InteractiveUserData;
    this.litmusPadGroup.add(blueLitmusStack);

    const padLabel = this.createApparatusLabel(
      '📑 Red & Blue Papers',
      'ಕೆಂಪು & ನೀಲಿ ಕಾಗದ',
      'Click to Dip Strips',
      'ಕಾಗದ ಅದ್ದಲು ಕ್ಲಿಕ್ ಮಾಡಿ',
      1.05
    );
    this.litmusPadDiv = padLabel.div;
    this.litmusPadGroup.add(padLabel.obj);
    this.stationBGroup.add(this.litmusPadGroup);

    // 3. Clean Stock Volumetric Flask (1.85, 0.28, 0 on Left Stand Tier 1)
    const stockFlaskGroup = new THREE.Group();
    stockFlaskGroup.position.set(1.85, 0.28, 0);
    const stockBody = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.42, 0),
          new THREE.Vector2(0.46, 0.18),
          new THREE.Vector2(0.14, 0.74),
          new THREE.Vector2(0.14, 1.15),
          new THREE.Vector2(0.19, 1.2),
        ],
        22
      ),
      this.glassMaterial
    );
    const stockLiquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.38, 0.44, 18),
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.65,
        roughness: 0.15,
      })
    );
    stockLiquid.position.y = 0.24;
    const stockStopper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.11, 0.16, 14),
      new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.8 })
    );
    stockStopper.position.y = 1.24;
    stockFlaskGroup.add(stockBody, stockLiquid, stockStopper);
    this.leftStandGroup.add(stockFlaskGroup);
  }

  private setupRightTestingStand(): void {
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: '#78350f',
      roughness: 0.55,
      metalness: 0.05,
    });

    // -----------------------------------------------------------------------
    // TIER 3 (Top Shelf, y = 4.18): 3 Items — Hibiscus Board, Litmus Board, Measuring Cylinder
    // -----------------------------------------------------------------------
    // 1. Hibiscus Paper Results Board (-1.75, 4.18, -0.05)
    this.stationAPinboardGroup.position.set(-1.75, 4.18, -0.05);
    const miniBoardFrame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.35, 0.08), woodMaterial);
    miniBoardFrame.position.y = 0.72;
    this.stationAPinboardGroup.add(miniBoardFrame);

    const miniCorkFace = new THREE.Mesh(
      new THREE.BoxGeometry(1.74, 1.18, 0.04),
      new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.85 })
    );
    miniCorkFace.position.set(0, 0.72, 0.035);
    this.stationAPinboardGroup.add(miniCorkFace);
    this.stationAPinboardGroup.add(this.pinnedHibiscusGroup);

    const pinboardALabel = this.createApparatusLabel(
      '📌 Hibiscus Strip Board',
      'ದಾಸವಾಳ ಕಾಗದ ಫಲಕ',
      'Pinned Paper Results',
      'ಪರೀಕ್ಷಿತ ಕಾಗದ',
      1.62
    );
    this.hibiscusBoardDiv = pinboardALabel.div;
    this.stationAPinboardGroup.add(pinboardALabel.obj);
    this.rightStandGroup.add(this.stationAPinboardGroup);

    // 2. Litmus Paper Results Pinboard (0.25, 4.18, -0.05)
    this.litmusPinboardGroup.position.set(0.25, 4.18, -0.05);
    const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.35, 0.08), woodMaterial);
    boardFrame.position.y = 0.72;
    this.litmusPinboardGroup.add(boardFrame);

    const corkFace = new THREE.Mesh(
      new THREE.BoxGeometry(1.74, 1.18, 0.04),
      new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.85 })
    );
    corkFace.position.set(0, 0.72, 0.035);
    this.litmusPinboardGroup.add(corkFace);
    this.litmusPinboardGroup.add(this.pinnedItemsGroup);

    const pinboardBLabel = this.createApparatusLabel(
      '📌 Litmus Pinboard',
      'ಲಿಟ್ಮಸ್ ಫಲಕ',
      'Pinned Results',
      'ಪರೀಕ್ಷಿತ ಕಾಗದ',
      1.62
    );
    this.litmusBoardDiv = pinboardBLabel.div;
    this.litmusPinboardGroup.add(pinboardBLabel.obj);
    this.rightStandGroup.add(this.litmusPinboardGroup);

    // 3. Graduated Measuring Cylinder (2.05, 4.18, 0.05)
    const cylinderGroup = new THREE.Group();
    cylinderGroup.position.set(2.05, 4.18, 0.05);
    const cylBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.34, 0.08, 6),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.35, metalness: 0.65 })
    );
    cylBase.position.y = 0.04;
    const cylTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 1.45, 22, 1, true),
      this.glassMaterial
    );
    cylTube.position.y = 0.78;
    const cylLiquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.135, 0.135, 0.92, 18),
      new THREE.MeshStandardMaterial({
        color: '#60a5fa',
        transparent: true,
        opacity: 0.6,
        roughness: 0.12,
      })
    );
    cylLiquid.position.y = 0.52;
    cylinderGroup.add(cylBase, cylTube, cylLiquid);
    const tickMat = new THREE.MeshBasicMaterial({ color: '#e2e8f0' });
    for (let t = 0; t < 5; t++) {
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.02), tickMat);
      tick.position.set(0, 0.38 + t * 0.22, 0.165);
      cylinderGroup.add(tick);
    }
    this.rightStandGroup.add(cylinderGroup);

    // -----------------------------------------------------------------------
    // TIER 2 (Middle Shelf, y = 2.18): Sample Storage Rack on Right Stand
    // -----------------------------------------------------------------------
    this.storageRackGroup.position.set(0, 2.18, 0.08);
    const storageBase = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 0.78), woodMaterial);
    storageBase.position.y = 0.04;
    storageBase.receiveShadow = true;
    this.storageRackGroup.add(storageBase);

    const storageBackBar = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 0.1), woodMaterial);
    storageBackBar.position.set(0, 0.56, -0.26);
    this.storageRackGroup.add(storageBackBar);

    const sPostL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.56, 0.48), woodMaterial);
    sPostL.position.set(-2.15, 0.28, -0.08);
    const sPostR = sPostL.clone();
    sPostR.position.x = 2.15;
    this.storageRackGroup.add(sPostL, sPostR);

    const storageLabel = this.createApparatusLabel(
      '🧪 Sample Rack (Click to Pick)',
      'ಮಾದರಿ ಸ್ಟ್ಯಾಂಡ್ (ಆಯ್ಕೆ ಮಾಡಿ)',
      'Move Tubes to Center Table',
      'ಪರೀಕ್ಷಾ ಮೇಜಿಗೆ ತರಲು ಕ್ಲಿಕ್ ಮಾಡಿ',
      1.42
    );
    this.storageRackGroup.add(storageLabel.obj);
    this.rightStandGroup.add(this.storageRackGroup);

    // -----------------------------------------------------------------------
    // TIER 1 (Bottom Shelf, y = 0.28): Clean Rinse Beaker & Distilled Wash Bottle
    // -----------------------------------------------------------------------
    const rinseGroup = new THREE.Group();
    rinseGroup.position.set(-1.35, 0.28, 0.06);
    const rinseMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.38, 0.95, 24, 1, true),
      this.glassMaterial
    );
    rinseMesh.position.y = 0.5;
    const rinseWater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.37, 0.35, 0.58, 20),
      new THREE.MeshStandardMaterial({
        color: '#bae6fd',
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
      })
    );
    rinseWater.position.y = 0.31;
    rinseGroup.add(rinseMesh, rinseWater);
    this.rightStandGroup.add(rinseGroup);

    const washBottleGroup = new THREE.Group();
    washBottleGroup.position.set(1.25, 0.28, 0.06);
    const washBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.88, 22),
      new THREE.MeshPhysicalMaterial({
        color: '#e0f2fe',
        transmission: this.isSoftwareGl ? 0 : 0.7,
        opacity: this.isSoftwareGl ? 0.5 : 1.0,
        transparent: true,
        depthWrite: false,
        roughness: 0.2,
      })
    );
    washBody.position.y = 0.44;
    const washCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 0.2, 18),
      new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.4 })
    );
    washCap.position.y = 0.96;
    const washSpout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.04, 0.42, 10),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 })
    );
    washSpout.position.set(0.14, 1.15, 0);
    washSpout.rotation.z = -0.62;
    washBottleGroup.add(washBody, washCap, washSpout);
    this.rightStandGroup.add(washBottleGroup);

    // -----------------------------------------------------------------------
    // CENTER TABLE RIGHT ZONE: Active 3-Tube Testing Rack
    // -----------------------------------------------------------------------
    this.activeRackGroup.position.set(1.22, 1.49, 0.06);
    const activeBase = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.09, 0.72), woodMaterial);
    activeBase.position.y = 0.045;
    activeBase.receiveShadow = true;
    this.activeRackGroup.add(activeBase);

    const activeTopBar = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.08, 0.62), woodMaterial);
    activeTopBar.position.y = 1.04;
    this.activeRackGroup.add(activeTopBar);

    const activeSideL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.04, 0.62), woodMaterial);
    activeSideL.position.set(-1.19, 0.52, 0);
    const activeSideR = activeSideL.clone();
    activeSideR.position.x = 1.19;
    this.activeRackGroup.add(activeSideL, activeSideR);

    const ringMat = new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.78, roughness: 0.24 });
    for (let i = 0; i < ACTIVE_FRONT_SLOTS; i++) {
      const slotX = (i - 1) * 0.82;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 10, 24), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(slotX, 1.09, 0);
      this.activeRackGroup.add(ring);
    }
    this.centerTableGroup.add(this.activeRackGroup);
  }

  private resetFlowerPetals(): void {
    this.pluckablePetals.forEach((p, i) => {
      const angle = (i / TOTAL_PETALS) * Math.PI * 2;
      if (p.parent !== this.flowerGroup) {
        this.flowerGroup.add(p);
      }
      p.rotation.set(-0.55, 0, angle + Math.PI / 2);
      p.position.set(Math.cos(angle) * 0.12, 0.2, Math.sin(angle) * 0.12);
      p.scale.setScalar(0.84);
      p.visible = true;
      (p.userData as InteractiveUserData).plucked = false;
    });
  }

  private renderTubeLabelHTML(
    rosterNum: number,
    substance: Substance,
    statusEn: string | null = null,
    statusKn: string | null = null,
    dotColor: string | null = null,
    isShelf = false
  ): string {
    const col = dotColor || substance.initialColorHex;
    const checkMark = statusEn ? ' ✓' : '';
    if (isShelf) {
      return `
        <div class="tube-compact-info label-title">
          <span class="swatch-indicator" style="background: ${col};"></span>
          <span>#${rosterNum}${checkMark}</span>
        </div>
        <div class="tube-full-info">
          <div class="label-title">
            <span class="swatch-indicator" style="background: ${col};"></span>
            <span class="en-text">${rosterNum}. ${substance.nameEn}</span>
            <span class="both-sep"> · </span>
            <span class="kn-text">${substance.nameKn}</span>
          </div>
          <div class="label-sub">
            <span class="en-text">Pick to front</span>
            <span class="both-sep"> · </span>
            <span class="kn-text">ಮುಂದಕ್ಕೆ ತೆಗೆಯಿರಿ</span>
          </div>
        </div>
      `;
    }
    const subEn = statusEn || `${substance.typeEn}`;
    const subKn = statusKn || `${substance.nameKn} · ${substance.typeKn}`;
    return `
      <div class="tube-compact-info label-title">
        <span class="swatch-indicator" style="background: ${col};"></span>
        <span>#${rosterNum}${checkMark}</span>
      </div>
      <div class="tube-full-info">
        <div class="label-title">
          <span class="swatch-indicator" style="background: ${col};"></span>
          <span class="en-text">${rosterNum}. ${substance.nameEn}</span>
          <span class="both-sep"> · </span>
          <span class="kn-text">${rosterNum}. ${substance.nameKn}</span>
        </div>
        <div class="label-sub">
          <span class="en-text">${subEn}</span>
          <span class="both-sep"> · </span>
          <span class="kn-text">${subKn}</span>
        </div>
      </div>
    `;
  }

  private clearTubeList(list: TubeEntry[], parent: THREE.Group): void {
    list.forEach((t) => {
      parent.remove(t.container);
      t.mesh.geometry.dispose();
      t.liquidMesh.geometry.dispose();
      t.liquidMat.dispose();
      t.labelObj.element.parentNode?.removeChild(t.labelObj.element);
    });
    list.length = 0;
  }

  private createTubeEntry(
    substance: Substance,
    rosterIdx: number,
    slotIndex: number,
    posX: number,
    posY: number,
    scale: number,
    isShelf: boolean
  ): TubeEntry {
    const tubeHeight = 1.85;
    const tubeRadius = 0.2;
    const tubePoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(tubeRadius * 0.9, 0.05),
      new THREE.Vector2(tubeRadius, 0.2),
      new THREE.Vector2(tubeRadius, tubeHeight),
      new THREE.Vector2(tubeRadius * 1.15, tubeHeight + 0.04),
      new THREE.Vector2(tubeRadius * 0.95, tubeHeight + 0.04),
      new THREE.Vector2(tubeRadius * 0.85, 0.2),
      new THREE.Vector2(0, 0.05),
    ];
    const tubeGeo = new THREE.LatheGeometry(tubePoints, 24);
    const state = this.testRecords[substance.id];
    const useHibiscusView = this.currentTab !== 'litmus';

    const container = new THREE.Group();
    container.position.set(posX, posY, 0);
    container.scale.setScalar(scale);

    const userData: InteractiveUserData = isShelf
      ? { isShelfTubeA: true, substanceId: substance.id, index: slotIndex }
      : { isTubeA: true, substanceId: substance.id, index: slotIndex };

    const mesh = new THREE.Mesh(tubeGeo, this.glassMaterial);
    mesh.castShadow = !this.isSoftwareGl && !isShelf;
    mesh.renderOrder = 2;
    mesh.userData = userData;
    container.add(mesh);

    const targetColor = useHibiscusView ? substance.hibiscusColorHex : substance.litmusSolutionHex;
    const liquidMat = createLiquidShaderMaterial(substance.initialColorHex, targetColor);
    const liquidMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(tubeRadius * 0.82, tubeRadius * 0.82, 1.05, 20),
      liquidMat
    );
    liquidMesh.position.y = 0.62;
    liquidMesh.userData = userData;
    container.add(liquidMesh);

    if (useHibiscusView && state.hibiscusTested) {
      liquidMat.uniforms.uColorMix.value = 1.0;
    } else if (!useHibiscusView && state.litmusSolutionTested) {
      liquidMat.uniforms.uColorMix.value = 1.0;
    }

    const labelDiv = document.createElement('div');
    let badgeClass = '';
    let statusEn: string | null = null;
    let statusKn: string | null = null;
    let dot: string | null = null;

    if (useHibiscusView) {
      if (state.hibiscusTested) {
        badgeClass =
          substance.category === 'acid'
            ? 'tested-acid'
            : substance.category === 'base'
              ? 'tested-base'
              : 'tested-neutral';
        statusEn = `🌺 ${substance.hibiscusResultEn}`;
        statusKn = `🌺 ${substance.hibiscusResultKn}`;
        dot = substance.hibiscusColorHex;
      } else if (state.hibiscusPaperTested) {
        badgeClass =
          substance.category === 'acid'
            ? 'tested-acid'
            : substance.category === 'base'
              ? 'tested-base'
              : 'tested-neutral';
        statusEn = `📄 ${substance.hibiscusPaperResultEn}`;
        statusKn = `📄 ${substance.hibiscusPaperResultKn}`;
        dot = substance.hibiscusColorHex;
      }
    } else {
      if (state.litmusSolutionTested) {
        badgeClass =
          substance.category === 'acid'
            ? 'tested-acid'
            : substance.category === 'base'
              ? 'tested-base'
              : 'tested-neutral';
        statusEn = `📜 ${substance.litmusSolutionResultEn}`;
        statusKn = `📜 ${substance.litmusSolutionResultKn}`;
        dot = substance.litmusSolutionHex;
      } else if (state.litmusPaperRedTested || state.litmusPaperBlueTested) {
        badgeClass =
          substance.category === 'acid'
            ? 'tested-acid'
            : substance.category === 'base'
              ? 'tested-base'
              : 'tested-neutral';
        statusEn = '📜 Paper Tested';
        statusKn = '📜 ಕಾಗದ ಪರೀಕ್ಷಿತ';
        dot = substance.litmusSolutionHex;
      }
    }

    labelDiv.className = `label-3d tube-pill ${badgeClass}`;
    labelDiv.innerHTML = this.renderTubeLabelHTML(
      rosterIdx + 1,
      substance,
      statusEn,
      statusKn,
      dot,
      isShelf
    );

    const labelObj = new CSS2DObject(labelDiv);
    labelObj.position.set(0, isShelf ? 2.0 : 2.15, 0);
    container.add(labelObj);

    return {
      substance,
      container,
      mesh,
      liquidMesh,
      liquidMat,
      labelDiv,
      labelObj,
      slotIndex,
    };
  }

  private buildTestTubes(): void {
    this.clearTubeList(this.activeTubes, this.activeRackGroup);
    this.clearTubeList(this.shelfTubes, this.storageRackGroup);

    const validIds = new Set(this.activeSubstances.map((s) => s.id));
    this.activeTubeIds = this.activeTubeIds.filter((id) => validIds.has(id)).slice(0, ACTIVE_FRONT_SLOTS);
    for (const s of this.activeSubstances) {
      if (this.activeTubeIds.length >= ACTIVE_FRONT_SLOTS) break;
      if (!this.activeTubeIds.includes(s.id)) {
        this.activeTubeIds.push(s.id);
      }
    }

    // Build 3 Active Testing Tubes on Center Table Testing Rack
    this.activeTubeIds.forEach((id, slotIdx) => {
      const rosterIdx = this.activeSubstances.findIndex((s) => s.id === id);
      const substance = this.activeSubstances[rosterIdx];
      if (!substance) return;
      const posX = (slotIdx - 1) * 0.82;

      const entry = this.createTubeEntry(substance, rosterIdx, slotIdx, posX, 0.09, 0.78, false);
      this.activeRackGroup.add(entry.container);
      this.activeTubes.push(entry);
    });

    // Build remaining Sample Tubes neatly in Right Stand Tier 2 Storage Rack
    const shelfSubs = this.activeSubstances.filter((s) => !this.activeTubeIds.includes(s.id));
    const shelfCount = shelfSubs.length;
    const shelfSpan = 3.6;
    const shelfSpacing = shelfCount > 1 ? shelfSpan / (shelfCount - 1) : 0;
    const shelfStartX = shelfCount > 1 ? -shelfSpan / 2 : 0;

    shelfSubs.forEach((substance, i) => {
      const rosterIdx = this.activeSubstances.findIndex((s) => s.id === substance.id);
      const posX = shelfStartX + i * shelfSpacing;

      const shelfEntry = this.createTubeEntry(substance, rosterIdx, i, posX, 0.08, 0.58, true);
      this.storageRackGroup.add(shelfEntry.container);
      this.shelfTubes.push(shelfEntry);
    });

    this.rebuildInteractiveList();
    this.updateLabelStationVisibility();
  }

  private rebuildInteractiveList(): void {
    this.interactiveMeshes = [];
    this.scene.traverse((obj) => {
      const d = obj.userData as InteractiveUserData;
      if (
        d &&
        (d.isPetal ||
          d.isMortar ||
          d.isPestle ||
          d.isBeaker ||
          d.isFunnel ||
          d.isHibiscusDropper ||
          d.isHibiscusPaperPad ||
          d.isLichenDish ||
          d.isRedLitmusStack ||
          d.isBlueLitmusStack ||
          d.isLitmusDropper ||
          d.isTubeA ||
          d.isTubeB ||
          d.isShelfTubeA ||
          d.isShelfTubeB)
      ) {
        this.interactiveMeshes.push(obj);
      }
    });
  }

  private setAnimating(isAnim: boolean, labelEn = '', labelKn = ''): void {
    this.animating = isAnim;
    this.animatingLabelEn = labelEn;
    this.animatingLabelKn = labelKn;
    document.body.classList.toggle('is-animating', isAnim);
    this.emitSnapshot();
  }

  private updateLabelStationVisibility(): void {
    const showA = this.currentTab === 'hibiscus' || this.currentTab === 'compare';
    const showB = this.currentTab === 'litmus' || this.currentTab === 'compare';

    this.stationAGroup.traverse((obj) => {
      if (obj instanceof CSS2DObject) {
        obj.visible = showA;
      }
    });
    this.flowerGroup.traverse((obj) => {
      if (obj instanceof CSS2DObject) obj.visible = showA;
    });
    this.stationBGroup.traverse((obj) => {
      if (obj instanceof CSS2DObject) {
        obj.visible = showB;
      }
    });
    this.lichenDishGroup.traverse((obj) => {
      if (obj instanceof CSS2DObject) obj.visible = showB;
    });
    this.stationAPinboardGroup.traverse((obj) => {
      if (obj instanceof CSS2DObject) obj.visible = showA;
    });
    this.litmusPinboardGroup.traverse((obj) => {
      if (obj instanceof CSS2DObject) obj.visible = showB;
    });

    // Keep indicator-only bottle label shown once extracted onto Center Table
    if (this.hibiscusBottleLabelObj) {
      this.hibiscusBottleLabelObj.visible = showA && this.isFiltered;
    }
    if (this.filterLabelObj) {
      this.filterLabelObj.visible = showA;
    }
  }

  private syncCenterTableApparatus(): void {
    // Keep only the active indicator/prep item on the Center Table Indicator Zone;
    // return all other materials neatly to their Left Stand shelves!
    const onHibiscus = this.currentTab === 'hibiscus' || this.currentTab === 'compare';
    const onLitmus = this.currentTab === 'litmus';

    // Default all Left Stand homes first
    this.beakerGroup.position.copy(this.homeBeakerPos);
    this.beakerGroup.rotation.set(0, this.leftStandRotY, 0);

    // Mortar & Pestle: only on Center Table during Hibiscus prep (mortarOnTable && !isFiltered)
    if (onHibiscus && this.mortarOnTable && !this.isFiltered && this.stationATool === 'dropper') {
      this.mortarGroup.position.copy(this.tableIndicatorPos);
      this.mortarGroup.rotation.set(0, 0, 0);
      this.pestleGroup.position.copy(this.tableIndicatorPos).add(this.tablePestleOffset);
      this.pestleGroup.rotation.set(-0.22, 0, 0.34);
    } else {
      this.mortarGroup.position.copy(this.homeMortarPos);
      this.mortarGroup.rotation.set(0, this.leftStandRotY, 0);
      this.pestleGroup.position.copy(this.homePestlePos);
      this.pestleGroup.rotation.set(-0.22, this.leftStandRotY, 0.34);
    }

    // Filter unit always returns to Left Stand when not actively filtering
    this.filterUnitGroup.position.copy(this.homeFilterPos);
    this.filterUnitGroup.rotation.set(0, this.leftStandRotY, 0);

    // Hibiscus Indicator Dropper Bottle: sits alone on Center Table Indicator Pad when filtered & dropper mode active
    if (this.isFiltered) {
      if (this.hibiscusBottleGroup.parent !== this.scene) {
        this.scene.attach(this.hibiscusBottleGroup);
      }
      if (onHibiscus && this.stationATool === 'dropper') {
        this.hibiscusBottleGroup.position.copy(this.tableIndicatorPos);
        this.hibiscusBottleGroup.rotation.set(0, 0, 0);
      } else {
        // Put neatly on Left Stand beside Filter Funnel
        this.hibiscusBottleGroup.position.copy(this.homeFilterPos).add(new THREE.Vector3(0.45, 0, 0.35));
        this.hibiscusBottleGroup.rotation.set(0, this.leftStandRotY, 0);
      }
    }

    // Hibiscus Petal-Rubbing Paper Pad: moves onto Center Table when paper mode is selected on Hibiscus tab
    if (onHibiscus && this.stationATool === 'paper') {
      this.hibiscusPaperPadGroup.position.copy(this.tableIndicatorPos);
      this.hibiscusPaperPadGroup.rotation.set(0, 0, 0);
    } else {
      this.hibiscusPaperPadGroup.position.copy(this.homeHibPadPos);
      this.hibiscusPaperPadGroup.rotation.set(0, this.leftStandRotY, 0);
    }

    // Litmus Dropper vs Paper Tray on Center Table when Litmus tab active
    if (onLitmus) {
      if (this.stationBTool === 'solution') {
        this.litmusPadGroup.position.copy(this.homeLitmusPadPos);
        this.litmusPadGroup.rotation.set(0, this.leftStandRotY, 0);
        if (this.litmusPrepared) {
          this.litmusLiquidGroup.position.copy(this.tableIndicatorPos);
          this.litmusLiquidGroup.rotation.set(0, 0, 0);
        } else {
          this.litmusLiquidGroup.position.copy(this.homeLitmusBottlePos);
          this.litmusLiquidGroup.rotation.set(0, this.leftStandRotY, 0);
        }
      } else {
        this.litmusLiquidGroup.position.copy(this.homeLitmusBottlePos);
        this.litmusLiquidGroup.rotation.set(0, this.leftStandRotY, 0);
        this.litmusPadGroup.position.copy(this.tableIndicatorPos);
        this.litmusPadGroup.rotation.set(0, 0, 0);
      }
    } else {
      this.litmusLiquidGroup.position.copy(this.homeLitmusBottlePos);
      this.litmusLiquidGroup.rotation.set(0, this.leftStandRotY, 0);
      this.litmusPadGroup.position.copy(this.homeLitmusPadPos);
      this.litmusPadGroup.rotation.set(0, this.leftStandRotY, 0);
    }
  }

  private updateGuideRing(): void {
    [
      this.flowerDiv,
      this.mortarDiv,
      this.beakerDiv,
      this.bottleDiv,
      this.hibiscusBottleDiv,
      this.hibiscusPadDiv,
      this.lichenDiv,
    ].forEach((el) => el?.classList.remove('is-target-highlight'));

    let targetGroup: THREE.Object3D | null = null;
    if (this.currentTab === 'hibiscus') {
      if (this.stationATool === 'paper') {
        if (!this.hibiscusPaperPrepared) {
          targetGroup = this.hibiscusPaperPadGroup;
          this.hibiscusPadDiv?.classList.add('is-target-highlight');
        }
      } else if (this.hibiscusStage === 'A0') {
        if (!this.mortarOnTable) {
          targetGroup = this.mortarGroup;
          this.mortarDiv?.classList.add('is-target-highlight');
        } else {
          targetGroup = this.flowerGroup;
          this.flowerDiv?.classList.add('is-target-highlight');
        }
      } else if (this.hibiscusStage === 'A1') {
        targetGroup = this.mortarGroup;
        this.mortarDiv?.classList.add('is-target-highlight');
      } else if (this.hibiscusStage === 'A2') {
        targetGroup = this.beakerGroup;
        this.beakerDiv?.classList.add('is-target-highlight');
      } else if (this.hibiscusStage === 'A3') {
        targetGroup = this.filterUnitGroup;
        this.bottleDiv?.classList.add('is-target-highlight');
      }
    } else if (this.currentTab === 'litmus') {
      if (!this.litmusPrepared && this.stationBTool === 'solution') {
        targetGroup = this.lichenDishGroup;
        this.lichenDiv?.classList.add('is-target-highlight');
      }
    }

    if (targetGroup) {
      targetGroup.getWorldPosition(this._worldPos);
      this.guideRing.position.set(this._worldPos.x, this._worldPos.y + 0.03, this._worldPos.z);
      this.guideRing.visible = true;
    } else {
      this.guideRing.visible = false;
    }
  }

  private emitSnapshot(): void {
    const hCount = this.activeSubstances.filter((s) => this.testRecords[s.id].hibiscusTested).length;
    const hPaperCount = this.activeSubstances.filter(
      (s) => this.testRecords[s.id].hibiscusPaperTested
    ).length;
    const lCount = this.activeSubstances.filter(
      (s) =>
        this.testRecords[s.id].litmusPaperRedTested ||
        this.testRecords[s.id].litmusPaperBlueTested ||
        this.testRecords[s.id].litmusSolutionTested
    ).length;
    const lSolCount = this.activeSubstances.filter(
      (s) => this.testRecords[s.id].litmusSolutionTested
    ).length;

    const clonedRecords: Record<number, SubstanceTestRecord> = {};
    Object.keys(this.testRecords).forEach((key) => {
      const id = Number(key);
      clonedRecords[id] = { ...this.testRecords[id] };
    });

    this.callbacks.onSnapshot({
      tab: this.currentTab,
      mortarOnTable: this.mortarOnTable,
      petalsPlucked: this.petalsPlucked,
      totalPetals: TOTAL_PETALS,
      crushCount: this.crushCount,
      waterAdded: this.waterAdded,
      isFiltered: this.isFiltered,
      hibiscusPaperPrepared: this.hibiscusPaperPrepared,
      litmusPrepared: this.litmusPrepared,
      hibiscusStage: this.hibiscusStage,
      stationATool: this.stationATool,
      stationBTool: this.stationBTool,
      animating: this.animating,
      batchRunning: this.batchRunning,
      animatingLabelEn: this.animatingLabelEn,
      animatingLabelKn: this.animatingLabelKn,
      isExpandedRoster: this.isExpandedRoster,
      hibiscusTestedCount: hCount,
      hibiscusPaperTestedCount: hPaperCount,
      litmusTestedCount: lCount,
      litmusSolutionTestedCount: lSolCount,
      totalSamples: this.activeSubstances.length,
      activeTubeIds: [...this.activeTubeIds],
      testRecords: clonedRecords,
    });
  }

  /* =========================================================================
     SHELF <-> ACTIVE STAND PICKER & SWAPPING
     ========================================================================= */
  swapTubeFromShelf(substanceId: number, announce = true): number {
    const existingIdx = this.activeTubeIds.indexOf(substanceId);
    if (existingIdx !== -1) return existingIdx;

    const sub = this.activeSubstances.find((s) => s.id === substanceId);
    if (!sub) return 0;

    const slot = this.nextSwapCursor % ACTIVE_FRONT_SLOTS;
    this.nextSwapCursor++;
    this.activeTubeIds[slot] = substanceId;
    this.buildTestTubes();
    this.emitSnapshot();

    if (announce) {
      this.audio.playPluck();
      const num = this.activeSubstances.findIndex((s) => s.id === substanceId) + 1;
      this.callbacks.onToast({
        textEn: `#${num} ${sub.nameEn} moved to Center Table (Slot ${slot + 1})`,
        textKn: `#${num} ${sub.nameKn} ಮಧ್ಯದ ಪರೀಕ್ಷಾ ಮೇಜಿಗೆ ತರಲಾಗಿದೆ (ಸ್ಥಾನ ${slot + 1})`,
        type: 'success',
        duration: 1800,
      });
    }
    return slot;
  }

  cycleNextTubeBatch(): void {
    if (this.animating || this.batchRunning) return;
    this.audio.init();
    const total = this.activeSubstances.length;
    const lastActiveId = this.activeTubeIds[this.activeTubeIds.length - 1] ?? 0;
    const lastIdx = Math.max(
      0,
      this.activeSubstances.findIndex((s) => s.id === lastActiveId)
    );
    const nextBatch: number[] = [];
    for (let i = 1; i <= ACTIVE_FRONT_SLOTS; i++) {
      nextBatch.push(this.activeSubstances[(lastIdx + i) % total].id);
    }
    this.activeTubeIds = nextBatch;
    this.nextSwapCursor = 0;
    this.buildTestTubes();
    this.emitSnapshot();
    this.audio.playPluck();

    const namesEn = nextBatch
      .map((id) => {
        const idx = this.activeSubstances.findIndex((s) => s.id === id);
        return `#${idx + 1} ${this.activeSubstances[idx]?.nameEn ?? ''}`;
      })
      .join(', ');
    const namesKn = nextBatch
      .map((id) => {
        const idx = this.activeSubstances.findIndex((s) => s.id === id);
        return `#${idx + 1} ${this.activeSubstances[idx]?.nameKn ?? ''}`;
      })
      .join(', ');

    this.callbacks.onToast({
      textEn: `Loaded from Storage Rack: ${namesEn}`,
      textKn: `ಕೆಳ ಶೆಲ್ಫ್‌ನಿಂದ ತಂದ ಮಾದರಿಗಳು: ${namesKn}`,
      type: 'success',
      duration: 2200,
    });
  }

  /* =========================================================================
     ANIMATED LAB ACTIONS
     ========================================================================= */
  private scheduleAnim(
    duration: number,
    onTick: (p: number, elapsed: number) => void,
    onEnd: () => void
  ): void {
    const startTime = performance.now();
    const step = (now: number) => {
      if (this.disposed) return;
      const elapsed = now - startTime;
      const p = Math.min(elapsed / duration, 1.0);
      onTick(p, elapsed);
      if (p < 1.0) {
        const id = requestAnimationFrame(step);
        this.activeAnimTimers.push(id);
      } else {
        onEnd();
      }
    };
    const id = requestAnimationFrame(step);
    this.activeAnimTimers.push(id);
  }

  bringMortarToTable(onDone?: () => void): void {
    if (this.animating || this.mortarOnTable) {
      onDone?.();
      return;
    }
    this.setAnimating(
      true,
      'Placing Mortar & Pestle on Center Table...',
      'ಖರಲ್ ಮತ್ತು ಒನಕೆಯನ್ನು ಮಧ್ಯದ ಮೇಜಿನ ಮೇಲೆ ಇಡಲಾಗುತ್ತಿದೆ...'
    );
    this.audio.init();
    this.audio.playPluck();

    const startMortar = this.mortarGroup.position.clone();
    const startPestle = this.pestleGroup.position.clone();
    const endMortar = this.tableIndicatorPos.clone();
    const endPestle = this.tableIndicatorPos.clone().add(this.tablePestleOffset);

    this.scheduleAnim(
      760,
      (p) => {
        const ease = 1 - Math.pow(1 - p, 3);
        const arc = Math.sin(p * Math.PI) * 0.55;
        this.mortarGroup.position.lerpVectors(startMortar, endMortar, ease);
        this.mortarGroup.position.y += arc;
        this.mortarGroup.rotation.y = THREE.MathUtils.lerp(this.leftStandRotY, 0, ease);

        this.pestleGroup.position.lerpVectors(startPestle, endPestle, ease);
        this.pestleGroup.position.y += arc;
        this.pestleGroup.rotation.y = THREE.MathUtils.lerp(this.leftStandRotY, 0, ease);
      },
      () => {
        this.mortarGroup.position.copy(endMortar);
        this.mortarGroup.rotation.set(0, 0, 0);
        this.pestleGroup.position.copy(endPestle);
        this.pestleGroup.rotation.set(-0.22, 0, 0.34);
        this.mortarOnTable = true;
        this.audio.playSuccess();
        this.callbacks.onToast({
          textEn: 'Mortar placed on Center Table! Now pluck 5 hibiscus petals.',
          textKn: 'ಖರಲ್ ಮೇಜಿನ ಮೇಲೆ ಇಡಲಾಗಿದೆ! ಈಗ 5 ದಾಸವಾಳ ದಳಗಳನ್ನು ಕೀಳಿ ಹಾಕಿ.',
          type: 'success',
          duration: 2400,
        });
        this.setAnimating(false);
        this.updateGuideRing();
        this.emitSnapshot();
        onDone?.();
      }
    );
  }

  pluckPetal(petalMesh: THREE.Mesh, onDone?: () => void): void {
    const data = petalMesh.userData as InteractiveUserData;
    if (this.animating || data.plucked) return;

    if (!this.mortarOnTable) {
      this.bringMortarToTable(() => this.pluckPetal(petalMesh, onDone));
      return;
    }

    this.setAnimating(true, 'Plucking hibiscus petal...', 'ದಾಸವಾಳ ದಳ ಕೀಳಲಾಗುತ್ತಿದೆ...');
    this.audio.init();
    this.audio.playPluck();
    data.plucked = true;

    const worldStart = new THREE.Vector3();
    petalMesh.getWorldPosition(worldStart);
    this.scene.attach(petalMesh);

    const mortarWorld = new THREE.Vector3();
    this.mortarGroup.getWorldPosition(mortarWorld);
    const targetPos = new THREE.Vector3(
      mortarWorld.x + (Math.random() - 0.5) * 0.25,
      mortarWorld.y + 0.3,
      mortarWorld.z + (Math.random() - 0.5) * 0.25
    );

    this.scheduleAnim(
      480,
      (p) => {
        const ease = 1 - Math.pow(1 - p, 3);
        petalMesh.position.x = THREE.MathUtils.lerp(worldStart.x, targetPos.x, ease);
        petalMesh.position.z = THREE.MathUtils.lerp(worldStart.z, targetPos.z, ease);
        petalMesh.position.y =
          THREE.MathUtils.lerp(worldStart.y, targetPos.y, ease) + Math.sin(p * Math.PI) * 1.1;
        petalMesh.rotation.x += 0.08;
        petalMesh.rotation.y += 0.08;
      },
      () => {
        petalMesh.visible = false;
        this.petalsPlucked++;
        const mortarPetal = this.mortarPetalMeshes[this.petalsPlucked - 1];
        if (mortarPetal) {
          mortarPetal.visible = true;
        }
        if (this.petalsPlucked >= TOTAL_PETALS) {
          this.hibiscusStage = 'A1';
          this.audio.playSuccess();
          this.callbacks.onCelebrate(['#f43f5e', '#fb7185', '#fbbf24']);
          this.callbacks.onToast({
            textEn: `All ${TOTAL_PETALS} petals collected! Tap the mortar on the Center Table to crush them.`,
            textKn: `ಎಲ್ಲಾ ${TOTAL_PETALS} ದಳಗಳು ಸಂಗ್ರಹವಾಗಿವೆ! ಅರೆಯಲು ಮೇಜಿನ ಮೇಲಿನ ಕುಟ್ಟಾಣಿ ಕ್ಲಿಕ್ ಮಾಡಿ.`,
            type: 'success',
          });
        } else {
          this.callbacks.onToast({
            textEn: `Petal ${this.petalsPlucked}/${TOTAL_PETALS} placed in mortar`,
            textKn: `ದಳ ${this.petalsPlucked}/${TOTAL_PETALS} ಕುಟ್ಟಾಣಿಗೆ ಹಾಕಲಾಗಿದೆ`,
            type: 'success',
            duration: 1400,
          });
        }
        this.setAnimating(false);
        this.updateGuideRing();
        this.emitSnapshot();
        onDone?.();
      }
    );
  }

  crushPetals(onDone?: () => void): void {
    if (this.animating) return;
    if (this.hibiscusStage === 'A0' && !this.mortarOnTable) {
      this.bringMortarToTable(onDone);
      return;
    }
    if (this.hibiscusStage !== 'A1') return;
    this.setAnimating(true, 'Crushing hibiscus petals...', 'ದಳಗಳನ್ನು ಅರೆಯಲಾಗುತ್ತಿದೆ...');
    this.audio.init();
    this.audio.playCrush();

    const origPestleY = this.tableIndicatorPos.y + this.tablePestleOffset.y;
    this.scheduleAnim(
      360,
      (p) => {
        this.pestleGroup.position.y = origPestleY - Math.sin(p * Math.PI) * 0.18;
        this.pestleGroup.scale.y = 1.0 - Math.sin(p * Math.PI) * 0.12;
      },
      () => {
        this.pestleGroup.position.y = origPestleY;
        this.pestleGroup.scale.set(1, 1, 1);
        this.crushCount++;

        this.mortarPetalMeshes.forEach((mesh) => {
          (mesh.material as THREE.MeshStandardMaterial).color.lerp(
            new THREE.Color('#380310'),
            0.35
          );
        });

        if (this.crushCount >= 3) {
          this.hibiscusStage = 'A2';
          this.audio.playSuccess();
          this.callbacks.onCelebrate(['#f43f5e', '#fbbf24']);
          this.callbacks.onToast({
            textEn: 'Petals crushed! Tap Warm Water on Left Stand.',
            textKn: 'ದಳಗಳು ನುಣ್ಣಗಾಗಿವೆ! ಎಡ ಸ್ಟ್ಯಾಂಡ್‌ನ ಬಿಸಿ ನೀರನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ.',
            type: 'success',
          });
        }
        this.setAnimating(false);
        this.updateGuideRing();
        this.emitSnapshot();
        onDone?.();
      }
    );
  }

  addWarmWater(): void {
    if (this.animating || this.hibiscusStage !== 'A2') return;
    this.setAnimating(
      true,
      'Bringing Warm Water to Center Table & returning beaker...',
      'ಮೇಜಿನ ಮೇಲಿನ ಕುಟ್ಟಾಣಿಗೆ ಬಿಸಿ ನೀರು ಸುರಿಯಲಾಗುತ್ತಿದೆ...'
    );
    this.audio.init();
    this.audio.playPour();

    const origPos = this.homeBeakerPos.clone();
    const mortarPos = this.mortarGroup.position.clone();
    // Move beaker cleanly above & right of Mortar on the Center Table
    const pourPos = new THREE.Vector3(mortarPos.x + 1.02, mortarPos.y + 1.38, mortarPos.z + 0.12);

    (this.pourStreamMesh.material as THREE.MeshBasicMaterial).color.set('#bae6fd');
    this.pourStreamMesh.visible = false;

    this.scheduleAnim(
      2350,
      (p) => {
        if (p < 0.28) {
          const ease = 1 - Math.pow(1 - p / 0.28, 2);
          this.beakerGroup.position.lerpVectors(origPos, pourPos, ease);
          this.beakerGroup.position.y += Math.sin((p / 0.28) * Math.PI) * 0.45;
          this.beakerGroup.rotation.set(0, THREE.MathUtils.lerp(this.leftStandRotY, 0, ease), 0);
          this.pourStreamMesh.visible = false;
        } else if (p < 0.72) {
          const pPour = (p - 0.28) / 0.44;
          const tilt = Math.sin(pPour * Math.PI) * 0.84;
          this.beakerGroup.rotation.set(-tilt * 0.2, 0, tilt);

          if (tilt > 0.26) {
            this.pourStreamMesh.visible = true;
            this.pourStreamMesh.position.set(mortarPos.x + 0.14, mortarPos.y + 0.84, mortarPos.z + 0.04);
            this.pourStreamMesh.rotation.set(-0.1, 0, 0.18);
            this.pourStreamMesh.scale.set(0.85, 0.72 + Math.sin(pPour * 18) * 0.05, 0.85);
          } else {
            this.pourStreamMesh.visible = false;
          }

          this.mortarLiquidMat.uniforms.uOpacity.value = Math.min(0.88, pPour * 0.95);
          this.mortarLiquidMat.uniforms.uRipple.value = 1.0;
          this.beakerWater.scale.y = 1.0 - pPour * 0.45;
        } else {
          this.pourStreamMesh.visible = false;
          this.mortarLiquidMat.uniforms.uRipple.value = 0.0;
          const pRet = (p - 0.72) / 0.28;
          this.beakerGroup.rotation.set(0, THREE.MathUtils.lerp(0, this.leftStandRotY, pRet), 0);
          this.beakerGroup.position.lerpVectors(pourPos, origPos, pRet);
          this.beakerGroup.position.y += Math.sin(pRet * Math.PI) * 0.4;
        }
      },
      () => {
        this.beakerGroup.position.copy(origPos);
        this.beakerGroup.rotation.set(0, this.leftStandRotY, 0);
        this.pourStreamMesh.visible = false;
        this.mortarLiquidMat.uniforms.uRipple.value = 0.0;
        this.waterAdded = true;
        this.hibiscusStage = 'A3';
        this.audio.playSuccess();
        this.callbacks.onToast({
          textEn: 'Water poured & beaker returned to stand! Tap Filter Funnel next.',
          textKn: 'ನೀರು ಸುರಿದು ಬೀಕರ್ ಸ್ಟ್ಯಾಂಡ್‌ಗೆ ಇಡಲಾಗಿದೆ! ಮುಂದೆ ಫನೆಲ್ ಕ್ಲಿಕ್ ಮಾಡಿ.',
          type: 'success',
        });
        this.setAnimating(false);
        this.updateGuideRing();
        this.emitSnapshot();
      }
    );
  }

  filterAndBottle(): void {
    if (this.animating || this.hibiscusStage !== 'A3') return;
    this.setAnimating(
      true,
      'Filtering extract & returning prep tools to stand...',
      'ದ್ರಾವಣ ಸೋಸಿ ಸಲಕರಣೆಗಳನ್ನು ಸ್ಟ್ಯಾಂಡ್‌ಗೆ ಮರಳಿಸಲಾಗುತ್ತಿದೆ...'
    );
    this.audio.init();
    this.audio.playPour();

    const startMortar = this.mortarGroup.position.clone();
    const startPestle = this.pestleGroup.position.clone();
    const startFilter = this.homeFilterPos.clone();

    const targetMortarPour = new THREE.Vector3(
      this.tableFilterPos.x - 0.92,
      this.tableFilterPos.y + 1.65,
      this.tableFilterPos.z + 0.06
    );
    let bottleDetached = false;
    let bottleDetachStart = new THREE.Vector3();

    (this.pourStreamMesh.material as THREE.MeshBasicMaterial).color.set('#e11d48');
    this.pourStreamMesh.visible = false;

    this.scheduleAnim(
      3100,
      (p) => {
        if (p < 0.22) {
          // Phase 1: Bring Filter Funnel & Dropper Bottle from Left Stand onto Center Table
          const t = p / 0.22;
          const ease = 1 - Math.pow(1 - t, 2);
          this.filterUnitGroup.position.lerpVectors(startFilter, this.tableFilterPos, ease);
          this.filterUnitGroup.position.y += Math.sin(t * Math.PI) * 0.45;
          this.filterUnitGroup.rotation.y = THREE.MathUtils.lerp(this.leftStandRotY, 0, ease);

          this.mortarGroup.position.lerpVectors(startMortar, this.tableMortarFilterPos, ease);
          this.pestleGroup.position.lerpVectors(
            startPestle,
            this.tableMortarFilterPos.clone().add(this.tablePestleOffset),
            ease
          );
        } else if (p < 0.36) {
          // Phase 2: Lift Mortar over Funnel on Center Table
          const t = (p - 0.22) / 0.14;
          this.filterUnitGroup.position.copy(this.tableFilterPos);
          this.filterUnitGroup.rotation.set(0, 0, 0);
          this.mortarGroup.position.lerpVectors(this.tableMortarFilterPos, targetMortarPour, t);
        } else if (p < 0.72) {
          // Phase 3: Pour crimson extract through Funnel into Indicator Dropper Bottle
          const pFilter = (p - 0.36) / 0.36;
          const tilt = Math.sin(pFilter * Math.PI) * 0.72;
          this.mortarGroup.rotation.set(-tilt * 0.2, 0, -tilt);
          if (tilt > 0.24) {
            this.pourStreamMesh.visible = true;
            this.pourStreamMesh.position.set(
              this.tableFilterPos.x - 0.04,
              this.tableFilterPos.y + 1.32,
              this.tableFilterPos.z + 0.04
            );
            this.pourStreamMesh.rotation.set(-0.08, 0, -0.06);
            this.pourStreamMesh.scale.set(0.8, 0.58, 0.8);
          } else {
            this.pourStreamMesh.visible = false;
          }
          this.bottleLiquidMat.uniforms.uOpacity.value = pFilter * 0.92;
          this.mortarLiquidMat.uniforms.uOpacity.value = 0.88 * (1.0 - pFilter);
        } else {
          // Phase 4: Return Mortar, Pestle & Filter Stand back to Left Stand; keep ONLY Indicator Bottle on Center Table!
          this.pourStreamMesh.visible = false;
          if (!bottleDetached) {
            bottleDetached = true;
            this.scene.attach(this.hibiscusBottleGroup);
            bottleDetachStart = this.hibiscusBottleGroup.position.clone();
          }
          const tRet = (p - 0.72) / 0.28;
          const ease = 1 - Math.pow(1 - tRet, 2);

          this.mortarGroup.rotation.set(0, THREE.MathUtils.lerp(0, this.leftStandRotY, ease), 0);
          this.mortarGroup.position.lerpVectors(targetMortarPour, this.homeMortarPos, ease);
          this.mortarGroup.position.y += Math.sin(tRet * Math.PI) * 0.45;

          this.pestleGroup.position.lerpVectors(
            this.tableMortarFilterPos.clone().add(this.tablePestleOffset),
            this.homePestlePos,
            ease
          );
          this.pestleGroup.rotation.set(-0.22, THREE.MathUtils.lerp(0, this.leftStandRotY, ease), 0.34);

          this.filterUnitGroup.position.lerpVectors(this.tableFilterPos, this.homeFilterPos, ease);
          this.filterUnitGroup.position.y += Math.sin(tRet * Math.PI) * 0.4;
          this.filterUnitGroup.rotation.y = THREE.MathUtils.lerp(0, this.leftStandRotY, ease);

          // Slide ONLY the filled Indicator Bottle neatly into the Center Table Indicator Slot
          this.hibiscusBottleGroup.position.lerpVectors(bottleDetachStart, this.tableIndicatorPos, ease);
          this.hibiscusBottleGroup.rotation.set(0, 0, 0);
        }
      },
      () => {
        this.mortarGroup.position.copy(this.homeMortarPos);
        this.mortarGroup.rotation.set(0, this.leftStandRotY, 0);
        this.pestleGroup.position.copy(this.homePestlePos);
        this.pestleGroup.rotation.set(-0.22, this.leftStandRotY, 0.34);
        this.filterUnitGroup.position.copy(this.homeFilterPos);
        this.filterUnitGroup.rotation.set(0, this.leftStandRotY, 0);
        if (this.hibiscusBottleGroup.parent !== this.scene) {
          this.scene.attach(this.hibiscusBottleGroup);
        }
        this.hibiscusBottleGroup.position.copy(this.tableIndicatorPos);
        this.hibiscusBottleGroup.rotation.set(0, 0, 0);

        this.pourStreamMesh.visible = false;
        this.isFiltered = true;
        this.hibiscusStage = 'A4';
        this.hibiscusPipetteLiquid.visible = true;
        this.updateLabelStationVisibility();
        this.audio.playSuccess();
        this.callbacks.onCelebrate(['#f43f5e', '#10b981', '#fbbf24', '#38bdf8']);
        this.callbacks.onToast({
          textEn: 'Tools returned to stand! Only Indicator & 3 Tubes remain on Center Table for testing.',
          textKn: 'ಸಲಕರಣೆಗಳು ಸ್ಟ್ಯಾಂಡ್‌ಗೆ ಮರಳಿವೆ! ಮೇಜಿನ ಮೇಲೆ ಸೂಚಕ ಮತ್ತು ಟ್ಯೂಬ್‌ಗಳಿವೆ — ಈಗ ಪರೀಕ್ಷಿಸಿ.',
          type: 'success',
          duration: 3400,
        });
        this.setAnimating(false);
        this.updateGuideRing();
        this.emitSnapshot();
      }
    );
  }

  prepareHibiscusPaper(onDone?: () => void): void {
    if (this.animating) return;
    if (this.hibiscusPaperPrepared) {
      const idx = this.activeTubes.findIndex(
        (t) => !this.testRecords[t.substance.id].hibiscusPaperTested
      );
      this.dipHibiscusPaper(idx !== -1 ? idx : 0, onDone);
      return;
    }

    this.setAnimating(
      true,
      'Rubbing hibiscus petal onto filter paper...',
      'ಬಿಳಿ ಕಾಗದದ ಮೇಲೆ ದಾಸವಾಳ ದಳವನ್ನು ಉಜ್ಜಲಾಗುತ್ತಿದೆ...'
    );
    this.audio.init();
    this.audio.playPaperDip();

    const startPadPos = this.hibiscusPaperPadGroup.position.clone();
    const startPadRotY = this.hibiscusPaperPadGroup.rotation.y;
    const origPetalPos = this.rubbingPetalMesh.position.clone();

    this.scheduleAnim(
      1550,
      (p) => {
        if (p < 0.25) {
          const ease = 1 - Math.pow(1 - p / 0.25, 2);
          this.hibiscusPaperPadGroup.position.lerpVectors(startPadPos, this.tableIndicatorPos, ease);
          this.hibiscusPaperPadGroup.rotation.y = THREE.MathUtils.lerp(startPadRotY, 0, ease);
        } else {
          this.hibiscusPaperPadGroup.position.copy(this.tableIndicatorPos);
          this.hibiscusPaperPadGroup.rotation.set(0, 0, 0);
          const pRub = (p - 0.25) / 0.75;
          const rubX = 0.24 + Math.sin(pRub * Math.PI * 5) * 0.14;
          const rubZ = Math.cos(pRub * Math.PI * 4) * 0.28;
          this.rubbingPetalMesh.position.set(rubX, 0.18, rubZ);
          this.hibiscusPaperStackMat.color.lerpColors(
            new THREE.Color('#f1f5f9'),
            new THREE.Color('#9d174d'),
            pRub
          );
        }
      },
      () => {
        this.hibiscusPaperPadGroup.position.copy(this.tableIndicatorPos);
        this.hibiscusPaperPadGroup.rotation.set(0, 0, 0);
        this.rubbingPetalMesh.position.copy(origPetalPos);
        this.hibiscusPaperStackMat.color.set('#9d174d');
        this.hibiscusPaperPrepared = true;
        this.stationATool = 'paper';
        this.syncCenterTableApparatus();
        this.audio.playSuccess();
        this.callbacks.onCelebrate(['#ec4899', '#fbbf24', '#10b981']);
        this.callbacks.onToast({
          textEn: 'Hibiscus paper strips ready on Center Table! Dip into any tube next to it.',
          textKn: 'ದಾಸವಾಳ ಕಾಗದ ಮೇಜಿನ ಮೇಲೆ ಸಿದ್ಧ! ಪಕ್ಕದ ಟ್ಯೂಬ್‌ನಲ್ಲಿ ಅದ್ದಿ.',
          type: 'success',
          duration: 3000,
        });
        this.setAnimating(false);
        this.updateGuideRing();
        this.emitSnapshot();
        onDone?.();
      }
    );
  }

  dipHibiscusPaper(slotIndex: number, onDone?: () => void, durationMs = 1650): void {
    if (this.animating) return;
    if (!this.hibiscusPaperPrepared) {
      this.prepareHibiscusPaper(() => this.dipHibiscusPaper(slotIndex, onDone, durationMs));
      return;
    }

    const targetTube = this.activeTubes[slotIndex];
    if (!targetTube) {
      onDone?.();
      return;
    }

    const s = targetTube.substance;
    const rosterNum = this.activeSubstances.findIndex((item) => item.id === s.id) + 1;
    this.setAnimating(
      true,
      `Dipping Hibiscus paper into ${s.nameEn}...`,
      `${s.nameKn} ನಲ್ಲಿ ದಾಸವಾಳ ಕಾಗದ ಅದ್ದಲಾಗುತ್ತಿದೆ...`
    );
    this.audio.init();
    this.audio.playPaperDip();

    const baseStripColor = '#9d174d';
    const resultHex = s.category === 'neutral' ? '#9d174d' : s.hibiscusColorHex;

    (this.activePaperStrip.material as THREE.ShaderMaterial).dispose();
    this.activePaperStrip.material = createPaperShaderMaterial(baseStripColor, resultHex);
    this.activePaperStrip.visible = true;

    const tubeWorld = new THREE.Vector3();
    targetTube.container.getWorldPosition(tubeWorld);
    const startY = tubeWorld.y + 1.55;
    this.activePaperStrip.position.set(tubeWorld.x, startY, tubeWorld.z);
    this.activePaperStrip.rotation.set(0, 0, 0);

    const boardTargetPos = new THREE.Vector3();
    this.stationAPinboardGroup.getWorldPosition(boardTargetPos);
    boardTargetPos.y += 0.72;

    this.scheduleAnim(
      durationMs,
      (p) => {
        if (p < 0.25) {
          this.activePaperStrip.position.y = startY - (p / 0.25) * 0.85;
        } else if (p < 0.65) {
          (this.activePaperStrip.material as THREE.ShaderMaterial).uniforms.uProgress.value =
            (p - 0.25) / 0.4;
        } else if (p < 0.8) {
          this.activePaperStrip.position.y = startY - 0.85 + ((p - 0.65) / 0.15) * 0.85;
        } else {
          const pFly = (p - 0.8) / 0.2;
          this.activePaperStrip.position.lerp(boardTargetPos, pFly);
        }
      },
      () => {
        this.activePaperStrip.visible = false;
        this.audio.playPin();

        const pinnedMesh = new THREE.Mesh(
          this.activeStripGeo.clone(),
          (this.activePaperStrip.material as THREE.ShaderMaterial).clone()
        );
        pinnedMesh.scale.set(0.36, 0.36, 0.36);
        const pinX = (this.pinnedHibiscusStrips.length % 5) * 0.32 - 0.64;
        const pinY = 0.96 - Math.floor(this.pinnedHibiscusStrips.length / 5) * 0.46;
        pinnedMesh.position.set(pinX, pinY, 0.06);
        this.pinnedHibiscusGroup.add(pinnedMesh);
        this.pinnedHibiscusStrips.push(pinnedMesh);

        const pushpin = new THREE.Mesh(
          new THREE.SphereGeometry(0.032, 10, 10),
          new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.75 })
        );
        pushpin.position.set(pinX, pinY + 0.18, 0.085);
        this.pinnedHibiscusGroup.add(pushpin);

        this.testRecords[s.id].hibiscusPaperTested = true;

        const badgeClass =
          s.category === 'acid'
            ? 'tested-acid'
            : s.category === 'base'
              ? 'tested-base'
              : 'tested-neutral';
        targetTube.labelDiv.className = `label-3d tube-pill ${badgeClass}`;
        targetTube.labelDiv.innerHTML = this.renderTubeLabelHTML(
          rosterNum,
          s,
          `📄 ${s.hibiscusPaperResultEn}`,
          `📄 ${s.hibiscusPaperResultKn}`,
          resultHex
        );

        this.audio.playSuccess();
        this.callbacks.onToast({
          textEn: `Hibiscus Paper in ${s.nameEn}: ${s.hibiscusPaperResultEn}`,
          textKn: `${s.nameKn} ನಲ್ಲಿ ದಾಸವಾಳ ಕಾಗದ: ${s.hibiscusPaperResultKn}`,
          type: s.category,
          duration: 2400,
        });

        if (this.activeSubstances.every((item) => this.testRecords[item.id].hibiscusPaperTested)) {
          this.callbacks.onCelebrate();
        }

        this.setAnimating(false);
        this.emitSnapshot();
        onDone?.();
      }
    );
  }

  testTubeHibiscus(slotIndex: number, onDone?: () => void, durationMs = 1850): void {
    if (this.animating) return;
    if (this.hibiscusStage !== 'A4') {
      this.callbacks.onToast({
        textEn: 'Prepare the Hibiscus extract first (follow the gold ring).',
        textKn: 'ಮೊದಲು ದಾಸವಾಳ ದ್ರಾವಣವನ್ನು ತಯಾರಿಸಿ (ಚಿನ್ನದ ಉಂಗುರವನ್ನು ಅನುಸರಿಸಿ).',
        type: 'neutral',
      });
      return;
    }
    const targetTube = this.activeTubes[slotIndex];
    if (!targetTube) {
      onDone?.();
      return;
    }

    const s = targetTube.substance;
    const rosterNum = this.activeSubstances.findIndex((item) => item.id === s.id) + 1;
    this.setAnimating(
      true,
      `Using dropper on ${s.nameEn}...`,
      `${s.nameKn} ಗೆ ಡ್ರಾಪರ್ ಮೂಲಕ ಹನಿ ಹಾಕಲಾಗುತ್ತಿದೆ...`
    );
    this.audio.init();

    const tubeWorld = new THREE.Vector3();
    targetTube.container.getWorldPosition(tubeWorld);
    const liftPos = new THREE.Vector3(0, 1.15, 0.1);
    const targetLocal = this.hibiscusBottleGroup.worldToLocal(
      tubeWorld.clone().add(new THREE.Vector3(0, 1.38, 0.0))
    );
    const dropperOrigPos = new THREE.Vector3(0, 0, 0);

    (this.dropMesh.material as THREE.MeshBasicMaterial).color.set('#be123c');
    let lastPlink = 0;

    this.scheduleAnim(
      durationMs,
      (p) => {
        if (p < 0.14) {
          this.hibiscusPipetteGroup.position.lerpVectors(dropperOrigPos, liftPos, p / 0.14);
          this.dropMesh.visible = false;
        } else if (p < 0.3) {
          this.hibiscusPipetteGroup.position.lerpVectors(
            liftPos,
            targetLocal,
            (p - 0.14) / 0.16
          );
          this.dropMesh.visible = false;
        } else if (p < 0.76) {
          const pDrops = (p - 0.3) / 0.46;
          targetTube.liquidMat.uniforms.uColorMix.value = Math.max(
            targetTube.liquidMat.uniforms.uColorMix.value,
            pDrops
          );
          targetTube.liquidMat.uniforms.uRipple.value = 1.0;

          const dropPhase = (pDrops * 3) % 1;
          const squeeze = Math.sin(dropPhase * Math.PI);
          this.hibiscusBulbMesh.scale.set(
            1 + squeeze * 0.16,
            1.28 - squeeze * 0.3,
            1 + squeeze * 0.16
          );

          this.dropMesh.visible = true;
          this.dropMesh.position.set(
            tubeWorld.x,
            tubeWorld.y + 1.48 - dropPhase * 0.76,
            tubeWorld.z
          );

          const stage = Math.floor(pDrops * 3) + 1;
          if (stage !== lastPlink && stage <= 3) {
            lastPlink = stage;
            this.audio.playPlink(stage);
          }
        } else if (p < 0.9) {
          this.dropMesh.visible = false;
          this.hibiscusBulbMesh.scale.set(1, 1.28, 1);
          targetTube.liquidMat.uniforms.uRipple.value = 0.0;
          this.hibiscusPipetteGroup.position.lerpVectors(
            targetLocal,
            liftPos,
            (p - 0.76) / 0.14
          );
        } else {
          this.hibiscusPipetteGroup.position.lerpVectors(
            liftPos,
            dropperOrigPos,
            (p - 0.9) / 0.1
          );
        }
      },
      () => {
        this.hibiscusPipetteGroup.position.copy(dropperOrigPos);
        this.hibiscusBulbMesh.scale.set(1, 1.28, 1);
        this.dropMesh.visible = false;
        this.testRecords[s.id].hibiscusTested = true;
        this.testRecords[s.id].hibiscusMix = 1.0;

        const badgeClass =
          s.category === 'acid'
            ? 'tested-acid'
            : s.category === 'base'
              ? 'tested-base'
              : 'tested-neutral';
        targetTube.labelDiv.className = `label-3d tube-pill ${badgeClass}`;
        targetTube.labelDiv.innerHTML = this.renderTubeLabelHTML(
          rosterNum,
          s,
          `🌺 ${s.hibiscusResultEn}`,
          `🌺 ${s.hibiscusResultKn}`,
          s.hibiscusColorHex
        );

        this.audio.playSuccess();
        if (s.category === 'acid') {
          this.callbacks.onToast({
            textEn: `${s.nameEn} turned ${s.hibiscusResultEn} — ${s.typeEn}`,
            textKn: `${s.nameKn} → ${s.hibiscusResultKn} (${s.typeKn})`,
            type: 'acid',
            duration: 2400,
          });
        } else if (s.category === 'base') {
          this.callbacks.onToast({
            textEn: `${s.nameEn} turned ${s.hibiscusResultEn} — ${s.typeEn}`,
            textKn: `${s.nameKn} → ${s.hibiscusResultKn} (${s.typeKn})`,
            type: 'base',
            duration: 2400,
          });
        } else {
          this.callbacks.onToast({
            textEn: `${s.nameEn}: No change — ${s.typeEn}`,
            textKn: `${s.nameKn}: ಬದಲಾವಣೆಯಿಲ್ಲ (${s.typeKn})`,
            type: 'neutral',
            duration: 2400,
          });
        }

        if (this.activeSubstances.every((item) => this.testRecords[item.id].hibiscusTested)) {
          this.callbacks.onCelebrate();
        }

        this.setAnimating(false);
        this.emitSnapshot();
        onDone?.();
      }
    );
  }

  prepareLitmus(onDone?: () => void): void {
    if (this.animating) return;
    if (this.litmusPrepared) {
      onDone?.();
      return;
    }
    this.setAnimating(
      true,
      'Extracting purple Litmus & placing indicator on Center Table...',
      'ಲಿಟ್ಮಸ್ ದ್ರಾವಣ ತಯಾರಿಸಿ ಪರೀಕ್ಷಾ ಮೇಜಿಗೆ ತರಲಾಗುತ್ತಿದೆ...'
    );
    this.audio.init();
    this.audio.playGrind();

    const startBottlePos = this.litmusLiquidGroup.position.clone();
    const startBottleRotY = this.litmusLiquidGroup.rotation.y;

    this.scheduleAnim(
      1700,
      (p) => {
        if (p < 0.72) {
          const pGrind = p / 0.72;
          this.lichenPestle.rotation.z = Math.sin(pGrind * Math.PI * 6) * 0.3;
          this.litmusBottleLiquidMat.uniforms.uOpacity.value = pGrind * 0.92;
        } else {
          this.lichenPestle.rotation.set(-0.35, 0, 0.45);
          this.litmusBottleLiquidMat.uniforms.uOpacity.value = 0.92;
          const pMove = (p - 0.72) / 0.28;
          const ease = 1 - Math.pow(1 - pMove, 2);
          this.litmusLiquidGroup.position.lerpVectors(startBottlePos, this.tableIndicatorPos, ease);
          this.litmusLiquidGroup.position.y += Math.sin(pMove * Math.PI) * 0.4;
          this.litmusLiquidGroup.rotation.y = THREE.MathUtils.lerp(startBottleRotY, 0, ease);
        }
      },
      () => {
        this.lichenPestle.rotation.set(-0.35, 0, 0.45);
        this.litmusPrepared = true;
        this.litmusPipetteLiquid.visible = true;
        this.syncCenterTableApparatus();
        this.audio.playSuccess();
        this.callbacks.onCelebrate(['#6366f1', '#a855f7', '#fbbf24']);
        this.callbacks.onToast({
          textEn: 'Litmus Indicator placed on Center Table! Tap the 3 test tubes beside it.',
          textKn: 'ಲಿಟ್ಮಸ್ ಸೂಚಕ ಮೇಜಿನ ಮೇಲೆ ಸಿದ್ಧ! ಪಕ್ಕದ 3 ಟ್ಯೂಬ್‌ಗಳನ್ನು ಪರೀಕ್ಷಿಸಿ.',
          type: 'success',
          duration: 3000,
        });
        this.setAnimating(false);
        this.updateGuideRing();
        this.emitSnapshot();
        onDone?.();
      }
    );
  }

  dipLitmusPaper(
    paperType: 'red' | 'blue',
    slotIndex: number,
    onDone?: () => void,
    durationMs = 1650
  ): void {
    if (this.animating) return;
    const targetTube = this.activeTubes[slotIndex];
    if (!targetTube) {
      onDone?.();
      return;
    }

    const substance = targetTube.substance;
    const rosterNum = this.activeSubstances.findIndex((item) => item.id === substance.id) + 1;
    const isRed = paperType === 'red';
    this.setAnimating(
      true,
      `Dipping ${isRed ? 'Red' : 'Blue'} Litmus in ${substance.nameEn}...`,
      `${substance.nameKn} ನಲ್ಲಿ ${isRed ? 'ಕೆಂಪು' : 'ನೀಲಿ'} ಲಿಟ್ಮಸ್ ಅದ್ದಲಾಗುತ್ತಿದೆ...`
    );
    this.audio.init();
    this.audio.playPaperDip();

    let targetColorHex = isRed ? '#ef4444' : '#2563eb';
    if (isRed && substance.category === 'base') targetColorHex = '#2563eb';
    else if (!isRed && substance.category === 'acid') targetColorHex = '#ef4444';

    (this.activePaperStrip.material as THREE.ShaderMaterial).dispose();
    this.activePaperStrip.material = createPaperShaderMaterial(
      isRed ? '#ef4444' : '#2563eb',
      targetColorHex
    );
    this.activePaperStrip.visible = true;

    const tubeWorld = new THREE.Vector3();
    targetTube.container.getWorldPosition(tubeWorld);
    const startY = tubeWorld.y + 1.55;
    this.activePaperStrip.position.set(tubeWorld.x, startY, tubeWorld.z);
    this.activePaperStrip.rotation.set(0, 0, 0);

    const boardTargetPos = new THREE.Vector3();
    this.litmusPinboardGroup.getWorldPosition(boardTargetPos);
    boardTargetPos.y += 0.72;

    this.scheduleAnim(
      durationMs,
      (p) => {
        if (p < 0.25) {
          this.activePaperStrip.position.y = startY - (p / 0.25) * 0.85;
        } else if (p < 0.65) {
          (this.activePaperStrip.material as THREE.ShaderMaterial).uniforms.uProgress.value =
            (p - 0.25) / 0.4;
        } else if (p < 0.8) {
          this.activePaperStrip.position.y = startY - 0.85 + ((p - 0.65) / 0.15) * 0.85;
        } else {
          const pFly = (p - 0.8) / 0.2;
          this.activePaperStrip.position.lerp(boardTargetPos, pFly);
        }
      },
      () => {
        this.activePaperStrip.visible = false;
        this.audio.playPin();

        const pinnedMesh = new THREE.Mesh(
          this.activeStripGeo.clone(),
          (this.activePaperStrip.material as THREE.ShaderMaterial).clone()
        );
        pinnedMesh.scale.set(0.36, 0.36, 0.36);
        const pinX = (this.pinnedStrips.length % 5) * 0.32 - 0.64;
        const pinY = 0.96 - Math.floor(this.pinnedStrips.length / 5) * 0.46;
        pinnedMesh.position.set(pinX, pinY, 0.06);
        this.pinnedItemsGroup.add(pinnedMesh);
        this.pinnedStrips.push(pinnedMesh);

        const pushpin = new THREE.Mesh(
          new THREE.SphereGeometry(0.032, 10, 10),
          new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.8 })
        );
        pushpin.position.set(pinX, pinY + 0.18, 0.085);
        this.pinnedItemsGroup.add(pushpin);

        if (isRed) this.testRecords[substance.id].litmusPaperRedTested = true;
        else this.testRecords[substance.id].litmusPaperBlueTested = true;

        const badgeClass =
          substance.category === 'acid'
            ? 'tested-acid'
            : substance.category === 'base'
              ? 'tested-base'
              : 'tested-neutral';
        targetTube.labelDiv.className = `label-3d tube-pill ${badgeClass}`;
        targetTube.labelDiv.innerHTML = this.renderTubeLabelHTML(
          rosterNum,
          substance,
          `📜 ${isRed ? 'Red' : 'Blue'}: ${isRed ? substance.litmusPaperRedEn : substance.litmusPaperBlueEn}`,
          `📜 ${isRed ? 'ಕೆಂಪು' : 'ನೀಲಿ'}: ${isRed ? substance.litmusPaperRedKn : substance.litmusPaperBlueKn}`,
          targetColorHex
        );

        this.audio.playSuccess();
        this.callbacks.onToast({
          textEn: `${isRed ? 'Red' : 'Blue'} Litmus in ${substance.nameEn}: ${
            isRed ? substance.litmusPaperRedEn : substance.litmusPaperBlueEn
          }`,
          textKn: `${substance.nameKn} ನಲ್ಲಿ ${isRed ? 'ಕೆಂಪು' : 'ನೀಲಿ'} ಲಿಟ್ಮಸ್: ${
            isRed ? substance.litmusPaperRedKn : substance.litmusPaperBlueKn
          }`,
          type: substance.category,
          duration: 2400,
        });

        this.setAnimating(false);
        this.emitSnapshot();
        onDone?.();
      }
    );
  }

  testTubeLitmusSolution(slotIndex: number, onDone?: () => void, durationMs = 1850): void {
    if (this.animating) return;
    if (!this.litmusPrepared) {
      this.callbacks.onToast({
        textEn: 'Tap the Lichen Powder dish on Top Shelf first to extract Litmus!',
        textKn: 'ಮೊದಲು ಮೇಲಿನ ಶೆಲ್ಫ್‌ನ ಕಲ್ಲುಹೂವಿನ ತಟ್ಟೆಯನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ!',
        type: 'neutral',
      });
      return;
    }
    const targetTube = this.activeTubes[slotIndex];
    if (!targetTube) {
      onDone?.();
      return;
    }

    const s = targetTube.substance;
    const rosterNum = this.activeSubstances.findIndex((item) => item.id === s.id) + 1;
    this.setAnimating(
      true,
      `Using Litmus dropper on ${s.nameEn}...`,
      `${s.nameKn} ಗೆ ಲಿಟ್ಮಸ್ ಡ್ರಾಪರ್ ಹನಿ ಹಾಕಲಾಗುತ್ತಿದೆ...`
    );
    this.audio.init();

    const tubeWorld = new THREE.Vector3();
    targetTube.container.getWorldPosition(tubeWorld);
    const liftPos = new THREE.Vector3(0, 1.15, 0.1);
    const targetLocal = this.litmusLiquidGroup.worldToLocal(
      tubeWorld.clone().add(new THREE.Vector3(0, 1.38, 0.0))
    );
    const dropperOrigPos = new THREE.Vector3(0, 0, 0);

    (this.dropMesh.material as THREE.MeshBasicMaterial).color.set('#7c3aed');
    let lastPlink = 0;

    this.scheduleAnim(
      durationMs,
      (p) => {
        if (p < 0.14) {
          this.litmusPipetteGroup.position.lerpVectors(dropperOrigPos, liftPos, p / 0.14);
          this.dropMesh.visible = false;
        } else if (p < 0.3) {
          this.litmusPipetteGroup.position.lerpVectors(
            liftPos,
            targetLocal,
            (p - 0.14) / 0.16
          );
          this.dropMesh.visible = false;
        } else if (p < 0.76) {
          const pDrops = (p - 0.3) / 0.46;
          targetTube.liquidMat.uniforms.uColorMix.value = Math.max(
            targetTube.liquidMat.uniforms.uColorMix.value,
            pDrops
          );
          targetTube.liquidMat.uniforms.uRipple.value = 1.0;

          const dropPhase = (pDrops * 3) % 1;
          const squeeze = Math.sin(dropPhase * Math.PI);
          this.litmusBulbMesh.scale.set(
            1 + squeeze * 0.16,
            1.28 - squeeze * 0.3,
            1 + squeeze * 0.16
          );

          this.dropMesh.visible = true;
          this.dropMesh.position.set(
            tubeWorld.x,
            tubeWorld.y + 1.48 - dropPhase * 0.76,
            tubeWorld.z
          );

          const stage = Math.floor(pDrops * 3) + 1;
          if (stage !== lastPlink && stage <= 3) {
            lastPlink = stage;
            this.audio.playPlink(stage);
          }
        } else if (p < 0.9) {
          this.dropMesh.visible = false;
          this.litmusBulbMesh.scale.set(1, 1.28, 1);
          targetTube.liquidMat.uniforms.uRipple.value = 0.0;
          this.litmusPipetteGroup.position.lerpVectors(
            targetLocal,
            liftPos,
            (p - 0.76) / 0.14
          );
        } else {
          this.litmusPipetteGroup.position.lerpVectors(
            liftPos,
            dropperOrigPos,
            (p - 0.9) / 0.1
          );
        }
      },
      () => {
        this.litmusPipetteGroup.position.copy(dropperOrigPos);
        this.litmusBulbMesh.scale.set(1, 1.28, 1);
        this.dropMesh.visible = false;
        this.testRecords[s.id].litmusSolutionTested = true;
        this.testRecords[s.id].litmusSolutionMix = 1.0;

        const badgeClass =
          s.category === 'acid'
            ? 'tested-acid'
            : s.category === 'base'
              ? 'tested-base'
              : 'tested-neutral';
        targetTube.labelDiv.className = `label-3d tube-pill ${badgeClass}`;
        targetTube.labelDiv.innerHTML = this.renderTubeLabelHTML(
          rosterNum,
          s,
          `📜 Litmus: ${s.litmusSolutionResultEn}`,
          `📜 ಲಿಟ್ಮಸ್: ${s.litmusSolutionResultKn}`,
          s.litmusSolutionHex
        );

        this.audio.playSuccess();
        this.callbacks.onToast({
          textEn: `Litmus in ${s.nameEn} turned ${s.litmusSolutionResultEn}`,
          textKn: `${s.nameKn} ನಲ್ಲಿ ಲಿಟ್ಮಸ್ → ${s.litmusSolutionResultKn}`,
          type: s.category,
          duration: 2400,
        });

        if (this.activeSubstances.every((item) => this.testRecords[item.id].litmusSolutionTested)) {
          this.callbacks.onCelebrate();
        }

        this.setAnimating(false);
        this.emitSnapshot();
        onDone?.();
      }
    );
  }

  /* =========================================================================
     PUBLIC CONTROL API FOR REACT HUD
     ========================================================================= */
  setTab(tab: StationTab): void {
    this.currentTab = tab;
    this.targetCamPos.copy(this.cameraTargets[tab].pos);
    this.targetControlsTarget.copy(this.cameraTargets[tab].lookAt);
    this.cameraTransitionActive = true;
    this.buildTestTubes();
    this.syncCenterTableApparatus();
    this.updateGuideRing();
    this.emitSnapshot();
  }

  setStationATool(tool: StationATool): void {
    this.stationATool = tool;
    this.syncCenterTableApparatus();
    this.updateGuideRing();
    this.emitSnapshot();
  }

  setStationBTool(tool: StationBTool): void {
    this.stationBTool = tool;
    this.syncCenterTableApparatus();
    this.updateGuideRing();
    this.emitSnapshot();
  }

  resetCameraView(): void {
    this.targetCamPos.copy(this.cameraTargets[this.currentTab].pos);
    this.targetControlsTarget.copy(this.cameraTargets[this.currentTab].lookAt);
    this.cameraTransitionActive = true;
  }

  focusTube(rosterIndex: number): void {
    const substance = this.activeSubstances[rosterIndex];
    if (!substance) return;
    const slotIdx = this.swapTubeFromShelf(substance.id, false);
    const tubeObj = this.activeTubes[slotIdx];
    if (!tubeObj) return;
    tubeObj.container.getWorldPosition(this._worldPos);
    this.targetControlsTarget.copy(this._worldPos);
    this.targetCamPos.set(this._worldPos.x, this._worldPos.y + 1.5, this._worldPos.z + 4.4);
    this.cameraTransitionActive = true;
  }

  toggleRoster(): void {
    this.isExpandedRoster = !this.isExpandedRoster;
    this.activeSubstances = this.isExpandedRoster ? ALL_SUBSTANCES : ALL_SUBSTANCES.slice(0, 8);
    this.buildTestTubes();
    this.emitSnapshot();
  }

  testAll(
    mode: 'hibiscusDropper' | 'hibiscusPaper' | 'litmusBlue' | 'litmusRed' | 'litmusSolution'
  ): void {
    if (this.animating || this.batchRunning) return;
    this.audio.init();
    this.batchCancelled = false;

    if (mode === 'hibiscusDropper' && this.hibiscusStage !== 'A4') {
      this.callbacks.onToast({
        textEn: 'Finish preparing Hibiscus liquid first (pick 5 petals → crush → water → filter).',
        textKn: 'ಮೊದಲು ದಾಸವಾಳ ದ್ರಾವಣ ತಯಾರಿಸಿ (5 ದಳ → ಅರೆಯಿರಿ → ನೀರು → ಸೋಸಿ).',
        type: 'neutral',
      });
      return;
    }

    const runSequence = (
      substanceIds: number[],
      stepFn: (slotIdx: number, next: () => void) => void
    ) => {
      if (substanceIds.length === 0) {
        this.callbacks.onToast({
          textEn: 'All samples already tested for this indicator!',
          textKn: 'ಎಲ್ಲಾ ಮಾದರಿಗಳನ್ನು ಈಗಾಗಲೇ ಪರೀಕ್ಷಿಸಲಾಗಿದೆ!',
          type: 'success',
        });
        return;
      }

      this.batchRunning = true;
      this.emitSnapshot();

      let cursor = 0;
      const runNext = () => {
        if (this.disposed || this.batchCancelled || cursor >= substanceIds.length) {
          this.batchRunning = false;
          this.emitSnapshot();
          if (!this.batchCancelled && !this.disposed) {
            this.callbacks.onCelebrate();
            this.callbacks.onToast({
              textEn: `Completed testing all ${this.activeSubstances.length} samples!`,
              textKn: `ಎಲ್ಲಾ ${this.activeSubstances.length} ಮಾದರಿಗಳ ಪರೀಕ್ಷೆ ಪೂರ್ಣಗೊಂಡಿದೆ!`,
              type: 'success',
              duration: 3000,
            });
          }
          return;
        }
        const subId = substanceIds[cursor++];
        const slotIdx = this.swapTubeFromShelf(subId, false);
        stepFn(slotIdx, () => {
          const timer = window.setTimeout(runNext, 140);
          this.activeAnimTimers.push(timer);
        });
      };
      runNext();
    };

    if (mode === 'hibiscusDropper') {
      const pending = this.activeSubstances
        .filter((s) => !this.testRecords[s.id].hibiscusTested)
        .map((s) => s.id);
      const list = pending.length > 0 ? pending : this.activeSubstances.map((s) => s.id);
      runSequence(list, (slotIdx, next) => this.testTubeHibiscus(slotIdx, next, 900));
    } else if (mode === 'hibiscusPaper') {
      const startPaperBatch = () => {
        const pending = this.activeSubstances
          .filter((s) => !this.testRecords[s.id].hibiscusPaperTested)
          .map((s) => s.id);
        const list = pending.length > 0 ? pending : this.activeSubstances.map((s) => s.id);
        runSequence(list, (slotIdx, next) => this.dipHibiscusPaper(slotIdx, next, 860));
      };
      if (!this.hibiscusPaperPrepared) {
        this.prepareHibiscusPaper(startPaperBatch);
      } else {
        startPaperBatch();
      }
    } else if (mode === 'litmusBlue') {
      const pending = this.activeSubstances
        .filter((s) => !this.testRecords[s.id].litmusPaperBlueTested)
        .map((s) => s.id);
      const list = pending.length > 0 ? pending : this.activeSubstances.map((s) => s.id);
      runSequence(list, (slotIdx, next) => this.dipLitmusPaper('blue', slotIdx, next, 860));
    } else if (mode === 'litmusRed') {
      const pending = this.activeSubstances
        .filter((s) => !this.testRecords[s.id].litmusPaperRedTested)
        .map((s) => s.id);
      const list = pending.length > 0 ? pending : this.activeSubstances.map((s) => s.id);
      runSequence(list, (slotIdx, next) => this.dipLitmusPaper('red', slotIdx, next, 860));
    } else if (mode === 'litmusSolution') {
      const startSolBatch = () => {
        const pending = this.activeSubstances
          .filter((s) => !this.testRecords[s.id].litmusSolutionTested)
          .map((s) => s.id);
        const list = pending.length > 0 ? pending : this.activeSubstances.map((s) => s.id);
        runSequence(list, (slotIdx, next) => this.testTubeLitmusSolution(slotIdx, next, 900));
      };
      if (!this.litmusPrepared) {
        this.prepareLitmus(startSolBatch);
      } else {
        startSolBatch();
      }
    }
  }

  runAutoStep(): void {
    if (this.animating || this.batchRunning) return;
    this.audio.init();

    if (this.currentTab === 'hibiscus') {
      if (this.stationATool === 'paper') {
        if (!this.hibiscusPaperPrepared) {
          this.prepareHibiscusPaper();
        } else {
          const frontIdx = this.activeTubes.findIndex(
            (t) => !this.testRecords[t.substance.id].hibiscusPaperTested
          );
          if (frontIdx !== -1) {
            this.dipHibiscusPaper(frontIdx);
          } else {
            const nextSub = this.activeSubstances.find(
              (s) => !this.testRecords[s.id].hibiscusPaperTested
            );
            if (nextSub) {
              const slotIdx = this.swapTubeFromShelf(nextSub.id, true);
              this.dipHibiscusPaper(slotIdx);
            } else {
              this.dipHibiscusPaper(0);
            }
          }
        }
        return;
      }

      if (this.hibiscusStage === 'A0') {
        if (!this.mortarOnTable) {
          this.bringMortarToTable();
        } else {
          const nextPetal = this.pluckablePetals.find(
            (p) => !(p.userData as InteractiveUserData).plucked
          );
          if (nextPetal) {
            this.pluckPetal(nextPetal);
          }
        }
      } else if (this.hibiscusStage === 'A1') {
        const runCrush = () => {
          if (this.hibiscusStage === 'A1') {
            this.crushPetals(runCrush);
          }
        };
        runCrush();
      } else if (this.hibiscusStage === 'A2') {
        this.addWarmWater();
      } else if (this.hibiscusStage === 'A3') {
        this.filterAndBottle();
      } else if (this.hibiscusStage === 'A4') {
        const frontIdx = this.activeTubes.findIndex(
          (t) => !this.testRecords[t.substance.id].hibiscusTested
        );
        if (frontIdx !== -1) {
          this.testTubeHibiscus(frontIdx);
        } else {
          const nextSub = this.activeSubstances.find((s) => !this.testRecords[s.id].hibiscusTested);
          if (nextSub) {
            const slotIdx = this.swapTubeFromShelf(nextSub.id, true);
            this.testTubeHibiscus(slotIdx);
          } else {
            this.testTubeHibiscus(0);
          }
        }
      }
    } else if (this.currentTab === 'litmus') {
      if (!this.litmusPrepared && this.stationBTool === 'solution') {
        this.prepareLitmus();
      } else if (this.stationBTool === 'bluePaper') {
        const frontIdx = this.activeTubes.findIndex(
          (t) => !this.testRecords[t.substance.id].litmusPaperBlueTested
        );
        if (frontIdx !== -1) {
          this.dipLitmusPaper('blue', frontIdx);
        } else {
          const nextSub = this.activeSubstances.find(
            (s) => !this.testRecords[s.id].litmusPaperBlueTested
          );
          if (nextSub) {
            const slotIdx = this.swapTubeFromShelf(nextSub.id, true);
            this.dipLitmusPaper('blue', slotIdx);
          } else {
            this.dipLitmusPaper('blue', 0);
          }
        }
      } else if (this.stationBTool === 'redPaper') {
        const frontIdx = this.activeTubes.findIndex(
          (t) => !this.testRecords[t.substance.id].litmusPaperRedTested
        );
        if (frontIdx !== -1) {
          this.dipLitmusPaper('red', frontIdx);
        } else {
          const nextSub = this.activeSubstances.find(
            (s) => !this.testRecords[s.id].litmusPaperRedTested
          );
          if (nextSub) {
            const slotIdx = this.swapTubeFromShelf(nextSub.id, true);
            this.dipLitmusPaper('red', slotIdx);
          } else {
            this.dipLitmusPaper('red', 0);
          }
        }
      } else if (!this.litmusPrepared) {
        this.prepareLitmus();
      } else {
        const frontIdx = this.activeTubes.findIndex(
          (t) => !this.testRecords[t.substance.id].litmusSolutionTested
        );
        if (frontIdx !== -1) {
          this.testTubeLitmusSolution(frontIdx);
        } else {
          const nextSub = this.activeSubstances.find(
            (s) => !this.testRecords[s.id].litmusSolutionTested
          );
          if (nextSub) {
            const slotIdx = this.swapTubeFromShelf(nextSub.id, true);
            this.testTubeLitmusSolution(slotIdx);
          } else {
            this.testTubeLitmusSolution(0);
          }
        }
      }
    }
  }

  resetAll(): void {
    this.audio.init();
    this.batchCancelled = true;
    this.batchRunning = false;
    this.activeAnimTimers.forEach((id) => {
      cancelAnimationFrame(id);
      clearTimeout(id);
    });
    this.activeAnimTimers = [];

    this.testRecords = createInitialTestRecords();
    this.activeTubeIds = [0, 1, 2];
    this.nextSwapCursor = 0;
    this.mortarOnTable = false;
    this.petalsPlucked = 0;
    this.crushCount = 0;
    this.waterAdded = false;
    this.isFiltered = false;
    this.hibiscusPaperPrepared = false;
    this.litmusPrepared = false;
    this.hibiscusStage = 'A0';
    this.stationATool = 'dropper';
    this.stationBTool = 'bluePaper';
    this.setAnimating(false);

    this.resetFlowerPetals();

    this.mortarPetalMeshes.forEach((p) => {
      p.visible = false;
      (p.material as THREE.MeshStandardMaterial).color.set('#e11d48');
    });

    // Re-nest Hibiscus Bottle inside Filter Unit on Left Stand Tier 2
    if (this.hibiscusBottleGroup.parent !== this.filterUnitGroup) {
      this.filterUnitGroup.add(this.hibiscusBottleGroup);
    }
    this.hibiscusBottleGroup.position.set(0, 0, 0);
    this.hibiscusBottleGroup.rotation.set(0, 0, 0);

    this.mortarLiquidMat.uniforms.uOpacity.value = 0.0;
    this.mortarLiquidMat.uniforms.uRipple.value = 0.0;
    this.bottleLiquidMat.uniforms.uOpacity.value = 0.0;
    this.litmusBottleLiquidMat.uniforms.uOpacity.value = 0.0;
    this.hibiscusPipetteLiquid.visible = false;
    this.litmusPipetteLiquid.visible = false;
    this.hibiscusPipetteGroup.position.set(0, 0, 0);
    this.litmusPipetteGroup.position.set(0, 0, 0);
    this.hibiscusBulbMesh.scale.set(1, 1.28, 1);
    this.litmusBulbMesh.scale.set(1, 1.28, 1);
    this.hibiscusPaperStackMat.color.set('#f1f5f9');
    this.beakerWater.scale.y = 1.0;
    this.pourStreamMesh.visible = false;
    this.dropMesh.visible = false;
    this.activePaperStrip.visible = false;

    const clearGroup = (grp: THREE.Group) => {
      while (grp.children.length > 0) {
        const child = grp.children[0] as THREE.Mesh;
        grp.remove(child);
        child.geometry?.dispose();
        if (child.material && !Array.isArray(child.material)) {
          child.material.dispose();
        }
      }
    };
    clearGroup(this.pinnedItemsGroup);
    clearGroup(this.pinnedHibiscusGroup);
    this.pinnedStrips = [];
    this.pinnedHibiscusStrips = [];

    this.buildTestTubes();
    this.setTab('hibiscus');
    this.audio.playSuccess();
    this.callbacks.onToast({
      textEn: 'Fresh Center Table & Stands ready!',
      textKn: 'ಹೊಸ ಪರೀಕ್ಷಾ ಮೇಜು ಮತ್ತು ಸ್ಟ್ಯಾಂಡ್‌ಗಳು ಸಿದ್ಧ!',
      type: 'success',
      duration: 2000,
    });
  }

  getActiveSubstances(): Substance[] {
    return this.activeSubstances;
  }

  /* =========================================================================
     DOM EVENTS & RENDER LOOP
     ========================================================================= */
  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.animating) {
      this.renderer.domElement.style.cursor = 'default';
      this.callbacks.onTooltip({
        visible: false,
        x: 0,
        y: 0,
        titleEn: '',
        titleKn: '',
        subtitleEn: '',
        subtitleKn: '',
      });
      return;
    }

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

    if (intersects.length === 0) {
      this.renderer.domElement.style.cursor = 'default';
      this.callbacks.onTooltip({
        visible: false,
        x: 0,
        y: 0,
        titleEn: '',
        titleKn: '',
        subtitleEn: '',
        subtitleKn: '',
      });
      return;
    }

    const d = intersects[0].object.userData as InteractiveUserData;
    this.renderer.domElement.style.cursor = 'pointer';

    const x = Math.min(e.clientX + 14, window.innerWidth - 260);
    const y = Math.min(e.clientY + 14, window.innerHeight - 95);

    if (d.isPetal) {
      this.callbacks.onTooltip({
        visible: true,
        x,
        y,
        titleEn: '🌺 Hibiscus Petal',
        titleKn: '🌺 ದಾಸವಾಳ ದಳ',
        subtitleEn: 'Click to pluck into mortar (5 petals)',
        subtitleKn: 'ಕುಟ್ಟಾಣಿಗೆ ಹಾಕಲು ಕ್ಲಿಕ್ ಮಾಡಿ (5 ದಳಗಳು)',
      });
    } else if (d.isMortar || d.isPestle) {
      this.callbacks.onTooltip({
        visible: true,
        x,
        y,
        titleEn: '🥣 Mortar & Pestle',
        titleKn: '🥣 ಖರಲ್ ಮತ್ತು ಒನಕೆ',
        subtitleEn: !this.mortarOnTable
          ? 'Click to place on Center Table'
          : 'Click to crush hibiscus petals on table',
        subtitleKn: !this.mortarOnTable
          ? 'ಮಧ್ಯದ ಮೇಜಿನ ಮೇಲೆ ಇಡಲು ಕ್ಲಿಕ್ ಮಾಡಿ'
          : 'ಮೇಜಿನ ಮೇಲೆ ದಳಗಳನ್ನು ಅರೆಯಲು ಕ್ಲಿಕ್ ಮಾಡಿ',
      });
    } else if (d.isBeaker) {
      this.callbacks.onTooltip({
        visible: true,
        x,
        y,
        titleEn: '♨️ Warm Water Beaker',
        titleKn: '♨️ ಬಿಸಿ ನೀರಿನ ಬೀಕರ್',
        subtitleEn: 'Click to pour into mortar on Center Table',
        subtitleKn: 'ಮೇಜಿನ ಮೇಲಿನ ಕುಟ್ಟಾಣಿಗೆ ಸುರಿಯಲು ಕ್ಲಿಕ್ ಮಾಡಿ',
      });
    } else if (d.isFunnel || d.isHibiscusDropper) {
      this.callbacks.onTooltip({
        visible: true,
        x,
        y,
        titleEn: '💧 Hibiscus Filter & Dropper',
        titleKn: '💧 ದಾಸವಾಳ ಫನೆಲ್ ಮತ್ತು ಡ್ರಾಪರ್',
        subtitleEn:
          this.hibiscusStage === 'A4'
            ? 'Click dropper to test next active tube'
            : 'Click funnel to filter extract',
        subtitleKn:
          this.hibiscusStage === 'A4'
            ? 'ಮುಂದಿನ ಟ್ಯೂಬ್ ಪರೀಕ್ಷಿಸಲು ಡ್ರಾಪರ್ ಕ್ಲಿಕ್ ಮಾಡಿ'
            : 'ದ್ರಾವಣ ಸೋಸಲು ಫನೆಲ್ ಕ್ಲಿಕ್ ಮಾಡಿ',
      });
    } else if (d.isHibiscusPaperPad) {
      this.callbacks.onTooltip({
        visible: true,
        x,
        y,
        titleEn: '🌺📄 Hibiscus Petal-Rubbed Paper',
        titleKn: '🌺📄 ದಳ ಉಜ್ಜಿದ ದಾಸವಾಳ ಕಾಗದ',
        subtitleEn: this.hibiscusPaperPrepared
          ? 'Click to dip strip into next active tube'
          : 'Click to rub petal onto white paper',
        subtitleKn: this.hibiscusPaperPrepared
          ? 'ಮುಂದಿನ ಟ್ಯೂಬ್‌ನಲ್ಲಿ ಕಾಗದ ಅದ್ದಲು ಕ್ಲಿಕ್ ಮಾಡಿ'
          : 'ಕಾಗದದ ಮೇಲೆ ದಳ ಉಜ್ಜಲು ಕ್ಲಿಕ್ ಮಾಡಿ',
      });
    } else if (d.isLichenDish) {
      this.callbacks.onTooltip({
        visible: true,
        x,
        y,
        titleEn: '🧫 Lichen Powder',
        titleKn: '🧫 ಕಲ್ಲುಹೂವಿನ ಪುಡಿ',
        subtitleEn: 'Click to extract Litmus dye',
        subtitleKn: 'ಲಿಟ್ಮಸ್ ದ್ರಾವಣ ತಯಾರಿಸಲು ಕ್ಲಿಕ್ ಮಾಡಿ',
      });
    } else if (d.isRedLitmusStack) {
      this.callbacks.onTooltip({
        visible: true,
        x,
        y,
        titleEn: '📑 Red Litmus Paper',
        titleKn: '📑 ಕೆಂಪು ಲಿಟ್ಮಸ್ ಕಾಗದ',
        subtitleEn: 'Click to dip into next sample',
        subtitleKn: 'ಮುಂದಿನ ದ್ರಾವಣದಲ್ಲಿ ಅದ್ದಲು ಕ್ಲಿಕ್ ಮಾಡಿ',
      });
    } else if (d.isBlueLitmusStack) {
      this.callbacks.onTooltip({
        visible: true,
        x,
        y,
        titleEn: '📑 Blue Litmus Paper',
        titleKn: '📑 ನೀಲಿ ಲಿಟ್ಮಸ್ ಕಾಗದ',
        subtitleEn: 'Click to dip into next sample',
        subtitleKn: 'ಮುಂದಿನ ದ್ರಾವಣದಲ್ಲಿ ಅದ್ದಲು ಕ್ಲಿಕ್ ಮಾಡಿ',
      });
    } else if (d.isLitmusDropper) {
      this.callbacks.onTooltip({
        visible: true,
        x,
        y,
        titleEn: '💧 Litmus Solution Dropper',
        titleKn: '💧 ಲಿಟ್ಮಸ್ ದ್ರಾವಣ ಡ್ರಾಪರ್',
        subtitleEn: 'Click to drop solution into next sample',
        subtitleKn: 'ಹನಿ ಹಾಕಲು ಕ್ಲಿಕ್ ಮಾಡಿ',
      });
    } else if ((d.isShelfTubeA || d.isShelfTubeB) && d.substanceId !== undefined) {
      const idx = this.activeSubstances.findIndex((item) => item.id === d.substanceId);
      const s = this.activeSubstances[idx];
      if (s) {
        this.callbacks.onTooltip({
          visible: true,
          x,
          y,
          titleEn: `🧪 #${idx + 1} ${s.nameEn}`,
          titleKn: `🧪 #${idx + 1} ${s.nameKn}`,
          subtitleEn: 'Click to swap onto Active Testing Rack (3 slots)',
          subtitleKn: 'ಸಕ್ರಿಯ ಪರೀಕ್ಷಾ ಸ್ಥಾನಕ್ಕೆ ತರಲು ಕ್ಲಿಕ್ ಮಾಡಿ',
        });
      }
    } else if ((d.isTubeA || d.isTubeB) && d.substanceId !== undefined) {
      const idx = this.activeSubstances.findIndex((item) => item.id === d.substanceId);
      const s = this.activeSubstances[idx];
      if (s) {
        const st = this.testRecords[s.id];
        const isLitmus = this.currentTab === 'litmus';
        const tested = isLitmus
          ? st.litmusSolutionTested || st.litmusPaperBlueTested || st.litmusPaperRedTested
          : st.hibiscusTested || st.hibiscusPaperTested;
        this.callbacks.onTooltip({
          visible: true,
          x,
          y,
          titleEn: `🧪 ${idx + 1}. ${s.nameEn}`,
          titleKn: `🧪 ${idx + 1}. ${s.nameKn}`,
          subtitleEn: isLitmus
            ? tested
              ? `✓ Tested · ${s.typeEn}`
              : 'Click to test with Litmus'
            : st.hibiscusTested
              ? `🌺 ${s.hibiscusResultEn} · ${s.typeEn}`
              : this.stationATool === 'paper'
                ? 'Click to dip Hibiscus petal paper'
                : 'Click to add Hibiscus drops',
          subtitleKn: isLitmus
            ? tested
              ? `✓ ಪರೀಕ್ಷಿತ · ${s.typeKn}`
              : 'ಲಿಟ್ಮಸ್‌ನಿಂದ ಪರೀಕ್ಷಿಸಲು ಕ್ಲಿಕ್ ಮಾಡಿ'
            : st.hibiscusTested
              ? `🌺 ${s.hibiscusResultKn} · ${s.typeKn}`
              : this.stationATool === 'paper'
                ? 'ದಳ ಕಾಗದ ಅದ್ದಲು ಕ್ಲಿಕ್ ಮಾಡಿ'
                : 'ದಾಸವಾಳ ಹನಿ ಹಾಕಲು ಕ್ಲಿಕ್ ಮಾಡಿ',
          accentColor: isLitmus
            ? tested
              ? '#93c5fd'
              : undefined
            : st.hibiscusTested
              ? s.hibiscusColorHex
              : undefined,
        });
      }
    }
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent): void => {
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    const maxMove = e.pointerType === 'touch' ? 12 : 6;
    if (Math.hypot(dx, dy) > maxMove) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.audio.init();
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);
    if (intersects.length === 0) return;

    const obj = intersects[0].object;
    const d = obj.userData as InteractiveUserData;

    if (d.isPetal) {
      this.pluckPetal(obj as THREE.Mesh);
    } else if (d.isMortar || d.isPestle) {
      this.crushPetals();
    } else if (d.isBeaker) {
      this.addWarmWater();
    } else if (d.isFunnel) {
      this.filterAndBottle();
    } else if (d.isHibiscusDropper) {
      if (this.hibiscusStage === 'A3') {
        this.filterAndBottle();
      } else {
        this.stationATool = 'dropper';
        this.syncCenterTableApparatus();
        this.updateGuideRing();
        this.emitSnapshot();
        const idx = this.activeTubes.findIndex(
          (t) => !this.testRecords[t.substance.id].hibiscusTested
        );
        this.testTubeHibiscus(idx !== -1 ? idx : 0);
      }
    } else if (d.isHibiscusPaperPad) {
      this.stationATool = 'paper';
      this.syncCenterTableApparatus();
      this.updateGuideRing();
      this.emitSnapshot();
      this.prepareHibiscusPaper();
    } else if ((d.isShelfTubeA || d.isShelfTubeB) && d.substanceId !== undefined) {
      this.swapTubeFromShelf(d.substanceId, true);
    } else if ((d.isTubeA || d.isTubeB) && d.index !== undefined) {
      if (this.currentTab === 'litmus') {
        if (this.stationBTool === 'redPaper') {
          this.dipLitmusPaper('red', d.index);
        } else if (this.stationBTool === 'solution') {
          this.testTubeLitmusSolution(d.index);
        } else {
          this.dipLitmusPaper('blue', d.index);
        }
      } else {
        if (this.stationATool === 'paper' || (this.hibiscusStage !== 'A4' && this.hibiscusPaperPrepared)) {
          this.dipHibiscusPaper(d.index);
        } else {
          this.testTubeHibiscus(d.index);
        }
      }
    } else if (d.isLichenDish) {
      this.prepareLitmus();
    } else if (d.isRedLitmusStack) {
      this.currentTab = 'litmus';
      this.stationBTool = 'redPaper';
      this.buildTestTubes();
      this.syncCenterTableApparatus();
      this.updateGuideRing();
      this.emitSnapshot();
      const idx = this.activeTubes.findIndex(
        (t) => !this.testRecords[t.substance.id].litmusPaperRedTested
      );
      this.dipLitmusPaper('red', idx !== -1 ? idx : 0);
    } else if (d.isBlueLitmusStack) {
      this.currentTab = 'litmus';
      this.stationBTool = 'bluePaper';
      this.buildTestTubes();
      this.syncCenterTableApparatus();
      this.updateGuideRing();
      this.emitSnapshot();
      const idx = this.activeTubes.findIndex(
        (t) => !this.testRecords[t.substance.id].litmusPaperBlueTested
      );
      this.dipLitmusPaper('blue', idx !== -1 ? idx : 0);
    } else if (d.isLitmusDropper) {
      this.currentTab = 'litmus';
      this.stationBTool = 'solution';
      this.buildTestTubes();
      this.syncCenterTableApparatus();
      this.updateGuideRing();
      this.emitSnapshot();
      const idx = this.activeTubes.findIndex(
        (t) => !this.testRecords[t.substance.id].litmusSolutionTested
      );
      this.testTubeLitmusSolution(idx !== -1 ? idx : 0);
    }
  };

  private updateResponsiveCamera(aspect: number): void {
    const targetFov = aspect < 1 ? Math.min(66, 40 + (1 - aspect) * 44) : 40;
    this.camera.fov = targetFov;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  private onResize = (): void => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.updateResponsiveCamera(width / height);
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    this.callbacks.onContextLost?.(true);
  };

  private onContextRestored = (): void => {
    this.callbacks.onContextLost?.(false);
  };

  private bindEvents(): void {
    const el = this.renderer.domElement;
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('webglcontextlost', this.onContextLost);
    el.addEventListener('webglcontextrestored', this.onContextRestored);
    window.addEventListener('resize', this.onResize);
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const delta = Math.min(this.clock.getDelta(), 0.1);
      const time = this.clock.getElapsedTime();

      if (this.cameraTransitionActive) {
        this.camera.position.x = THREE.MathUtils.damp(
          this.camera.position.x,
          this.targetCamPos.x,
          6,
          delta
        );
        this.camera.position.y = THREE.MathUtils.damp(
          this.camera.position.y,
          this.targetCamPos.y,
          6,
          delta
        );
        this.camera.position.z = THREE.MathUtils.damp(
          this.camera.position.z,
          this.targetCamPos.z,
          6,
          delta
        );
        this.controls.target.x = THREE.MathUtils.damp(
          this.controls.target.x,
          this.targetControlsTarget.x,
          6,
          delta
        );
        this.controls.target.y = THREE.MathUtils.damp(
          this.controls.target.y,
          this.targetControlsTarget.y,
          6,
          delta
        );
        this.controls.target.z = THREE.MathUtils.damp(
          this.controls.target.z,
          this.targetControlsTarget.z,
          6,
          delta
        );

        const camDist = this.camera.position.distanceTo(this.targetCamPos);
        const tgtDist = this.controls.target.distanceTo(this.targetControlsTarget);
        if (camDist < 0.02 && tgtDist < 0.02) {
          this.camera.position.copy(this.targetCamPos);
          this.controls.target.copy(this.targetControlsTarget);
          this.cameraTransitionActive = false;
        }
      }

      this.controls.update();

      if (this.guideRing.visible) {
        const s = 1.0 + Math.sin(time * 4.2) * 0.09;
        this.guideRing.scale.set(s, s, 1);
        (this.guideRing.material as THREE.MeshBasicMaterial).opacity =
          0.55 + Math.sin(time * 4.2) * 0.3;
      }

      const steamAttr = this.steamGeo.attributes.position as THREE.BufferAttribute;
      const steamPos = steamAttr.array as Float32Array;
      for (let s = 0; s < this.steamParticleCount; s++) {
        steamPos[s * 3 + 1] += delta * 0.62;
        if (steamPos[s * 3 + 1] > 2.05) {
          steamPos[s * 3 + 1] = 0.95;
          steamPos[s * 3] = (Math.random() - 0.5) * 0.55;
          steamPos[s * 3 + 2] = (Math.random() - 0.5) * 0.55;
        }
      }
      steamAttr.needsUpdate = true;

      for (let i = 0; i < this.activeTubes.length; i++) {
        this.activeTubes[i].liquidMat.uniforms.uTime.value = time;
      }
      for (let i = 0; i < this.shelfTubes.length; i++) {
        this.shelfTubes[i].liquidMat.uniforms.uTime.value = time;
      }
      this.mortarLiquidMat.uniforms.uTime.value = time;

      this.renderer.render(this.scene, this.camera);
      this.labelRenderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    this.frameId = requestAnimationFrame(tick);
  }

  dispose(): void {
    this.disposed = true;
    this.batchCancelled = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.activeAnimTimers.forEach((id) => {
      cancelAnimationFrame(id);
      clearTimeout(id);
    });

    const el = this.renderer.domElement;
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('webglcontextlost', this.onContextLost);
    el.removeEventListener('webglcontextrestored', this.onContextRestored);
    window.removeEventListener('resize', this.onResize);

    this.controls.removeEventListener('start', this.onControlsStart);
    this.controls.dispose();
    this.envRenderTarget.dispose();

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });

    this.css2dContainer.innerHTML = '';
    this.renderer.dispose();
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }
}
