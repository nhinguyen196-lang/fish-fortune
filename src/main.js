// A v3.7.7 – Ultra Sparse Distance-Based Water Trail + Extra-Fine Projectile Tail

// Fixes: enlarged fish scale, restored GLB shooter picking, 180-degree inward-facing conveyor orientation, and muzzle anchor offset to the mouth edge in fish-local axes.

// Based on A v2.27.2 – Wider Center Search + Four-Face Targeting

import * as THREE from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

import { clone as cloneSkinnedModel } from "three/addons/utils/SkeletonUtils.js";

 

// Load the two cube assets from the project's public folder.

// Vite serves files in public/ from the site root.

const gltfLoader = new GLTFLoader();

const cubeAssetUrls = {

  white: "/gem_red.glb",

  black: "/gem_green.glb"

};

const cubeAssetPromises = {

  white: gltfLoader.loadAsync(cubeAssetUrls.white),

  black: gltfLoader.loadAsync(cubeAssetUrls.black)

};

 

const CONFIG = {

  viewHeight: 25,

  rows: 13,

  columns: 13,

  subdivisions: 2,

  // Near-touching larger cubes; preserve the overall grid footprint.

  pixelSize: 0.312,

  pixelGap: 0.00175,

  pixelHeight: 0.25,

  gridCenterZ: -1.3,

  trackHalfWidth: 5,

  trackHalfDepth: 5.5,

  trackRadius: 0.85,

  slotCount: 5,

  slotWidth: 1.3,

  slotDepth: 1.3,

  slotGap: 0.2,

  slotZ: 6.3,

  characterColumns: 4,

  characterRows: 4,

  characterStartZ: 9.55,

  characterGapX: 1.38,

  characterGapZ: 1.32,

  maxConveyorShooters: 5,

  conveyorSpeed: 0.1,

  initialAmmo: 20,

  shotCooldown: 0.12,

  projectileDuration: 0.16,

  gameDuration: 120

};

 

const scene = new THREE.Scene();
scene.background = null;

 

const camera = new THREE.OrthographicCamera(

  -7,

  7,

  CONFIG.viewHeight / 2,

  -CONFIG.viewHeight / 2,

  0.1,

  100

);

 

// Lower the camera elevation slightly so the front/lower edge of the grid

// and the cube side faces are more visible instead of looking nearly top-down.

camera.position.set(0, 14, 8);

camera.up.set(0, 0, -1);

camera.lookAt(0, 0, 2.2);

// Keep the board centered above the playfield across portrait and landscape layouts.
// The live countdown stays in front as an HTML overlay.
const timerBoardAnchor = new THREE.Group();
timerBoardAnchor.name = "Timer Board Anchor";
timerBoardAnchor.frustumCulled = false;
scene.add(timerBoardAnchor);
let timerBoardContent = null;
let timerBoardCenter = new THREE.Vector3();
let timerBoardBaseScale = 0;
const timerBoardShadowCanvas = document.createElement("canvas");
timerBoardShadowCanvas.width = 256;
timerBoardShadowCanvas.height = 128;
const timerBoardShadowContext = timerBoardShadowCanvas.getContext("2d");
const timerBoardShadowGradient = timerBoardShadowContext.createRadialGradient(128, 64, 12, 128, 64, 124);
timerBoardShadowGradient.addColorStop(0, "rgba(32, 18, 8, 0.3)");
timerBoardShadowGradient.addColorStop(0.62, "rgba(32, 18, 8, 0.13)");
timerBoardShadowGradient.addColorStop(1, "rgba(32, 18, 8, 0)");
timerBoardShadowContext.fillStyle = timerBoardShadowGradient;
timerBoardShadowContext.fillRect(0, 0, 256, 128);
const timerBoardShadowTexture = new THREE.CanvasTexture(timerBoardShadowCanvas);
const timerBoardShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({
    map: timerBoardShadowTexture,
    transparent: true,
    depthWrite: false,
    toneMapped: false
  })
);
timerBoardShadow.name = "Timer Board Soft Shadow";
timerBoardShadow.renderOrder = 0;
timerBoardShadow.frustumCulled = false;
scene.add(timerBoardShadow);
let timerBoardShadowSize = new THREE.Vector2(1, 0.5);
gltfLoader.loadAsync("/timer_board.glb").then(({ scene: timerBoard }) => {
  timerBoard.name = "Timer Board";
  timerBoardContent = new THREE.Group();
  timerBoardContent.name = "Timer Board Content";
  timerBoardContent.add(timerBoard);
  // This GLB's board surface lies in its local XZ plane (its normal is +Y).
  // Turn that normal toward the camera, then apply the camera orientation.
  timerBoardContent.quaternion.copy(camera.quaternion).multiply(
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)
  );
  timerBoardContent.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(timerBoardContent);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const largestDimension = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(largestDimension) || largestDimension <= 0) return;

  // Bounds are measured in the anchor's coordinate space; offset the wrapper
  // so its measured center lands exactly at the anchor position.
  timerBoardCenter.copy(center);
  timerBoardBaseScale = 9.0 / largestDimension;
  timerBoardShadowSize.set(size.x * timerBoardBaseScale * 1.08, size.y * timerBoardBaseScale * 0.48);
  timerBoardContent.traverse((object) => {
    object.frustumCulled = false;
    if (object.isMesh) object.renderOrder = 1;
  });
  timerBoardAnchor.add(timerBoardContent);
  positionTimerBoard();
}).catch((error) => console.error("Could not load timer_board.glb", error));

function positionTimerBoard() {
  const viewportScale = camera.top / (CONFIG.viewHeight / 2);
  const boardScreenY = camera.top - 1.5 * viewportScale;
  timerBoardAnchor.position.copy(
    camera.localToWorld(new THREE.Vector3(0, boardScreenY, -49.55))
  );
  timerBoardAnchor.quaternion.identity();
  timerBoardShadow.position.copy(
    camera.localToWorld(new THREE.Vector3(0.18 * viewportScale, boardScreenY - 0.2 * viewportScale, -49.82))
  );
  timerBoardShadow.quaternion.copy(camera.quaternion);
  timerBoardShadow.scale.set(
    timerBoardShadowSize.x * viewportScale,
    timerBoardShadowSize.y * viewportScale,
    1
  );
  if (timerBoardContent) {
    const boardScale = timerBoardBaseScale * viewportScale;
    timerBoardContent.scale.setScalar(boardScale);
    timerBoardContent.position.copy(timerBoardCenter).multiplyScalar(-boardScale);
  }
}

const backgroundImageAspect = 1920 / 1080;
const backgroundTexture = new THREE.TextureLoader().load("/back_ground.jpg");
backgroundTexture.colorSpace = THREE.SRGBColorSpace;
const backgroundPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.MeshBasicMaterial({ map: backgroundTexture, toneMapped: false, depthWrite: false })
);
backgroundPlane.name = "Game Background";
backgroundPlane.renderOrder = -1000;
backgroundPlane.frustumCulled = false;
scene.add(backgroundPlane);



 

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});

 

renderer.setClearColor(0x000000, 0);

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFSoftShadowMap;

 

document.body.style.margin = "0";

document.body.style.padding = "0";

document.body.style.width = "100vw";

document.body.style.height = "100vh";

document.body.style.overflow = "hidden";

document.body.style.backgroundColor = "#63dfe8";

 

document.body.appendChild(renderer.domElement);

 

// -----------------------------------------------------------------------------

// GAME UI: TIMER, CONVEYOR COUNTER AND END-GAME OVERLAY

// -----------------------------------------------------------------------------

 

const gameUIStyle = document.createElement("style");

 

gameUIStyle.textContent = `  body, canvas {

    cursor: url("/cursor-game.png") 8 6, auto;

  }

 

  #game-timer {

    position: fixed;

    top: 52px;

    left: 50%;

    transform: translateX(-50%);

    z-index: 10;

    min-width: 0;

    padding: 0;

    border: 0;

    border-radius: 0;

    background: transparent;

    color: #fff;

    font: 700 30px/1 'Comic Relief', cursive;

    letter-spacing: 1px;

    text-align: center;

    font-variant-numeric: tabular-nums;

    pointer-events: none;

    text-shadow: 0 2px 3px rgba(45,24,12,.5);

  }

 

  #conveyor-counter {

    position: fixed;

    z-index: 11;

    min-width: 0;

    padding: 0;

    border: 0;

    border-radius: 0;

    background: transparent;

    color: #fff;

    font: 700 20px/1 'Comic Relief', cursive;

    letter-spacing: .5px;

    text-align: center;

    font-variant-numeric: tabular-nums;

    pointer-events: none;

    text-shadow: 0 2px 3px rgba(0,0,0,.85), 0 0 7px rgba(0,0,0,.55);

    transform: translate(-50%, -50%);

  }

 

  #conveyor-counter.full {

    border-color: #ff7777;

    color: #ff9999;

  }

 

  #game-end-overlay {

    position: fixed;

    inset: 0;

    z-index: 20;

    display: none;

    align-items: center;

    justify-content: center;

    background: rgba(15,18,35,.48);

    pointer-events: none;

  }

 

  #game-end-panel {

    box-sizing: border-box;

    display: flex;

    flex-direction: column;

    align-items: center;

    position: relative;

    width: min(86vw, 80vh, 430px);

    aspect-ratio: 1;

    padding: 27% 9% 15%;

    border: 0;

    background-color: transparent;

    background-position: center;

    background-repeat: no-repeat;

    background-size: contain;

    color: #fff;

    text-align: center;

    font-family: 'Comic Relief', Arial, sans-serif;

    box-shadow: none;

  }

  #game-end-panel.lose { --end-board-image: url("/lose_board.png"); }
  #game-end-panel:is(.win, .lose) { width: min(96vw, 92vh, 620px); padding: 0; pointer-events: none; }
  #game-end-panel:is(.win, .lose) #game-end-title,
  #game-end-panel:is(.win, .lose) #game-end-subtitle { display: none; }
  #game-end-panel:is(.win, .lose) #game-replay-button {
    left: 49.6%;
    top: 63.7%;
    width: 35.6%;
    height: 14.6%;
    min-height: 0;
    padding: 0;
    border-radius: 24% / 50%;
    background-image: var(--end-board-image, url("/win_board.png"));
    background-size: 280.8988764% 684.9315068%;
    background-position: 49.378882% 66.042155%;
    background-repeat: no-repeat;
    overflow: hidden;
    font-size: 0;
    cursor: pointer;
    transition: transform .15s ease, background-color .15s ease;
  }
  #game-end-panel:is(.win, .lose) #game-replay-button::before {
    content: "";
    position: absolute;
    inset: 12% 6%;
    border-radius: inherit;
    pointer-events: none;
    box-shadow: inset 0 0 8px 2px rgba(255, 213, 120, .45);
    filter: blur(3px);
    opacity: 0;
    transition: opacity .15s ease;
  }
  #game-end-panel:is(.win, .lose) #game-replay-button:hover::before,
  #game-end-panel:is(.win, .lose) #game-replay-button:focus-visible::before { opacity: 1; }
  #game-end-panel:is(.win, .lose) #game-replay-button:hover,
  #game-end-panel:is(.win, .lose) #game-replay-button:focus-visible {
    transform: translate(-50%, -50%) scale(1.1);
    background-color: transparent;
    box-shadow: none;
  }
  #game-end-panel:is(.win, .lose) #game-replay-button:active {
    transform: translate(-50%, -50%);
    background-color: rgba(50, 25, 8, .18);
  }

 

  #game-end-title {

    margin: 0;

    width: max-content;

    max-width: 100%;

    white-space: nowrap;

    font-size: clamp(28px, 7vw, 46px);

    line-height: 1;

    font-weight: 900;

    letter-spacing: 2px;

  }

 

  #game-end-subtitle {

    margin: 10px 0 0;

    width: max-content;

    max-width: 100%;

    white-space: nowrap;

    font-size: clamp(10px, 2.7vw, 16px);

    font-weight: 600;

    letter-spacing: .5px;

  }

 

  #game-replay-button {

    display: inline-flex;

    position: absolute;

    left: 50%;

    top: 64%;

    transform: translate(-50%, -50%);

    align-items: center;

    justify-content: center;

    min-width: 0;

    min-height: 34px;

    margin: 0;

    padding: 6px 18px;

    border: 0;

    border-radius: 0;

    background: transparent;

    color: #fff;

    font: 800 14px/1 Arial, sans-serif;

    letter-spacing: 1.5px;

    cursor: url("/cursor-game.png") 8 6, auto;

    pointer-events: auto;

    text-shadow: 0 2px 4px rgba(40, 20, 5, .9);

    box-shadow: none;

    transition: transform .15s ease, filter .15s ease;

  }

  #game-replay-button:hover { filter: brightness(1.12); transform: translate(-50%, calc(-50% - 2px)); }

  #game-replay-button:active { transform: translate(-50%, -50%) scale(.98); }

  #game-end-panel { pointer-events: auto; }

 

  #screen-warning-glow {

    position: fixed;

    inset: 0;

    z-index: 8;

    pointer-events: none;

    opacity: 0;

    background:

      radial-gradient(ellipse at center,

        rgba(255, 0, 24, 0.02) 28%,

        rgba(255, 0, 24, 0.12) 58%,

        rgba(255, 0, 18, 0.42) 100%),

      linear-gradient(0deg,

        rgba(255, 0, 20, 0.10),

        rgba(255, 0, 20, 0.10));

    box-shadow: inset 0 0 95px 28px rgba(255, 0, 24, 0.42);

    transition: opacity .25s ease;

  }

  #screen-warning-glow.active {

    opacity: 1;

    animation: screen-red-pulse .72s ease-in-out infinite alternate;

  }

  @keyframes screen-red-pulse {

    from {

      opacity: .58;

      box-shadow: inset 0 0 75px 18px rgba(255, 0, 24, .34);

      filter: saturate(1.05);

    }

    to {

      opacity: 1;

      box-shadow: inset 0 0 145px 48px rgba(255, 0, 24, .68);

      filter: saturate(1.5);

    }

  }

 

  #game-timer.warning { color:#ff7777; text-shadow:0 2px 4px rgba(90,20,10,.65); animation:timer-warning .7s ease-in-out infinite alternate; }

  @keyframes timer-warning { from { opacity:1; } to { opacity:.82; } }

  #game-end-overlay.show { animation:overlay-in .45s ease-out both; }

  #game-end-panel:is(.win, .lose) { animation:win-panel-in .55s cubic-bezier(.2,.85,.25,1.2) both; }

  @keyframes overlay-in { from { opacity:0; } to { opacity:1; } }

  @keyframes win-panel-in { from { opacity:0; transform:scale(.72); } to { opacity:1; transform:scale(1); } }

  #performance-hud { position:fixed; right:10px; bottom:10px; z-index:30; padding:6px 8px; border:1px solid rgba(255,255,255,.25); border-radius:7px; background:rgba(18,22,38,.72); color:rgba(255,255,255,.8); font:10px/1.45 monospace; pointer-events:none; white-space:pre; }

  @media (max-width:480px) {

    #game-timer {

      top: 34px;

      padding: 7px 16px;


    }

 

    #game-end-panel { width: min(86vw, 80vh, 430px); }

  }

 

  canvas {

    display: block;

    width: 100vw;

    height: 100vh;

    touch-action: manipulation;

  }

 

  @media (max-width:600px) {

    #game-timer {

      top: max(52px, env(safe-area-inset-top));

      min-width: 96px;

      padding: 6px 12px;

      border-radius: 12px;


      letter-spacing: 1px;

    }

    #conveyor-counter {

      min-width: 48px;

      padding: 4px 8px;

      font-size: 18px;

    }

    #game-end-panel {

      box-sizing: border-box;

      width: min(86vw, 340px);

      min-width: 0;

      padding: 27% 9% 15%;

    }

    #game-end-title { font-size: clamp(34px, 10vw, 54px); }

    #game-end-subtitle {

      font-size: clamp(11px, 3vw, 14px);

      line-height: 1.35;

    }

  }

 

  @media (max-height:620px) and (orientation:landscape) {

    #game-timer { top: 27px; padding: 5px 12px; }

    #game-end-panel { padding: 27% 9% 15%; }

    #game-end-title { font-size: 38px; }

  }

`;

 

document.head.appendChild(gameUIStyle);

 

const screenWarningGlow = document.createElement("div");

screenWarningGlow.id = "screen-warning-glow";

document.body.appendChild(screenWarningGlow);

 

const timerElement = document.createElement("div");

timerElement.id = "game-timer";

timerElement.textContent = "02:00";

document.body.appendChild(timerElement);

const chooseFishHint = document.createElement("div");
chooseFishHint.textContent = "Click";
Object.assign(chooseFishHint.style, {
  position: "fixed",
  zIndex: "12",
  left: "50%",
  top: "70%",
  transform: "translate(-50%, -100%)",
  padding: "0",
  border: "0",
  borderRadius: "0",
  background: "transparent",
  boxShadow: "none",
  color: "#fff",
  font: "700 24px/1 'Comic Relief', cursive",
  textShadow: "0 2px 5px rgba(0,0,0,.85), 0 0 9px rgba(0,0,0,.45)",
  whiteSpace: "nowrap",
  pointerEvents: "none",
  transition: "opacity .35s ease"
});
document.body.appendChild(chooseFishHint);
const chooseFishPointer = document.createElement("div");
chooseFishPointer.setAttribute("aria-hidden", "true");
chooseFishPointer.innerHTML = `<img src="/cursor.png" alt="" width="60" height="72" style="display:block;width:60px;height:72px;object-fit:contain;">`;
Object.assign(chooseFishPointer.style, {
  position: "fixed",
  zIndex: "13",
  left: "50%",
  top: "70%",
  width: "60px",
  height: "72px",
  pointerEvents: "none",
  filter: "drop-shadow(0 2px 3px rgba(0,0,0,.75))",
  transformOrigin: "top left"
});
document.body.appendChild(chooseFishPointer);
chooseFishPointer.animate([
  { transform: "translate(5px, -7px) scale(1)", offset: 0 },
  { transform: "translate(-3px, 2px) scale(.9)", offset: .38 },
  { transform: "translate(5px, -7px) scale(1)", offset: .62 },
  { transform: "translate(5px, -7px) scale(1)", offset: 1 }
], { duration: 1050, iterations: Infinity, easing: "ease-in-out" });
let chooseFishHintActive = true;
let guideHighlightedShooter = null;
function hideChooseFishHint() {
  if (!chooseFishHintActive) return;
  chooseFishHintActive = false;
  chooseFishHint.style.opacity = "0";
  chooseFishPointer.style.opacity = "0";
  if (guideHighlightedShooter) {
    guideHighlightedShooter.userData.isGuideHighlighted = false;
    guideHighlightedShooter.userData.selectionRing.visible = false;
    guideHighlightedShooter = null;
  }
  window.setTimeout(() => {
    chooseFishHint.remove();
    chooseFishPointer.remove();
  }, 400);
}

 

const conveyorCounterElement = document.createElement("div");

conveyorCounterElement.id = "conveyor-counter";

conveyorCounterElement.textContent = `${CONFIG.maxConveyorShooters}/${CONFIG.maxConveyorShooters}`;

document.body.appendChild(conveyorCounterElement);

 

const endOverlay = document.createElement("div");

endOverlay.id = "game-end-overlay";

 

const endPanel = document.createElement("div");

endPanel.id = "game-end-panel";

 

const endTitle = document.createElement("h1");

endTitle.id = "game-end-title";

 

const endSubtitle = document.createElement("p");

endSubtitle.id = "game-end-subtitle";

 

// Create the replay control before attaching its click handler below.

const replayButton = document.createElement("button");

replayButton.id = "game-replay-button";

replayButton.type = "button";

replayButton.textContent = "REPLAY";

 

endPanel.append(endTitle, endSubtitle, replayButton);

endOverlay.appendChild(endPanel);

document.body.appendChild(endOverlay);

 

renderer.domElement.style.display = "block";

renderer.domElement.style.touchAction = "none";

 

scene.add(new THREE.AmbientLight(0xffffff, 1.85));

 

const sun = new THREE.DirectionalLight(0xffd080, 3.5);

sun.position.set(-5, 18, -3);

sun.castShadow = true;

sun.shadow.mapSize.set(2048, 2048);

sun.shadow.camera.left = -30;

sun.shadow.camera.right = 30;

sun.shadow.camera.top = 30;

sun.shadow.camera.bottom = -30;

sun.shadow.camera.near = 0.5;

sun.shadow.camera.far = 60;

sun.shadow.bias = -0.0005;

sun.shadow.normalBias = 0.035;

sun.shadow.radius = 5;

scene.add(sun);

 

const materials = {

  floor: new THREE.MeshStandardMaterial({

    color: 0x4a4d6b,

    roughness: 0.9

  }),

 

  white: new THREE.MeshStandardMaterial({

    color: 0xf5f5f5,

    roughness: 0.65

  }),

 

  black: new THREE.MeshStandardMaterial({

    color: 0x202027,

    roughness: 0.65

  }),

 

 

  track: new THREE.MeshStandardMaterial({

    color: 0x343954,

    roughness: 0.5

  }),

 

  rail: new THREE.MeshStandardMaterial({

    color: 0xbcc9f4,

    metalness: 0.5,

    roughness: 0.3

  }),

 

  slot: new THREE.MeshStandardMaterial({

    color: 0x30364e,

    roughness: 0.8

  })

};

 

const floor = new THREE.Mesh(

  new THREE.PlaneGeometry(50, 50),

  new THREE.ShadowMaterial({ color: 0x21140d, opacity: 0.14 })

);

 

floor.rotation.x = -Math.PI / 2;

floor.position.y = -0.2;
floor.visible = true;

floor.receiveShadow = true;
floor.castShadow = false;

scene.add(floor);

 

// -----------------------------------------------------------------------------

// GRID

// -----------------------------------------------------------------------------

 

const ROWS = CONFIG.rows * CONFIG.subdivisions;

const COLUMNS = CONFIG.columns * CONFIG.subdivisions;

 

const PIXEL_SIZE = CONFIG.pixelSize;

const PIXEL_GAP = CONFIG.pixelGap;

// Scale the complete cube formation inward to create a wider margin inside
// the conveyor while preserving the spacing between cubes.
const GRID_LAYOUT_SCALE = 0.84;

const GRID_DEPTH_STRETCH = 1.1;

 

const GRID_WIDTH =

  COLUMNS * (PIXEL_SIZE + PIXEL_GAP) - PIXEL_GAP;

 

const GRID_DEPTH =

  ROWS * (PIXEL_SIZE + PIXEL_GAP) - PIXEL_GAP;

 

const GRID_CENTER_Z = CONFIG.gridCenterZ;

 

// One fixed switch cube at the center of the pixel grid.

// The switch remains present and is detected independently by each shooter.

const DEPTH_BOOST_SWITCH_ROW = Math.floor((ROWS - 1) / 2);

const DEPTH_BOOST_SWITCH_COLUMN = Math.floor((COLUMNS - 1) / 2);

// Unlock each shooter's boost before the scan reaches the center switch.

const DEPTH_BOOST_UNLOCK_LEAD = 5;

 

const gridGroup = new THREE.Group();

scene.add(gridGroup);

 

const pixelGeometry = new THREE.BoxGeometry(

  PIXEL_SIZE,

  CONFIG.pixelHeight,

  PIXEL_SIZE

);

 

const pixels = [];

 

function pixelIsWhite(row, column) {

  const value =

    (row * 17 + column * 29 + row * column * 3) % 11;

 

  return value < 5;

}

 

for (let row = 0; row < ROWS; row++) {

  for (let column = 0; column < COLUMNS; column++) {

    const parentRow = Math.floor(row / CONFIG.subdivisions);

    const parentColumn = Math.floor(column / CONFIG.subdivisions);

 

    const isWhite = pixelIsWhite(parentRow, parentColumn);

 

    // Stable gameplay root; the GLB is attached as a visual child after loading.

    const pixel = new THREE.Group();

    const placeholder = new THREE.Mesh(

      pixelGeometry,

      isWhite ? materials.white : materials.black

    );

    placeholder.castShadow = true;

    placeholder.receiveShadow = false;

    pixel.add(placeholder);

    pixel.userData.placeholder = placeholder;

    pixel.userData.assetColor = isWhite ? "white" : "black";

 

    pixel.position.x = GRID_LAYOUT_SCALE * (

      -GRID_WIDTH / 2 +

      PIXEL_SIZE / 2 +

      column * (PIXEL_SIZE + PIXEL_GAP)
    );

 

    pixel.position.y = 0.12;

 

    pixel.position.z = GRID_CENTER_Z + GRID_LAYOUT_SCALE * GRID_DEPTH_STRETCH * (

      -GRID_DEPTH / 2 +

      PIXEL_SIZE / 2 +

      row * (PIXEL_SIZE + PIXEL_GAP)
    );

    pixel.scale.set(
      GRID_LAYOUT_SCALE,
      GRID_LAYOUT_SCALE,
      GRID_LAYOUT_SCALE * GRID_DEPTH_STRETCH
    );

 

    pixel.castShadow = true;

    pixel.receiveShadow = false;

 

    pixel.userData.color = isWhite ? "white" : "black";

    pixel.userData.row = row;

    pixel.userData.column = column;

    pixel.userData.active = true;

    pixel.userData.pending = false;

    pixel.userData.isDepthBoostSwitch =

      row === DEPTH_BOOST_SWITCH_ROW &&

      column === DEPTH_BOOST_SWITCH_COLUMN;

 

    gridGroup.add(pixel);

    pixels.push(pixel);

  }

}

 

// Replace placeholder boxes with imported GLB models while preserving the

// gameplay root, which owns position, scale, visibility and userData.

async function replacePixelPlaceholdersWithGlb() {

  const [appleResult, melonResult] = await Promise.allSettled([

    cubeAssetPromises.white,

    cubeAssetPromises.black

  ]);

 

  const loadedAssets = {

    white: appleResult.status === "fulfilled" ? appleResult.value.scene : null,

    black: melonResult.status === "fulfilled" ? melonResult.value.scene : null

  };

 

  if (appleResult.status === "rejected") {

    console.error(`Failed to load ${cubeAssetUrls.white}:`, appleResult.reason);

  }

  if (melonResult.status === "rejected") {

    console.error(`Failed to load ${cubeAssetUrls.black}:`, melonResult.reason);

  }

 

  const measureGemHeightRatio = (sourceModel, rotateRedGem = false) => {
    if (!sourceModel) return null;
    const model = sourceModel.clone(true);
    if (rotateRedGem) model.rotation.y = Math.PI / 2;
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const horizontal = Math.max(size.x, size.z);
    return horizontal > 0 ? size.y / horizontal : null;
  };
  const redHeightRatio = measureGemHeightRatio(loadedAssets.white, true);
  const greenHeightRatio = measureGemHeightRatio(loadedAssets.black);
  const redVerticalStretch = redHeightRatio && greenHeightRatio
    ? Math.max(1.12, 1.12 * greenHeightRatio / redHeightRatio)
    : 1.2;

  for (const pixel of pixels) {

    const color = pixel.userData.assetColor;

    const sourceModel = loadedAssets[color];

    if (!sourceModel) continue;

 

    const model = sourceModel.clone(true);

 

    // Rotate only Apple around the vertical axis so its leaf turns toward the

    // camera-facing direction. Melon keeps its original orientation.

    if (color === "white") {

      model.rotation.y = Math.PI / 2;

    }

 

    model.updateMatrixWorld(true);

 

    const bounds = new THREE.Box3().setFromObject(model);

    const size = new THREE.Vector3();

    const center = new THREE.Vector3();

    bounds.getSize(size);

    bounds.getCenter(center);

 

    // Match the visible horizontal footprint (X/Z) between Apple and Melon.

    // Apple has a taller Y bound due to its stem, so do not use Y for fit scale.

    const horizontalDimension = Math.max(size.x, size.z);

    if (!Number.isFinite(horizontalDimension) || horizontalDimension <= 0) {

      console.warn(`Skipped ${color} cube: invalid GLB horizontal bounds.`);

      continue;

    }

 

    const targetSize = PIXEL_SIZE * 1.02;

    const fitScale = targetSize / horizontalDimension;

 

    // Match the red gem's final height to the green gem without changing width.
    const verticalStretch = color === "white" ? redVerticalStretch : 1.12;
    const horizontalStretch = color === "black" ? 1.08 : 1;

    model.scale.set(

      fitScale * horizontalStretch,

      fitScale * verticalStretch,

      fitScale * horizontalStretch

    );

 

    // Re-center using the same non-uniform scale so the model remains aligned

    // with its gameplay cell after the vertical stretch.

    model.position.set(

      -center.x * fitScale * horizontalStretch,

      -center.y * fitScale * verticalStretch,

      -center.z * fitScale * horizontalStretch

    );

 

    model.traverse(child => {

      if (child.isMesh) {

        child.castShadow = true;

        child.receiveShadow = false;

      }

    });

 

    const placeholder = pixel.userData.placeholder;

    if (placeholder) pixel.remove(placeholder);

    pixel.add(model);

    pixel.userData.placeholder = null;

    pixel.userData.glbModel = model;

  }

}

 

replacePixelPlaceholdersWithGlb();

// Brief billboard glints mimic moving highlights across the gems.
const gemSparkleCanvas = document.createElement("canvas");
gemSparkleCanvas.width = 64;
gemSparkleCanvas.height = 64;
const gemSparkleContext = gemSparkleCanvas.getContext("2d");
const gemSparkleGlow = gemSparkleContext.createRadialGradient(32, 32, 1, 32, 32, 31);
gemSparkleGlow.addColorStop(0, "rgba(255,255,255,1)");
gemSparkleGlow.addColorStop(0.18, "rgba(255,255,255,.9)");
gemSparkleGlow.addColorStop(1, "rgba(255,255,255,0)");
gemSparkleContext.fillStyle = gemSparkleGlow;
gemSparkleContext.fillRect(0, 0, 64, 64);
gemSparkleContext.beginPath();
gemSparkleContext.moveTo(32, 3);
gemSparkleContext.quadraticCurveTo(36, 28, 61, 32);
gemSparkleContext.quadraticCurveTo(36, 36, 32, 61);
gemSparkleContext.quadraticCurveTo(28, 36, 3, 32);
gemSparkleContext.quadraticCurveTo(28, 28, 32, 3);
gemSparkleContext.fillStyle = "rgba(255,255,255,.95)";
gemSparkleContext.fill();
const gemSparkleTexture = new THREE.CanvasTexture(gemSparkleCanvas);
gemSparkleTexture.colorSpace = THREE.SRGBColorSpace;

const gemSparkles = Array.from({ length: 18 }, () => {
  const material = new THREE.SpriteMaterial({
    map: gemSparkleTexture,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const sparkle = new THREE.Sprite(material);
  sparkle.name = "Gem Sparkle";
  sparkle.visible = false;
  sparkle.renderOrder = 12;
  sparkle.userData.age = 0;
  sparkle.userData.duration = 0;
  scene.add(sparkle);
  return sparkle;
});
let gemSparkleSpawnTimer = 0;

function updateGemSparkles(delta) {
  gemSparkleSpawnTimer -= delta;
  if (gemSparkleSpawnTimer <= 0) {
    const availablePixels = pixels.filter((pixel) => pixel.userData.active && pixel.visible);
    if (availablePixels.length) {
      const pixel = availablePixels[Math.floor(Math.random() * availablePixels.length)];
      const sparkle = gemSparkles.find((item) => !item.visible);
      if (sparkle) {
        pixel.updateWorldMatrix(true, false);
        sparkle.position.copy(pixel.localToWorld(new THREE.Vector3(
          (Math.random() - 0.5) * PIXEL_SIZE * 0.6,
          0.29,
          (Math.random() - 0.5) * PIXEL_SIZE * 0.6
        )));
        sparkle.userData.age = 0;
        sparkle.userData.duration = 0.35 + Math.random() * 0.35;
        sparkle.material.color.setHex(Math.random() < 0.5 ? 0xffffff : 0xbffaff);
        sparkle.visible = true;
      }
    }
    gemSparkleSpawnTimer = 0.08 + Math.random() * 0.1;
  }

  for (const sparkle of gemSparkles) {
    if (!sparkle.visible) continue;
    sparkle.userData.age += delta;
    const progress = sparkle.userData.age / sparkle.userData.duration;
    if (progress >= 1) {
      sparkle.visible = false;
      sparkle.material.opacity = 0;
      continue;
    }
    sparkle.material.opacity = Math.sin(progress * Math.PI) * 0.9;
    const viewportScale = camera.top / (CONFIG.viewHeight / 2);
    const size = (0.05 + Math.sin(progress * Math.PI) * 0.11) * viewportScale;
    sparkle.scale.set(size, size, 1);
  }
}

 

// -----------------------------------------------------------------------------

// PERIMETER LAYERS

// -----------------------------------------------------------------------------

 

function buildPerimeterLayers() {

  const layers = [];

  const maxLayers = Math.ceil(Math.min(ROWS, COLUMNS) / 2);

 

  for (let layer = 0; layer < maxLayers; layer++) {

    const sides = [[], [], [], []];

 

    const top = layer;

    const bottom = ROWS - 1 - layer;

    const left = layer;

    const right = COLUMNS - 1 - layer;

 

    // Side 0: Bottom

    for (let c = left; c <= right; c++) {

      sides[0].push(pixels[bottom * COLUMNS + c]);

    }

 

    // Side 1: Right

    for (let r = bottom - 1; r >= top; r--) {

      sides[1].push(pixels[r * COLUMNS + right]);

    }

 

    // Side 2: Top

    for (let c = right - 1; c >= left; c--) {

      sides[2].push(pixels[top * COLUMNS + c]);

    }

 

    // Side 3: Left

    for (let r = top + 1; r < bottom; r++) {

      sides[3].push(pixels[r * COLUMNS + left]);

    }

 

    layers.push(sides);

  }

 

  return layers;

}

 

const perimeterLayers = buildPerimeterLayers();

 

// -----------------------------------------------------------------------------

// CONVEYOR PATH

// -----------------------------------------------------------------------------

 

const TRACK_CENTER_Z = GRID_CENTER_Z;

const TRACK_HALF_WIDTH = CONFIG.trackHalfWidth;

const TRACK_HALF_DEPTH = CONFIG.trackHalfDepth;

const TRACK_RADIUS = CONFIG.trackRadius;

 

// Canonical gameplay path, independent from the visible conveyor model.

// Replace/rebuild the conveyor artwork without changing this shooter route.

class RoundedRectangleConveyorCurve extends THREE.Curve {

  constructor(halfWidth, halfDepth, radius, centerZ, y = 0.05) {

    super();

    this.halfWidth = halfWidth;

    this.halfDepth = halfDepth;

    this.radius = Math.min(radius, halfWidth, halfDepth);

    this.centerZ = centerZ;

    this.y = y;

 

    const w = halfWidth, d = halfDepth, r = this.radius;

    this.segments = [

      { type: "line", from: [-w + r, d], to: [w - r, d], length: 2 * (w - r) },

      { type: "arc", cx: w - r, cz: d - r, start: Math.PI / 2, end: 0, length: Math.PI * r / 2 },

      { type: "line", from: [w, d - r], to: [w, -d + r], length: 2 * (d - r) },

      { type: "arc", cx: w - r, cz: -d + r, start: 0, end: -Math.PI / 2, length: Math.PI * r / 2 },

      { type: "line", from: [w - r, -d], to: [-w + r, -d], length: 2 * (w - r) },

      { type: "arc", cx: -w + r, cz: -d + r, start: -Math.PI / 2, end: -Math.PI, length: Math.PI * r / 2 },

      { type: "line", from: [-w, -d + r], to: [-w, d - r], length: 2 * (d - r) },

      { type: "arc", cx: -w + r, cz: d - r, start: Math.PI, end: Math.PI / 2, length: Math.PI * r / 2 }

    ];

 

    let distance = 0;

    for (const segment of this.segments) {

      segment.startDistance = distance;

      distance += segment.length;

      segment.endDistance = distance;

    }

    this.totalLength = distance;

    this.arcLengthDivisions = 4096;

  }

 

  _locate(t) {

    const wrapped = ((t % 1) + 1) % 1;

    const distance = wrapped * this.totalLength;

    let segment = this.segments[this.segments.length - 1];

    for (const candidate of this.segments) {

      if (distance <= candidate.endDistance + 1e-10) {

        segment = candidate;

        break;

      }

    }

    const local = Math.max(0, Math.min(segment.length, distance - segment.startDistance));

    return { segment, u: segment.length > 0 ? local / segment.length : 0 };

  }

 

  // Exact arc-length parameterization: equal changes in t mean equal travel distance.

  getPoint(t, target = new THREE.Vector3()) {

    const { segment, u } = this._locate(t);

    let x, z;

    if (segment.type === "line") {

      x = THREE.MathUtils.lerp(segment.from[0], segment.to[0], u);

      z = THREE.MathUtils.lerp(segment.from[1], segment.to[1], u);

    } else {

      const angle = THREE.MathUtils.lerp(segment.start, segment.end, u);

      x = segment.cx + this.radius * Math.cos(angle);

      z = segment.cz + this.radius * Math.sin(angle);

    }

    return target.set(x, this.y, this.centerZ + z);

  }

 

  getTangent(t, target = new THREE.Vector3()) {

    const { segment, u } = this._locate(t);

    if (segment.type === "line") {

      return target.set(

        segment.to[0] - segment.from[0], 0,

        segment.to[1] - segment.from[1]

      ).normalize();

    }

    const angle = THREE.MathUtils.lerp(segment.start, segment.end, u);

    const sign = Math.sign(segment.end - segment.start);

    return target.set(-Math.sin(angle) * sign, 0, Math.cos(angle) * sign).normalize();

  }

 

  // This curve is already distance-parameterized; avoid a second approximate remap.

  getPointAt(u, target = new THREE.Vector3()) {

    return this.getPoint(u, target);

  }

 

  getTangentAt(u, target = new THREE.Vector3()) {

    return this.getTangent(u, target);

  }

}

 

function createRoundedPath() {

  return new RoundedRectangleConveyorCurve(

    TRACK_HALF_WIDTH,

    TRACK_HALF_DEPTH,

    TRACK_RADIUS,

    TRACK_CENTER_Z,

    0.05

  );

}

 

const conveyorPath = createRoundedPath();

const conveyorHeadAnchor = conveyorPath.getPointAt(0).clone();
conveyorHeadAnchor.x -= 1.2;
conveyorHeadAnchor.y = 2.05;
conveyorHeadAnchor.z += 0.2;

async function loadConveyorHeadModel() {
  try {
    const gltf = await gltfLoader.loadAsync("/moc_bang_chuyen.glb");
    const model = gltf.scene;
    model.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const modelScale = 4.2 / Math.max(size.x, size.z);
    const startDirection = conveyorPath.getTangentAt(0).normalize();
    const headGroup = new THREE.Group();

    model.scale.setScalar(modelScale);
    model.position.set(
      -center.x * modelScale,
      -center.y * modelScale,
      -center.z * modelScale
    );
    headGroup.position.copy(conveyorHeadAnchor);
    headGroup.rotation.y = Math.atan2(startDirection.x, startDirection.z) +
      (size.x >= size.z ? 0 : Math.PI / 2) + Math.PI;

    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    headGroup.add(model);
    scene.add(headGroup);
  } catch (error) {
    console.error("Failed to load conveyor head model /moc_bang_chuyen.glb:", error);
  }
}

loadConveyorHeadModel();

 

// ANIMATED CONVEYOR DIRECTION ARROWS

// -----------------------------------------------------------------------------

 

// The arrows travel opposite to the shooters, matching the direction guide:

// top: left, left side: down, bottom: right, right side: up.

const conveyorArrowShape = new THREE.Shape();

conveyorArrowShape.moveTo(0, 0.30);

conveyorArrowShape.lineTo(-0.15, 0.02);

conveyorArrowShape.lineTo(-0.065, 0.02);

conveyorArrowShape.lineTo(-0.065, -0.22);

conveyorArrowShape.lineTo(0.065, -0.22);

conveyorArrowShape.lineTo(0.065, 0.02);

conveyorArrowShape.lineTo(0.15, 0.02);

conveyorArrowShape.closePath();

 

const conveyorArrowGeometry = new THREE.ShapeGeometry(conveyorArrowShape);

// Rotate the geometry so its forward axis is local +Z. This lets each arrow

// use a direction quaternion and point reliably around every corner.

conveyorArrowGeometry.rotateX(Math.PI / 2);

 

const conveyorArrowMaterial = new THREE.MeshBasicMaterial({

  color: 0xc5f7ff,

  transparent: true,

  opacity: 0.78,

  side: THREE.DoubleSide,

  depthWrite: false

});

 

const conveyorDirectionArrows = new THREE.Group();

const CONVEYOR_ARROW_COUNT = 12;

const CONVEYOR_ARROW_SPEED = 0.1; // Path laps per second.

const CONVEYOR_ARROW_START_T = 0.982;

const conveyorArrowMeshes = [];

const conveyorArrowForward = new THREE.Vector3(0, 0, 1);

const conveyorArrowDirection = new THREE.Vector3();

 

for (let i = 0; i < CONVEYOR_ARROW_COUNT; i++) {

  const arrow = new THREE.Mesh(

    conveyorArrowGeometry,

    conveyorArrowMaterial

  );

 

  arrow.renderOrder = 2;

  arrow.userData.pathT =

    CONVEYOR_ARROW_START_T * (1 - i / CONVEYOR_ARROW_COUNT);

 

  conveyorArrowMeshes.push(arrow);

  conveyorDirectionArrows.add(arrow);

}

 

scene.add(conveyorDirectionArrows);

 

function updateConveyorArrows(delta) {

  for (const arrow of conveyorArrowMeshes) {

    // Move forward along the path: this is the counter-clockwise direction.

    arrow.userData.pathT += CONVEYOR_ARROW_SPEED * delta;

 

    // When an arrow reaches the end of the visible conveyor run, wrap it

    // back to the entry point so the stream loops continuously.

    if (arrow.userData.pathT >= CONVEYOR_ARROW_START_T) {

      arrow.userData.pathT -= CONVEYOR_ARROW_START_T;

    }

 

    const t = arrow.userData.pathT;

    const point = conveyorPath.getPointAt(t);

    const tangent = conveyorPath.getTangentAt(t).normalize();

 

    conveyorArrowDirection.copy(tangent);

 

    arrow.position.set(point.x, point.y + 0.585, point.z);

    arrow.quaternion.setFromUnitVectors(

      conveyorArrowForward,

      conveyorArrowDirection

    );

  }

}

 

// -----------------------------------------------------------------------------

// CONVEYOR MODEL (GLB)

// The gameplay path above remains independent from the visible conveyor model.

// The GLB supplies the wooden conveyor frame and its inset water surface.

const CONVEYOR_GLB_URL = "/bang_chuyen.glb";

let conveyorModel = null;

 

async function loadConveyorModel() {

  try {

    const gltf = await gltfLoader.loadAsync(CONVEYOR_GLB_URL);

    conveyorModel = gltf.scene;

 

    conveyorModel.name = "conveyor-model";

    // Keep the visible belt centered on the same Z position as its path and
    // direction arrows. The GLB is authored around the world origin.
    conveyorModel.updateMatrixWorld(true);
    const conveyorBounds = new THREE.Box3().setFromObject(conveyorModel);
    const conveyorSize = conveyorBounds.getSize(new THREE.Vector3());
    const conveyorCenter = conveyorBounds.getCenter(new THREE.Vector3());

    // Keep the arrow/fish route at the center of the belt surface, with room
    // for the full belt width around it.
    const CONVEYOR_BELT_SCALE = 1.12;
    conveyorModel.scale.x *=
      (TRACK_HALF_WIDTH * 2 * CONVEYOR_BELT_SCALE) / conveyorSize.x;
    conveyorModel.scale.z *=
      (TRACK_HALF_DEPTH * 2 * CONVEYOR_BELT_SCALE) / conveyorSize.z;
    conveyorModel.position.set(
      -conveyorCenter.x * conveyorModel.scale.x,
      0,
      TRACK_CENTER_Z - conveyorCenter.z * conveyorModel.scale.z
    );

    conveyorModel.traverse((child) => {

      if (!child.isMesh) return;

      const isWaterSurface = child.name.toLowerCase() === "water";

      // Prevent shadow-map footprints on the broad conveyor water surface.

      child.castShadow = !isWaterSurface;

      child.receiveShadow = !isWaterSurface;

 

      // Keep the water plane below gameplay tiles so it cannot cover them.

      if (isWaterSurface) {

        conveyorModel.updateMatrixWorld(true);

        const worldPosition = new THREE.Vector3();

        child.getWorldPosition(worldPosition);

        worldPosition.y = 0.005;

        child.parent.worldToLocal(worldPosition);

        child.position.copy(worldPosition);

      }

    });

 

    conveyorModel.updateMatrixWorld(true);

    scene.add(conveyorModel);

    console.info(`Loaded conveyor model: ${CONVEYOR_GLB_URL}`);

  } catch (error) {

    console.error(`Failed to load conveyor model ${CONVEYOR_GLB_URL}:`, error);

  }

}

 

loadConveyorModel();

 

// -----------------------------------------------------------------------------

// WAITING TRAY

// -----------------------------------------------------------------------------

 

const SLOT_COUNT = CONFIG.slotCount;

const SLOT_WIDTH = CONFIG.slotWidth;

const SLOT_DEPTH = CONFIG.slotDepth;

const SLOT_GAP = CONFIG.slotGap;

const SLOT_Z = CONFIG.slotZ;

 

const trayWidth =

  SLOT_COUNT * SLOT_WIDTH +

  (SLOT_COUNT - 1) * SLOT_GAP;

 

const trayGroup = new THREE.Group();

scene.add(trayGroup);

 

const slotGeometry = new THREE.BoxGeometry(

  SLOT_WIDTH,

  0.18,

  SLOT_DEPTH

);

 

const traySlots = [];

 

for (let i = 0; i < SLOT_COUNT; i++) {

  const slot = new THREE.Mesh(

    slotGeometry,

    materials.slot

  );

 

  slot.position.set(

    -trayWidth / 2 +

    SLOT_WIDTH / 2 +

    i * (SLOT_WIDTH + SLOT_GAP),

    0.05,

    SLOT_Z

  );

 

  trayGroup.add(slot);

 

  traySlots.push({

    mesh: slot,

    shooter: null

  });

}

 

 

// -----------------------------------------------------------------------------

// WAITING SLOT GLB

// Keep the original slot geometry and GLB; render its water without the atlas.

const WAITING_SLOT_GLB_URL = "/slot_waitting.glb";

 

async function loadWaitingSlotAssets() {

  try {

    const gltf = await gltfLoader.loadAsync(WAITING_SLOT_GLB_URL);

    for (const slotData of traySlots) {

      const oldMesh = slotData.mesh;

      const slotModel = gltf.scene.clone(true);

      slotModel.scale.set(SLOT_WIDTH / 1.42690325, 1, SLOT_DEPTH / 1.3935209);

      slotModel.position.copy(oldMesh.position);

      slotModel.position.y += 0.07;

      slotModel.rotation.copy(oldMesh.rotation);

      slotModel.traverse((child) => {

        if (!child.isMesh || child.name.toLowerCase() !== "water") return;

        // Clone the material and remove the atlas while retaining the original GLB.

        const clearAtlas = (material) => {

          const plainMaterial = material.clone();

          plainMaterial.map = null;

          plainMaterial.emissiveMap = null;

          plainMaterial.color.set(0x547f9a);

          plainMaterial.needsUpdate = true;

          return plainMaterial;

        };

        child.material = Array.isArray(child.material)

          ? child.material.map(clearAtlas)

          : clearAtlas(child.material);

        child.castShadow = false;

        child.receiveShadow = false;

      });

      trayGroup.add(slotModel);

      trayGroup.remove(oldMesh);

      slotData.mesh = slotModel;

    }

  } catch (error) {

    console.error("Could not load waiting slot asset. Check /slot_waitting.glb in public/.", error);

  }

}

 

function updateWaitingWaterAnimation() {

  // Keep the existing animation-loop call site; slot water is static.

}

loadWaitingSlotAssets();

 

// -----------------------------------------------------------------------------

// SHOOTER AMMO LABEL

// -----------------------------------------------------------------------------

 

function createAmmoLabel(number) {

  const canvas = document.createElement("canvas");

 

  canvas.width = 256;

  canvas.height = 128;

 

  const ctx = canvas.getContext("2d");

 

  ctx.font = "bold 76px Arial";

  ctx.textAlign = "center";

  ctx.textBaseline = "middle";

  ctx.lineWidth = 10;

  ctx.strokeStyle = "#111111";

 

  ctx.strokeText(number, 128, 64);

 

  ctx.fillStyle = "#ffffff";

  ctx.fillText(number, 128, 64);

 

  const texture = new THREE.CanvasTexture(canvas);

 

  const sprite = new THREE.Sprite(

    new THREE.SpriteMaterial({

      map: texture,

      transparent: true,

      depthTest: false

    })

  );

 

  sprite.scale.set(0.85, 0.43, 1);

  sprite.position.set(0, 0.72, 0.35);

 

  return sprite;

}

 

function updateAmmoLabel(shooter) {

  const sprite = shooter.userData.ammoLabel;

  const texture = sprite.material.map;

  const canvas = texture.image;

  const ctx = canvas.getContext("2d");

 

  ctx.clearRect(0, 0, canvas.width, canvas.height);

 

  ctx.font = "bold 76px Arial";

  ctx.textAlign = "center";

  ctx.textBaseline = "middle";

  ctx.lineWidth = 10;

  ctx.strokeStyle = "#111111";

 

  ctx.strokeText(shooter.userData.ammo, 128, 64);

 

  ctx.fillStyle = "#ffffff";

  ctx.fillText(shooter.userData.ammo, 128, 64);

 

  if (shooter.userData.ammo <= 0) {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = "bold 76px Arial";

    ctx.textAlign = "center"; ctx.textBaseline = "middle";

    ctx.lineWidth = 10; ctx.strokeStyle = "#111111";

    ctx.strokeText("0", 128, 64);

    ctx.fillStyle = "#ff6666"; ctx.fillText("0", 128, 64);

  }

  texture.needsUpdate = true;

}

 

// -----------------------------------------------------------------------------

function createLowAmmoGlow() {

  const canvas = document.createElement("canvas");

  canvas.width = 128;

  canvas.height = 128;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(64, 64, 5, 64, 64, 62);

  gradient.addColorStop(0, "rgba(255, 35, 35, 0.62)");

  gradient.addColorStop(0.35, "rgba(255, 25, 25, 0.28)");

  gradient.addColorStop(1, "rgba(255, 0, 0, 0)");

  ctx.fillStyle = gradient;

  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({

    map: texture, color: 0xff3333, transparent: true, opacity: 0.8,

    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false

  }));

  glow.scale.set(1.45, 1.45, 1);

  glow.position.set(0, 0.48, 0);

  glow.visible = false;

  glow.userData.pulseTime = 0;

  return glow;

}

 

function updateLowAmmoGlow(shooter, delta) {

  // Low-ammo feedback is handled exclusively by fish desaturation.

  // Keep the legacy sprite hidden so no red warning glow appears.

  const glow = shooter.userData.lowAmmoGlow;

  if (glow) glow.visible = false;

}

 

// Fully desaturate the fish as soon as its ammo reaches 5 rounds.

// The transition is smoothed and affects both material colors and textures.

function updateFishLowAmmoDesaturation(shooter, delta) {

  const colorMaterials = shooter.userData.fishColorMaterials;

  if (!colorMaterials?.length) return;

 

  const ammo = shooter.userData.ammo;

  const targetDesaturation = ammo <= 5 && ammo > 0 ? 1 : 0;

 

  const current = shooter.userData.fishDesaturation ?? 0;

  const smoothing = 1 - Math.exp(-delta * 5.5);

  const next = THREE.MathUtils.lerp(current, targetDesaturation, smoothing);

  shooter.userData.fishDesaturation = next;

 

  for (const entry of colorMaterials) {

    entry.desaturationUniform.value = next;

  }

}

 

function createEmptyStatusLabel() {

  const canvas = document.createElement("canvas");

  canvas.width = 256; canvas.height = 72;

  const ctx = canvas.getContext("2d");

  ctx.font = "bold 42px Arial"; ctx.textAlign = "center";

  ctx.textBaseline = "middle"; ctx.fillStyle = "#ff7777";

  ctx.fillText("EMPTY", 128, 36);

  const texture = new THREE.CanvasTexture(canvas);

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({

    map: texture, transparent: true, depthTest: false

  }));

  sprite.scale.set(0.9, 0.25, 1);

  sprite.position.set(0, 1.02, 0.35);

  return sprite;

}

 

 

// -----------------------------------------------------------------------------

// WATER VFX: SHOOTER AURA, MOVEMENT TRAIL AND CUBE IMPACT

// -----------------------------------------------------------------------------

// Lightweight procedural effects. Gameplay, targeting and projectile timing stay

// unchanged. Shared geometries/materials keep the effect inexpensive.

const waterVfx = {

  trail: [],

  impacts: [],

  ripples: [],

  wakes: [],

  pondRippleTimer: 0.15,

  maxTrail: 150,

  maxImpactDroplets: 14

};

const waterDropGeometry = new THREE.SphereGeometry(0.068, 10, 8);

const waterDropMaterial = new THREE.MeshBasicMaterial({

  color: 0x36cfff, transparent: true, opacity: 0.94,

  blending: THREE.AdditiveBlending, depthWrite: false

});

const waterRingGeometry = new THREE.TorusGeometry(0.38, 0.038, 7, 36);

const waterRippleGeometry = new THREE.TorusGeometry(0.38, 0.045, 8, 48);

const waterRingMaterial = new THREE.MeshBasicMaterial({

  color: 0x43dcff, transparent: true, opacity: 0.62,

  blending: THREE.AdditiveBlending, depthWrite: false

});

const backgroundOceanRipples = [];
let backgroundOceanRippleTimer = 0.35;

function updateBackgroundOceanRipples(delta) {
  const visibleImageRight = backgroundTexture.offset.x + backgroundTexture.repeat.x;
  const hasVisibleSideWater = backgroundTexture.offset.x < 0.27 || visibleImageRight > 0.73;
  if (!hasVisibleSideWater) {
    for (const ripple of backgroundOceanRipples) {
      scene.remove(ripple.ring);
      ripple.ring.material.dispose();
    }
    backgroundOceanRipples.length = 0;
    backgroundOceanRippleTimer = 0.35;
    return;
  }

  backgroundOceanRippleTimer -= delta;
  if (backgroundOceanRippleTimer <= 0 && backgroundOceanRipples.length < 8) {
    // Favor water around the boat and around the dock posts on both sides.
    let imageU;
    let imageV;
    const region = Math.random();
    if (region < 0.36) {
      imageU = 0.92 + Math.random() * 0.06;
      imageV = 0.28 + Math.random() * 0.4;
    } else if (region < 0.44) {
      imageU = 0.69 + Math.random() * 0.12;
      imageV = 0.12 + Math.random() * 0.06;
    } else if (region < 0.52) {
      imageU = 0.69 + Math.random() * 0.12;
      imageV = 0.76 + Math.random() * 0.08;
    } else {
      const postRows = [0.1, 0.72, 0.9];
      const postRow = postRows[Math.floor(Math.random() * postRows.length)];
      const leftSide = Math.random() < 0.5;
      imageU = leftSide
        ? 0.2 + Math.random() * 0.1
        : 0.91 + Math.random() * 0.07;
      imageV = THREE.MathUtils.clamp(postRow + (Math.random() - 0.5) * 0.14, 0.08, 0.92);
    }

    // Convert the background-image position to the currently visible camera crop.
    let u = (imageU - backgroundTexture.offset.x) / backgroundTexture.repeat.x;
    let v = (backgroundTexture.offset.y + backgroundTexture.repeat.y - (1 - imageV)) /
      backgroundTexture.repeat.y;
    if (u < 0.02 || u > 0.98 || v < 0.08 || v > 0.92) {
      const fromLeft = Math.random() < 0.5;
      u = fromLeft ? 0.035 + Math.random() * 0.075 : 0.89 + Math.random() * 0.075;
      v = 0.16 + Math.random() * 0.72;
    }
    const material = waterRingMaterial.clone();
    material.color.setHex(0x7feeff);
    material.opacity = 0.72;
    material.depthTest = false;
    material.depthWrite = false;
    const ring = new THREE.Mesh(waterRippleGeometry, material);
    ring.name = "Background Ocean Ripple";
    ring.renderOrder = -999;
    ring.frustumCulled = false;
    scene.add(ring);
    backgroundOceanRipples.push({
      ring,
      u,
      v,
      elapsed: 0,
      duration: 2.1 + Math.random() * 0.9,
      startScale: 0.18,
      maxScale: 1.8 + Math.random() * 0.5
    });
    backgroundOceanRippleTimer = 0.3 + Math.random() * 0.4;
  } else if (backgroundOceanRipples.length >= 8) {
    backgroundOceanRippleTimer = 0.35;
  }

  for (let i = backgroundOceanRipples.length - 1; i >= 0; i--) {
    const ripple = backgroundOceanRipples[i];
    ripple.elapsed += delta;
    const progress = Math.min(ripple.elapsed / ripple.duration, 1);
    const eased = 1 - Math.pow(1 - progress, 2);
    ripple.ring.position.copy(camera.localToWorld(new THREE.Vector3(
      THREE.MathUtils.lerp(camera.left, camera.right, ripple.u),
      THREE.MathUtils.lerp(camera.top, camera.bottom, ripple.v),
      -49.72
    )));
    ripple.ring.quaternion.copy(camera.quaternion);
    ripple.ring.scale.setScalar(THREE.MathUtils.lerp(ripple.startScale, ripple.maxScale, eased));
    ripple.ring.material.opacity = 0.72 * (1 - progress);
    if (progress >= 1) {
      scene.remove(ripple.ring);
      ripple.ring.material.dispose();
      backgroundOceanRipples.splice(i, 1);
    }
  }
}

const waterWakeGeometry = new THREE.SphereGeometry(0.05, 10, 8);
const waterWakeMaterial = new THREE.MeshBasicMaterial({
  color: 0x54e5ff,
  transparent: true,
  opacity: 0.98,
  blending: THREE.NormalBlending,
  depthWrite: false,
  depthTest: false
});

 

function createShooterWaterAura(shooter) {

  const aura = new THREE.Group();

  const ring = new THREE.Mesh(waterRingGeometry, waterRingMaterial.clone());

  ring.rotation.x = Math.PI / 2;

  ring.position.y = 0.035;

  aura.add(ring);

 

  const innerRing = new THREE.Mesh(

    new THREE.TorusGeometry(0.22, 0.012, 5, 28),

    waterRingMaterial.clone()

  );

  innerRing.rotation.x = Math.PI / 2;

  innerRing.position.y = 0.045;

  innerRing.material.opacity = 0.24;

  aura.add(innerRing);

 

  const halo = new THREE.Mesh(

    new THREE.CircleGeometry(0.43, 32),

    new THREE.MeshBasicMaterial({

      color: 0x36cfff, transparent: true, opacity: 0.10,

      blending: THREE.AdditiveBlending, depthWrite: false,

      side: THREE.DoubleSide

    })

  );

  halo.rotation.x = -Math.PI / 2;

  halo.position.y = 0.018;

  aura.add(halo);

 

  aura.visible = false;

  shooter.add(aura);

  shooter.userData.waterAura = { group: aura, ring, innerRing, halo, time: Math.random() * 6.28 };

}

 

function spawnWaterDroplet(position, velocity, duration = 0.42, scale = 1) {

  if (waterVfx.trail.length >= waterVfx.maxTrail) {

    const old = waterVfx.trail.shift();

    scene.remove(old.mesh);

    old.mesh.material.dispose();

  }

  const mesh = new THREE.Mesh(waterDropGeometry, waterDropMaterial.clone());

  mesh.position.copy(position);

 

  const travelDirection = velocity.lengthSq() > 0.0001

    ? velocity.clone().normalize()

    : new THREE.Vector3(0, 1, 0);

 

  // Elongated droplets aligned to their travel direction read more clearly

  // as stylized water streaks instead of tiny round specks.

  mesh.scale.set(0.9 * scale, 1.75 * scale, 0.9 * scale);

  mesh.quaternion.setFromUnitVectors(

    new THREE.Vector3(0, 1, 0),

    travelDirection

  );

 

  scene.add(mesh);

  waterVfx.trail.push({ mesh, velocity: velocity.clone(), elapsed: 0, duration, gravity: 1.25 });

}

 

function createWaterImpact(position) {

  const ring = new THREE.Mesh(waterRingGeometry, waterRingMaterial.clone());

  ring.position.copy(position);

  ring.position.y += 0.205;

  ring.rotation.x = Math.PI / 2;

  ring.scale.setScalar(0.18);

  scene.add(ring);

  waterVfx.impacts.push({ ring, elapsed: 0, duration: 0.34 });

 

  const count = 15;

  for (let i = 0; i < count; i++) {

    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.22;

    const speed = 0.48 + Math.random() * 0.62;

    const velocity = new THREE.Vector3(

      Math.cos(angle) * speed,

      0.45 + Math.random() * 0.55,

      Math.sin(angle) * speed

    );

    const origin = position.clone();

    origin.y += 0.22;

    spawnWaterDroplet(origin, velocity, 0.42 + Math.random() * 0.20, 0.85 + Math.random() * 0.65);

  }

}

 

function spawnFishRipple(position, waterHeight, region = "pond") {
  const ring = new THREE.Mesh(waterRippleGeometry, waterRingMaterial.clone());
  ring.position.set(position.x, waterHeight, position.z);
  ring.rotation.x = Math.PI / 2;
  ring.scale.setScalar(0.22);
  ring.material.blending = THREE.NormalBlending;
  ring.material.color.setHex(region === "pond" ? 0xffffff : 0x65eaff);
  ring.material.opacity = 0.9;
  ring.renderOrder = 3;
  scene.add(ring);
  let edgeDistance;
  if (region === "pond") {
    edgeDistance = Math.min(
        position.x - POND_RIPPLE_BOUNDS.minX,
        POND_RIPPLE_BOUNDS.maxX - position.x,
        position.z - POND_RIPPLE_BOUNDS.minZ,
        POND_RIPPLE_BOUNDS.maxZ - position.z
      );
  } else {
    const slot = traySlots[0];
    edgeDistance = slot ? Math.min(SLOT_WIDTH, SLOT_DEPTH) * 0.42 : 0.38;
  }
  const maxScale = Math.max(0.22, Math.min(1.97, edgeDistance / 0.38));
  const startScale = 0.16 + Math.random() * 0.12;
  ring.scale.setScalar(startScale);
  waterVfx.ripples.push({
    ring,
    elapsed: 0,
    duration: 0.55 + Math.random() * 0.45,
    startScale,
    maxScale
  });
}

function spawnWaterWakeDroplet(position, direction) {
  if (waterVfx.wakes.length >= 180) {
    const oldest = waterVfx.wakes.shift();
    scene.remove(oldest.mesh);
    oldest.mesh.material.dispose();
  }

  const mesh = new THREE.Mesh(waterWakeGeometry, waterWakeMaterial.clone());
  mesh.position.set(position.x, 0.42, position.z);
  mesh.rotation.y = Math.atan2(direction.x, direction.z);
  const dropletSize = 0.9 + Math.random() * 0.9;
  mesh.scale.set(1.05 * dropletSize, 0.9 * dropletSize, 1.05 * dropletSize);
  mesh.renderOrder = 10;
  scene.add(mesh);
  waterVfx.wakes.push({
    mesh,
    elapsed: 0,
    duration: 0.7 + Math.random() * 0.25
  });
}

function updateWaterVfx(delta) {

  for (const shooter of shooters) {

    const aura = shooter.userData.waterAura;

    if (!aura) continue;

    const state = shooter.userData.state;
    const movingOnBelt = state === "conveyor" ||
      state === "enteringConveyor" ||
      state === "exhaustedOnConveyor";
    const waitingAtSlot = state === "waiting";

    aura.group.visible = false;

    if (waitingAtSlot) {
      shooter.userData.rippleTimer -= delta;
      if (shooter.userData.rippleTimer <= 0) {
        spawnFishRipple(
          shooter.position,
          waitingAtSlot ? 0.16 : 0.16,
          "slot"
        );
        shooter.userData.rippleTimer = 0.65 + Math.random() * 0.65;
      }
    } else {
      shooter.userData.rippleTimer = 0;
    }

    if (!movingOnBelt) continue;

    shooter.userData.waterTrailTimer -= delta;
    if (shooter.userData.waterTrailTimer <= 0) {
      const trailT = shooter.userData.pathT - (0.008 + Math.random() * 0.012);
      const wakePosition = conveyorPath.getPointAt(trailT);
      const direction = conveyorPath.getTangentAt(trailT).normalize();
      const sideOffset = (Math.random() - 0.5) * 0.32;
      wakePosition.x += direction.z * sideOffset;
      wakePosition.z -= direction.x * sideOffset;
      spawnWaterWakeDroplet(wakePosition, direction);
      shooter.userData.waterTrailTimer = 0.12 + Math.random() * 0.16;
    }

    aura.time += delta;

    const pulse = 1 + Math.sin(aura.time * 5.5) * 0.07;

    aura.ring.scale.setScalar(pulse);

    aura.innerRing.rotation.z += delta * 0.8;

    aura.ring.material.opacity = 0.30 + 0.13 * (0.5 + 0.5 * Math.sin(aura.time * 4));

    aura.halo.material.opacity = 0.07 + 0.035 * (0.5 + 0.5 * Math.sin(aura.time * 3.2));

  }

  waterVfx.pondRippleTimer -= delta;
  if (waterVfx.pondRippleTimer <= 0) {
    const inset = 0.4;
    const x = THREE.MathUtils.lerp(
      POND_RIPPLE_BOUNDS.minX + inset,
      POND_RIPPLE_BOUNDS.maxX - inset,
      Math.random()
    );
    const z = THREE.MathUtils.lerp(
      POND_RIPPLE_BOUNDS.minZ + inset,
      POND_RIPPLE_BOUNDS.maxZ - inset,
      Math.random()
    );
    spawnFishRipple(new THREE.Vector3(x, 0, z), 0.16, "pond");
    waterVfx.pondRippleTimer = 0.25 + Math.random() * 0.7;
  }

 

  for (let i = waterVfx.trail.length - 1; i >= 0; i--) {

    const p = waterVfx.trail[i];

    p.elapsed += delta;

    p.mesh.position.addScaledVector(p.velocity, delta);

    p.velocity.y -= p.gravity * delta;

    const t = Math.min(p.elapsed / p.duration, 1);

    p.mesh.scale.multiplyScalar(1 - delta * 0.9);

    if (t >= 1) {

      scene.remove(p.mesh);

      p.mesh.material.dispose();

      waterVfx.trail.splice(i, 1);

    } else {

      p.mesh.material.opacity = 0.94 * (1 - t);

    }

  }

 

  for (let i = waterVfx.impacts.length - 1; i >= 0; i--) {

    const fx = waterVfx.impacts[i];

    fx.elapsed += delta;

    const t = Math.min(fx.elapsed / fx.duration, 1);

    const eased = 1 - Math.pow(1 - t, 3);

    fx.ring.scale.setScalar(0.18 + eased * 1.75);

    fx.ring.material.opacity = 0.48 * (1 - t);

    if (t >= 1) {

      scene.remove(fx.ring);

      fx.ring.material.dispose();

      waterVfx.impacts.splice(i, 1);

    }

  }

  for (let i = waterVfx.ripples.length - 1; i >= 0; i--) {
    const ripple = waterVfx.ripples[i];
    ripple.elapsed += delta;
    const t = Math.min(ripple.elapsed / ripple.duration, 1);
    const eased = 1 - Math.pow(1 - t, 2);
    const rippleScale = Math.min(
      THREE.MathUtils.lerp(ripple.startScale, ripple.maxScale, eased),
      ripple.maxScale
    );
    ripple.ring.scale.setScalar(rippleScale);
    ripple.ring.material.opacity = 0.9 * (1 - t);
    if (t >= 1) {
      scene.remove(ripple.ring);
      ripple.ring.material.dispose();
      waterVfx.ripples.splice(i, 1);
    }
  }

  for (let i = waterVfx.wakes.length - 1; i >= 0; i--) {
    const wake = waterVfx.wakes[i];
    wake.elapsed += delta;
    const t = Math.min(wake.elapsed / wake.duration, 1);
    wake.mesh.material.opacity = 0.98 * (1 - t);
    wake.mesh.scale.multiplyScalar(1 - delta * 0.18);
    if (t >= 1) {
      scene.remove(wake.mesh);
      wake.mesh.material.dispose();
      waterVfx.wakes.splice(i, 1);
    }
  }

}

 

// SHOOTER CHARACTERS

// -----------------------------------------------------------------------------

 

const shooterGroup = new THREE.Group();

scene.add(shooterGroup);

 

const shooters = [];

const chooseFishGuideWorld = new THREE.Vector3();
const chooseFishGuideNdc = new THREE.Vector3();
const chooseFishGuideTemp = new THREE.Vector3();

function updateChooseFishHintPosition() {
  if (!chooseFishHintActive) return;
  const rackShooters = shooters.filter((shooter) =>
    shooter.visible && shooter.userData.state === "rack"
  );
  if (!rackShooters.length) return;

  const targetShooter = rackShooters[0];
  if (guideHighlightedShooter !== targetShooter) {
    if (guideHighlightedShooter) guideHighlightedShooter.userData.isGuideHighlighted = false;
    guideHighlightedShooter = targetShooter;
    guideHighlightedShooter.userData.isGuideHighlighted = true;
  }
  targetShooter.updateWorldMatrix(true, false);
  targetShooter.getWorldPosition(chooseFishGuideWorld);
  chooseFishGuideNdc.copy(chooseFishGuideWorld).project(camera);
  const screenX = (chooseFishGuideNdc.x * 0.5 + 0.5) * window.innerWidth;
  const screenY = (-chooseFishGuideNdc.y * 0.5 + 0.5) * window.innerHeight;
  chooseFishHint.style.left = `${THREE.MathUtils.clamp(screenX, 100, window.innerWidth - 100)}px`;
  chooseFishHint.style.top = `${Math.max(48, screenY - 36)}px`;
  chooseFishPointer.style.left = `${THREE.MathUtils.clamp(screenX + 18, 8, window.innerWidth - 68)}px`;
  chooseFishPointer.style.top = `${Math.max(8, screenY - 30)}px`;
}

 

// Declare before createShooter() is called to avoid the temporal dead zone.

const shooterAnimationMixers = [];

const fishShooterGltfs = { white: null, black: null };

 

const CHARACTER_COLUMNS = CONFIG.characterColumns;

const CHARACTER_ROWS = CONFIG.characterRows;

const CHARACTER_START_Z = CONFIG.characterStartZ;

const CHARACTER_GAP_X = CONFIG.characterGapX;

const CHARACTER_GAP_Z = CONFIG.characterGapZ;

const POND_RIPPLE_BOUNDS = {
  minX: -((CHARACTER_COLUMNS - 1) * CHARACTER_GAP_X) / 2 - 0.25,
  maxX: ((CHARACTER_COLUMNS - 1) * CHARACTER_GAP_X) / 2 + 0.25,
  minZ: CHARACTER_START_Z - 0.25,
  maxZ: CHARACTER_START_Z + (CHARACTER_ROWS - 1) * CHARACTER_GAP_Z + 0.25
};

async function loadFishQueueModel() {
  try {
    const gltf = await gltfLoader.loadAsync("/bon_ca.glb");
    const fishQueueModel = gltf.scene;
    fishQueueModel.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(fishQueueModel);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const targetWidth = CHARACTER_COLUMNS * CHARACTER_GAP_X + 1;
    const modelScale = targetWidth / Math.max(size.x, size.z);
    const queueCenterZ =
      CHARACTER_START_Z + ((CHARACTER_ROWS - 1) * CHARACTER_GAP_Z) / 2;

    fishQueueModel.scale.setScalar(modelScale);
    fishQueueModel.position.set(
      -center.x * modelScale,
      -0.2,
      queueCenterZ - 0.3 - center.z * modelScale
    );

    fishQueueModel.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = true;
    });

    scene.add(fishQueueModel);
  } catch (error) {
    console.error("Failed to load fish queue model /bon_ca.glb:", error);
  }
}

loadFishQueueModel();

 

function createShooter(id, color, x, z) {

  const group = new THREE.Group();

 

  // Replaceable character artwork container; gameplay UI/effects stay on the root.

  const characterVisual = new THREE.Group();

  group.add(characterVisual);

 

  const isWhite = color === "white";

 

  const bodyMaterial = isWhite

    ? materials.white

    : materials.black;

 

  const body = new THREE.Mesh(

    new THREE.SphereGeometry(0.38, 24, 20),

    bodyMaterial

  );

 

  body.scale.set(1.08, 1.42, 1.02);

  body.position.y = 0.4;

 

  characterVisual.add(body);

 

  const head = new THREE.Mesh(

    new THREE.SphereGeometry(0.29, 24, 20),

    bodyMaterial

  );

 

  head.scale.setScalar(1.08);

  head.position.set(0, 0.91, 0.14);

  characterVisual.add(head);

 

  const earGeometry = new THREE.CapsuleGeometry(

    0.09,

    0.42,

    4,

    8

  );

 

  for (let i = 0; i < 2; i++) {

    const ear = new THREE.Mesh(

      earGeometry,

      bodyMaterial

    );

 

    ear.position.set(

      i === 0 ? -0.15 : 0.15,

      1.25,

      0.12

    );

 

    ear.rotation.z = i === 0 ? -0.12 : 0.12;

 

    characterVisual.add(ear);

  }

 

  const eyeMaterial = new THREE.MeshBasicMaterial({

    color: isWhite ? 0x171717 : 0xffffff

  });

 

  for (let i = 0; i < 2; i++) {

    const eye = new THREE.Mesh(

      new THREE.SphereGeometry(0.035, 12, 12),

      eyeMaterial

    );

 

    eye.position.set(

      i === 0 ? -0.1 : 0.1,

      0.88,

      0.38

    );

 

    characterVisual.add(eye);

  }

 

  const selectionRing = new THREE.Mesh(

    new THREE.TorusGeometry(0.52, 0.045, 8, 36),

    new THREE.MeshBasicMaterial({ color: 0x55eaff, transparent: true, opacity: 0.95, depthWrite: false })

  );

  selectionRing.rotation.x = Math.PI / 2;

  selectionRing.position.set(0, 0.10, 0);

  selectionRing.visible = false;

  group.add(selectionRing);

 

  const ammoLabel = createAmmoLabel(CONFIG.initialAmmo);

  const lowAmmoGlow = createLowAmmoGlow();

 

  group.add(lowAmmoGlow);

  group.add(ammoLabel);

  group.position.set(x, 0.12, z);

 

  group.userData.characterVisual = characterVisual;

  group.userData.shooterId = id;

  group.userData.color = color;

  group.userData.ammo = CONFIG.initialAmmo;

  group.userData.ammoLabel = ammoLabel;

  group.userData.selectionRing = selectionRing;

  group.userData.wigglePhase = Math.random() * Math.PI * 2;

  group.userData.wiggleTime = 0;

  group.userData.selectedPulse = 0;
  group.userData.isHovered = false;

  group.userData.lowAmmoGlow = lowAmmoGlow;

  group.userData.state = "rack";

  group.userData.pathT = 0;

  group.userData.pathYaw = null;

  group.userData.waterTrailDistance = 0;

  group.userData.waterTrailTimer = Math.random() * 0.075;

  group.userData.rippleTimer = Math.random() * 0.35;

  group.userData.tween = null;

  group.userData.fireCooldown = 0;

  group.userData.noTargetTime = 0;

  group.userData.noTargetFrames = 0;

  group.userData.targetSearchFailed = false;

  group.userData.depthBoostUnlocked = false;

  group.userData.depthBoostMultiplier = 1;

  group.userData.edgeCursors = {};

  group.userData.exhausted = false;

  group.userData.emptyStatusLabel = null;

 

  createShooterWaterAura(group);

 

  group.traverse(child => {

    if (child.isMesh || child.isSprite) {

      child.userData.shooterGroup = group;

    }

  });

 

  shooterGroup.add(group);

  shooters.push(group);

  if (fishShooterGltfs[color]) attachFishModelToShooter(group);

 

  return group;

}

 

for (let row = 0; row < CHARACTER_ROWS; row++) {

  for (let column = 0; column < CHARACTER_COLUMNS; column++) {

    const x =

      (column - (CHARACTER_COLUMNS - 1) / 2) *

      CHARACTER_GAP_X;

 

    const z =

      CHARACTER_START_Z + row * CHARACTER_GAP_Z;

 

    const color =

      (row + column) % 2 === 0

        ? "black"

        : "white";

 

    createShooter(shooters.length, color, x, z);

  }

}

 

// -----------------------------------------------------------------------------

// FISH SHOOTER GLBS – fish_red.glb and fish_green.glb

// -----------------------------------------------------------------------------

function fitShooterModelToHeight(model, targetHeight = 1.35) {

  model.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(model);

  const size = new THREE.Vector3();

  const center = new THREE.Vector3();

  bounds.getSize(size);

  bounds.getCenter(center);

 

  if (!Number.isFinite(size.y) || size.y <= 0) {

    throw new Error("fish_red.glb has invalid model bounds.");

  }

 

  const fitScale = targetHeight / size.y;

  model.scale.multiplyScalar(fitScale);

  model.position.set(

    -center.x * fitScale,

    -bounds.min.y * fitScale,

    -center.z * fitScale

  );

  model.updateMatrixWorld(true);

}

 

function attachFishModelToShooter(shooter) {

  const shooterColor = shooter.userData.color;

  const shooterGltf = fishShooterGltfs[shooterColor];

  if (!shooterGltf) return;

 

  const characterVisual = shooter.userData.characterVisual;

  if (!characterVisual || characterVisual.userData.fishModelAttached) return;

 

  // Red fish replaces white shooters; green fish replaces black shooters.

  // Both models deliberately share the exact same fit, muzzle, and animation setup.

  const fishModel = cloneSkinnedModel(shooterGltf.scene);

  fishModel.name = shooterColor === "white"

    ? "FishRedShooterModel"

    : "FishGreenShooterModel";

  fitShooterModelToHeight(fishModel, 1.15);

 

  // Replace only character artwork; keep all gameplay/UI/effect objects intact.

  characterVisual.clear();

  characterVisual.add(fishModel);

  characterVisual.userData.fishModelAttached = true;

  characterVisual.userData.fishModelColor = shooterColor;

 

  // Shared muzzle anchor: same local coordinates and scale as fish_red.

  const FISH_MUZZLE_LOCAL_POSITION = new THREE.Vector3(

    0,

    0.38,

    -0.62

  );

 

  const muzzleAnchor = new THREE.Object3D();

  muzzleAnchor.name = shooterColor === "white"

    ? "FishRedMuzzleAnchor"

    : "FishGreenMuzzleAnchor";

  muzzleAnchor.position.copy(FISH_MUZZLE_LOCAL_POSITION);

  characterVisual.add(muzzleAnchor);

 

  // Keep the muzzle anchor invisible. The old cyan debug dot is intentionally

  // omitted so no blue marker/pixel appears attached to the fish's mouth.

  shooter.userData.muzzleAnchor = muzzleAnchor;

  shooter.userData.muzzleMarkerDot = null;

  shooter.userData.muzzleAnchorSource = "characterVisual-local-marker";

 

  if (shooterGltf.animations && shooterGltf.animations.length > 0) {

    const mixer = new THREE.AnimationMixer(fishModel);

    const clip = shooterGltf.animations[0];

    mixer.clipAction(clip).play();

    mixer.setTime(Math.random() * Math.max(clip.duration, 0.001));

    shooter.userData.modelAnimationMixer = mixer;

    shooterAnimationMixers.push(mixer);

  }

 

  const fishColorMaterials = [];

 

  fishModel.traverse(child => {

    child.userData.shooterGroup = shooter;

 

    if (child.isMesh) {

      child.castShadow = true;

      child.receiveShadow = true;

 

      // Clone materials per fish so each shooter desaturates independently.

      const cloneAndTrackMaterial = material => {

        const instanceMaterial = material.clone();

        const desaturationUniform = { value: 0 };

 

        instanceMaterial.onBeforeCompile = shader => {

          shader.uniforms.uFishDesaturation = desaturationUniform;

 

          // Declare the uniform in the fragment shader's global scope.

          shader.fragmentShader = shader.fragmentShader.replace(

            "#include <common>",

            `#include <common>

            uniform float uFishDesaturation;`

          );

 

          // Desaturate after the base-color texture has been sampled.

          shader.fragmentShader = shader.fragmentShader.replace(

            "#include <color_fragment>",

            `#include <color_fragment>

            float fishGray = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));

            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(fishGray), uFishDesaturation);`

          );

        };

        instanceMaterial.customProgramCacheKey = () => "fish-low-ammo-desaturation-v2";

 

        fishColorMaterials.push({

          material: instanceMaterial,

          desaturationUniform

        });

 

        return instanceMaterial;

      };

 

      child.material = Array.isArray(child.material)

        ? child.material.map(cloneAndTrackMaterial)

        : cloneAndTrackMaterial(child.material);

    }

  });

 

  shooter.userData.fishColorMaterials = fishColorMaterials;

  shooter.userData.fishDesaturation = 0;

}

 

async function loadShooterModel(color, url) {

  try {

    const gltf = await gltfLoader.loadAsync(url);

    fishShooterGltfs[color] = gltf;

 

    for (const shooter of shooters) {

      if (shooter.userData.color === color) {

        attachFishModelToShooter(shooter);

      }

    }

 

    console.info(

      `Loaded ${url}; ${gltf.animations?.length ?? 0} animation clip(s) found.`

    );

  } catch (error) {

    console.error(`Failed to load ${url} for ${color} shooters:`, error);

  }

}

 

loadShooterModel("white", "/fish_red.glb");

loadShooterModel("black", "/fish_green.glb");

 

// IDs keep increasing so newly spawned shooters continue the color sequence.

let nextShooterId = shooters.length;

const MAX_RACK_SHOOTERS = CHARACTER_COLUMNS * CHARACTER_ROWS;

 

const MAX_CONVEYOR_SHOOTERS = CONFIG.maxConveyorShooters;

const CONVEYOR_SPEED = CONFIG.conveyorSpeed;

// Shooter exit point: lower-left rounded bend marked in the latest reference.

const SHOOTER_EXIT_PATH_T = 0.982;

 

const activeConveyor = [];

const waitingQueue = [];

 

// -----------------------------------------------------------------------------

// CONVEYOR CAPACITY COUNTER

// -----------------------------------------------------------------------------

 

function getConveyorCount() {

  // Count both shooters already on the conveyor and shooters currently

  // entering it. Waiting-tray and rack shooters are not included.

  return activeConveyor.length +

    shooters.filter(

      shooter =>

        shooter.userData.state === "enteringConveyor"

    ).length;

}

 

function updateConveyorCounter() {

  const occupied = Math.min(getConveyorCount(), MAX_CONVEYOR_SHOOTERS);

  const remaining = MAX_CONVEYOR_SHOOTERS - occupied;

 

  // Countdown: show available conveyor capacity (5/5 -> 0/5).

  conveyorCounterElement.textContent =

    `${remaining}/${MAX_CONVEYOR_SHOOTERS}`;

 

  conveyorCounterElement.classList.toggle(

    "full",

    remaining <= 0

  );

 

  // Anchor the HTML counter next to the conveyor's entry point in screen space.

  const anchor = conveyorHeadAnchor.clone();
  anchor.x += 0.35;
  anchor.z -= 0.02;

  anchor.project(camera);

 

  const screenX = (anchor.x * 0.5 + 0.5) * window.innerWidth;

  const screenY = (-anchor.y * 0.5 + 0.5) * window.innerHeight;

 

  conveyorCounterElement.style.left = `${screenX}px`;

  conveyorCounterElement.style.top = `${screenY}px`;

}

 

// -----------------------------------------------------------------------------

// SHOOTER TWEENS AND RACK MANAGEMENT

// -----------------------------------------------------------------------------

 

function createTween(shooter, target, duration, onComplete) {

  shooter.userData.tween = {

    from: shooter.position.clone(),

    to: target.clone(),

    duration,

    elapsed: 0,

    onComplete

  };

}

 

function updateTweens(delta) {

  for (const shooter of shooters) {

    const tween = shooter.userData.tween;

 

    if (!tween) continue;

 

    tween.elapsed += delta;

 

    const progress = Math.min(

      tween.elapsed / tween.duration,

      1

    );

 

    const eased =

      progress * progress * (3 - 2 * progress);

 

    shooter.position.lerpVectors(

      tween.from,

      tween.to,

      eased

    );

 

    if (progress >= 1) {

      shooter.userData.tween = null;

      if (shooter.userData.state === "waiting") {

        shooter.userData.selectionRing.visible = true;

        shooter.userData.selectedPulse = Math.max(shooter.userData.selectedPulse, 0.22);

        playGameTone(460, 0.07, "sine", 0.025);

      }

 

      if (tween.onComplete) {

        tween.onComplete();

      }

    }

  }

}

 

function arrangeRack() {

  const rackShooters = shooters.filter(

    shooter => shooter.userData.state === "rack"

  );

 

  rackShooters.forEach((shooter, index) => {

    const row = Math.floor(index / CHARACTER_COLUMNS);

    const column = index % CHARACTER_COLUMNS;

 

    const x =

      (column - (CHARACTER_COLUMNS - 1) / 2) *

      CHARACTER_GAP_X;

 

    const z =

      CHARACTER_START_Z + row * CHARACTER_GAP_Z;

 

    const target = new THREE.Vector3(x, 0.12, z);

 

    const enteringPond = shooter.position.z > POND_RIPPLE_BOUNDS.maxZ;
    createTween(
      shooter,
      target,
      0.3,
      enteringPond
        ? () => spawnFishRipple(shooter.position, 0.15)
        : null
    );

  });

}

 

function refillRack() {

  const rackShooters = shooters.filter(

    shooter => shooter.userData.state === "rack"

  );

 

  // Keep the rack full: every selected shooter is replaced by a new one.

  if (rackShooters.length < MAX_RACK_SHOOTERS) {

    const spawnZ =

      CHARACTER_START_Z + CHARACTER_ROWS * CHARACTER_GAP_Z + 2;

 

    const color = nextShooterId % 2 === 0 ? "black" : "white";

 

    createShooter(

      nextShooterId,

      color,

      0,

      spawnZ

    );

 

    nextShooterId += 1;

  }

 

  // Existing shooters move forward and the new shooter fills the last slot.

  arrangeRack();

}

 

function refreshWaitingTray() {

  // Clear the current slot references before assigning the queue again.

  for (const slot of traySlots) {

    slot.shooter = null;

  }

 

  // Only the first five queued shooters are visible on the tray.

  // Remaining shooters stay in the logical queue until a slot is free.

  for (let i = 0; i < waitingQueue.length; i++) {

    const shooter = waitingQueue[i];

 

    if (i < traySlots.length) {

      const slot = traySlots[i];

      slot.shooter = shooter;

 

      shooter.visible = true;

      shooter.userData.state = "waiting";

      shooter.userData.slotIndex = i;

 

      const target = new THREE.Vector3(

        slot.mesh.position.x,

        0.25,

        slot.mesh.position.z

      );

 

      // Move a shooter only when it is not already travelling to this slot.

      if (

        !shooter.userData.tween ||

        shooter.userData.tween.to.distanceTo(target) > 0.05

      ) {

        createTween(shooter, target, 0.35, null);

      }

    } else {

      shooter.userData.state = "queued";

      shooter.userData.slotIndex = -1;

      shooter.userData.tween = null;

      shooter.visible = false;

    }

  }

}

 

// -----------------------------------------------------------------------------

// GAME STATE AND TIMER

// -----------------------------------------------------------------------------

 

let gameStatus = "ready";

let timeRemaining = CONFIG.gameDuration;

let lastCountdownBeepSecond = null;

let victorySequence = null;

let victoryWave = null;

const victoryParticles = [];

 

function formatTime(seconds) {

  const totalSeconds = Math.max(0, Math.ceil(seconds));

  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;

}

function updateTimerDisplay() {

  timerElement.textContent = formatTime(timeRemaining);

  // Red warning glow, timer highlight, and countdown beeps activate

  // only during the final 10 seconds of an active game.

  const warningActive =

    gameStatus === "playing" && timeRemaining <= 10 && timeRemaining > 0;

  timerElement.classList.toggle("warning", warningActive);

  screenWarningGlow.classList.toggle("active", warningActive);

 

  // Play one short, higher-pitched beep per displayed second (10 to 1).

  const countdownSecond = Math.ceil(timeRemaining);

  if (warningActive && countdownSecond !== lastCountdownBeepSecond) {

    lastCountdownBeepSecond = countdownSecond;

    playGameTone(880, 0.12, "square", 0.052);

  }

  if (!warningActive) lastCountdownBeepSecond = null;

}

function startGame() {

  if (gameStatus !== "ready") return;

  gameStatus = "playing";

  unlockGameAudio();

  startBackgroundMusic();

  updateTimerDisplay();

}

function createVictoryWave() {

  const geometry = new THREE.TorusGeometry(0.35, 0.045, 8, 64);

  const material = new THREE.MeshBasicMaterial({ color:0x8fffd0, transparent:true, opacity:0.95, depthWrite:false });

  const wave = new THREE.Mesh(geometry, material);

  wave.rotation.x = Math.PI / 2;

  wave.position.set(0, 0.55, GRID_CENTER_Z);

  wave.scale.setScalar(0.1);

  scene.add(wave);

  return wave;

}

function beginVictorySequence() {

  if (gameStatus !== "playing") return;

  gameStatus = "victorySequence";

  victorySequence = { elapsed:0, slowMotionDuration:0.22, totalDuration:1.9, fireworksTriggered:[] };

  victoryWave = createVictoryWave();

  endTitle.textContent = "YOU WIN!";

  endTitle.style.color = "#75f0a5";

  endSubtitle.textContent = "BRAVO!  ALL CUBES CLEARED";

  endPanel.classList.add("win");

}

function playWinSound() {

  // Compact ascending fanfare timed to the quicker victory sequence.

  playGameTone(659, 0.13, "triangle", 0.06);

  setTimeout(() => playGameTone(784, 0.14, "triangle", 0.065), 100);

  setTimeout(() => playGameTone(1047, 0.22, "sine", 0.07), 210);

  setTimeout(() => {

    playGameTone(1318, 0.28, "sine", 0.055);

    playGameTone(1047, 0.28, "triangle", 0.035);

  }, 360);

}

 

function playLoseSound() {

  // Clear descending failure cue with a short low-frequency finish.

  playGameTone(392, 0.18, "sawtooth", 0.045);

  setTimeout(() => playGameTone(294, 0.22, "sawtooth", 0.05), 145);

  setTimeout(() => playGameTone(196, 0.30, "triangle", 0.055), 315);

  setTimeout(() => playGameTone(130.8, 0.42, "sine", 0.065), 520);

}

 

// Set this to the hosted game URL when the next game page is available.

const REPLAY_GAME_URL = "";

 

replayButton.addEventListener("click", () => {

  const destination = REPLAY_GAME_URL.trim() || window.location.href;

  window.location.assign(destination);

});

 

function finishGame(result) {

  if (gameStatus === "ended") return;

  gameStatus = "ended";

  stopBackgroundMusic();

  if (result === "win") playWinSound();

  else playLoseSound();

  endOverlay.style.display = "flex";

  endOverlay.classList.add("show");

  endPanel.classList.remove("win", "lose");
  replayButton.setAttribute("aria-label", result === "win" ? "Keep playing" : "Try again");
  endPanel.style.backgroundImage = result === "win"
    ? 'url("/win_board.png")'
    : 'url("/lose_board.png")';

  if (result === "win") {

    endTitle.textContent = "YOU WIN!";

    endTitle.style.color = "#75f0a5";

    endSubtitle.textContent = "BRAVO!  ALL CUBES CLEARED";

    endPanel.classList.add("win");

  } else {

    endPanel.classList.add("lose");

    endTitle.textContent = "YOU LOSE!";

    endTitle.style.color = "#ff7777";

    endSubtitle.textContent = "TIME'S UP";

  }

}

function updateVictorySequence(delta) {

  if (!victorySequence || gameStatus !== "victorySequence") return 0;

 

  victorySequence.elapsed += delta;

  const elapsed = victorySequence.elapsed;

 

  // Fireworks continue throughout the celebration instead of ending with the wave.

  triggerVictoryFireworks(elapsed);

 

  const waveDuration = 0.95;

  const t = Math.min(Math.max((elapsed - 0.22) / 0.73, 0), 1);

  const eased = 1 - Math.pow(1 - t, 3);

  if (victoryWave) {

    victoryWave.scale.setScalar(0.1 + eased * 15);

    victoryWave.material.opacity = 0.95 * (1 - t);

  }

 

  if (elapsed >= waveDuration && victoryWave) {

    scene.remove(victoryWave);

    victoryWave.geometry.dispose();

    victoryWave.material.dispose();

    victoryWave = null;

  }

 

  if (elapsed >= victorySequence.totalDuration) {

    finishGame("win");

  }

 

  // Hold a short slow-motion beat at the beginning, then return to normal time

  // while the firework celebration plays.

  return elapsed <= 0.22 ? 0.28 : 1;

}

function updateGameTimer(delta) {

  if (gameStatus !== "playing") return;

  timeRemaining = Math.max(0, timeRemaining - delta);

  updateTimerDisplay();

  if (timeRemaining <= 0) finishGame("lose");

}

function checkWinCondition() {

  if (gameStatus !== "playing") return;

  if (pixels.every(pixel => !pixel.userData.active)) beginVictorySequence();

}

 

// SHOOTER SELECTION AND QUEUE

// -----------------------------------------------------------------------------

 

function selectShooter(shooter) {

  if (gameStatus !== "ready" && gameStatus !== "playing") return;

  if (shooter.userData.state !== "rack") return;

  hideChooseFishHint();

 

  // Start the countdown when the player makes the first selection.

  startGame();

  shooter.userData.selectedPulse = 0.58;

  shooter.userData.selectionRing.visible = true;

  shooter.userData.selectionRing.scale.setScalar(0.35);

  playGameTone(660, 0.10, "triangle", 0.05);

 

  // Add every selected shooter to the end of the FIFO queue.

  waitingQueue.push(shooter);

  shooter.userData.state = "queued";

  shooter.visible = true;

 

  refillRack();

  refreshWaitingTray();

  tryLaunchWaiting();

}

 

function isEntryGateClear() {

  const minimumSpacing = 1.35;

 

  for (const shooter of activeConveyor) {

    const t = shooter.userData.pathT;

 

    const distanceToGate =

      Math.min(t, 1 - t) * conveyorPath.getLength();

 

    if (distanceToGate < minimumSpacing) {

      return false;

    }

  }

 

  for (const shooter of shooters) {

    if (shooter.userData.state === "enteringConveyor") {

      return false;

    }

  }

 

  return true;

}

 

function tryLaunchWaiting() {

  if (getConveyorCount() >= MAX_CONVEYOR_SHOOTERS) {

    return;

  }

 

  if (!isEntryGateClear()) {

    return;

  }

 

  // FIFO: launch the shooter that has been waiting the longest.

  const waitingShooter = waitingQueue.shift();

 

  if (!waitingShooter) return;

 

  waitingShooter.userData.state = "enteringConveyor";

  waitingShooter.userData.selectionRing.visible = false;

  waitingShooter.visible = true;

 

  // Promote the next queued shooters into the five visible tray slots.

  refreshWaitingTray();

 

  const initialT = 0;

 

  const startPoint = conveyorPath.getPointAt(initialT);

 

  const target = new THREE.Vector3(

    startPoint.x,

    0.3,

    startPoint.z

  );

 

  waitingShooter.userData.pathT = initialT;

  waitingShooter.userData.edgeCursors = {};

  waitingShooter.userData.fireCooldown = 0.5;

  waitingShooter.userData.noTargetTime = 0;

  waitingShooter.userData.noTargetFrames = 0;

  waitingShooter.userData.targetSearchFailed = false;

 

  createTween(waitingShooter, target, 0.65, () => {

    waitingShooter.userData.state = "conveyor";

 

    activeConveyor.push(waitingShooter);

 

    tryLaunchWaiting();

  });

}

 

// -----------------------------------------------------------------------------

// PROJECTILES

// -----------------------------------------------------------------------------

 

const projectiles = [];

 

function createProjectileGeometry() {

  // Extra-fine elongated water-bullet profile. The tail remains almost

  // needle-thin for most of its length before widening into the rounded nose.

  return new THREE.LatheGeometry(

    [

      new THREE.Vector2(0.0002, -0.420),

      new THREE.Vector2(0.0005, -0.360),

      new THREE.Vector2(0.0010, -0.300),

      new THREE.Vector2(0.0040, -0.240),

      new THREE.Vector2(0.0120, -0.180),

      new THREE.Vector2(0.0280, -0.120),

      new THREE.Vector2(0.0500, -0.105),

      new THREE.Vector2(0.0750, -0.050),

      new THREE.Vector2(0.0960, 0.010),

      new THREE.Vector2(0.1050, 0.070),

      new THREE.Vector2(0.1060, 0.120),

      new THREE.Vector2(0.0920, 0.170),

      new THREE.Vector2(0.0600, 0.215),

      new THREE.Vector2(0.0250, 0.248),

      new THREE.Vector2(0.0000, 0.265)

    ],

    20

  );

}

 

const projectileMaterials = {

  white: new THREE.MeshBasicMaterial({

    color: 0xffffff

  }),

 

  black: new THREE.MeshBasicMaterial({

    color: 0x65dfff

  })

};

 

function createProjectile(shooter, pixel) {

  // Read the muzzle anchor's world position. The anchor is parented directly

  // to fishModel, so its fixed local XYZ position follows the complete fish

  // transform chain, including the inward-facing rotation on every edge.

  shooter.updateMatrixWorld(true);

 

  const characterVisual = shooter.userData.characterVisual;

  const isFishShooter =

    characterVisual?.userData.fishModelAttached &&

    shooter.userData.muzzleAnchor;

 

  const start = isFishShooter

    ? shooter.userData.muzzleAnchor.getWorldPosition(new THREE.Vector3())

    : shooter.position.clone().add(new THREE.Vector3(0, 0.85, 0));

 

  const end = pixel.position.clone();

 

  end.y += 0.2;

 

  const projectile = new THREE.Mesh(

    createProjectileGeometry(),

    projectileMaterials[shooter.userData.color]

  );

 

  // Local +Y is the projectile's forward axis: the rounded broad end leads,

  // while the narrow tail follows the muzzle-to-target direction.

  const projectileDirection = end.clone().sub(start).normalize();

  projectile.quaternion.setFromUnitVectors(

    new THREE.Vector3(0, 1, 0),

    projectileDirection

  );

 

  projectile.position.copy(start);

  scene.add(projectile);

 

  const projectileGlow = new THREE.Mesh(

    new THREE.SphereGeometry(0.105, 16, 14),

    new THREE.MeshBasicMaterial({

      color: shooter.userData.color === "white" ? 0xffffff : 0x55dcff,

      transparent: true, opacity: 0.30,

      blending: THREE.AdditiveBlending, depthWrite: false

    })

  );

  projectileGlow.position.copy(start);

  projectileGlow.quaternion.copy(projectile.quaternion);

  projectileGlow.scale.set(0.95, 2.05, 0.95);

  scene.add(projectileGlow);

 

  const lineGeometry = new THREE.BufferGeometry();

 

  lineGeometry.setFromPoints([start, start]);

 

  const lineMaterial = new THREE.LineBasicMaterial({

    color:

      shooter.userData.color === "white"

        ? 0xffffff

        : 0x65dfff,

    transparent: true,

    opacity: 0.07

  });

 

  const line = new THREE.Line(

    lineGeometry,

    lineMaterial

  );

 

  scene.add(line);

 

  const impactLight = new THREE.PointLight(

    shooter.userData.color === "white"

      ? 0xffffff

      : 0x65dfff,

    0,

    1.5

  );

 

  impactLight.position.copy(end);

  scene.add(impactLight);

 

  projectiles.push({

    mesh: projectile,

    glow: projectileGlow,

    line,

    lineMaterial,

    impactLight,

    start,

    end,

    muzzleAnchor: isFishShooter ? shooter.userData.muzzleAnchor : null,

    pixel,

    elapsed: 0,

    duration: CONFIG.projectileDuration,

    impactElapsed: 0,

    impacted: false,

    originalScale: pixel.scale.clone()

  });

}

 

// -----------------------------------------------------------------------------

// TARGETING AND LINE OF SIGHT

// -----------------------------------------------------------------------------

 

// Each face has its own layer progression.

// A shooter can advance on the current face without waiting for

// the other three faces to clear their corresponding layers.

function getFirstUnclearedLayerByColor(color, side) {

  for (let layer = 0; layer < perimeterLayers.length; layer++) {

    const sidePixels = perimeterLayers[layer][side];

 

    const hasColorPixel = sidePixels.some(pixel =>

      pixel.userData.active &&

      pixel.userData.color === color

    );

 

    if (hasColorPixel) {

      return layer;

    }

  }

 

  return -1;

}

 

// Test whether the line segment from the shooter to a target intersects

// the square footprint of an active pixel. This is performed in the XZ

// plane because the board is viewed from above.

function segmentIntersectsPixel(start, end, pixel) {

  const halfX = PIXEL_SIZE * GRID_LAYOUT_SCALE * 0.5 + 0.008;
  const halfZ =
    PIXEL_SIZE * GRID_LAYOUT_SCALE * GRID_DEPTH_STRETCH * 0.5 + 0.008;

 

  const minX = pixel.position.x - halfX;

  const maxX = pixel.position.x + halfX;

  const minZ = pixel.position.z - halfZ;

  const maxZ = pixel.position.z + halfZ;

 

  const dx = end.x - start.x;

  const dz = end.z - start.z;

 

  let tMin = 0;

  let tMax = 1;

 

  const epsilon = 1e-8;

 

  // X slab

  if (Math.abs(dx) < epsilon) {

    if (start.x < minX || start.x > maxX) {

      return false;

    }

  } else {

    let tx1 = (minX - start.x) / dx;

    let tx2 = (maxX - start.x) / dx;

 

    if (tx1 > tx2) {

      const temp = tx1;

      tx1 = tx2;

      tx2 = temp;

    }

 

    tMin = Math.max(tMin, tx1);

    tMax = Math.min(tMax, tx2);

 

    if (tMin > tMax) return false;

  }

 

  // Z slab

  if (Math.abs(dz) < epsilon) {

    if (start.z < minZ || start.z > maxZ) {

      return false;

    }

  } else {

    let tz1 = (minZ - start.z) / dz;

    let tz2 = (maxZ - start.z) / dz;

 

    if (tz1 > tz2) {

      const temp = tz1;

      tz1 = tz2;

      tz2 = temp;

    }

 

    tMin = Math.max(tMin, tz1);

    tMax = Math.min(tMax, tz2);

 

    if (tMin > tMax) return false;

  }

 

  // Ignore intersections only at the very end of the segment.

  return tMax > 0.001 && tMin < 0.995;

}

 

function hasClearLineOfSight(shooter, target) {

  shooter.updateMatrixWorld(true);

 

  const characterVisual = shooter.userData.characterVisual;

  const muzzleAnchor = shooter.userData.muzzleAnchor;

  const hasFishMuzzle =

    characterVisual?.userData.fishModelAttached &&

    muzzleAnchor;

 

  const start = hasFishMuzzle

    ? muzzleAnchor.getWorldPosition(new THREE.Vector3())

    : shooter.position;

  const end = target.position;

 

  for (const pixel of pixels) {

    if (!pixel.userData.active) continue;

    if (pixel === target) continue;

 

    if (segmentIntersectsPixel(start, end, pixel)) {

      return false;

    }

  }

 

  return true;

}

// Both fish shooters use a narrow forward cone for near cubes. The cone expands

// progressively with target depth, allowing deeper shots to fan out naturally.

const FISH_AIM_START_ANGLE_DEG = 45;

const FISH_AIM_MAX_ANGLE_DEG = 82;

 

function isTargetWithinFishAimCone(shooter, target, depth, maxDepth) {

  const characterVisual = shooter.userData.characterVisual;

  const muzzleAnchor = shooter.userData.muzzleAnchor;

 

  // Preserve existing targeting for non-fish shooters and before GLB loading.

  if (

    !characterVisual?.userData.fishModelAttached ||

    !muzzleAnchor

  ) return true;

 

  shooter.updateMatrixWorld(true);

  const muzzlePosition = muzzleAnchor.getWorldPosition(new THREE.Vector3());

 

  // Use the fish visual pivot's local -Z axis as its actual facing direction.

  // The muzzle marker and this forward vector therefore share the same parent

  // rotation and cannot drift apart when the fish turns around the conveyor.

  const pivotWorldPosition = characterVisual.getWorldPosition(new THREE.Vector3());

  const forwardPoint = characterVisual.localToWorld(

    new THREE.Vector3(0, 0, -1)

  );

  const forward = forwardPoint.sub(pivotWorldPosition).normalize();

  forward.y = 0;

  forward.normalize();

 

  const toTarget = new THREE.Vector3(

    target.position.x - muzzlePosition.x,

    0,

    target.position.z - muzzlePosition.z

  ).normalize();

 

  const depthProgress = THREE.MathUtils.clamp(

    maxDepth > 0 ? depth / maxDepth : 0,

    0,

    1

  );

  const allowedAngleDeg = THREE.MathUtils.lerp(

    FISH_AIM_START_ANGLE_DEG,

    FISH_AIM_MAX_ANGLE_DEG,

    depthProgress

  );

  const minimumAimDot = Math.cos(

    THREE.MathUtils.degToRad(allowedAngleDeg)

  );

 

  return forward.dot(toTarget) >= minimumAimDot;

}

 

 

function getAdaptiveLaneOffsets(depth, multiplier = 1) {

  // The switch multiplier widens the lateral search radius at each depth.

  // Normal: x1. Unlocked: x4. After 2 failed frames: x7; after 4: x10.

  const radius = Math.max(0, Math.floor(depth * multiplier));

  const offsets = [0];

 

  for (let distance = 1; distance <= radius; distance++) {

    offsets.push(-distance, distance);

  }

 

  return offsets;

}

 

function getPixelAtFaceDepth(side, lane, depth) {

  if (side === 0) {

    // Bottom: bottom edge toward the center.

    return pixels[(ROWS - 1 - depth) * COLUMNS + lane];

  }

 

  if (side === 2) {

    // Top: top edge toward the center.

    return pixels[depth * COLUMNS + lane];

  }

 

  if (side === 1) {

    // Right: right edge toward the center.

    return pixels[lane * COLUMNS + (COLUMNS - 1 - depth)];

  }

 

  // Left: left edge toward the center.

  return pixels[lane * COLUMNS + depth];

}

 

function updateDepthBoostMultiplier(shooter) {

  if (!shooter.userData.depthBoostUnlocked) {

    shooter.userData.depthBoostMultiplier = 1;

    return 1;

  }

 

  shooter.userData.depthBoostMultiplier =

    shooter.userData.noTargetFrames >= 4

      ? 10

      : shooter.userData.noTargetFrames >= 2

        ? 7

        : 4;

 

  return shooter.userData.depthBoostMultiplier;

}

 

function findNextTarget(shooter, layer, side) {

  let depthBoostMultiplier = updateDepthBoostMultiplier(shooter);

  const maxTargetDistance = 20;

  const maxTargetDistanceSq = maxTargetDistance * maxTargetDistance;

  const isHorizontalFace = side === 0 || side === 2;

  const laneCount = isHorizontalFace ? COLUMNS : ROWS;

  const maxDepth = isHorizontalFace

    ? Math.floor(ROWS / 2)

    : Math.floor(COLUMNS / 2);

 

  // Find the lane aligned most closely with the shooter's actual position.

  let baseLane = 0;

  let closestOffset = Infinity;

 

  for (let lane = 0; lane < laneCount; lane++) {

    const referencePixel = isHorizontalFace

      ? pixels[lane]

      : pixels[lane * COLUMNS];

 

    const lanePosition = isHorizontalFace

      ? referencePixel.position.x

      : referencePixel.position.z;

 

    const shooterPosition = isHorizontalFace

      ? shooter.position.x

      : shooter.position.z;

 

    const offset = Math.abs(lanePosition - shooterPosition);

 

    if (offset < closestOffset) {

      closestOffset = offset;

      baseLane = lane;

    }

  }

 

  // Each lane has its own scan cursor and blocker state.

  // A blocker closes only that lane; neighboring lanes remain searchable.

  const nextDepthByOffset = new Map();

  const blockedOffsets = new Set();

 

  // Convert the fixed switch coordinate into this face's depth/lane space.

  const switchDepth = side === 0

    ? ROWS - 1 - DEPTH_BOOST_SWITCH_ROW

    : side === 2

      ? DEPTH_BOOST_SWITCH_ROW

      : side === 1

        ? COLUMNS - 1 - DEPTH_BOOST_SWITCH_COLUMN

        : DEPTH_BOOST_SWITCH_COLUMN;

 

  const switchLane = side === 0 || side === 2

    ? DEPTH_BOOST_SWITCH_COLUMN

    : DEPTH_BOOST_SWITCH_ROW;

 

  for (let depth = 0; depth <= maxDepth; depth++) {

    // Unlock when the fixed switch enters this shooter's expanding scan region.

    // This is independent per shooter and does not require the switch lane to

    // be unobstructed by ordinary cubes.

    if (

      !shooter.userData.depthBoostUnlocked &&

      depth >= Math.max(0, switchDepth - DEPTH_BOOST_UNLOCK_LEAD) &&

      Math.abs(switchLane - baseLane) <=

        Math.floor(depth * 2)

    ) {

      shooter.userData.depthBoostUnlocked = true;

      depthBoostMultiplier = updateDepthBoostMultiplier(shooter);

    }

 

    // Both fish types get a slightly wider shallow search fan. This lets them acquire

    // nearby front-row targets up to two lanes off-center instead of waiting

    // until deeper scan layers before those lanes become eligible.

    const isLoadedFishShooter =

      shooter.userData.characterVisual?.userData.fishModelAttached;

    const fishLaneSearchMultiplier = isLoadedFishShooter ? 2 : 1;

 

    const laneOffsets = getAdaptiveLaneOffsets(

      depth,

      depthBoostMultiplier * fishLaneSearchMultiplier

    );

 

    // Keep the central lane first, then newly opened lanes from near to far.

    // Newly opened lanes are back-scanned from the outside edge so they cannot

    // accidentally shoot through a blocker that lies before the current depth.

    for (const laneOffset of laneOffsets) {

      if (blockedOffsets.has(laneOffset)) continue;

 

      const lane = baseLane + laneOffset;

 

      if (lane < 0 || lane >= laneCount) {

        blockedOffsets.add(laneOffset);

        continue;

      }

 

      const firstDepth = nextDepthByOffset.get(laneOffset) ?? 0;

 

      for (let scanDepth = firstDepth; scanDepth <= depth; scanDepth++) {

        const pixel = getPixelAtFaceDepth(side, lane, scanDepth);

 

        // The fixed switch is hidden metadata on an ordinary white/black cube.

        // Reaching it unlocks this shooter's persistent boost, then the cube

        // continues through normal active/color/pending/LOS target handling.

        if (pixel.userData.isDepthBoostSwitch) {

          shooter.userData.depthBoostUnlocked = true;

          depthBoostMultiplier = updateDepthBoostMultiplier(shooter);

        }

 

        // Cleared cubes no longer obstruct a lane.

        if (!pixel.userData.active) continue;

 

        // Pending or wrong-color cubes block only this lane.

        if (

          pixel.userData.pending ||

          pixel.userData.color !== shooter.userData.color

        ) {

          blockedOffsets.add(laneOffset);

          break;

        }

 

        const dx = pixel.position.x - shooter.position.x;

        const dz = pixel.position.z - shooter.position.z;

        const distanceSq = dx * dx + dz * dz;

 

        if (distanceSq > maxTargetDistanceSq) {

          blockedOffsets.add(laneOffset);

          break;

        }

 

        // Confirm the actual diagonal shot is unobstructed as well.

        // This catches blockers in neighboring lanes that a grid-lane scan

        // alone might not detect near corners.

        if (!hasClearLineOfSight(shooter, pixel)) {

          blockedOffsets.add(laneOffset);

          break;

        }

 

        

        // Skip targets outside the fish's forward cone. Continue scanning

        // deeper in this lane because a cube farther inward may enter the cone.

        if (!isTargetWithinFishAimCone(shooter, pixel, scanDepth, maxDepth)) {

          continue;

        }

 

        pixel.userData.pending = true;

        return pixel;

      }

 

      nextDepthByOffset.set(laneOffset, depth + 1);

    }

  }

 

  return null;

}

 

// Return all four faces ordered by the shooter's actual distance to each

// conveyor-facing edge. The nearest face always has priority, even when it

// contains a deeper layer than a farther face.

function getShooterSidesByDistance(pathT) {

  const point = conveyorPath.getPointAt(pathT);

 

  const sideDistances = [

    {

      side: 0, // bottom

      distance: Math.abs(

        point.z - (TRACK_CENTER_Z + TRACK_HALF_DEPTH)

      )

    },

    {

      side: 1, // right

      distance: Math.abs(

        point.x - TRACK_HALF_WIDTH

      )

    },

    {

      side: 2, // top

      distance: Math.abs(

        point.z - (TRACK_CENTER_Z - TRACK_HALF_DEPTH)

      )

    },

    {

      side: 3, // left

      distance: Math.abs(

        point.x + TRACK_HALF_WIDTH

      )

    }

  ];

 

  sideDistances.sort((a, b) => a.distance - b.distance);

 

  return sideDistances.map(item => item.side);

}

 

// After the two-frame fallback on layers 1-2, inspect faces from nearest

// to farthest. On each face, inspect only that face's outermost uncleared

// same-color layer. Face proximity takes priority over layer depth.

function getAllowedFaces(orderedSides) {

  // Search all four faces in nearest-to-farthest order.

  // The opposite face is eligible too; color and line-of-sight checks

  // still prevent blocked or mismatched targets from being selected.

  // Side IDs: 0 = bottom, 1 = right, 2 = top, 3 = left.

  return orderedSides;

}

 

function findTargetAcrossFacesAtOuterLayer(shooter, orderedSides) {

  // Fallback scan checks every edge in the fixed order:

  // bottom -> right -> top -> left.

  // This outer-layer fallback includes the edge opposite the nearest edge.

  const allowedSides = orderedSides;

 

  for (const candidateSide of allowedSides) {

    const candidateLayer = getFirstUnclearedLayerByColor(

      shooter.userData.color,

      candidateSide

    );

 

    if (candidateLayer < 0) {

      continue;

    }

 

    const target = findNextTarget(

      shooter,

      candidateLayer,

      candidateSide

    );

 

    if (target) {

      return target;

    }

  }

 

  return null;

}

 

// From layer 3 onward, search all four faces face-first, not layer-first:

// 1) nearest face to farthest face;

// 2) within each face, layers outer-to-inner.

// The opposite face is eligible, but color and LOS checks still apply.

function findTargetAcrossAllFacesAndLayers(shooter, orderedSides) {

  // Search all four faces in nearest-to-farthest order.

  // Same-color and LOS checks still gate every selected target.

  const allowedSides = getAllowedFaces(orderedSides);

 

  for (const candidateSide of allowedSides) {

    for (

      let candidateLayer = 0;

      candidateLayer < perimeterLayers.length;

      candidateLayer++

    ) {

      const target = findNextTarget(

        shooter,

        candidateLayer,

        candidateSide

      );

 

      if (target) {

        return target;

      }

    }

  }

 

  return null;

}

 

// -----------------------------------------------------------------------------

// SHOOTING

// -----------------------------------------------------------------------------

 

const GLOBAL_SEARCH_START_LAYER = 2; // Layer 3 in human-readable counting.

 

function fireAtTarget(shooter, target) {

  if (!target) return false;

 

  createProjectile(shooter, target);

  playGameTone(250 + Math.random() * 70, 0.045, "square", 0.016);

  shooter.userData.ammo--;

  updateAmmoLabel(shooter);

 

  if (shooter.userData.ammo <= 0) {

    shooter.userData.exhausted = true;

    updateAmmoLabel(shooter);

    // Remove immediately when the final round is fired.

    removeShooterFromConveyor(shooter, "depleted");

  }

 

  return true;

}

 

function shootPixel(shooter, side) {

  if (shooter.userData.ammo <= 0) {

    return false;

  }

 

  const orderedSides = getShooterSidesByDistance(

    shooter.userData.pathT

  );

 

  const nearestSide = orderedSides[0];

 

  const currentLayer = getFirstUnclearedLayerByColor(

    shooter.userData.color,

    nearestSide

  );

 

  // From layer 3 onward, preserve nearest-face priority first.

  // Only after choosing a face do we scan its layers outer-to-inner.

  if (currentLayer >= GLOBAL_SEARCH_START_LAYER) {

    const expandedTarget = findTargetAcrossAllFacesAndLayers(

      shooter,

      orderedSides

    );

 

    return fireAtTarget(shooter, expandedTarget);

  }

 

  // Layers 1-2: first try only the nearest face and its outermost

  // uncleared layer. Do not jump to another face or deeper layer yet.

  if (currentLayer >= 0) {

    const strictTarget = findNextTarget(

      shooter,

      currentLayer,

      nearestSide

    );

 

    if (strictTarget) {

      return fireAtTarget(shooter, strictTarget);

    }

  }

 

  // After one failed animation frame, expand the outer-layer scan

  // in the fixed order: bottom -> right -> top -> left.

  if (shooter.userData.noTargetFrames < 1) {

    return false;

  }

 

  const fallbackTarget = findTargetAcrossFacesAtOuterLayer(

    shooter,

    [0, 1, 2, 3] // Bottom -> Right -> Top -> Left

  );

 

  return fireAtTarget(shooter, fallbackTarget);

}

 

 

// -----------------------------------------------------------------------------

// HIT FLASH

// -----------------------------------------------------------------------------

 

function createHitFlash(pixel) {

  const flashMaterial = new THREE.MeshBasicMaterial({

    color: 0xffffff,

    transparent: true,

    opacity: 0.9

  });

 

  const flash = new THREE.Mesh(

    new THREE.BoxGeometry(

      PIXEL_SIZE * 1.8,

      0.08,

      PIXEL_SIZE * 1.8

    ),

    flashMaterial

  );

 

  flash.position.copy(pixel.position);

  flash.position.y += 0.15;

 

  scene.add(flash);

 

  return {

    mesh: flash,

    elapsed: 0

  };

}

 

const hitFlashes = [];

 

function createFinalCubeBurst(position) {

  const colors = [0xffffff, 0x8fffd0, 0x65dfff, 0xffd166];

  for (let i = 0; i < 18; i++) {

    const material = new THREE.MeshBasicMaterial({ color:colors[i % colors.length], transparent:true, opacity:1 });

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.09,0.09,0.09), material);

    mesh.position.copy(position); mesh.position.y += 0.22; scene.add(mesh);

    const angle = i / 18 * Math.PI * 2, speed = 1.2 + (i % 4) * 0.28;

    victoryParticles.push({ mesh, velocity:new THREE.Vector3(Math.cos(angle)*speed,0.7+(i%3)*0.25,Math.sin(angle)*speed), elapsed:0, duration:0.65+(i%3)*0.08 });

  }

}

function createVictoryFireworkBurst(origin, colorSeed = 0) {

  const palette = [0xffd166, 0xff6b9a, 0x8fffd0, 0x65dfff, 0xffffff, 0xc6a0ff];

  const count = 36;

  for (let i = 0; i < count; i++) {

    const color = palette[(i + colorSeed) % palette.length];

    const geometry = new THREE.BoxGeometry(0.075, 0.075, 0.075);

    const material = new THREE.MeshBasicMaterial({

      color, transparent: true, opacity: 1

    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.copy(origin);

    scene.add(mesh);

 

    const y = (Math.random() * 2 - 1);

    const angle = Math.random() * Math.PI * 2;

    const horizontal = Math.sqrt(1 - y * y);

    const speed = 1.7 + Math.random() * 1.8;

    const velocity = new THREE.Vector3(

      Math.cos(angle) * horizontal * speed,

      y * speed + 0.65,

      Math.sin(angle) * horizontal * speed

    );

    victoryParticles.push({

      mesh, velocity, elapsed: 0,

      duration: 1.0 + Math.random() * 0.55

    });

  }

}

 

function triggerVictoryFireworks(elapsed) {

  const schedule = [

    { at: 0.08, x: -3.2, z: -0.2, seed: 0 },

    { at: 0.20, x: 3.1, z: -0.3, seed: 2 },

    { at: 0.32, x: -2.2, z: 2.0, seed: 4 },

    { at: 0.44, x: 2.2, z: 2.0, seed: 1 },

    { at: 0.56, x: 0.0, z: -1.0, seed: 3 },

    { at: 0.68, x: -3.4, z: 1.2, seed: 5 },

    { at: 0.80, x: 3.3, z: 1.1, seed: 1 },

    { at: 0.92, x: -1.4, z: -0.8, seed: 3 },

    { at: 1.04, x: 1.5, z: 1.8, seed: 0 },

    { at: 1.16, x: -2.8, z: -1.7, seed: 4 },

    { at: 1.28, x: 2.8, z: -1.6, seed: 2 },

    { at: 1.40, x: 0.0, z: 0.8, seed: 5 },

    { at: 1.52, x: -0.8, z: -2.0, seed: 1 }

  ];

 

  for (let i = 0; i < schedule.length; i++) {

    const cue = schedule[i];

    if (elapsed >= cue.at && !victorySequence.fireworksTriggered.includes(i)) {

      victorySequence.fireworksTriggered.push(i);

      createVictoryFireworkBurst(

        new THREE.Vector3(cue.x, 2.2 + (i % 2) * 0.45, cue.z),

        cue.seed

      );

      playGameTone(880 + i * 90, 0.11, "sine", 0.025);

    }

  }

}

 

function updateVictoryParticles(delta) {

  for (let i = victoryParticles.length - 1; i >= 0; i--) {

    const p = victoryParticles[i]; p.elapsed += delta;

    p.mesh.position.addScaledVector(p.velocity, delta); p.velocity.y -= 2.8 * delta;

    const t = Math.min(p.elapsed / p.duration, 1);

    p.mesh.material.opacity = 1 - t; p.mesh.scale.setScalar(1 - t * 0.65);

    if (t >= 1) {

      scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose();

      victoryParticles.splice(i,1);

    }

  }

}

 

let lastCubeHitSoundAt = 0;
let cubeHitSoundCombo = 0;

function playCubeHitSatisfaction() {
  const now = performance.now();
  cubeHitSoundCombo = now - lastCubeHitSoundAt < 900
    ? Math.min(cubeHitSoundCombo + 1, 8)
    : 1;
  lastCubeHitSoundAt = now;

  const notes = [523.25, 659.25, 783.99, 1046.5, 1174.66, 1318.51];
  const note = notes[(cubeHitSoundCombo - 1) % notes.length];
  playGameTone(note, 0.12, "sine", 0.024);
  if (cubeHitSoundCombo >= 2) {
    playGameTone(note * 1.5, 0.16, "triangle", 0.012);
  }

  // A quick rising chime gives a little "wow" when several gems pop in a row.
  if (cubeHitSoundCombo === 3) {
    playGameTone(783.99, 0.24, "triangle", 0.038);
    window.setTimeout(() => playGameTone(1046.5, 0.22, "sine", 0.033), 75);
    window.setTimeout(() => playGameTone(1318.51, 0.30, "sine", 0.03), 150);
  } else if (cubeHitSoundCombo === 5) {
    playGameTone(1567.98, 0.22, "sine", 0.03);
    window.setTimeout(() => playGameTone(2093, 0.3, "sine", 0.025), 85);
  }
}

function updateProjectiles(delta) {

  for (let i = projectiles.length - 1; i >= 0; i--) {

    const shot = projectiles[i];

 

    if (!shot.impacted) {

      shot.elapsed += delta;

 

      const t = Math.min(

        shot.elapsed / shot.duration,

        1

      );

 

      const eased = t * t * (3 - 2 * t);

 

      const previousPosition = shot.mesh.position.clone();

      shot.mesh.position.lerpVectors(

        shot.start,

        shot.end,

        eased

      );

 

      // Continuous water spray: emit tiny droplets along the segment travelled

      // this frame, with a strong forward component and light lateral turbulence.

      const travel = shot.mesh.position.clone().sub(previousPosition);

      const travelLength = travel.length();

      if (travelLength > 0.0001) {

        const direction = travel.clone().normalize();

        const side = new THREE.Vector3(-direction.z, 0, direction.x);

 

        // Emit by travelled distance instead of every animation frame.

        // This keeps a wide, stable gap between individual water beads.

        shot.trailDistance = (shot.trailDistance || 0) + travelLength;

        const TRAIL_DROPLET_SPACING = 0.28;

 

        if (shot.trailDistance >= TRAIL_DROPLET_SPACING) {

          const overshoot = shot.trailDistance - TRAIL_DROPLET_SPACING;

          const along = Math.max(

            0,

            Math.min(1, 1 - overshoot / Math.max(travelLength, 0.0001))

          );

          const origin = previousPosition.clone().lerp(

            shot.mesh.position,

            along

          );

 

          origin.x += (Math.random() - 0.5) * 0.095;

          origin.y += (Math.random() - 0.5) * 0.065;

          origin.z += (Math.random() - 0.5) * 0.095;

 

          const forwardSpeed = 0.42 + Math.random() * 0.48;

          const sideSpeed = (Math.random() - 0.5) * 0.95;

          const lift = (Math.random() - 0.25) * 0.38;

          const velocity = direction.clone().multiplyScalar(forwardSpeed)

            .addScaledVector(side, sideSpeed);

          velocity.y += lift;

 

          spawnWaterDroplet(

            origin,

            velocity,

            0.10 + Math.random() * 0.055,

            0.82 + Math.random() * 0.32

          );

 

          shot.trailDistance = overshoot;

        }

      }

 

      shot.glow.position.copy(shot.mesh.position);

      const glowPulse = 1 + Math.sin(shot.elapsed * 55) * 0.08;

      shot.glow.scale.set(

        0.95 * glowPulse,

        2.05 * glowPulse,

        0.95 * glowPulse

      );

 

      shot.line.geometry.setFromPoints([

        shot.mesh.position,

        shot.start

      ]);

 

      shot.lineMaterial.opacity = 0.07 * (1 - t * 0.35);

 

      if (t >= 1) {

        shot.impacted = true;

 

        shot.pixel.userData.active = false;

        shot.pixel.userData.pending = false;

        shot.pixel.visible = false;

 

        playCubeHitSatisfaction();
        hitFlashes.push(createHitFlash(shot.pixel));

 

        shot.impactLight.intensity = 2;

 

        createWaterImpact(shot.end);

        scene.remove(shot.mesh);

        scene.remove(shot.glow);

        scene.remove(shot.line);

        shot.glow.geometry.dispose();

        shot.glow.material.dispose();

 

        shot.mesh.geometry.dispose();

        shot.line.geometry.dispose();

        shot.lineMaterial.dispose();

 

        shot.impactElapsed = 0;

      }

    } else {

      shot.impactElapsed += delta;

 

      shot.impactLight.intensity = Math.max(

        0,

        2 * (1 - shot.impactElapsed / 0.12)

      );

 

      if (shot.impactElapsed >= 0.12) {

        scene.remove(shot.impactLight);

        projectiles.splice(i, 1);

      }

    }

  }

 

  for (let i = hitFlashes.length - 1; i >= 0; i--) {

    const flash = hitFlashes[i];

 

    flash.elapsed += delta;

 

    const t = Math.min(flash.elapsed / 0.18, 1);

    const scale = 1 + t * 1.5;

 

    flash.mesh.scale.set(scale, 1, scale);

    flash.mesh.material.opacity = 1 - t;

 

    if (t >= 1) {

      scene.remove(flash.mesh);

 

      flash.mesh.geometry.dispose();

      flash.mesh.material.dispose();

 

      hitFlashes.splice(i, 1);

    }

  }

}

 

// -----------------------------------------------------------------------------

// SHOOTER MOVEMENT AND ONE-LAP LIFECYCLE

// -----------------------------------------------------------------------------

 

function getShooterSide(pathT) {

  const point = conveyorPath.getPointAt(pathT);

 

  const distances = [

    Math.abs(

      point.z - (TRACK_CENTER_Z + TRACK_HALF_DEPTH)

    ),

 

    Math.abs(

      point.x - TRACK_HALF_WIDTH

    ),

 

    Math.abs(

      point.z - (TRACK_CENTER_Z - TRACK_HALF_DEPTH)

    ),

 

    Math.abs(

      point.x + TRACK_HALF_WIDTH

    )

  ];

 

  let nearestSide = 0;

 

  for (let side = 1; side < distances.length; side++) {

    if (distances[side] < distances[nearestSide]) {

      nearestSide = side;

    }

  }

 

  return nearestSide;

}

 

function updateShooting(delta) {

  for (let shooterIndex = activeConveyor.length - 1; shooterIndex >= 0; shooterIndex--) {

    const shooter = activeConveyor[shooterIndex];

    if (shooter.userData.exhausted) {

      continue;

    }

 

    // Count actual animation frames only after a target search has failed.

    // The first failed attempt arms the counter; the next two frames trigger

    // the expanded face search.

    if (shooter.userData.targetSearchFailed) {

      shooter.userData.noTargetFrames += 1;

    }

 

    shooter.userData.fireCooldown -= delta;

 

    if (shooter.userData.fireCooldown > 0) {

      continue;

    }

 

    const side = getShooterSide(

      shooter.userData.pathT

    );

 

    const fired = shootPixel(shooter, side);

 

    if (fired) {

      shooter.userData.noTargetFrames = 0;

      shooter.userData.targetSearchFailed = false;

      shooter.userData.noTargetTime = 0;

      shooter.userData.depthBoostMultiplier =

        shooter.userData.depthBoostUnlocked ? 4 : 1;

    } else {

      shooter.userData.targetSearchFailed = true;

    }

 

    shooter.userData.fireCooldown = fired

      ? CONFIG.shotCooldown

      : 0.08;

  }

}

 

 

function removeShooterFromConveyor(shooter, finalState) {

  const index = activeConveyor.indexOf(shooter);

 

  if (index !== -1) {

    activeConveyor.splice(index, 1);

  }

 

  shooter.userData.state = finalState;

  shooter.userData.tween = null;

  shooterGroup.remove(shooter);

 

  // Removing a shooter opens a conveyor slot for the next queued shooter.

  tryLaunchWaiting();

}

 

function removeExhaustedShooters() {

  for (const shooter of activeConveyor) {

    if (shooter.userData.exhausted && !shooter.userData.emptyStatusLabel) {

      shooter.userData.emptyStatusLabel = createEmptyStatusLabel();

      shooter.add(shooter.userData.emptyStatusLabel);

      shooter.userData.state = "exhaustedOnConveyor";

    }

  }

}

 

function updateConveyor(delta) {

  // A shooter is removed at the marked lower-left bend after one lap.

  // It never wraps around for a second lap.

  for (let i = activeConveyor.length - 1; i >= 0; i--) {

    const shooter = activeConveyor[i];

 

    shooter.userData.pathT += CONVEYOR_SPEED * delta;

 

    if (shooter.userData.pathT >= SHOOTER_EXIT_PATH_T) {

      shooter.userData.pathT = SHOOTER_EXIT_PATH_T;

      // Stop at the marked lower-left bend rather than the path seam.

      const exitPoint = conveyorPath.getPointAt(SHOOTER_EXIT_PATH_T);

 

      shooter.position.set(

        exitPoint.x,

        0.3,

        exitPoint.z

      );

 

      removeShooterFromConveyor(shooter, "completedLap");

      continue;

    }

 

    const t = shooter.userData.pathT;

    const point = conveyorPath.getPointAt(t);

 

    shooter.position.set(

      point.x,

      0.3,

      point.z

    );

 

    // The final curve has evenly redistributed control points. Its arc-length

    // tangent is stable through the rounded corners and avoids corner-join flips.

    const direction = conveyorPath.getTangentAt(t).normalize();

    const targetYaw = Math.atan2(direction.x, direction.z);

 

    if (shooter.userData.pathYaw === null ||

        !Number.isFinite(shooter.userData.pathYaw)) {

      shooter.userData.pathYaw = targetYaw;

    } else {

      // Smooth the shortest angular distance to prevent 180-degree snap-backs.

      const angleDelta = Math.atan2(

        Math.sin(targetYaw - shooter.userData.pathYaw),

        Math.cos(targetYaw - shooter.userData.pathYaw)

      );

      const turnBlend = 1 - Math.exp(-delta * 10);

      shooter.userData.pathYaw += angleDelta * turnBlend;

    }

    shooter.rotation.y = shooter.userData.pathYaw;

 

    // Fish artwork faces inward toward the cube grid on every conveyor edge; add 180 degrees because the GLB's forward axis is opposite to the assumed +Z.

    // The root keeps its path-facing yaw; the visual child applies the

    // compensating local yaw so the fish's local +Z face points at the grid.

    const characterVisual = shooter.userData.characterVisual;

    if (characterVisual?.userData.fishModelAttached) {

      const toGridX = -shooter.position.x;

      const toGridZ = GRID_CENTER_Z - shooter.position.z;

      const inwardWorldYaw = Math.atan2(toGridX, toGridZ);

 

      // Give fish a small temporary yaw bias as they enter the conveyor at

      // the lower-left start corner. This helps cover the marked bottom-left

      // cube pocket that the normal center-facing angle can leave behind.

      // The bias fades smoothly to zero, after which the original inward-facing

      // rotation rule is used unchanged for the rest of the conveyor lap.

      const FISH_ENTRY_AIM_BIAS_DEG = 22;

      const FISH_ENTRY_AIM_BIAS_END_T = 0.075;

      const entryProgress = THREE.MathUtils.clamp(

        t / FISH_ENTRY_AIM_BIAS_END_T,

        0,

        1

      );

      const smoothEntryProgress =

        entryProgress * entryProgress * (3 - 2 * entryProgress);

      const entryAimBias = THREE.MathUtils.degToRad(

        FISH_ENTRY_AIM_BIAS_DEG * (1 - smoothEntryProgress)

      );

 

      characterVisual.rotation.y =

        inwardWorldYaw + entryAimBias - shooter.rotation.y + Math.PI;

    }

  }

}

 

// -----------------------------------------------------------------------------

// POINTER INPUT

// -----------------------------------------------------------------------------

 

let gameAudioContext = null;

let gameAudioUnlockBound = false;

 

function unlockGameAudio() {

  try {

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!gameAudioContext) gameAudioContext = new AudioContextClass();

    if (gameAudioContext.state === "suspended") {

      gameAudioContext.resume().catch(() => {});

    }

  } catch (error) {

    // Audio is optional; never interrupt gameplay.

  }

}

 

// Browsers require audio to be unlocked from a real user gesture.

// Bind early so both WIN and LOSE sounds can play when the result is reached.

if (!gameAudioUnlockBound) {

  gameAudioUnlockBound = true;

  window.addEventListener("pointerdown", unlockGameAudio, { capture: true });

  window.addEventListener("keydown", unlockGameAudio, { capture: true });

}

 

function playGameTone(frequency = 520, duration = 0.09, type = "sine", volume = 0.04, when = null) {

  try {

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!gameAudioContext) gameAudioContext = new AudioContextClass();

 

    const scheduleTone = () => {

      if (!gameAudioContext || gameAudioContext.state !== "running") return;

      const oscillator = gameAudioContext.createOscillator();

      const gain = gameAudioContext.createGain();

      const startAt = Number.isFinite(when)
        ? Math.max(gameAudioContext.currentTime + 0.005, when)
        : gameAudioContext.currentTime + 0.015;

      oscillator.type = type;

      oscillator.frequency.setValueAtTime(frequency, startAt);

      gain.gain.setValueAtTime(volume, startAt);

      gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

      oscillator.connect(gain);

      gain.connect(gameAudioContext.destination);

      oscillator.start(startAt);

      oscillator.stop(startAt + duration);

    };

 

    if (gameAudioContext.state === "suspended") {

      gameAudioContext.resume().then(scheduleTone).catch(() => {});

    } else {

      scheduleTone();

    }

  } catch (error) {

    // Optional audio must never interrupt gameplay.

  }

}

 

 

// -----------------------------------------------------------------------------

// TROPICAL BACKGROUND AUDIO

// -----------------------------------------------------------------------------

 

let backgroundMusicActive = false;
let oceanWavesSource = null;
let oceanWavesGain = null;
let oceanWavesLfo = null;
let tropicalMusicSource = null;
let tropicalMusicGainNode = null;
let tropicalLoopResetPending = false;
const TROPICAL_LOOP_START = 0.02;
const TROPICAL_LOOP_END = 4.35;
const TROPICAL_MUSIC_VOLUME = 0.025;
const tropicalBackgroundMusic = new Audio("/jonasblakewood-tropical-tropical.mp3");
tropicalBackgroundMusic.loop = true;
tropicalBackgroundMusic.preload = "auto";
tropicalBackgroundMusic.volume = TROPICAL_MUSIC_VOLUME;

function connectTropicalMusic() {
  if (!gameAudioContext || tropicalMusicSource) return;
  try {
    tropicalMusicSource = gameAudioContext.createMediaElementSource(tropicalBackgroundMusic);
    const reduceDrumLowEnd = gameAudioContext.createBiquadFilter();
    const softenMusic = gameAudioContext.createBiquadFilter();
    const tamePercussion = gameAudioContext.createDynamicsCompressor();
    tropicalMusicGainNode = gameAudioContext.createGain();
    reduceDrumLowEnd.type = "highpass";
    reduceDrumLowEnd.frequency.value = 165;
    reduceDrumLowEnd.Q.value = 0.55;
    softenMusic.type = "lowpass";
    softenMusic.frequency.value = 3400;
    softenMusic.Q.value = 0.45;
    tamePercussion.threshold.value = -32;
    tamePercussion.knee.value = 18;
    tamePercussion.ratio.value = 5;
    tamePercussion.attack.value = 0.012;
    tamePercussion.release.value = 0.2;
    tropicalMusicGainNode.gain.value = TROPICAL_MUSIC_VOLUME;
    tropicalMusicSource.connect(reduceDrumLowEnd);
    reduceDrumLowEnd.connect(softenMusic);
    softenMusic.connect(tamePercussion);
    tamePercussion.connect(tropicalMusicGainNode);
    tropicalMusicGainNode.connect(gameAudioContext.destination);
    tropicalBackgroundMusic.volume = 1;
  } catch (error) {
    tropicalMusicSource = null;
    tropicalBackgroundMusic.volume = TROPICAL_MUSIC_VOLUME;
  }
}

tropicalBackgroundMusic.addEventListener("timeupdate", () => {
  if (!backgroundMusicActive || tropicalLoopResetPending || tropicalBackgroundMusic.currentTime < TROPICAL_LOOP_END) return;
  // Skip the short quiet tail in the sample so the loop doesn't pause on its beat.
  tropicalLoopResetPending = true;
  tropicalBackgroundMusic.currentTime = TROPICAL_LOOP_START;
  tropicalLoopResetPending = false;
});

function startOceanWaves() {
  if (!gameAudioContext || oceanWavesSource || gameAudioContext.state !== "running") return;
  const sampleCount = gameAudioContext.sampleRate * 4;
  const buffer = gameAudioContext.createBuffer(1, sampleCount, gameAudioContext.sampleRate);
  const samples = buffer.getChannelData(0);
  let smoothedNoise = 0;
  for (let i = 0; i < sampleCount; i += 1) {
    smoothedNoise = smoothedNoise * 0.94 + (Math.random() * 2 - 1) * 0.06;
    samples[i] = smoothedNoise * 2;
  }
  const filter = gameAudioContext.createBiquadFilter();
  oceanWavesGain = gameAudioContext.createGain();
  oceanWavesSource = gameAudioContext.createBufferSource();
  oceanWavesLfo = gameAudioContext.createOscillator();
  const lfoDepth = gameAudioContext.createGain();
  filter.type = "lowpass";
  filter.frequency.value = 680;
  oceanWavesGain.gain.setValueAtTime(0.012, gameAudioContext.currentTime);
  lfoDepth.gain.value = 0.004;
  oceanWavesSource.buffer = buffer;
  oceanWavesSource.loop = true;
  oceanWavesLfo.type = "sine";
  oceanWavesLfo.frequency.value = 0.06;
  oceanWavesSource.connect(filter);
  filter.connect(oceanWavesGain);
  oceanWavesGain.connect(gameAudioContext.destination);
  oceanWavesLfo.connect(lfoDepth);
  lfoDepth.connect(oceanWavesGain.gain);
  oceanWavesSource.start();
  oceanWavesLfo.start();
}

function stopOceanWaves() {
  if (!oceanWavesSource || !gameAudioContext) return;
  const source = oceanWavesSource;
  const lfo = oceanWavesLfo;
  const gain = oceanWavesGain;
  oceanWavesSource = null;
  oceanWavesLfo = null;
  oceanWavesGain = null;
  const now = gameAudioContext.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setTargetAtTime(0.0001, now, 0.18);
  window.setTimeout(() => {
    try { source.stop(); lfo.stop(); } catch (error) { /* already stopped */ }
    source.disconnect();
    lfo.disconnect();
    gain.disconnect();
  }, 1000);
}

function startBackgroundMusic() {

  if (backgroundMusicActive) return;

  unlockGameAudio();

  connectTropicalMusic();

  backgroundMusicActive = true;

  tropicalBackgroundMusic.currentTime = 0;
  tropicalLoopResetPending = false;
  if (tropicalMusicGainNode && gameAudioContext?.state === "running") {
    tropicalMusicGainNode.gain.cancelScheduledValues(gameAudioContext.currentTime);
    tropicalMusicGainNode.gain.setValueAtTime(TROPICAL_MUSIC_VOLUME, gameAudioContext.currentTime);
  }
  tropicalBackgroundMusic.play().catch(() => {});

  if (gameAudioContext?.state === "running") {
    startOceanWaves();
  } else {
    gameAudioContext?.resume().then(() => {
      if (backgroundMusicActive) startOceanWaves();
    }).catch(() => {});
  }

}

 

function stopBackgroundMusic() {

  backgroundMusicActive = false;

  tropicalBackgroundMusic.pause();
  tropicalBackgroundMusic.currentTime = 0;
  stopOceanWaves();

}

 

const raycaster = new THREE.Raycaster();

const pointer = new THREE.Vector2();

let hoveredShooter = null;

function updateHoveredShooter(event) {
  if (gameStatus !== "ready" && gameStatus !== "playing") return;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(shooterGroup.children, true);
  let nextHoveredShooter = null;

  for (const hit of intersections) {
    let object = hit.object;
    while (object && !nextHoveredShooter) {
      nextHoveredShooter = object.userData?.shooterGroup ?? null;
      object = object.parent;
    }
    if (nextHoveredShooter) break;
  }

  if (nextHoveredShooter?.userData.state !== "rack") {
    nextHoveredShooter = null;
  }

  if (hoveredShooter && hoveredShooter !== nextHoveredShooter) {
    hoveredShooter.userData.isHovered = false;
  }
  hoveredShooter = nextHoveredShooter;
  if (hoveredShooter) hoveredShooter.userData.isHovered = true;
  renderer.domElement.style.cursor = hoveredShooter ? 'url("/cursor-game.png") 8 6, auto' : "";
}

renderer.domElement.addEventListener("pointermove", updateHoveredShooter);
renderer.domElement.addEventListener("pointerleave", () => {
  if (hoveredShooter) hoveredShooter.userData.isHovered = false;
  hoveredShooter = null;
  renderer.domElement.style.cursor = "";
});

 

function handlePointer(event) {

  if (gameStatus !== "ready" && gameStatus !== "playing") return;

 

  const rect = renderer.domElement.getBoundingClientRect();

 

  pointer.x =

    ((event.clientX - rect.left) / rect.width) * 2 - 1;

 

  pointer.y =

    -((event.clientY - rect.top) / rect.height) * 2 + 1;

 

  raycaster.setFromCamera(pointer, camera);

 

  const intersections = raycaster.intersectObjects(

    shooterGroup.children,

    true

  );

 

  if (intersections.length === 0) {

    return;

  }

 

  let shooter = null;

 

  // Walk up the hierarchy so clicks on nested GLB meshes still resolve to

  // their owning shooter, even if a future model node is not directly tagged.

  for (const hit of intersections) {

    let object = hit.object;

 

    while (object && !shooter) {

      shooter = object.userData?.shooterGroup ?? null;

      object = object.parent;

    }

 

    if (shooter) break;

  }

 

  if (shooter) {

    selectShooter(shooter);

  }

}

 

renderer.domElement.addEventListener(

  "pointerdown",

  handlePointer

);

 

// -----------------------------------------------------------------------------

// MAIN ANIMATION LOOP

// -----------------------------------------------------------------------------

 

const clock = new THREE.Clock();

 

function updateShooterIdleMotion(delta) {

  for (const shooter of shooters) {

    const state = shooter.userData.state;

    const ring = shooter.userData.selectionRing;

    if ((state === "waiting" || state === "rack") && !shooter.userData.tween) {

      shooter.userData.wiggleTime += delta;

      const t = shooter.userData.wiggleTime * (state === "rack" ? 5.6 : 5.0) +

        shooter.userData.wigglePhase;

      const motionStrength = state === "rack" ? 1.0 : 0.82;

      const baseY = state === "rack" ? 0.12 : 0.25;

 

      // Rack shooters now have a clearly visible idle animation too.

      shooter.rotation.z = Math.sin(t) * 0.17 * motionStrength;

      shooter.rotation.y = Math.sin(t * 0.78) * 0.13 * motionStrength;

      shooter.rotation.x = Math.cos(t * 0.62) * 0.065 * motionStrength;

      shooter.position.y = baseY + Math.abs(Math.sin(t * 1.45)) *

        (state === "rack" ? 0.15 : 0.12);

      const pulse = 1 + Math.sin(t * 1.1) * 0.045 * motionStrength;

      const hoverScale = shooter.userData.isHovered
        ? 1.12
        : shooter.userData.isGuideHighlighted ? 1.34 : 1;
      shooter.scale.setScalar(pulse * hoverScale);

    } else if (state !== "waiting" && state !== "rack") {

      shooter.rotation.z *= 0.78;

      shooter.rotation.y *= 0.78;

      shooter.rotation.x *= 0.78;

      shooter.scale.lerp(new THREE.Vector3(1, 1, 1), 0.22);

    } else if (shooter.userData.tween) {

      // Keep tweened slot/rack repositioning authoritative while moving.

      shooter.rotation.z *= 0.88;

      shooter.rotation.y *= 0.88;

      shooter.rotation.x *= 0.88;

      shooter.scale.lerp(new THREE.Vector3(1, 1, 1), 0.18);

    }

    if (shooter.userData.selectedPulse > 0) {

      shooter.userData.selectedPulse = Math.max(0, shooter.userData.selectedPulse - delta);

      ring.visible = true;

      ring.scale.setScalar(
        0.45 + (0.58 - shooter.userData.selectedPulse) * 1.55
      );

      ring.material.opacity = Math.min(
        1,
        0.25 + shooter.userData.selectedPulse * 1.25
      );

    } else if (state === "rack" && shooter.userData.isGuideHighlighted) {
      ring.visible = true;
      ring.material.opacity = 0.72 + 0.24 * Math.sin(performance.now() * 0.006);
      ring.scale.setScalar(1.0 + 0.16 * Math.sin(performance.now() * 0.006));

    } else if (state !== "waiting") {

      ring.visible = false;

    } else {

      ring.visible = true;

      ring.material.opacity = 0.34 + 0.16 * Math.sin(performance.now() * 0.004);

      ring.scale.setScalar(1);

    }

  }

}

 

let nextShadowRefresh = 0;

function refreshSceneShadowFlags() {
  scene.traverse((object) => {
    if (!object.isMesh || object === floor || object === backgroundPlane || object === timerBoardShadow) return;
    let ancestor = object;
    while (ancestor && ancestor !== timerBoardContent) ancestor = ancestor.parent;
    if (timerBoardContent && ancestor === timerBoardContent) {
      object.castShadow = false;
      object.receiveShadow = false;
      return;
    }
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const isSolidLitMesh = materials.some((material) =>
      material && !material.transparent && !material.isMeshBasicMaterial && !material.isShaderMaterial
    );
    if (isSolidLitMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
}

function animate() {

  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  updateConveyorArrows(delta);

  for (const mixer of shooterAnimationMixers) mixer.update(delta);

  updateShooterIdleMotion(delta);

  updateWaterVfx(delta);
  updateBackgroundOceanRipples(delta);

  updateWaitingWaterAnimation(delta);
  updateGemSparkles(delta);
  updateChooseFishHintPosition();

  if (clock.elapsedTime >= nextShadowRefresh) {
    refreshSceneShadowFlags();
    nextShadowRefresh = clock.elapsedTime + 1;
  }

 

  if (gameStatus === "playing") {

    updateTweens(delta);

    updateConveyor(delta);

    tryLaunchWaiting();

    updateShooting(delta);

    for (const shooter of activeConveyor) {

      updateLowAmmoGlow(shooter, delta);

      updateFishLowAmmoDesaturation(shooter, delta);

    }

    updateProjectiles(delta);

    updateVictoryParticles(delta);

    checkWinCondition();

    updateGameTimer(delta);

  } else if (gameStatus === "victorySequence") {

    const scale = updateVictorySequence(delta);

    if (scale > 0) {

      const slowDelta = delta * scale;

      updateTweens(slowDelta);

      updateConveyor(slowDelta);

      updateProjectiles(slowDelta);

      updateVictoryParticles(slowDelta);

    } else {

      updateVictoryParticles(delta);

    }

  } else {

    updateVictoryParticles(delta);

  }

  updateConveyorCounter();

  renderer.render(scene, camera);

}

 

animate();

 

// -----------------------------------------------------------------------------

// RESPONSIVE RESIZE

// -----------------------------------------------------------------------------

 

function resize() {

  const width = Math.max(1, window.innerWidth);

  const height = Math.max(1, window.innerHeight);

  const aspect = width / height;

  // Keep the orthographic view centered and preserve proportions. On narrow phones,

  // expand the vertical view enough to fit the full game width, including the rack.

  const requiredHalfWorldWidth = 6.7;

  const halfHeight = Math.max(CONFIG.viewHeight / 2, requiredHalfWorldWidth / aspect);

  const halfWidth = halfHeight * aspect;

 

  camera.left = -halfWidth;

  camera.right = halfWidth;

  camera.top = halfHeight;

  camera.bottom = -halfHeight;

  camera.updateProjectionMatrix();
  positionTimerBoard();
  const panoramicTimerOffset = aspect > 2.6 ? 60 : 0;
  const landscapeTimerOffset = aspect > 1.5 && aspect <= 2.6 ? 6 : 0;
  const mediumTimerOffset = width > 600 && aspect <= 1.5 ? 8 : 0;
  timerElement.style.top = `${Math.max(8, height * 0.064 - 15 + panoramicTimerOffset + landscapeTimerOffset + mediumTimerOffset)}px`;

  // Keep the background plane aligned to the camera viewport on every resize.
  backgroundPlane.scale.set((camera.right - camera.left) / 2, (camera.top - camera.bottom) / 2, 1);
  backgroundPlane.position.copy(camera.position).add(
    camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(50)
  );
  backgroundPlane.quaternion.copy(camera.quaternion);
  backgroundTexture.repeat.set(1, 1);
  backgroundTexture.offset.set(0, 0);
  if (aspect < backgroundImageAspect) {
    const visibleWidth = aspect / backgroundImageAspect;
    backgroundTexture.repeat.x = visibleWidth;
    backgroundTexture.offset.x = (1 - visibleWidth) / 2;
  } else {
    const visibleHeight = backgroundImageAspect / aspect;
    backgroundTexture.repeat.y = visibleHeight;
    backgroundTexture.offset.y = (1 - visibleHeight) / 2;
  }

 

  // Lower pixel ratio on mobile to reduce GPU load.

  const mobileViewport = width <= 768 || height <= 600;

  renderer.setPixelRatio(Math.min(

    window.devicePixelRatio || 1,

    mobileViewport ? 1.25 : 1.5

  ));

  // Update both the WebGL drawing buffer and the canvas CSS dimensions.

  // Keeping these in sync prevents horizontal/vertical stretching when the

  // browser window or mobile viewport changes size.

  renderer.setSize(width, height, true);

  renderer.domElement.style.display = "block";

  renderer.domElement.style.width = `${width}px`;

  renderer.domElement.style.height = `${height}px`;

  updateConveyorCounter();

} 

window.addEventListener("resize", resize);

 

resize();

if (new URLSearchParams(window.location.search).has("exportScene")) {
  const exportButton = document.createElement("button");
  exportButton.id = "export-scene-button";
  exportButton.textContent = "Export scene + camera (.glb)";
  Object.assign(exportButton.style, {
    position: "fixed",
    right: "16px",
    top: "16px",
    zIndex: "100",
    padding: "10px 14px",
    border: "1px solid rgba(255,255,255,.7)",
    borderRadius: "8px",
    background: "#252a45",
    color: "white",
    font: "600 14px Arial, sans-serif",
    cursor: 'url("/cursor-game.png") 8 6, auto'
  });
  exportButton.addEventListener("click", () => {
    const savedUserData = [];
    scene.traverse((object) => {
      savedUserData.push([object, object.userData]);
      object.userData = {};
    });
    let exportRoot;
    try {
      exportRoot = cloneSkinnedModel(scene);
    } finally {
      for (const [object, userData] of savedUserData) {
        object.userData = userData;
      }
    }
    const exportCamera = camera.clone();
    exportCamera.name = "Render Camera";
    const exportAspect = 708 / 881;
    const exportHalfHeight = Math.max(
      CONFIG.viewHeight / 2,
      6.7 / exportAspect
    );
    const exportHalfWidth = exportHalfHeight * exportAspect;
    exportCamera.left = -exportHalfWidth;
    exportCamera.right = exportHalfWidth;
    exportCamera.top = exportHalfHeight;
    exportCamera.bottom = -exportHalfHeight;
    exportCamera.updateProjectionMatrix();
    exportRoot.add(exportCamera);
    exportRoot.updateMatrixWorld(true);

    exportButton.disabled = true;
    exportButton.textContent = "Exporting…";
    new GLTFExporter().parse(
      exportRoot,
      (result) => {
        const blob = new Blob([result], { type: "model/gltf-binary" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "fish-fortune-background.glb";
        link.click();
        URL.revokeObjectURL(url);
        exportButton.textContent = "Exported";
      },
      (error) => {
        console.error("Scene export failed:", error);
        exportButton.disabled = false;
        exportButton.textContent = "Export failed";
      },
      { binary: true, onlyVisible: true }
    );
  });
  document.body.appendChild(exportButton);
}

