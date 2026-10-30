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
  characterGapX: 1.75,
  characterGapZ: 1.5,
  maxConveyorShooters: 5,
  conveyorSpeed: 0.1,
  initialAmmo: 20,
  shotCooldown: 0.12,
  projectileDuration: 0.16
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

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.overflow = "hidden";
document.body.style.background = "#4a4d6b";

document.body.appendChild(renderer.domElement);

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

const ROWS = CONFIG.rows * CONFIG.subdivisions;
const COLUMNS = CONFIG.columns * CONFIG.subdivisions;

const PIXEL_SIZE = CONFIG.pixelSize;
const PIXEL_GAP = CONFIG.pixelGap;

const GRID_WIDTH =
  COLUMNS * (PIXEL_SIZE + PIXEL_GAP) - PIXEL_GAP;

const GRID_DEPTH =
  ROWS * (PIXEL_SIZE + PIXEL_GAP) - PIXEL_GAP;

const GRID_CENTER_Z = CONFIG.gridCenterZ;

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

    gridGroup.add(pixel);
    pixels.push(pixel);
  }
}

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

  return new THREE.CatmullRomCurve3(
    points,
    true,
    "centripetal"
  );
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

  texture.needsUpdate = true;
}

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

  body.scale.set(0.85, 1.15, 0.8);
  body.position.y = 0.4;

  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 24, 20),
    bodyMaterial
  );

  head.position.set(0, 0.85, 0.12);
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

  const ammoLabel = createAmmoLabel(CONFIG.initialAmmo);

  group.add(ammoLabel);
  group.position.set(x, 0.12, z);

  group.userData.shooterId = id;
  group.userData.color = color;
  group.userData.ammo = CONFIG.initialAmmo;
  group.userData.ammoLabel = ammoLabel;
  group.userData.state = "rack";
  group.userData.pathT = 0;
  group.userData.tween = null;
  group.userData.fireCooldown = 0;
  group.userData.edgeCursors = {};
  group.userData.exhausted = false;

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

const activeConveyor = [];
const waitingQueue = [];

function getConveyorCount() {
  return activeConveyor.length +
    shooters.filter(
      shooter =>
        shooter.userData.state === "enteringConveyor"
    ).length;
}

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

function selectShooter(shooter) {
  if (shooter.userData.state !== "rack") return;

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

  createTween(waitingShooter, target, 0.65, () => {
    waitingShooter.userData.state = "conveyor";

    activeConveyor.push(waitingShooter);

    tryLaunchWaiting();
  });
}

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

function findNextTarget(shooter, layer, side) {
  if (layer < 0 || layer >= perimeterLayers.length) {
    return null;
  }

  const sidePixels = perimeterLayers[layer][side];

  if (!sidePixels || sidePixels.length === 0) {
    return null;
  }

  let nearestPixel = null;
  let nearestDistanceSq = Infinity;

  const maxTargetDistance = 3.0;
  const maxTargetDistanceSq =
    maxTargetDistance * maxTargetDistance;

  for (const pixel of sidePixels) {
    if (!pixel.userData.active) continue;
    if (pixel.userData.pending) continue;

    if (pixel.userData.color !== shooter.userData.color) {
      continue;
    }

    const dx = pixel.position.x - shooter.position.x;
    const dz = pixel.position.z - shooter.position.z;

    const distanceSq = dx * dx + dz * dz;

    if (distanceSq > maxTargetDistanceSq) {
      continue;
    }

    // Any active pixel, regardless of color, blocks the shot.
    if (!hasClearLineOfSight(shooter, pixel)) {
      continue;
    }

    if (distanceSq < nearestDistanceSq) {
      nearestDistanceSq = distanceSq;
      nearestPixel = pixel;
    }
  }

  if (!nearestPixel) {
    return null;
  }

  nearestPixel.userData.pending = true;

  return nearestPixel;
}

function shootPixel(shooter, side) {
  if (shooter.userData.ammo <= 0) {
    return false;
  }

  // Get the outermost remaining layer for this shooter's color
  // on this specific face only.
  const currentLayer = getFirstUnclearedLayerByColor(
    shooter.userData.color,
    side
  );

  if (currentLayer === -1) {
    return false;
  }

  // Search the current face first, then the next faces in conveyor order.
  // Each candidate face resolves its own layer independently.
  for (let sideOffset = 0; sideOffset < 4; sideOffset++) {
    const candidateSide = (side + sideOffset) % 4;

    const candidateLayer = getFirstUnclearedLayerByColor(
      shooter.userData.color,
      candidateSide
    );

    if (candidateLayer === -1) {
      continue;
    }

    const target = findNextTarget(
      shooter,
      candidateLayer,
      candidateSide
    );

    if (!target) continue;

    createProjectile(shooter, target);

    shooter.userData.ammo--;

    updateAmmoLabel(shooter);

    if (shooter.userData.ammo <= 0) {
      shooter.userData.exhausted = true;
    }

    return true;
  }

  // No reachable target on any face.
  // Wait and retry instead of shooting through blockers.
  return false;
}

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
  for (const shooter of activeConveyor) {
    if (shooter.userData.exhausted) {
      continue;
    }

    shooter.userData.fireCooldown -= delta;

    if (shooter.userData.fireCooldown > 0) {
      continue;
    }

    const side = getShooterSide(
      shooter.userData.pathT
    );

    const fired = shootPixel(shooter, side);

    shooter.userData.fireCooldown = fired
      ? CONFIG.shotCooldown
      : 0.08;
  }
}

function removeExhaustedShooters() {
  for (let i = activeConveyor.length - 1; i >= 0; i--) {
    const shooter = activeConveyor[i];

    if (!shooter.userData.exhausted) {
      continue;
    }

    activeConveyor.splice(i, 1);

    shooter.userData.state = "exhausted";

    shooterGroup.remove(shooter);

    tryLaunchWaiting();
  }
}

function updateConveyor(delta) {
  for (const shooter of activeConveyor) {
    shooter.userData.pathT += CONVEYOR_SPEED * delta;

    if (shooter.userData.pathT >= 1) {
      shooter.userData.pathT -= 1;
    }

    const t = shooter.userData.pathT;

    const point = conveyorPath.getPointAt(t);

    shooter.position.set(
      point.x,
      0.3,
      point.z
    );

    const tangent = conveyorPath.getTangentAt(t);

    shooter.rotation.y = Math.atan2(
      tangent.x,
      tangent.z
    );
  }
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function handlePointer(event) {
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

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  updateTweens(delta);
  updateConveyor(delta);
  tryLaunchWaiting();
  updateShooting(delta);
  updateProjectiles(delta);
  removeExhaustedShooters();

  renderer.render(scene, camera);
}

animate();

function resize() {
  const aspect = window.innerWidth / window.innerHeight;

  const halfHeight = CONFIG.viewHeight / 2;
  const halfWidth = halfHeight * aspect;

  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
}

window.addEventListener("resize", resize);

resize();