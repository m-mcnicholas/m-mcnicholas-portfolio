import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// F is deliberately left unexpanded: an F -> FF rule compounds with each
// extra iteration (older branches keep re-doubling), which made height
// balloon unpredictably as density increased. Leaving F atomic means only
// X's recursive branching drives density, so height stays controlled by
// the base segment length and per-branch decay below.
const RULES = { X: "F-[[X]+X]+F[+FX]-X" };
const MAX_ITERATIONS = 4;
const MAX_STRING_LENGTH = 2000;
const LEAVES_PER_BUD = 3;
const BASE_ANGLE = THREE.MathUtils.degToRad(22.5);
const LEAF_PALETTE = [0xb1552d, 0xd98a2b, 0x8a6a2f, 0xc94f3f, 0xe0a83e];
const FOREST_MIN_TREES = 7;
const FOREST_MAX_TREES = 12;
// The golden angle gives a phyllotaxis (sunflower-seed) layout: each tree
// lands at an evenly rotated angle at increasing radius, which reads as a
// natural scatter without any collision checking.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function mulberry32(seed) {
  return () => {
    let value = seed += 0x6d2b79f5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function generateLSystem(axiom, rules, maxIterations, maxLength) {
  let current = axiom;
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const next = current
      .split("")
      .map((symbol) => rules[symbol] ?? symbol)
      .join("");
    if (next.length > maxLength) break;
    current = next;
  }
  return current;
}

// Interprets the L-system string as a 3D turtle walk. 'X' marks a growth bud
// (recorded as a leaf site) rather than drawing anything, since the grammar
// never resolves it to further branches after the final iteration.
function walkTurtle(instructions, random) {
  const segments = [];
  const leaves = [];
  const stack = [];

  let position = new THREE.Vector3(0, 0, 0);
  let direction = new THREE.Vector3(0, 1, 0);
  let up = new THREE.Vector3(0, 0, 1);
  let length = 0.4;
  let radius = 0.058;
  let depth = 0;

  for (const symbol of instructions) {
    if (symbol === "F") {
      const start = position.clone();
      position = position.clone().add(direction.clone().multiplyScalar(length));
      segments.push({ start, end: position.clone(), radius, depth });
    } else if (symbol === "+" || symbol === "-") {
      const jitter = (random() - 0.5) * THREE.MathUtils.degToRad(6);
      const angle = (symbol === "+" ? 1 : -1) * (BASE_ANGLE + jitter);
      direction.applyAxisAngle(up, angle);
    } else if (symbol === "[") {
      stack.push({ position: position.clone(), direction: direction.clone(), up: up.clone(), length, radius, depth });
      // Fanning the branch out of the growth plane keeps the shared 2D-style
      // grammar from reading as a flat cutout once it is rendered in 3D.
      up.applyAxisAngle(direction, (random() - 0.5) * Math.PI * 0.9 + Math.PI * 0.35);
      length *= 0.72 + random() * 0.05;
      radius *= 0.72;
      depth += 1;
    } else if (symbol === "]") {
      const state = stack.pop();
      if (state) {
        position = state.position;
        direction = state.direction;
        up = state.up;
        length = state.length;
        radius = state.radius;
        depth = state.depth;
      }
    } else if (symbol === "X") {
      leaves.push({ position: position.clone(), direction: direction.clone() });
    }
  }

  return { segments, leaves };
}

function makeBarkTexture(random) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  context.fillStyle = "#4a3423";
  context.fillRect(0, 0, size, size);
  for (let column = 0; column < 90; column += 1) {
    const x = random() * size;
    context.strokeStyle = random() > 0.5 ? "#6b4c2f55" : "#2c1c1055";
    context.lineWidth = 0.6 + random() * 1.6;
    context.beginPath();
    for (let y = -6; y <= size + 6; y += 8) {
      const wave = Math.sin(y * 0.05 + x) * 2.4;
      if (y === -6) context.moveTo(x + wave, y);
      else context.lineTo(x + wave, y);
    }
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 3);
  return texture;
}

function buildTree(random) {
  const group = new THREE.Group();
  const disposables = { geometries: [], materials: [], textures: [] };

  const instructions = generateLSystem("X", RULES, MAX_ITERATIONS, MAX_STRING_LENGTH);
  const { segments, leaves } = walkTurtle(instructions, random);

  const branchGeometries = segments.map(({ start, end, radius }) => {
    const direction = end.clone().sub(start);
    const height = direction.length();
    const geometry = new THREE.CylinderGeometry(radius * 0.72, radius, height, 6, 1);
    geometry.translate(0, height / 2, 0);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
    geometry.translate(start.x, start.y, start.z);
    return geometry;
  });

  const barkTexture = makeBarkTexture(random);
  disposables.textures.push(barkTexture);
  const barkMaterial = new THREE.MeshStandardMaterial({ map: barkTexture, roughness: 0.92, color: 0xdcc9a8 });
  disposables.materials.push(barkMaterial);

  if (branchGeometries.length) {
    const mergedBranches = mergeGeometries(branchGeometries, false);
    branchGeometries.forEach((geometry) => geometry.dispose());
    disposables.geometries.push(mergedBranches);
    const trunk = new THREE.Mesh(mergedBranches, barkMaterial);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);
  }

  // A small cluster per bud reads as a full canopy without adding more branch
  // geometry, so density can grow independently of tree height. At the
  // iteration cap this reaches several thousand leaves, so they are drawn as
  // one instanced mesh rather than one draw call per leaf.
  const leafGeometry = new THREE.IcosahedronGeometry(0.036, 0);
  disposables.geometries.push(leafGeometry);
  const leafMaterial = new THREE.MeshStandardMaterial({ roughness: 0.62 });
  disposables.materials.push(leafMaterial);

  const leafCount = leaves.length * LEAVES_PER_BUD;
  const leafMesh = new THREE.InstancedMesh(leafGeometry, leafMaterial, Math.max(1, leafCount));
  leafMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  leafMesh.castShadow = true;
  leafMesh.count = leafCount;

  const leafBases = new Array(leafCount);
  const leafPhases = new Array(leafCount);
  const leafQuaternions = new Array(leafCount);
  const leafScales = new Array(leafCount);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();

  let instanceIndex = 0;
  leaves.forEach((leaf, leafIndex) => {
    for (let cluster = 0; cluster < LEAVES_PER_BUD; cluster += 1) {
      const offset = new THREE.Vector3((random() - 0.5) * 0.14, (random() - 0.5) * 0.14, (random() - 0.5) * 0.14);
      const basePosition = leaf.position.clone().add(offset);
      const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * Math.PI, random() * Math.PI, random() * Math.PI));
      const scale = 0.55 + random() * 0.75;

      leafBases[instanceIndex] = basePosition;
      leafPhases[instanceIndex] = leafIndex * 0.62 + cluster * 1.7;
      leafQuaternions[instanceIndex] = quaternion;
      leafScales[instanceIndex] = scale;

      matrix.compose(basePosition, quaternion, new THREE.Vector3(scale, scale, scale));
      leafMesh.setMatrixAt(instanceIndex, matrix);
      color.set(LEAF_PALETTE[Math.floor(random() * LEAF_PALETTE.length) % LEAF_PALETTE.length]);
      leafMesh.setColorAt(instanceIndex, color);
      instanceIndex += 1;
    }
  });
  leafMesh.instanceMatrix.needsUpdate = true;
  if (leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true;
  group.add(leafMesh);

  const leafAnimation = { mesh: leafMesh, bases: leafBases, phases: leafPhases, quaternions: leafQuaternions, scales: leafScales };

  return { group, disposables, leafAnimation, leafCount, branchCount: segments.length };
}

// Scatters an independently-grown tree at each phyllotaxis site. Reusing the
// same PRNG sequentially across trees (rather than re-seeding per tree) means
// every tree in the forest still comes from one seed, so a given seed always
// reproduces the same forest.
function buildForest(random) {
  const group = new THREE.Group();
  const disposables = { geometries: [], materials: [], textures: [] };
  const leafAnimations = [];
  let branchCount = 0;
  let leafCount = 0;

  const treeCount = FOREST_MIN_TREES + Math.floor(random() * (FOREST_MAX_TREES - FOREST_MIN_TREES + 1));

  for (let index = 0; index < treeCount; index += 1) {
    const tree = buildTree(random);

    const radius = 1.1 + 5.4 * Math.sqrt((index + 0.5) / treeCount) + (random() - 0.5) * 0.6;
    const angle = index * GOLDEN_ANGLE + (random() - 0.5) * 0.4;
    const scale = 0.72 + random() * 0.6;

    tree.group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    tree.group.rotation.y = random() * Math.PI * 2;
    tree.group.scale.setScalar(scale);

    group.add(tree.group);
    disposables.geometries.push(...tree.disposables.geometries);
    disposables.materials.push(...tree.disposables.materials);
    disposables.textures.push(...tree.disposables.textures);
    leafAnimations.push(tree.leafAnimation);
    branchCount += tree.branchCount;
    leafCount += tree.leafCount;
  }

  return { group, disposables, leafAnimations, branchCount, leafCount, treeCount };
}

function initialize() {
  const stage = document.querySelector("#tree-canvas");
  const seedLabel = document.querySelector("#tree-seed");
  const fallback = document.querySelector("#tree-fallback");
  const regenerateButton = document.querySelector("#regenerate");
  if (!stage) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch (error) {
    fallback.hidden = false;
    regenerateButton.disabled = true;
    console.warn("The generative tree could not initialize a WebGL renderer.", error);
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcfd8c0);
  scene.fog = new THREE.Fog(0xcfd8c0, 9, 40);

  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 80);
  camera.position.set(8.2, 5.4, 10.4);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.7, 0);
  controls.enableDamping = true;
  controls.minDistance = 2.4;
  controls.maxDistance = 34;
  controls.maxPolarAngle = Math.PI * 0.51;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xdfe9d2, 0x3c3324, 0.9));
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  const key = new THREE.DirectionalLight(0xfff3d6, 1.5);
  key.position.set(-5.6, 8.4, 6.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.0004;
  scene.add(key);

  // Larger than the fog's far distance so its circular edge fades into the
  // background before it becomes visible, reading as open ground rather than
  // a disc.
  const groundGeometry = new THREE.CircleGeometry(45, 48);
  groundGeometry.rotateX(-Math.PI / 2);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x5a4a34, roughness: 1 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.receiveShadow = true;
  scene.add(ground);

  let current = null;

  function clearForest() {
    if (!current) return;
    scene.remove(current.group);
    current.disposables.geometries.forEach((geometry) => geometry.dispose());
    current.disposables.materials.forEach((material) => material.dispose());
    current.disposables.textures.forEach((texture) => texture.dispose());
    current = null;
  }

  function grow(seed) {
    clearForest();
    const random = mulberry32(seed);
    current = buildForest(random);
    scene.add(current.group);
    seedLabel.textContent = `Seed ${seed} · ${current.treeCount} trees · ${current.branchCount} branch segments · ${current.leafCount} leaves`;
  }

  function newSeed() {
    return Math.floor(Math.random() * 0xffffffff);
  }

  function resize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize, { passive: true });
  regenerateButton.addEventListener("click", () => grow(newSeed()));

  resize();
  grow(newSeed());

  const clock = new THREE.Clock();
  const swayMatrix = new THREE.Matrix4();
  const swayPosition = new THREE.Vector3();
  const swayScale = new THREE.Vector3();
  function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    if (current) {
      current.leafAnimations.forEach(({ mesh, bases, phases, quaternions, scales }) => {
        for (let index = 0; index < bases.length; index += 1) {
          const sway = Math.sin(elapsed * 1.4 + phases[index]) * 0.03;
          swayPosition.copy(bases[index]);
          swayPosition.x += sway;
          swayScale.setScalar(scales[index]);
          swayMatrix.compose(swayPosition, quaternions[index], swayScale);
          mesh.setMatrixAt(index, swayMatrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      });
    }
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

initialize();
