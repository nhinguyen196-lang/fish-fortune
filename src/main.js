
import * as THREE from "three";

// ============================================================
// 1. CONFIGURATION
// ============================================================

const CONFIG = {
  viewHeight: 25,

  rows: 20,
  columns: 20,

  pixelSize: 0.31,
  pixelGap: 0.035,
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
  conveyorSpeed: 0.035,

  initialAmmo: 20,
  shotCooldown: 0.22,
  projectileDuration: 0.16
};

// ============================================================
// 2. SCENE
// ============================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x4a4d6b);

// ============================================================
// 3. CAMERA - PORTRAIT
// ============================================================

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

// ============================================================
// 4. RENDERER
// ============================================================

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.overflow = "hidden";
document.body.style.background = "#4a4d6b";

document.body.appendChild(renderer.domElement);

renderer.domElement.style.display = "block";
renderer.domElement.style.touchAction = "none";

// ============================================================
// 5. LIGHTING
// ============================================================

scene.add(
  new THREE.AmbientLight(0xffffff, 1.6)
);

const sun = new THREE.DirectionalLight(
  0xffffff,
  2
);

sun.position.set(-5, 18, 10);
sun.castShadow = true;

scene.add(sun);

// ============================================================
// 6. MATERIALS
// ============================================================

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

// ============================================================
// 7. FLOOR
// ============================================================

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  materials.floor
);

floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.2;

scene.add(floor);

// ============================================================
// 8. PIXEL GRID
// ============================================================

const ROWS = CONFIG.rows;
const COLUMNS = CONFIG.columns;

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

    const isWhite = pixelIsWhite(row, column);

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

    pixel.userData.color =
      isWhite ? "white" : "black";

    pixel.userData.row = row;
    pixel.userData.column = column;
    pixel.userData.active = true;
    pixel.userData.pending = false;

    gridGroup.add(pixel);
    pixels.push(pixel);
  }
}

// ============================================================
// 9. PERIMETER SYSTEM
// ============================================================

// Each layer has 4 sequentially scanned sides:
// bottom -> right -> top -> left.

function buildPerimeterLayers() {

  const layers = [];

  const maxLayers = Math.ceil(
    Math.min(ROWS, COLUMNS) / 2
  );

  for (let layer = 0; layer < maxLayers; layer++) {

    const sides = [[], [], [], []];

    const top = layer;
    const bottom = ROWS - 1 - layer;
    const left = layer;
    const right = COLUMNS - 1 - layer;

    // Side 0: Bottom, left -> right
    for (let c = left; c <= right; c++) {
      sides[0].push(
        pixels[bottom * COLUMNS + c]
      );
    }

    // Side 1: Right, bottom -> top
    for (let r = bottom - 1; r >= top; r--) {
      sides[1].push(
        pixels[r * COLUMNS + right]
      );
    }

    // Side 2: Top, right -> left
    for (let c = right - 1; c >= left; c--) {
      sides[2].push(
        pixels[top * COLUMNS + c]
      );
    }

    // Side 3: Left, top -> bottom
    for (let r = top + 1; r < bottom; r++) {
      sides[3].push(
        pixels[r * COLUMNS + left]
      );
    }

    layers.push(sides);
  }

  return layers;
}

const perimeterLayers = buildPerimeterLayers();

let currentPerimeter = 0;

// ============================================================
// 10. CONVEYOR PATH
// START: BOTTOM-LEFT CORNER
// DIRECTION: COUNTERCLOCKWISE
// ============================================================

const TRACK_CENTER_Z = GRID_CENTER_Z;

const TRACK_HALF_WIDTH = CONFIG.trackHalfWidth;
const TRACK_HALF_DEPTH = CONFIG.trackHalfDepth;
const TRACK_RADIUS = CONFIG.trackRadius;

function createRoundedPath() {

  const points = [];

  function addPoint(x, z) {

    points.push(
      new THREE.Vector3(
        x,
        0.05,
        TRACK_CENTER_Z + z
      )
    );
  }

  function addArc(cx, cz, startAngle, endAngle) {

    const steps = 20;

    for (let i = 0; i <= steps; i++) {

      const t = i / steps;

      const angle =
        startAngle +
        (endAngle - startAngle) * t;

      addPoint(
        cx + TRACK_RADIUS * Math.cos(angle),
        cz + TRACK_RADIUS * Math.sin(angle)
      );
    }
  }

  // START: bottom-left
  addPoint(
    -TRACK_HALF_WIDTH + TRACK_RADIUS,
    TRACK_HALF_DEPTH
  );

  // Bottom edge
  addPoint(
    TRACK_HALF_WIDTH - TRACK_RADIUS,
    TRACK_HALF_DEPTH
  );

  // Bottom-right corner
  addArc(
    TRACK_HALF_WIDTH - TRACK_RADIUS,
    TRACK_HALF_DEPTH - TRACK_RADIUS,
    Math.PI / 2,
    0
  );

  // Right edge
  addPoint(
    TRACK_HALF_WIDTH,
    -TRACK_HALF_DEPTH + TRACK_RADIUS
  );

  // Top-right corner
  addArc(
    TRACK_HALF_WIDTH - TRACK_RADIUS,
    -TRACK_HALF_DEPTH + TRACK_RADIUS,
    0,
    -Math.PI / 2
  );

  // Top edge
  addPoint(
    -TRACK_HALF_WIDTH + TRACK_RADIUS,
    -TRACK_HALF_DEPTH
  );

  // Top-left corner
  addArc(
    -TRACK_HALF_WIDTH + TRACK_RADIUS,
    -TRACK_HALF_DEPTH + TRACK_RADIUS,
    -Math.PI / 2,
    -Math.PI
  );

  // Left edge
  addPoint(
    -TRACK_HALF_WIDTH,
    TRACK_HALF_DEPTH - TRACK_RADIUS
  );

  // Bottom-left corner
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

// Track base
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

// Outer rail
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

// ============================================================
// 11. WAITING TRAY
// ============================================================

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

// ============================================================
// 12. AMMO LABEL
// ============================================================

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

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.font = "bold 76px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.lineWidth = 10;
  ctx.strokeStyle = "#111111";

  ctx.strokeText(
    shooter.userData.ammo,
    128,
    64
  );

  ctx.fillStyle = "#ffffff";

  ctx.fillText(
    shooter.userData.ammo,
    128,
    64
  );

  texture.needsUpdate = true;
}

// ============================================================
// 13. SHOOTER CHARACTERS
// ============================================================

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

  const bodyMaterial =
    isWhite ? materials.white : materials.black;

  // Body
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 24, 20),
    bodyMaterial
  );

  body.scale.set(0.85, 1.15, 0.8);
  body.position.y = 0.4;

  group.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 24, 20),
    bodyMaterial
  );

  head.position.set(0, 0.85, 0.12);

  group.add(head);

  // Ears
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

    ear.rotation.z =
      i === 0 ? -0.12 : 0.12;

    group.add(ear);
  }

  // Eyes
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

  // Ammo
  const ammoLabel = createAmmoLabel(
    CONFIG.initialAmmo
  );

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

// Create 16 shooters
for (let row = 0; row < CHARACTER_ROWS; row++) {

  for (let column = 0; column < CHARACTER_COLUMNS; column++) {

    const x =
      (column - (CHARACTER_COLUMNS - 1) / 2) *
      CHARACTER_GAP_X;

    const z =
      CHARACTER_START_Z +
      row * CHARACTER_GAP_Z;

    const color =
      (row + column) % 2 === 0
        ? "black"
        : "white";

    createShooter(
      shooters.length,
      color,
      x,
      z
    );
  }
}

// ============================================================
// 14. GAMEPLAY STATE
// ============================================================

const MAX_CONVEYOR_SHOOTERS =
  CONFIG.maxConveyorShooters;

const CONVEYOR_SPEED =
  CONFIG.conveyorSpeed;

const activeConveyor = [];

function getConveyorCount() {

  return activeConveyor.length +
    shooters.filter(shooter =>
      shooter.userData.state === "enteringConveyor"
    ).length;
}

// ============================================================
// 15. TWEEN SYSTEM
// ============================================================

function createTween(
  shooter,
  target,
  duration,
  onComplete
) {

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

// ============================================================
// 16. SELECT SHOOTER
// ============================================================

function selectShooter(shooter) {

  if (shooter.userData.state !== "rack") {
    return;
  }

  const freeSlotIndex = traySlots.findIndex(
    slot => slot.shooter === null
  );

  if (freeSlotIndex === -1) {
    console.log("Waiting tray is full!");
    return;
  }

  const slot = traySlots[freeSlotIndex];

  slot.shooter = shooter;

  shooter.userData.state = "movingToTray";
  shooter.userData.slotIndex = freeSlotIndex;

  const target = new THREE.Vector3(
    slot.mesh.position.x,
    0.25,
    slot.mesh.position.z
  );

  createTween(shooter, target, 0.45, () => {

    shooter.userData.state = "waiting";

    tryLaunchWaiting();

  });
}

// ============================================================
// 17. LAUNCH FROM TRAY TO CONVEYOR
// ============================================================

function tryLaunchWaiting() {

  if (
    getConveyorCount() >= MAX_CONVEYOR_SHOOTERS
  ) {
    return;
  }

  const waitingShooter = shooters.find(
    shooter =>
      shooter.userData.state === "waiting"
  );

  if (!waitingShooter) return;

  const slotIndex =
    waitingShooter.userData.slotIndex;

  traySlots[slotIndex].shooter = null;

  waitingShooter.userData.state =
    "enteringConveyor";

  // Place shooters at separate positions on the belt.
  const initialT = (
    activeConveyor.length /
    MAX_CONVEYOR_SHOOTERS
  ) % 1;

  const startPoint = conveyorPath.getPointAt(initialT);

  const target = new THREE.Vector3(
    startPoint.x,
    0.3,
    startPoint.z
  );

  waitingShooter.userData.pathT = initialT;

  waitingShooter.userData.edgeCursors = {};

  waitingShooter.userData.fireCooldown = 0.5;

  createTween(
    waitingShooter,
    target,
    0.65,
    () => {

      waitingShooter.userData.state = "conveyor";

      activeConveyor.push(waitingShooter);

      tryLaunchWaiting();

    }
  );
}

// ============================================================
// 18. PROJECTILE SYSTEM
// ============================================================

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

  // Projectile
  const projectile = new THREE.Mesh(
    projectileGeometry,
    projectileMaterials[shooter.userData.color]
  );

  projectile.position.copy(start);

  scene.add(projectile);

  // Laser trail
  const lineGeometry = new THREE.BufferGeometry();

  lineGeometry.setFromPoints([
    start,
    start
  ]);

  const lineMaterial = new THREE.LineBasicMaterial({
    color: shooter.userData.color === "white"
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

  // Impact light
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

// ============================================================
// 19. FIND NEXT MATCHING PIXEL
// ============================================================

function findNextTarget(shooter, layer, side) {

  if (!shooter.userData.edgeCursors[layer]) {

    shooter.userData.edgeCursors[layer] = [
      0, 0, 0, 0
    ];
  }

  const sidePixels =
    perimeterLayers[layer][side];

  const cursors =
    shooter.userData.edgeCursors[layer];

  while (cursors[side] < sidePixels.length) {

    const pixel = sidePixels[cursors[side]];

    cursors[side]++;

    if (!pixel.userData.active) continue;
    if (pixel.userData.pending) continue;

    if (
      pixel.userData.color !==
      shooter.userData.color
    ) {
      continue;
    }

    pixel.userData.pending = true;

    return pixel;
  }

  return null;
}

// ============================================================
// 20. SHOOT ONE PIXEL
// ============================================================

function shootPixel(shooter, side) {

  if (currentPerimeter >= perimeterLayers.length) {
    return false;
  }

  if (shooter.userData.ammo <= 0) {
    return false;
  }

  const target = findNextTarget(
    shooter,
    currentPerimeter,
    side
  );

  if (!target) {
    return false;
  }

  createProjectile(shooter, target);

  // One ammo per successful hit
  shooter.userData.ammo--;

  updateAmmoLabel(shooter);

  if (shooter.userData.ammo <= 0) {
    shooter.userData.exhausted = true;
  }

  return true;
}

// ============================================================
// 21. PROJECTILE UPDATE & PIXEL DESTRUCTION
// ============================================================

function createHitFlash(pixel) {

  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9
  });

  const flash = new THREE.Mesh(
    new THREE.BoxGeometry(
      PIXEL_SIZE * 1.4,
      0.08,
      PIXEL_SIZE * 1.4
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

      const eased =
        t * t * (3 - 2 * t);

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

        hitFlashes.push(
          createHitFlash(shot.pixel)
        );

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

  // Update hit flashes
  for (let i = hitFlashes.length - 1; i >= 0; i--) {

    const flash = hitFlashes[i];

    flash.elapsed += delta;

    const t = Math.min(
      flash.elapsed / 0.18,
      1
    );

    const scale = 1 + t * 1.5;

    flash.mesh.scale.set(
      scale,
      1,
      scale
    );

    flash.mesh.material.opacity = 1 - t;

    if (t >= 1) {

      scene.remove(flash.mesh);

      flash.mesh.geometry.dispose();
      flash.mesh.material.dispose();

      hitFlashes.splice(i, 1);
    }
  }
}

// ============================================================
// 22. PERIMETER PROGRESSION
// ============================================================

function updatePerimeter() {

  if (currentPerimeter >= perimeterLayers.length) {
    return;
  }

  const allPixels =
    perimeterLayers[currentPerimeter].flat();

  const cleared = allPixels.every(pixel =>
    !pixel.userData.active &&
    !pixel.userData.pending
  );

  if (cleared) {

    currentPerimeter++;

    console.log(
      "Perimeter cleared:",
      currentPerimeter
    );

    // Reset shooter cursors for new layer
    for (const shooter of shooters) {
      shooter.userData.edgeCursors = {};
    }
  }
}

// ============================================================
// 23. SHOOTING UPDATE
// ============================================================

function getShooterSide(pathT) {

  // Four sequential conveyor sections.
  return Math.min(
    3,
    Math.floor(pathT * 4)
  );
}

function updateShooting(delta) {

  updatePerimeter();

  for (const shooter of activeConveyor) {

    if (shooter.userData.exhausted) continue;

    if (currentPerimeter >= perimeterLayers.length) {
      continue;
    }

    shooter.userData.fireCooldown -= delta;

    if (shooter.userData.fireCooldown > 0) {
      continue;
    }

    const side = getShooterSide(
      shooter.userData.pathT
    );

    const fired = shootPixel(
      shooter,
      side
    );

    shooter.userData.fireCooldown = fired
      ? CONFIG.shotCooldown
      : 0.08;
  }

  updatePerimeter();
}

// ============================================================
// 24. REMOVE EXHAUSTED SHOOTERS
// ============================================================

function removeExhaustedShooters() {

  for (
    let i = activeConveyor.length - 1;
    i >= 0;
    i--
  ) {

    const shooter = activeConveyor[i];

    if (!shooter.userData.exhausted) continue;

    activeConveyor.splice(i, 1);

    shooter.userData.state = "exhausted";

    shooterGroup.remove(shooter);

    // Release its slot and launch waiting shooter
    tryLaunchWaiting();
  }
}

// ============================================================
// 25. CONVEYOR UPDATE
// ============================================================

function updateConveyor(delta) {

  for (const shooter of activeConveyor) {

    shooter.userData.pathT +=
      CONVEYOR_SPEED * delta;

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

// ============================================================
// 26. MOUSE / TOUCH INPUT
// ============================================================

const raycaster = new THREE.Raycaster();

const pointer = new THREE.Vector2();

function handlePointer(event) {

  const rect =
    renderer.domElement.getBoundingClientRect();

  pointer.x =
    ((event.clientX - rect.left) / rect.width) * 2 - 1;

  pointer.y =
    -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(
    shooterGroup.children,
    true
  );

  if (intersections.length === 0) return;

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

// ============================================================
// 27. MAIN GAME LOOP
// ============================================================

const clock = new THREE.Clock();

function animate() {

  requestAnimationFrame(animate);

  const delta = Math.min(
    clock.getDelta(),
    0.05
  );

  updateTweens(delta);

  updateConveyor(delta);

  updateShooting(delta);

  updateProjectiles(delta);

  removeExhaustedShooters();

  renderer.render(scene, camera);
}

animate();

// ============================================================
// 28. RESPONSIVE CAMERA
// ============================================================

function resize() {

  const aspect =
    window.innerWidth / window.innerHeight;

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
