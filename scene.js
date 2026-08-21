import * as THREE from "three";
import { getBindingProfile } from "./bindings.js";

const BOOK_WIDTH = 8.1;
const BOOK_HEIGHT = 4.55;

function mulberry32(seed) {
  return () => {
    let value = seed += 0x6d2b79f5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function roundedRectangle(width, height, radius) {
  const shape = new THREE.Shape();
  const left = -width / 2;
  const bottom = -height / 2;
  shape.moveTo(left + radius, bottom);
  shape.lineTo(left + width - radius, bottom);
  shape.quadraticCurveTo(left + width, bottom, left + width, bottom + radius);
  shape.lineTo(left + width, bottom + height - radius);
  shape.quadraticCurveTo(left + width, bottom + height, left + width - radius, bottom + height);
  shape.lineTo(left + radius, bottom + height);
  shape.quadraticCurveTo(left, bottom + height, left, bottom + height - radius);
  shape.lineTo(left, bottom + radius);
  shape.quadraticCurveTo(left, bottom, left + radius, bottom);
  return shape;
}

export function createStudyScene(records, onLayout) {
  const stage = document.querySelector("#scene-canvas");
  const study = document.querySelector("#study");
  if (!stage || !study) throw new Error("The study stage is missing.");

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (error) {
    throw new Error("WebGL renderer creation failed.", { cause: error });
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x151c19);
  scene.fog = new THREE.Fog(0x151c19, 17, 29);

  // A nearly level sightline makes the pages face the reader. The previous
  // implementation looked down by roughly 31 degrees and flattened the book.
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  const cameraTarget = new THREE.Vector3(0, 2.62, 0.18);
  camera.position.set(0, 4.08, 14.4);
  camera.lookAt(cameraTarget);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  stage.append(renderer.domElement);

  const disposableGeometries = [];
  const disposableMaterials = [];
  const disposableTextures = [];
  const stackBooks = [];
  const openCoverMeshes = [];
  let turningLeaf;
  let archiveDrawerLocal;
  let selectionFrame = 0;
  let renderCount = 0;
  let disposed = false;

  function render() {
    renderer.render(scene, camera);
    renderCount += 1;
  }

  function canvasTexture(size, draw, repeatX = 1, repeatY = 1, color = true) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas textures are unavailable.");
    draw(context, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    disposableTextures.push(texture);
    return texture;
  }

  function textureSet(size, draw, repeatX = 1, repeatY = 1) {
    const color = canvasTexture(size, (context, side) => draw(context, side, "color"), repeatX, repeatY, true);
    const bump = canvasTexture(size, (context, side) => draw(context, side, "bump"), repeatX, repeatY, false);
    const roughness = canvasTexture(size, (context, side) => draw(context, side, "roughness"), repeatX, repeatY, false);
    return { color, bump, roughness };
  }

  // Repeat values are world-scale decisions: broad wood figure, sub-letter
  // paper fibers, tighter cloth threads, and page-edge lines dense enough to
  // survive the final camera distance without turning into visible stripes.
  function makeWoodTextures(dark = false, seed = 91) {
    return textureSet(512, (context, size, channel) => {
      const random = mulberry32(seed);
      context.fillStyle = channel === "color" ? (dark ? "#2d1a12" : "#55331f") : channel === "bump" ? "#777" : "#c2c2c2";
      context.fillRect(0, 0, size, size);
      for (let y = -12; y < size + 12; y += 7 + Math.floor(random() * 6)) {
        const strength = 0.08 + random() * 0.16;
        context.strokeStyle = channel === "color"
          ? `rgba(${dark ? "185,119,73" : "217,146,85"},${strength})`
          : channel === "bump" ? `rgba(220,220,220,${strength * 1.5})` : `rgba(90,90,90,${strength})`;
        context.lineWidth = 0.6 + random() * 1.5;
        context.beginPath();
        for (let x = 0; x <= size; x += 5) {
          const wave = Math.sin(x * 0.018 + y * 0.071) * (2 + random() * 2.5) + Math.sin(x * 0.004) * 5;
          if (x === 0) context.moveTo(x, y + wave);
          else context.lineTo(x, y + wave);
        }
        context.stroke();
      }
      for (let knot = 0; knot < 4; knot += 1) {
        const x = 70 + random() * (size - 140);
        const y = random() * size;
        for (let ring = 5; ring < 34; ring += 6) {
          context.strokeStyle = channel === "color" ? `rgba(25,10,5,${0.18 - ring / 300})` : channel === "bump" ? "#4b4b4b44" : "#ededed44";
          context.lineWidth = 1;
          context.beginPath();
          context.ellipse(x, y, ring * 1.8, ring * 0.5, 0.08, 0, Math.PI * 2);
          context.stroke();
        }
      }
      for (let scratch = 0; scratch < 42; scratch += 1) {
        const x = random() * size;
        const y = random() * size;
        const length = 5 + random() * 42;
        context.strokeStyle = channel === "color" ? (random() > 0.5 ? "#f5cb8c18" : "#1007042f") : channel === "bump" ? "#3a3a3a55" : "#f0f0f066";
        context.lineWidth = random() > 0.86 ? 1.4 : 0.65;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + length, y + random() * 3 - 1.5);
        context.stroke();
      }
    }, 2.5, 1.25);
  }

  function makePaperTextures(edge = false, seed = 41) {
    return textureSet(edge ? 256 : 384, (context, size, channel) => {
      const random = mulberry32(seed);
      context.fillStyle = channel === "color" ? (edge ? "#d0c098" : "#e6d7b3") : channel === "bump" ? "#858585" : "#efefef";
      context.fillRect(0, 0, size, size);
      if (edge) {
        for (let y = 1; y < size; y += 3 + Math.floor(random() * 3)) {
          context.fillStyle = channel === "color" ? "#6d593426" : channel === "bump" ? "#5f5f5f" : "#d8d8d8";
          context.fillRect(0, y, size, 1);
        }
      }
      for (let index = 0; index < size * 1.4; index += 1) {
        const x = random() * size;
        const y = random() * size;
        const length = 1 + random() * 8;
        context.strokeStyle = channel === "color" ? (random() > 0.52 ? "#fff8dc22" : "#795c3218") : channel === "bump" ? (random() > 0.5 ? "#b8b8b8" : "#686868") : "#dedede";
        context.lineWidth = 0.45;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + length, y + random() * 2 - 1);
        context.stroke();
      }
      if (!edge && channel === "color") {
        const stain = context.createRadialGradient(size * 0.82, size * 0.14, 2, size * 0.82, size * 0.14, 48);
        stain.addColorStop(0, "#80551f16");
        stain.addColorStop(0.62, "#80551f08");
        stain.addColorStop(1, "transparent");
        context.fillStyle = stain;
        context.fillRect(0, 0, size, size);
        for (let fox = 0; fox < 18; fox += 1) {
          const x = random() * size;
          const y = random() * size;
          context.fillStyle = `rgba(105,70,30,${0.018 + random() * 0.025})`;
          context.beginPath();
          context.arc(x, y, 0.5 + random() * 1.5, 0, Math.PI * 2);
          context.fill();
        }
      }
    }, edge ? 1 : 1.35, edge ? 7 : 1.35);
  }

  function makeBindingTextures(color = "#633f31", kind = "calf", seed = 73) {
    const isCloth = kind === "cloth" || kind === "buckram";
    return textureSet(384, (context, size, channel) => {
      const random = mulberry32(seed);
      context.fillStyle = channel === "color" ? color : channel === "bump" ? "#777" : isCloth ? "#e5e5e5" : "#c9c9c9";
      context.fillRect(0, 0, size, size);
      if (isCloth) {
        for (let line = 0; line < size; line += 3) {
          context.strokeStyle = channel === "color" ? (line % 6 ? "#ffffff0d" : "#00000013") : channel === "bump" ? (line % 6 ? "#adadad" : "#585858") : "#ededed";
          context.lineWidth = 0.7;
          context.beginPath(); context.moveTo(line, 0); context.lineTo(line, size); context.stroke();
          context.beginPath(); context.moveTo(0, line); context.lineTo(size, line + 1); context.stroke();
        }
      } else {
        for (let pore = 0; pore < 1200; pore += 1) {
          const x = random() * size;
          const y = random() * size;
          const radius = 0.25 + random() * 1.1;
          context.fillStyle = channel === "color" ? (random() > 0.42 ? "#ffffff0a" : "#00000016") : channel === "bump" ? (random() > 0.55 ? "#999" : "#555") : `${Math.floor(165 + random() * 70)},${Math.floor(165 + random() * 70)},${Math.floor(165 + random() * 70)}`;
          if (channel === "roughness") context.fillStyle = `rgb(${Math.floor(165 + random() * 70)},${Math.floor(165 + random() * 70)},${Math.floor(165 + random() * 70)})`;
          context.beginPath(); context.ellipse(x, y, radius * 1.8, radius, random(), 0, Math.PI * 2); context.fill();
        }
      }
      for (let crease = 0; crease < (isCloth ? 18 : 38); crease += 1) {
        const x = random() * size;
        const y = random() * size;
        context.strokeStyle = channel === "color" ? "#10080629" : channel === "bump" ? "#33333388" : "#f4f4f477";
        context.lineWidth = random() > 0.85 ? 1.3 : 0.6;
        context.beginPath();
        context.moveTo(x, y);
        context.quadraticCurveTo(x + 9 + random() * 24, y - 3 + random() * 6, x + 20 + random() * 42, y + random() * 5 - 2.5);
        context.stroke();
      }
      if (channel === "color") {
        const wear = context.createLinearGradient(0, 0, size, 0);
        wear.addColorStop(0, "#d7b47a2b"); wear.addColorStop(0.045, "transparent");
        wear.addColorStop(0.94, "transparent"); wear.addColorStop(1, "#13090666");
        context.fillStyle = wear; context.fillRect(0, 0, size, size);
      }
    }, isCloth ? 2.8 : 2.1, isCloth ? 2.8 : 2.1);
  }

  function makeArtworkTexture() {
    return canvasTexture(512, (context, size) => {
      const random = mulberry32(501);

      // A generated night sky in the spirit of a swirling starry-night
      // canvas: procedurally composed strokes and stars, not a reproduction
      // of any specific painting.
      const sky = context.createLinearGradient(0, 0, 0, size);
      sky.addColorStop(0, "#0c1a3a");
      sky.addColorStop(0.55, "#1d3f63");
      sky.addColorStop(0.8, "#3a5f78");
      context.fillStyle = sky;
      context.fillRect(0, 0, size, size);

      for (let swirl = 0; swirl < 7; swirl += 1) {
        const cx = 90 + random() * (size - 180);
        const cy = 50 + random() * (size * 0.55);
        const radius = 28 + random() * 66;
        const turns = 1.2 + random() * 1.6;
        const start = random() * Math.PI * 2;
        context.strokeStyle = `rgba(${210 + random() * 40},${220 + random() * 30},${180 + random() * 60},${0.16 + random() * 0.18})`;
        context.lineWidth = 2 + random() * 3;
        context.beginPath();
        for (let step = 0; step <= 40; step += 1) {
          const t = step / 40;
          const angle = start + t * Math.PI * 2 * turns;
          const r = radius * (0.3 + t * 0.7);
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r * 0.6;
          if (step === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      }

      for (let star = 0; star < 70; star += 1) {
        const x = random() * size;
        const y = random() * size * 0.62;
        const brightness = random();
        const r = brightness > 0.85 ? 2.6 : brightness > 0.55 ? 1.5 : 0.8;
        const glow = context.createRadialGradient(x, y, 0, x, y, r * 4);
        glow.addColorStop(0, `rgba(255,250,225,${0.55 + brightness * 0.4})`);
        glow.addColorStop(1, "rgba(255,250,225,0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, r * 4, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#fffaf0";
        context.beginPath();
        context.arc(x, y, r, 0, Math.PI * 2);
        context.fill();
      }

      const moonX = size * 0.74;
      const moonY = size * 0.22;
      const moonR = 34;
      const halo = context.createRadialGradient(moonX, moonY, moonR * 0.4, moonX, moonY, moonR * 3.2);
      halo.addColorStop(0, "rgba(255,241,196,0.55)");
      halo.addColorStop(1, "rgba(255,241,196,0)");
      context.fillStyle = halo;
      context.beginPath();
      context.arc(moonX, moonY, moonR * 3.2, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#fdf3d0";
      context.beginPath();
      context.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      context.fill();

      // Low hills and a pair of tapering, wind-bent silhouettes ground the
      // sky without tracing any specific painting's composition.
      context.fillStyle = "#0a1220";
      context.beginPath();
      context.moveTo(0, size * 0.82);
      for (let x = 0; x <= size; x += 16) {
        context.lineTo(x, size * 0.8 + Math.sin(x * 0.02 + 4) * 10);
      }
      context.lineTo(size, size);
      context.lineTo(0, size);
      context.closePath();
      context.fill();

      [[size * 0.16, 60], [size * 0.24, 42]].forEach(([x, height]) => {
        context.beginPath();
        context.moveTo(x, size * 0.84);
        for (let step = 0; step <= 10; step += 1) {
          const t = step / 10;
          const sway = Math.sin(t * Math.PI * 3) * (6 * (1 - t));
          context.lineTo(x + sway, size * 0.84 - t * height);
        }
        for (let step = 10; step >= 0; step -= 1) {
          const t = step / 10;
          const sway = Math.sin(t * Math.PI * 3 + 1) * (6 * (1 - t));
          context.lineTo(x + 8 + sway, size * 0.84 - t * height);
        }
        context.closePath();
        context.fill();
      });

      context.strokeStyle = "#c9a55c88";
      context.lineWidth = 2;
      context.strokeRect(28, 28, size - 56, size - 56);
      context.strokeRect(38, 38, size - 76, size - 76);
    });
  }

  function pbrMaterial(textures, options = {}) {
    return new THREE.MeshStandardMaterial({
      map: textures.color,
      bumpMap: textures.bump,
      roughnessMap: textures.roughness,
      bumpScale: options.bumpScale ?? 0.025,
      roughness: options.roughness ?? 0.88,
      metalness: options.metalness ?? 0,
      color: options.color ?? 0xffffff
    });
  }

  const woodTextures = makeWoodTextures(false, 91);
  const darkWoodTextures = makeWoodTextures(true, 147);
  const paperTextures = makePaperTextures(false);
  const pageEdgeTextures = makePaperTextures(true);
  const leatherTextures = makeBindingTextures("#573426", "calf", 119);
  const brassRoughness = canvasTexture(256, (context, size) => {
    const random = mulberry32(822);
    context.fillStyle = "#a9a9a9"; context.fillRect(0, 0, size, size);
    for (let mark = 0; mark < 240; mark += 1) {
      const shade = Math.floor(70 + random() * 150);
      context.fillStyle = `rgba(${shade},${shade},${shade},${0.12 + random() * 0.28})`;
      context.beginPath(); context.arc(random() * size, random() * size, 0.7 + random() * 5, 0, Math.PI * 2); context.fill();
    }
    const recess = context.createLinearGradient(0, 0, size, size);
    recess.addColorStop(0, "#33333366"); recess.addColorStop(0.12, "transparent"); recess.addColorStop(0.88, "transparent"); recess.addColorStop(1, "#25252588");
    context.fillStyle = recess; context.fillRect(0, 0, size, size);
  }, 1, 1, false);
  const materials = {
    wall: new THREE.MeshStandardMaterial({ color: 0x1e2925, roughness: 0.99 }),
    wood: pbrMaterial(woodTextures, { bumpScale: 0.022, roughness: 0.8 }),
    darkWood: pbrMaterial(darkWoodTextures, { bumpScale: 0.018, roughness: 0.84 }),
    paper: pbrMaterial(paperTextures, { bumpScale: 0.009, roughness: 0.96 }),
    pageEdge: pbrMaterial(pageEdgeTextures, { bumpScale: 0.016, roughness: 1 }),
    pageSeam: new THREE.MeshStandardMaterial({ color: 0x8f8063, roughness: 1 }),
    leather: pbrMaterial(leatherTextures, { bumpScale: 0.032, roughness: 0.86 }),
    brass: new THREE.MeshStandardMaterial({ color: 0x8d6c31, roughnessMap: brassRoughness, roughness: 0.62, metalness: 0.72 }),
    artwork: new THREE.MeshStandardMaterial({ map: makeArtworkTexture(), roughness: 0.91 }),
    ink: new THREE.MeshPhysicalMaterial({ color: 0x111817, roughness: 0.22, metalness: 0.08, clearcoat: 0.8 })
  };
  disposableMaterials.push(...Object.values(materials));

  // Compact local albedos add photographic detail to the two largest visible
  // surfaces while generated bump/roughness maps retain stable PBR response.
  // Either request may fail independently without blocking the study.
  function loadLocalAlbedo(url, material, repeat, label) {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(...repeat);
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        disposableTextures.push(texture);
        material.map = texture;
        material.needsUpdate = true;
        render();
      },
      undefined,
      () => console.warn(`The local ${label} albedo could not load; using the generated fallback.`)
    );
  }
  const walnutAlbedoUrl = new URL("./assets/textures/aged-walnut.jpg", import.meta.url).href;
  const paperAlbedoUrl = new URL("./assets/textures/aged-rag-paper.jpg", import.meta.url).href;
  loadLocalAlbedo(walnutAlbedoUrl, materials.wood, [2.15, 1.15], "walnut");
  loadLocalAlbedo(paperAlbedoUrl, materials.paper, [1.28, 1.28], "rag-paper");
  const shelfBookMaterials = ["#49372f", "#394d46", "#5c3c40", "#46526b", "#67552f"].map((color) => {
    const texture = makeBindingTextures(color, "cloth", color.charCodeAt(1) * 31);
    const material = pbrMaterial(texture, { bumpScale: 0.018, roughness: 0.94 });
    disposableMaterials.push(material);
    return material;
  });

  addLights();
  addRoom();
  const bookGroup = addReadingStandAndBook();
  addStack();

  function mesh(geometry, material, { position, rotation, cast = true, receive = true } = {}) {
    disposableGeometries.push(geometry);
    const object = new THREE.Mesh(geometry, material);
    if (position) object.position.set(...position);
    if (rotation) object.rotation.set(...rotation);
    object.castShadow = cast;
    object.receiveShadow = receive;
    scene.add(object);
    return object;
  }

  function addLights() {
    scene.add(new THREE.HemisphereLight(0xa9b1a8, 0x352117, 1.08));
    scene.add(new THREE.AmbientLight(0x8e8b80, 0.38));

    // A local point source supplies the visible warm falloff. A parallel warm
    // key from the same direction supplies one economical shadow map without
    // exposing a spotlight cone edge across the nearly vertical pages.
    const lampGlow = new THREE.PointLight(0xffc978, 48, 15, 2);
    lampGlow.position.set(-4.82, 5.18, 2.28);
    scene.add(lampGlow);
    const lamp = new THREE.DirectionalLight(0xffd39a, 1.65);
    lamp.position.set(-4.82, 6.0, 6.2);
    lamp.target.position.set(-1.25, 2.25, 0.42);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.bias = -0.00028;
    lamp.shadow.normalBias = 0.025;
    lamp.shadow.camera.left = -8;
    lamp.shadow.camera.right = 8;
    lamp.shadow.camera.top = 7;
    lamp.shadow.camera.bottom = -4;
    lamp.shadow.camera.near = 0.1;
    lamp.shadow.camera.far = 20;
    scene.add(lamp, lamp.target);

    const stackFill = new THREE.PointLight(0x9bada7, 27, 12, 2);
    stackFill.position.set(5.2, 4.9, 4.1);
    scene.add(stackFill);

    const shelfGlow = new THREE.PointLight(0xc58a50, 5.2, 8, 2.2);
    shelfGlow.position.set(6.6, 4.7, -1.9);
    scene.add(shelfGlow);

    const leftShelfGlow = new THREE.PointLight(0xad7647, 4.2, 7, 2.3);
    leftShelfGlow.position.set(-7.0, 4.4, -1.85);
    scene.add(leftShelfGlow);
  }

  function addRoom() {
    const blotterMaterial = new THREE.MeshStandardMaterial({ color: 0x3b2b23, roughness: 0.96 });
    disposableMaterials.push(blotterMaterial);
    mesh(new THREE.BoxGeometry(20, 10, 0.4), materials.wall, { position: [0, 4.2, -3.45] });
    [-5.15, 0.22, 5.48].forEach((x) => {
      mesh(new THREE.BoxGeometry(0.13, 8.1, 0.18), materials.darkWood, { position: [x, 4.2, -3.17], cast: false });
    });
    [0.72, 5.7, 8.24].forEach((y, index) => {
      mesh(new THREE.BoxGeometry(20, index === 1 ? 0.14 : 0.09, 0.2), materials.darkWood, { position: [0, y, -3.14], cast: false });
    });
    // Shallow beveled battens make the panel wall read as construction rather
    // than a single dark box while staying well behind the reading position.
    [[-2.48, 6.92, 4.7, 1.84], [2.95, 6.92, 4.55, 1.84]].forEach(([x, y, width, height]) => {
      mesh(new THREE.BoxGeometry(width, 0.08, 0.13), materials.darkWood, { position: [x, y + height / 2, -3.03], cast: false });
      mesh(new THREE.BoxGeometry(width, 0.08, 0.13), materials.darkWood, { position: [x, y - height / 2, -3.03], cast: false });
      [-1, 1].forEach((side) => mesh(new THREE.BoxGeometry(0.08, height, 0.13), materials.darkWood, { position: [x + side * width / 2, y, -3.03], cast: false }));
    });
    mesh(new THREE.BoxGeometry(20, 0.7, 8.5), materials.wood, { position: [0, -0.55, 1.05] });
    mesh(new THREE.BoxGeometry(20.2, 0.78, 0.5), materials.darkWood, { position: [0, -0.5, 5.05] });
    mesh(new THREE.BoxGeometry(9.15, 0.045, 5.4), blotterMaterial, { position: [-1.95, -0.17, 0.65], cast: false });

    addRecessedBookcase(-7.32, 3.55, 2.85);
    addRecessedBookcase(7.05, 3.72, 3.18);

    const lampStem = mesh(new THREE.CylinderGeometry(0.065, 0.085, 5.2, 18), materials.brass, { position: [-6.02, 2.52, 0.32] });
    lampStem.castShadow = true;
    const shadeMaterial = new THREE.MeshStandardMaterial({ color: 0x1d4a3c, emissive: 0x06130e, emissiveIntensity: 0.3, roughness: 0.53, metalness: 0.08, side: THREE.DoubleSide });
    const shadeInterior = new THREE.MeshStandardMaterial({ color: 0xc49b54, roughness: 0.7, metalness: 0.32, side: THREE.BackSide });
    disposableMaterials.push(shadeMaterial, shadeInterior);
    const shade = mesh(new THREE.CylinderGeometry(0.48, 0.9, 0.72, 30, 1, true), shadeMaterial, { position: [-4.9, 5.54, 2.18], rotation: [0, 0, -0.13], cast: false });
    shade.material.side = THREE.DoubleSide;
    mesh(new THREE.CylinderGeometry(0.465, 0.87, 0.7, 30, 1, true), shadeInterior, { position: [-4.89, 5.52, 2.195], rotation: [0, 0, -0.13], cast: false });
    const bulbMaterial = new THREE.MeshStandardMaterial({ color: 0xffd89a, emissive: 0xffb95d, emissiveIntensity: 2.5 });
    disposableMaterials.push(bulbMaterial);
    mesh(new THREE.SphereGeometry(0.16, 18, 14), bulbMaterial, { position: [-4.82, 5.19, 2.23], cast: false });
    const addBrassRod = (start, end, radius = 0.055) => {
      const from = new THREE.Vector3(...start);
      const to = new THREE.Vector3(...end);
      const direction = to.clone().sub(from);
      const rod = mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 14), materials.brass, {
        position: from.clone().add(to).multiplyScalar(0.5).toArray()
      });
      rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      return rod;
    };
    addBrassRod([-6.02, 5.08, 0.32], [-5.78, 5.25, 1.34], 0.06);
    addBrassRod([-5.78, 5.25, 1.34], [-5.02, 5.25, 2.1], 0.055);
    mesh(new THREE.CylinderGeometry(0.7, 0.86, 0.15, 28), materials.brass, { position: [-6.02, -0.05, 0.32] });

    mesh(new THREE.BoxGeometry(2.25, 2.75, 0.22), materials.darkWood, { position: [4.72, 4.35, -3.08], rotation: [0, 0, -0.012] });
    mesh(new THREE.BoxGeometry(1.92, 2.42, 0.08), materials.artwork, { position: [4.72, 4.35, -2.94], rotation: [0, 0, -0.012], cast: false });

    // A small inkwell gives the desk a useful scale cue without competing with
    // the selector. It remains behind the foremost book-spine plane.
    mesh(new THREE.CylinderGeometry(0.3, 0.37, 0.42, 18), materials.ink, { position: [6.55, 0.06, 0.82] });
    mesh(new THREE.CylinderGeometry(0.17, 0.23, 0.12, 18), materials.brass, { position: [6.55, 0.33, 0.82] });
  }

  function addRecessedBookcase(x, centerY, width) {
    const height = 5.6;
    const frameDepth = -2.9;
    const backMaterial = new THREE.MeshStandardMaterial({ color: 0x131a17, roughness: 0.99 });
    disposableMaterials.push(backMaterial);
    mesh(new THREE.BoxGeometry(width, height, 0.16), backMaterial, { position: [x, centerY, -3.16], cast: false });

    [-1, 1].forEach((side) => {
      mesh(new THREE.BoxGeometry(0.22, height + 0.34, 0.48), materials.darkWood, {
        position: [x + side * (width / 2 + 0.08), centerY, frameDepth]
      });
    });
    mesh(new THREE.BoxGeometry(width + 0.38, 0.22, 0.5), materials.darkWood, {
      position: [x, centerY + height / 2 + 0.1, frameDepth]
    });
    mesh(new THREE.BoxGeometry(width + 0.62, 0.11, 0.58), materials.wood, {
      position: [x, centerY + height / 2 + 0.26, frameDepth + 0.02]
    });

    const shelfLevels = [1.25, 2.6, 3.95, 5.3];
    shelfLevels.forEach((level, shelfIndex) => {
      const y = centerY - height / 2 + level;
      mesh(new THREE.BoxGeometry(width + 0.15, 0.16, 0.62), materials.darkWood, {
        position: [x, y, -2.82]
      });

      const random = mulberry32(Math.floor((x + 9) * 1000) + shelfIndex * 97);
      let cursor = x - width / 2 + 0.2 + (shelfIndex % 3) * 0.08;
      const count = 5 + Math.floor(random() * 5);
      for (let index = 0; index < count; index += 1) {
        if (index === 2 && shelfIndex % 2 === 0) cursor += 0.16 + random() * 0.18;
        const bookWidth = 0.16 + random() * 0.16;
        const bookHeight = 0.52 + random() * 0.37;
        const material = shelfBookMaterials[(index + shelfIndex) % shelfBookMaterials.length];
        const geometry = new THREE.BoxGeometry(bookWidth, bookHeight, 0.38);
        disposableGeometries.push(geometry);
        const book = new THREE.Mesh(geometry, material);
        book.position.set(cursor + bookWidth / 2, y + 0.08 + bookHeight / 2, -2.48 - random() * 0.07);
        book.rotation.z = index % 4 === 0 ? (random() - 0.5) * 0.095 : (random() - 0.5) * 0.018;
        book.castShadow = true;
        book.receiveShadow = true;
        scene.add(book);
        cursor += bookWidth + 0.025 + random() * 0.05;
        if (cursor > x + width / 2 - 0.18) break;
      }
    });
  }

  function addReadingStandAndBook() {
    const group = new THREE.Group();
    group.position.set(-2.1, 2.55, 0.15);
    scene.add(group);

    const boardGeometry = new THREE.BoxGeometry(8.55, 5.0, 0.38);
    disposableGeometries.push(boardGeometry);
    const board = new THREE.Mesh(boardGeometry, materials.darkWood);
    board.position.z = -0.3;
    board.castShadow = true;
    board.receiveShadow = true;
    group.add(board);

    // A slim brass frame around the exposed margin (the board is larger than
    // the book it holds) reads as a finished picture/lectern panel instead of
    // bare plywood, echoing the brass already used on the lamp and inkwell.
    const boardFrameZ = board.position.z + boardGeometry.parameters.depth / 2 + 0.02;
    const boardFrameThickness = 0.11;
    [
      [8.55, boardFrameThickness, 0, 2.5 - boardFrameThickness / 2],
      [8.55, boardFrameThickness, 0, -(2.5 - boardFrameThickness / 2)],
      [boardFrameThickness, 5.0, 4.275 - boardFrameThickness / 2, 0],
      [boardFrameThickness, 5.0, -(4.275 - boardFrameThickness / 2), 0]
    ].forEach(([width, height, x, y]) => {
      const stripGeometry = new THREE.BoxGeometry(width, height, 0.05);
      disposableGeometries.push(stripGeometry);
      const strip = new THREE.Mesh(stripGeometry, materials.brass);
      strip.position.set(x, y, boardFrameZ);
      strip.castShadow = false;
      group.add(strip);
    });

    const ledgeGeometry = new THREE.BoxGeometry(8.8, 0.3, 0.68);
    disposableGeometries.push(ledgeGeometry);
    const ledge = new THREE.Mesh(ledgeGeometry, materials.wood);
    ledge.position.set(0, -2.35, 0.18);
    ledge.castShadow = true;
    group.add(ledge);

    // The desk surface sits only ~0.25 units below the ledge, so the previous
    // support (a single box rotated into a diamond) had to be oversized to
    // clear the desktop at all; half of it was buried inside the tabletop and
    // only its upper point ever read on screen. A shallow plinth spanning the
    // ledge's footprint, with two corner feet that project forward past the
    // ledge's own front edge, gives the base a real silhouette within that
    // same tight gap instead of a floating rotated block.
    // The plinth uses the lighter wood (not the board's dark wood) because
    // this whole shelf sits directly against the desk's dark leather blotter;
    // a dark-on-dark base was invisible here in practice, reading as nothing
    // more than a stray brass highlight.
    const plinthGeometry = new THREE.BoxGeometry(8.3, 0.34, 0.56);
    disposableGeometries.push(plinthGeometry);
    const plinth = new THREE.Mesh(plinthGeometry, materials.wood);
    plinth.position.set(0, -2.62, 0.14);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    const plinthCapGeometry = new THREE.BoxGeometry(8.34, 0.04, 0.58);
    disposableGeometries.push(plinthCapGeometry);
    const plinthCap = new THREE.Mesh(plinthCapGeometry, materials.brass);
    plinthCap.position.set(0, -2.45, 0.14);
    plinthCap.castShadow = false;
    group.add(plinthCap);

    // The feet don't need their own brass cap: the plinth cap above already
    // spans their width, so the accent line still crosses them without a
    // second, redundant strip at each corner.
    const footGeometry = new THREE.BoxGeometry(0.62, 0.34, 0.74);
    disposableGeometries.push(footGeometry);
    [-1, 1].forEach((side) => {
      const foot = new THREE.Mesh(footGeometry, materials.wood);
      foot.position.set(side * 3.85, -2.62, 0.32);
      foot.castShadow = true;
      foot.receiveShadow = true;
      group.add(foot);
    });

    // The catalogue drawer was originally set into the desk's own front
    // apron, but that surface sits far enough toward the camera (world z
    // ~5.3) that it projects below the visible canvas at this focal length —
    // a screenshot caught it rendering entirely off-screen. The lectern's own
    // plinth is already inside the visible, well-lit frame, so the drawer
    // (dark front panel, brass escutcheon and knob) is built into its front
    // face instead, between the two corner feet.
    const plinthFrontZ = plinth.position.z + plinthGeometry.parameters.depth / 2;
    const drawerFrontGeometry = new THREE.BoxGeometry(4.3, 0.24, 0.12);
    disposableGeometries.push(drawerFrontGeometry);
    const drawerFront = new THREE.Mesh(drawerFrontGeometry, materials.darkWood);
    drawerFront.position.set(0, -2.62, plinthFrontZ + 0.06);
    drawerFront.castShadow = true;
    drawerFront.receiveShadow = true;
    group.add(drawerFront);
    const drawerFrontFaceZ = drawerFront.position.z + drawerFrontGeometry.parameters.depth / 2;

    const escutcheonGeometry = new THREE.BoxGeometry(0.34, 0.17, 0.03);
    disposableGeometries.push(escutcheonGeometry);
    const escutcheon = new THREE.Mesh(escutcheonGeometry, materials.brass);
    escutcheon.position.set(0, -2.62, drawerFrontFaceZ + 0.015);
    escutcheon.castShadow = false;
    group.add(escutcheon);

    const drawerKnobGeometry = new THREE.CylinderGeometry(0.065, 0.085, 0.06, 16);
    disposableGeometries.push(drawerKnobGeometry);
    const drawerKnob = new THREE.Mesh(drawerKnobGeometry, materials.brass);
    drawerKnob.position.set(0, -2.62, drawerFrontFaceZ + 0.06);
    drawerKnob.rotation.x = Math.PI / 2;
    drawerKnob.castShadow = true;
    group.add(drawerKnob);

    archiveDrawerLocal = {
      y: drawerFront.position.y,
      width: drawerFrontGeometry.parameters.width,
      height: drawerFrontGeometry.parameters.height,
      frontZ: drawerFrontFaceZ
    };

    // A soft contact patch strengthens the book/lectern junction without an
    // integrated-GPU post-processing pass.
    const contactMaterial = new THREE.MeshBasicMaterial({ color: 0x100906, transparent: true, opacity: 0.24, depthWrite: false });
    disposableMaterials.push(contactMaterial);
    const contactGeometry = new THREE.PlaneGeometry(7.9, 4.3);
    disposableGeometries.push(contactGeometry);
    const contact = new THREE.Mesh(contactGeometry, contactMaterial);
    contact.position.set(0, -0.06, -0.075);
    group.add(contact);

    const halfWidth = BOOK_WIDTH / 2;
    [-1, 1].forEach((side) => {
      const halfGroup = new THREE.Group();
      halfGroup.position.x = side * halfWidth / 2;
      halfGroup.rotation.y = side * -0.046 + (side < 0 ? -0.006 : 0.004);
      group.add(halfGroup);

      const coverGeometry = new THREE.ExtrudeGeometry(
        roundedRectangle(halfWidth + 0.18, BOOK_HEIGHT + 0.2, 0.13 + (side > 0 ? 0.018 : 0)),
        { depth: 0.1, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.028, bevelThickness: 0.018, curveSegments: 5 }
      );
      const pagesGeometry = new THREE.ExtrudeGeometry(
        roundedRectangle(halfWidth - 0.07, BOOK_HEIGHT - 0.09, 0.085),
        { depth: 0.235 + (side > 0 ? 0.012 : 0), bevelEnabled: true, bevelSegments: 2, bevelSize: 0.018, bevelThickness: 0.012, curveSegments: 4 }
      );
      disposableGeometries.push(coverGeometry, pagesGeometry);

      const cover = new THREE.Mesh(coverGeometry, materials.leather);
      cover.position.set(0, side < 0 ? -0.018 : 0.012, -0.045);
      cover.castShadow = true;
      cover.receiveShadow = true;
      halfGroup.add(cover);
      openCoverMeshes.push(cover);

      const pages = new THREE.Mesh(pagesGeometry, materials.pageEdge);
      pages.position.set(side * -0.018, side < 0 ? 0.006 : -0.004, 0.095);
      pages.castShadow = true;
      pages.receiveShadow = true;
      halfGroup.add(pages);

      const faceGeometry = new THREE.PlaneGeometry(halfWidth - 0.17, BOOK_HEIGHT - 0.17, 24, 14);
      const positions = faceGeometry.attributes.position;
      for (let index = 0; index < positions.count; index += 1) {
        const x = positions.getX(index);
        const y = positions.getY(index);
        const localHalf = (halfWidth - 0.17) / 2;
        const rawDistanceFromGutter = side < 0
          ? (localHalf - x) / (localHalf * 2)
          : (x + localHalf) / (localHalf * 2);
        const distanceFromGutter = THREE.MathUtils.clamp(rawDistanceFromGutter, 0, 1);
        const vertical = (y + (BOOK_HEIGHT - 0.17) / 2) / (BOOK_HEIGHT - 0.17);
        const gutterLift = 0.07 * Math.exp(-distanceFromGutter * 5.1);
        const outerSag = -0.014 * Math.pow(distanceFromGutter, 1.55);
        const sheetSag = -Math.sin(vertical * Math.PI) * (0.005 + distanceFromGutter * 0.006);
        const asymmetry = side < 0 ? Math.sin(vertical * Math.PI * 2) * 0.005 : -Math.sin(vertical * Math.PI) * 0.003;
        positions.setZ(index, gutterLift + outerSag + sheetSag + asymmetry);
      }
      faceGeometry.computeVertexNormals();
      disposableGeometries.push(faceGeometry);
      const face = new THREE.Mesh(faceGeometry, materials.paper);
      face.position.set(side * -0.025, side < 0 ? 0.012 : -0.008, 0.415);
      // The leaf is an ultra-thin surface. Let the thicker text block and
      // covers cast/receive contact shadows; self-shadowing this tessellated
      // face creates meter-scale shadow acne across the printed area.
      face.castShadow = false;
      face.receiveShadow = false;
      halfGroup.add(face);

      // A few independently offset edges break the perfect page-block seam at
      // the final camera distance without modeling hundreds of sheets.
      for (let layer = 0; layer < 3; layer += 1) {
        [-1, 1].forEach((edgeSide) => {
          const edgeGeometry = new THREE.BoxGeometry(halfWidth - 0.2 - layer * 0.014, 0.009, 0.15);
          disposableGeometries.push(edgeGeometry);
          const edge = new THREE.Mesh(edgeGeometry, materials.pageEdge);
          edge.position.set((layer % 2 ? 1 : -1) * 0.006, edgeSide * (BOOK_HEIGHT / 2 - 0.07 - layer * 0.014), 0.27 + layer * 0.006);
          edge.rotation.z = edgeSide * (layer - 1) * 0.0007 * side;
          edge.castShadow = true;
          halfGroup.add(edge);
        });
      }

      // The exposed fore-edge uses three nearly coincident sheet lips. Their
      // tiny offsets read as accumulated leaves only where the face is inset.
      for (let layer = 0; layer < 3; layer += 1) {
        const foreEdgeGeometry = new THREE.BoxGeometry(0.007, BOOK_HEIGHT - 0.22 - layer * 0.012, 0.145);
        disposableGeometries.push(foreEdgeGeometry);
        const foreEdge = new THREE.Mesh(foreEdgeGeometry, materials.pageEdge);
        foreEdge.position.set(side * (halfWidth / 2 - 0.052 - layer * 0.008), (layer - 1) * 0.004, 0.275 + layer * 0.006);
        foreEdge.castShadow = false;
        halfGroup.add(foreEdge);
      }
    });

    const hingeGeometry = new THREE.CylinderGeometry(0.07, 0.095, BOOK_HEIGHT, 24);
    disposableGeometries.push(hingeGeometry);
    const hinge = new THREE.Mesh(hingeGeometry, materials.leather);
    hinge.position.z = 0.31;
    hinge.castShadow = true;
    group.add(hinge);

    const leafGeometry = new THREE.PlaneGeometry(halfWidth - 0.2, BOOK_HEIGHT - 0.2, 18, 10);
    const leafPositions = leafGeometry.attributes.position;
    for (let index = 0; index < leafPositions.count; index += 1) {
      const x = leafPositions.getX(index);
      const normalized = (x + (halfWidth - 0.2) / 2) / (halfWidth - 0.2);
      leafPositions.setZ(index, Math.sin(normalized * Math.PI) * 0.035);
    }
    leafGeometry.computeVertexNormals();
    disposableGeometries.push(leafGeometry);
    turningLeaf = new THREE.Group();
    const leaf = new THREE.Mesh(leafGeometry, materials.paper);
    leaf.position.x = (halfWidth - 0.2) / 2;
    leaf.castShadow = true;
    turningLeaf.position.set(0.02, -0.01, 0.49);
    turningLeaf.visible = false;
    turningLeaf.add(leaf);
    group.add(turningLeaf);

    return group;
  }

  function addStack() {
    const gap = 0.028;
    const profiles = records.map(getBindingProfile);
    const centers = new Array(records.length);
    let cursor = 0.03;
    for (let index = records.length - 1; index >= 0; index -= 1) {
      centers[index] = cursor + profiles[index].thickness / 2;
      cursor += profiles[index].thickness + gap;
    }

    records.forEach((record, index) => {
      const profile = profiles[index];
      const { width, thickness, depth } = profile;
      const bindingTextures = makeBindingTextures(record.color, profile.kind, profile.seed);
      const bindingMaterial = pbrMaterial(bindingTextures, {
        bumpScale: profile.kind === "cloth" || profile.kind === "buckram" ? 0.018 : 0.032,
        roughness: profile.kind === "cloth" ? 0.96 : profile.kind === "buckram" ? 0.92 : 0.86
      });
      disposableMaterials.push(bindingMaterial);

      const object = new THREE.Group();
      object.position.set(4.45 + profile.offset, centers[index], 0.69 + ((profile.seed >>> 19) % 5) * 0.012);
      object.rotation.z = profile.lean;
      scene.add(object);

      const boardThickness = 0.045;
      const paperBlockGeometry = new THREE.BoxGeometry(width - 0.17, thickness - boardThickness * 2 - 0.025, depth - 0.16);
      disposableGeometries.push(paperBlockGeometry);
      const paperBlock = new THREE.Mesh(paperBlockGeometry, materials.pageEdge);
      paperBlock.position.z = -0.055;
      paperBlock.castShadow = true;
      paperBlock.receiveShadow = true;
      object.add(paperBlock);

      // A handful of sub-pixel head/tail seams catch oblique light without
      // turning the text block into striped decorative boards.
      const seamGeometry = new THREE.BoxGeometry(0.012, 0.004, depth - 0.22);
      disposableGeometries.push(seamGeometry);
      [-1, 1].forEach((end) => {
        [-0.29, 0, 0.31].forEach((layer) => {
          const seam = new THREE.Mesh(seamGeometry, materials.pageSeam);
          seam.position.set(end * (width / 2 - 0.083), layer * (thickness - boardThickness * 2), -0.055);
          seam.castShadow = false;
          object.add(seam);
        });
      });

      const boardGeometry = new THREE.BoxGeometry(width, boardThickness, depth + 0.035);
      disposableGeometries.push(boardGeometry);
      [-1, 1].forEach((side) => {
        const board = new THREE.Mesh(boardGeometry, bindingMaterial);
        board.position.y = side * (thickness / 2 - boardThickness / 2);
        board.castShadow = true;
        board.receiveShadow = true;
        object.add(board);
      });

      // The binding skin sits over the page block. Rounded volumes use a
      // cylindrical spine; cloth and buckram retain a flatter case profile.
      if (profile.rounded) {
        const spineGeometry = new THREE.CylinderGeometry(thickness / 2, thickness / 2, width, 20, 1, false);
        disposableGeometries.push(spineGeometry);
        const spine = new THREE.Mesh(spineGeometry, bindingMaterial);
        spine.rotation.z = Math.PI / 2;
        spine.scale.z = 0.3;
        spine.position.z = depth / 2 + 0.005;
        spine.castShadow = true;
        spine.receiveShadow = true;
        object.add(spine);
      } else {
        const spineGeometry = new THREE.BoxGeometry(width, thickness - 0.018, 0.115);
        disposableGeometries.push(spineGeometry);
        const spine = new THREE.Mesh(spineGeometry, bindingMaterial);
        spine.position.z = depth / 2 + 0.012;
        spine.castShadow = true;
        spine.receiveShadow = true;
        object.add(spine);
      }

      if (profile.kind === "half-leather") {
        const clothTextures = makeBindingTextures(record.color, "cloth", profile.seed + 17);
        const clothMaterial = pbrMaterial(clothTextures, { bumpScale: 0.016, roughness: 0.95 });
        disposableMaterials.push(clothMaterial);
        const panelGeometry = new THREE.BoxGeometry(width * 0.58, boardThickness + 0.009, depth + 0.052);
        disposableGeometries.push(panelGeometry);
        [-1, 1].forEach((side) => {
          const panel = new THREE.Mesh(panelGeometry, clothMaterial);
          panel.position.set(width * 0.07, side * (thickness / 2 - boardThickness / 2), 0);
          panel.castShadow = true;
          object.add(panel);
        });
      }

      for (let band = 0; band < profile.bands; band += 1) {
        const bandGeometry = new THREE.BoxGeometry(0.036, thickness - 0.012, 0.035);
        disposableGeometries.push(bandGeometry);
        const bandMesh = new THREE.Mesh(bandGeometry, bindingMaterial);
        bandMesh.position.set(-width * 0.3 + band * (width * 0.6 / Math.max(1, profile.bands - 1)), 0, depth / 2 + 0.075);
        bandMesh.castShadow = true;
        object.add(bandMesh);
      }

      stackBooks.push({ object, width, thickness, depth, homeX: object.position.x, profile, bindingMaterial });
    });

    mesh(new THREE.BoxGeometry(4.62, 0.24, 2.85), materials.darkWood, { position: [4.45, -0.1, 0.66] });
  }

  function projectPoint(point) {
    const projected = point.clone().project(camera);
    const bounds = study.getBoundingClientRect();
    return {
      x: (projected.x * 0.5 + 0.5) * bounds.width,
      y: (-projected.y * 0.5 + 0.5) * bounds.height
    };
  }

  function projectRectangle(corners) {
    const points = corners.map(projectPoint);
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    return { left, top, width: right - left, height: bottom - top };
  }

  function updateDomLayout() {
    // DOM surfaces receive only projected physical bounds. Paper color and
    // binding shape stay in WebGL so typography cannot become a floating card.
    const bookCorners = [
      new THREE.Vector3(-BOOK_WIDTH / 2 + 0.16, BOOK_HEIGHT / 2 - 0.15, 0.43),
      new THREE.Vector3(BOOK_WIDTH / 2 - 0.16, BOOK_HEIGHT / 2 - 0.15, 0.43),
      new THREE.Vector3(BOOK_WIDTH / 2 - 0.16, -BOOK_HEIGHT / 2 + 0.16, 0.4),
      new THREE.Vector3(-BOOK_WIDTH / 2 + 0.16, -BOOK_HEIGHT / 2 + 0.16, 0.4)
    ].map((point) => bookGroup.localToWorld(point));

    const spineBounds = stackBooks.map(({ object, width, thickness, depth }) => {
      const x = object.position.x;
      const y = object.position.y;
      const z = object.position.z + depth / 2 + 0.02;
      return projectRectangle([
        new THREE.Vector3(x - width / 2, y + thickness / 2, z),
        new THREE.Vector3(x + width / 2, y + thickness / 2, z),
        new THREE.Vector3(x + width / 2, y - thickness / 2, z),
        new THREE.Vector3(x - width / 2, y - thickness / 2, z)
      ]);
    });

    const drawerCorners = [
      new THREE.Vector3(-archiveDrawerLocal.width / 2, archiveDrawerLocal.y + archiveDrawerLocal.height / 2, archiveDrawerLocal.frontZ),
      new THREE.Vector3(archiveDrawerLocal.width / 2, archiveDrawerLocal.y + archiveDrawerLocal.height / 2, archiveDrawerLocal.frontZ),
      new THREE.Vector3(archiveDrawerLocal.width / 2, archiveDrawerLocal.y - archiveDrawerLocal.height / 2, archiveDrawerLocal.frontZ),
      new THREE.Vector3(-archiveDrawerLocal.width / 2, archiveDrawerLocal.y - archiveDrawerLocal.height / 2, archiveDrawerLocal.frontZ)
    ].map((point) => bookGroup.localToWorld(point));

    onLayout({
      book: projectRectangle(bookCorners),
      spines: spineBounds,
      drawer: projectRectangle(drawerCorners)
    });
  }

  function resize() {
    const bounds = study.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.aspect = aspect;
    // Taller laptop viewports project more horizontal page width. The camera
    // opens slightly and recenters in two small steps, keeping the book large
    // while protecting both the left page edge and the rightmost spine.
    if (aspect < 1.66) {
      camera.fov = 35;
      bookGroup.position.x = -1.92;
      camera.position.x = 0.08;
    } else if (aspect < 1.72) {
      camera.fov = 33.5;
      bookGroup.position.x = -2.05;
      camera.position.x = 0.15;
    } else {
      camera.fov = 32;
      bookGroup.position.x = -2.1;
      camera.position.x = 0;
    }
    cameraTarget.x = camera.position.x;
    camera.lookAt(cameraTarget);
    camera.updateProjectionMatrix();
    render();
    updateDomLayout();
  }

  function setSelected(index, { animate = true } = {}) {
    cancelAnimationFrame(selectionFrame);
    const starts = stackBooks.map(({ object }) => object.position.x);
    const targets = stackBooks.map(({ homeX }, recordIndex) => homeX + (recordIndex === index ? -0.32 : 0));
    const selectedBook = stackBooks[index];
    openCoverMeshes.forEach((cover) => { cover.material = selectedBook.bindingMaterial; });

    if (!animate) {
      stackBooks.forEach(({ object }, recordIndex) => { object.position.x = targets[recordIndex]; });
      turningLeaf.visible = false;
      turningLeaf.rotation.y = 0;
      render();
      updateDomLayout();
      return;
    }

    // Each request owns one short animation frame loop. A newer selection
    // cancels this loop and retargets from the current positions, so movement
    // can never queue or restore stale project state.
    turningLeaf.visible = true;
    turningLeaf.rotation.y = 0;
    const startedAt = performance.now();
    function animateSelection(now) {
      const progress = Math.min(1, (now - startedAt) / 280);
      const eased = 1 - Math.pow(1 - progress, 3);
      stackBooks.forEach(({ object }, recordIndex) => {
        object.position.x = THREE.MathUtils.lerp(starts[recordIndex], targets[recordIndex], eased);
      });
      const lift = Math.sin(progress * Math.PI);
      turningLeaf.rotation.y = -lift * 0.16;
      turningLeaf.position.z = 0.49 + lift * 0.19;
      render();
      updateDomLayout();
      if (progress < 1) selectionFrame = requestAnimationFrame(animateSelection);
      else {
        turningLeaf.visible = false;
        turningLeaf.rotation.y = 0;
        turningLeaf.position.z = 0.49;
        selectionFrame = 0;
        render();
      }
    }
    selectionFrame = requestAnimationFrame(animateSelection);
  }

  function dispose() {
    disposed = true;
    window.removeEventListener("resize", resize);
    cancelAnimationFrame(selectionFrame);
    disposableGeometries.forEach((geometry) => geometry.dispose());
    disposableMaterials.forEach((material) => material.dispose());
    disposableTextures.forEach((texture) => texture.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  function getDiagnostics() {
    return {
      renderCount,
      pixelRatio: renderer.getPixelRatio(),
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      selectionAnimating: selectionFrame !== 0
    };
  }

  return { setSelected, resize, dispose, getDiagnostics };
}
