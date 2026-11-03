// A v3.7.7 – Game Feel Polish, Victory Sequence, Feedback and Profiling
// Based on A v2.27.2 – Wider Center Search + Four-Face Targeting
import * as THREE from "three";
 
const CONFIG = {
  viewHeight: 25,
  rows: 13,
  columns: 13,
  subdivisions: 2,
  pixelSize: 0.226,
  pixelGap: 0.025,
  pixelHeight: 0.18,
  gridCenterZ: -1.3,
  trackHalfWidth: 5,
  trackHalfDepth: 5,
  trackRadius: 0.85,
  slotCount: 5,
  slotWidth: 1.3,
  slotDepth: 1.05,
  slotGap: 0.2,
  slotZ: 6.2,
  characterColumns: 4,
  characterRows: 4,
  characterStartZ: 8.5,
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
scene.background = new THREE.Color(0x4a4d6b);
 
const camera = new THREE.OrthographicCamera(
  -7,
  7,
  CONFIG.viewHeight / 2,
  -CONFIG.viewHeight / 2,
  0.1,
  100
);
 
camera.position.set(0, 45, 9);
camera.up.set(0, 0, -1);
camera.lookAt(0, 0, 3.2);
 
const renderer = new THREE.WebGLRenderer({
  antialias: true
});
 
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
 
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.width = "100vw";
document.body.style.height = "100vh";
document.body.style.overflow = "hidden";
document.body.style.background = "#4a4d6b";
 
document.body.appendChild(renderer.domElement);
 
// -----------------------------------------------------------------------------
// GAME UI: TIMER, CONVEYOR COUNTER AND END-GAME OVERLAY
// -----------------------------------------------------------------------------
 
const gameUIStyle = document.createElement("style");
 
gameUIStyle.textContent = `  body, canvas {
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Cpath d='M5 3 L5 27 L12 20 L17 32 L22 30 L17 18 L28 18 Z' fill='%2355eaff' stroke='%23151b2c' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E") 5 3, pointer;
  }
 
  #game-timer {
    position: fixed;
    top: 22px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    min-width: 112px;
    padding: 9px 20px;
    border: 2px solid rgba(255,255,255,.7);
    border-radius: 14px;
    background: rgba(28,32,54,.82);
    color: #fff;
    font: 700 30px/1 Arial,sans-serif;
    letter-spacing: 2px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    pointer-events: none;
    box-shadow: 0 4px 16px rgba(0,0,0,.22);
  }
 
  #conveyor-counter {
    position: fixed;
    z-index: 11;
    min-width: 58px;
    padding: 5px 10px;
    border: 2px solid rgba(255,255,255,.85);
    border-radius: 9px;
    background: rgba(28,32,54,.9);
    color: #fff;
    font: 800 22px/1 Arial,sans-serif;
    letter-spacing: .5px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    pointer-events: none;
    box-shadow: 0 3px 12px rgba(0,0,0,.25);
    transform: translate(-110%, 8px);
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
    min-width: 230px;
    padding: 28px 42px;
    border: 3px solid rgba(255,255,255,.85);
    border-radius: 22px;
    background: rgba(35,40,67,.96);
    color: #fff;
    text-align: center;
    font-family: Arial,sans-serif;
    box-shadow: 0 12px 36px rgba(0,0,0,.3);
  }
 
  #game-end-title {
    margin: 0;
    font-size: clamp(38px,9vw,64px);
    line-height: 1;
    font-weight: 900;
    letter-spacing: 2px;
  }
 
  #game-end-subtitle {
    margin: 12px 0 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 1px;
  }
 
  #game-replay-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 132px;
    min-height: 44px;
    margin-top: 22px;
    padding: 10px 24px;
    border: 0;
    border-radius: 999px;
    background: linear-gradient(135deg, #55e6b0, #28b8e8);
    color: #102333;
    font: 800 14px/1 Arial, sans-serif;
    letter-spacing: 1.5px;
    cursor: pointer;
    pointer-events: auto;
    box-shadow: 0 5px 18px rgba(45, 210, 190, .28);
    transition: transform .15s ease, filter .15s ease;
  }
  #game-replay-button:hover { filter: brightness(1.12); transform: translateY(-2px); }
  #game-replay-button:active { transform: translateY(1px) scale(.98); }
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
 
  #game-timer.warning { color:#ff7777; border-color:#ff7777; box-shadow:0 0 18px rgba(255,90,90,.55); animation:timer-warning .7s ease-in-out infinite alternate; }
  @keyframes timer-warning { from { transform:translateX(-50%) scale(1); } to { transform:translateX(-50%) scale(1.07); } }
  #game-end-overlay.show { animation:overlay-in .45s ease-out both; }
  #game-end-panel.win { animation:win-panel-in .55s cubic-bezier(.2,.85,.25,1.2) both; }
  @keyframes overlay-in { from { opacity:0; } to { opacity:1; } }
  @keyframes win-panel-in { from { opacity:0; transform:scale(.72); } to { opacity:1; transform:scale(1); } }
  #performance-hud { position:fixed; right:10px; bottom:10px; z-index:30; padding:6px 8px; border:1px solid rgba(255,255,255,.25); border-radius:7px; background:rgba(18,22,38,.72); color:rgba(255,255,255,.8); font:10px/1.45 monospace; pointer-events:none; white-space:pre; }
  @media (max-width:480px) {
    #game-timer {
      top: 12px;
      padding: 7px 16px;
      font-size: 25px;
    }
 
    #game-end-panel {
      min-width: 190px;
      padding: 24px 28px;
    }
  }
 
  canvas {
    display: block;
    width: 100vw;
    height: 100vh;
    touch-action: manipulation;
  }
 
  @media (max-width:600px) {
    #game-timer {
      top: max(8px, env(safe-area-inset-top));
      min-width: 96px;
      padding: 6px 12px;
      border-radius: 12px;
      font-size: clamp(20px, 5.5vw, 25px);
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
      padding: 20px 18px;
      border-radius: 18px;
    }
    #game-end-title { font-size: clamp(34px, 10vw, 54px); }
    #game-end-subtitle {
      font-size: clamp(11px, 3vw, 14px);
      line-height: 1.35;
    }
  }
 
  @media (max-height:620px) and (orientation:landscape) {
    #game-timer { top: 6px; padding: 5px 12px; font-size: 20px; }
    #game-end-panel { padding: 14px 22px; }
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
 
scene.add(new THREE.AmbientLight(0xffffff, 1.6));
 
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(-5, 18, 10);
sun.castShadow = true;
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
  materials.floor
);
 
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.2;
scene.add(floor);
 
// -----------------------------------------------------------------------------
// GRID
// -----------------------------------------------------------------------------
 
const ROWS = CONFIG.rows * CONFIG.subdivisions;
const COLUMNS = CONFIG.columns * CONFIG.subdivisions;
 
const PIXEL_SIZE = CONFIG.pixelSize;
const PIXEL_GAP = CONFIG.pixelGap;
 
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
 
    const pixel = new THREE.Mesh(
      pixelGeometry,
      isWhite ? materials.white : materials.black
    );
 
    pixel.position.x =
      -GRID_WIDTH / 2 +
      PIXEL_SIZE / 2 +
      column * (PIXEL_SIZE + PIXEL_GAP);
 
    pixel.position.y = 0.12;
 
    pixel.position.z =
      GRID_CENTER_Z -
      GRID_DEPTH / 2 +
      PIXEL_SIZE / 2 +
      row * (PIXEL_SIZE + PIXEL_GAP);
 
    pixel.castShadow = true;
    pixel.receiveShadow = true;
 
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
 
function createRoundedPath() {
  const points = [];
 
  function addPoint(x, z) {
    points.push(
      new THREE.Vector3(x, 0.05, TRACK_CENTER_Z + z)
    );
  }
 
  function addArc(cx, cz, startAngle, endAngle) {
    const steps = 20;
 
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
 
      const angle =
        startAngle + (endAngle - startAngle) * t;
 
      addPoint(
        cx + TRACK_RADIUS * Math.cos(angle),
        cz + TRACK_RADIUS * Math.sin(angle)
      );
    }
  }
 
  addPoint(
    -TRACK_HALF_WIDTH + TRACK_RADIUS,
    TRACK_HALF_DEPTH
  );
 
  addPoint(
    TRACK_HALF_WIDTH - TRACK_RADIUS,
    TRACK_HALF_DEPTH
  );
 
  addArc(
    TRACK_HALF_WIDTH - TRACK_RADIUS,
    TRACK_HALF_DEPTH - TRACK_RADIUS,
    Math.PI / 2,
    0
  );
 
  addPoint(
    TRACK_HALF_WIDTH,
    -TRACK_HALF_DEPTH + TRACK_RADIUS
  );
 
  addArc(
    TRACK_HALF_WIDTH - TRACK_RADIUS,
    -TRACK_HALF_DEPTH + TRACK_RADIUS,
    0,
    -Math.PI / 2
  );
 
  addPoint(
    -TRACK_HALF_WIDTH + TRACK_RADIUS,
    -TRACK_HALF_DEPTH
  );
 
  addArc(
    -TRACK_HALF_WIDTH + TRACK_RADIUS,
    -TRACK_HALF_DEPTH + TRACK_RADIUS,
    -Math.PI / 2,
    -Math.PI
  );
 
  addPoint(
    -TRACK_HALF_WIDTH,
    TRACK_HALF_DEPTH - TRACK_RADIUS
  );
 
  addArc(
    -TRACK_HALF_WIDTH + TRACK_RADIUS,
    TRACK_HALF_DEPTH - TRACK_RADIUS,
    Math.PI,
    Math.PI / 2
  );
 
  points.pop();
 
  // Build the original rounded-rectangle spline, then redistribute its
  // control vertices by equal arc-length intervals. The hand-authored points
  // above are denser on the corners than on the straight sections; using them
  // directly gives the spline uneven control-point spacing and can cause
  // visible heading changes as shooters pass corner joins.
  const sourceCurve = new THREE.CatmullRomCurve3(
    points,
    true,
    "centripetal"
  );
  sourceCurve.arcLengthDivisions = 2400;
 
  // getSpacedPoints samples by travelled distance, not by the original
  // control-point index. Rebuild the final closed spline from these evenly
  // distributed points so the conveyor motion has a more uniform path basis.
  const evenlySpacedPoints = sourceCurve.getSpacedPoints(480);
  evenlySpacedPoints.pop(); // Closed CatmullRomCurve3 supplies a duplicate seam point.
 
  const uniformCurve = new THREE.CatmullRomCurve3(
    evenlySpacedPoints,
    true,
    "centripetal"
  );
  uniformCurve.arcLengthDivisions = 4800;
  uniformCurve.updateArcLengths();
  return uniformCurve;
}
 
const conveyorPath = createRoundedPath();
 
const trackBase = new THREE.Mesh(
  new THREE.TubeGeometry(
    conveyorPath,
    240,
    0.58,
    12,
    true
  ),
  materials.track
);
 
scene.add(trackBase);
 
// -----------------------------------------------------------------------------
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
  color: 0x9cefff,
  transparent: true,
  opacity: 0.34,
  side: THREE.DoubleSide,
  depthWrite: false
});
 
const conveyorDirectionArrows = new THREE.Group();
const CONVEYOR_ARROW_COUNT = 12;
const CONVEYOR_ARROW_SPEED = 0.075; // Path laps per second.
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
 
const rail = new THREE.Mesh(
  new THREE.TubeGeometry(
    conveyorPath,
    240,
    0.09,
    10,
    true
  ),
  materials.rail
);
 
rail.position.y = 0.32;
scene.add(rail);
 
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
  const glow = shooter.userData.lowAmmoGlow;
  if (!glow) return;
  glow.visible = shooter.userData.ammo > 0 && shooter.userData.ammo <= 3;
  if (glow.visible) {
    glow.userData.pulseTime += delta;
    glow.material.opacity = 0.48 + 0.34 *
      (0.5 + 0.5 * Math.sin(glow.userData.pulseTime * 8));
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
 
// SHOOTER CHARACTERS
// -----------------------------------------------------------------------------
 
const shooterGroup = new THREE.Group();
scene.add(shooterGroup);
 
const shooters = [];
 
const CHARACTER_COLUMNS = CONFIG.characterColumns;
const CHARACTER_ROWS = CONFIG.characterRows;
const CHARACTER_START_Z = CONFIG.characterStartZ;
const CHARACTER_GAP_X = CONFIG.characterGapX;
const CHARACTER_GAP_Z = CONFIG.characterGapZ;
 
function createShooter(id, color, x, z) {
  const group = new THREE.Group();
 
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
 
  group.add(body);
 
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 24, 20),
    bodyMaterial
  );
 
  head.scale.setScalar(1.08);
  head.position.set(0, 0.91, 0.14);
  group.add(head);
 
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
 
    group.add(ear);
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
 
    group.add(eye);
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
 
  group.userData.shooterId = id;
  group.userData.color = color;
  group.userData.ammo = CONFIG.initialAmmo;
  group.userData.ammoLabel = ammoLabel;
  group.userData.selectionRing = selectionRing;
  group.userData.wigglePhase = Math.random() * Math.PI * 2;
  group.userData.wiggleTime = 0;
  group.userData.selectedPulse = 0;
  group.userData.lowAmmoGlow = lowAmmoGlow;
  group.userData.state = "rack";
  group.userData.pathT = 0;
  group.userData.pathYaw = null;
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
 
  group.traverse(child => {
    if (child.isMesh || child.isSprite) {
      child.userData.shooterGroup = group;
    }
  });
 
  shooterGroup.add(group);
  shooters.push(group);
 
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
  const anchor = conveyorPath.getPointAt(0).clone();
  anchor.y = 0.45;
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
 
    createTween(shooter, target, 0.3, null);
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
  if (result === "win") {
    endTitle.textContent = "YOU WIN!";
    endTitle.style.color = "#75f0a5";
    endSubtitle.textContent = "BRAVO!  ALL CUBES CLEARED";
    endPanel.classList.add("win");
  } else {
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
 
  // Start the countdown when the player makes the first selection.
  startGame();
  shooter.userData.selectedPulse = 0.42;
  shooter.userData.selectionRing.visible = true;
  shooter.userData.selectionRing.scale.setScalar(0.65);
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
 
const projectileGeometry = new THREE.SphereGeometry(
  0.075,
  12,
  12
);
 
const projectileMaterials = {
  white: new THREE.MeshBasicMaterial({
    color: 0xffffff
  }),
 
  black: new THREE.MeshBasicMaterial({
    color: 0x65dfff
  })
};
 
function createProjectile(shooter, pixel) {
  const start = shooter.position.clone();
 
  start.y += 0.85;
 
  const end = pixel.position.clone();
 
  end.y += 0.2;
 
  const projectile = new THREE.Mesh(
    projectileGeometry,
    projectileMaterials[shooter.userData.color]
  );
 
  projectile.position.copy(start);
  scene.add(projectile);
 
  const lineGeometry = new THREE.BufferGeometry();
 
  lineGeometry.setFromPoints([start, start]);
 
  const lineMaterial = new THREE.LineBasicMaterial({
    color:
      shooter.userData.color === "white"
        ? 0xffffff
        : 0x65dfff,
    transparent: true,
    opacity: 0.9
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
    line,
    lineMaterial,
    impactLight,
    start,
    end,
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
  const half = PIXEL_SIZE * 0.5 + 0.008;
 
  const minX = pixel.position.x - half;
  const maxX = pixel.position.x + half;
  const minZ = pixel.position.z - half;
  const maxZ = pixel.position.z + half;
 
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
  const start = shooter.position;
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
 
    const laneOffsets = getAdaptiveLaneOffsets(
      depth,
      depthBoostMultiplier
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
 
      shot.mesh.position.lerpVectors(
        shot.start,
        shot.end,
        eased
      );
 
      shot.line.geometry.setFromPoints([
        shot.mesh.position,
        shot.start
      ]);
 
      shot.lineMaterial.opacity = 1 - t * 0.45;
 
      if (t >= 1) {
        shot.impacted = true;
 
        shot.pixel.userData.active = false;
        shot.pixel.userData.pending = false;
        shot.pixel.visible = false;
 
        hitFlashes.push(createHitFlash(shot.pixel));
 
        shot.impactLight.intensity = 2;
 
        scene.remove(shot.mesh);
        scene.remove(shot.line);
 
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
 
function playGameTone(frequency = 520, duration = 0.09, type = "sine", volume = 0.04) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!gameAudioContext) gameAudioContext = new AudioContextClass();
 
    const scheduleTone = () => {
      if (!gameAudioContext || gameAudioContext.state !== "running") return;
      const oscillator = gameAudioContext.createOscillator();
      const gain = gameAudioContext.createGain();
      const startAt = gameAudioContext.currentTime + 0.015;
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
// PROCEDURAL BACKGROUND MUSIC
// -----------------------------------------------------------------------------
 
let backgroundMusicTimer = null;
let backgroundMusicStep = 0;
let backgroundMusicActive = false;
 
// A light arcade/electronic loop: soft bass pulse, bright plucks, and a simple
// repeating melody. Generated locally with Web Audio; no external audio file.
const backgroundMusicPattern = [
  { bass: 110.00, note: 440.00 },
  { bass: 110.00, note: 523.25 },
  { bass: 130.81, note: 659.25 },
  { bass: 130.81, note: 523.25 },
  { bass: 98.00,  note: 392.00 },
  { bass: 98.00,  note: 493.88 },
  { bass: 130.81, note: 587.33 },
  { bass: 146.83, note: 659.25 }
];
 
function scheduleBackgroundMusicStep() {
  if (!backgroundMusicActive || gameStatus !== "playing") return;
 
  const step = backgroundMusicPattern[backgroundMusicStep];
  // Keep the music behind gameplay SFX: deliberately low volume.
  playGameTone(step.bass, 0.30, "sine", 0.018);
  playGameTone(step.note, 0.16, "triangle", 0.012);
 
  if (backgroundMusicStep % 2 === 0) {
    playGameTone(step.note * 2, 0.07, "sine", 0.006);
  }
 
  backgroundMusicStep = (backgroundMusicStep + 1) % backgroundMusicPattern.length;
  backgroundMusicTimer = setTimeout(scheduleBackgroundMusicStep, 260);
}
 
function startBackgroundMusic() {
  if (backgroundMusicActive) return;
  unlockGameAudio();
  backgroundMusicActive = true;
  backgroundMusicStep = 0;
  scheduleBackgroundMusicStep();
}
 
function stopBackgroundMusic() {
  backgroundMusicActive = false;
  if (backgroundMusicTimer !== null) {
    clearTimeout(backgroundMusicTimer);
    backgroundMusicTimer = null;
  }
}
 
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
 
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
 
  const shooter =
    intersections[0].object.userData.shooterGroup;
 
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
      shooter.scale.setScalar(pulse);
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
      ring.scale.setScalar(0.72 + (0.55 - shooter.userData.selectedPulse) * 0.9);
      ring.material.opacity = 0.35 + shooter.userData.selectedPulse * 1.4;
    } else if (state !== "waiting") {
      ring.visible = false;
    } else {
      ring.visible = true;
      ring.material.opacity = 0.34 + 0.16 * Math.sin(performance.now() * 0.004);
      ring.scale.setScalar(1);
    }
  }
}
 
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  updateShooterIdleMotion(delta);
  updateConveyorArrows(delta);
 
  if (gameStatus === "playing") {
    updateTweens(delta);
    updateConveyor(delta);
    tryLaunchWaiting();
    updateShooting(delta);
    for (const shooter of activeConveyor) updateLowAmmoGlow(shooter, delta);
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
 
