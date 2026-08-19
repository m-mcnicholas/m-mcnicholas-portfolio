import * as THREE from "three";

const BOOK_WIDTH = 8.1;
const BOOK_HEIGHT = 4.55;

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
  scene.background = new THREE.Color(0x111816);
  scene.fog = new THREE.Fog(0x111816, 16, 28);

  // A nearly level sightline makes the pages face the reader. The previous
  // implementation looked down by roughly 31 degrees and flattened the book.
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  const cameraTarget = new THREE.Vector3(0, 2.75, 0.25);
  camera.position.set(0, 3.35, 14.4);
  camera.lookAt(cameraTarget);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  stage.append(renderer.domElement);

  const disposableGeometries = [];
  const disposableMaterials = [];
  const disposableTextures = [];
  const stackBooks = [];
  let selectionFrame = 0;

  function canvasTexture(size, draw, repeatX = 1, repeatY = 1) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas textures are unavailable.");
    draw(context, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    disposableTextures.push(texture);
    return texture;
  }

  function makeWoodTexture(dark = false) {
    return canvasTexture(512, (context, size) => {
      context.fillStyle = dark ? "#342017" : "#624029";
      context.fillRect(0, 0, size, size);
      for (let y = 7; y < size; y += 13) {
        context.strokeStyle = `rgba(${dark ? "176,119,78" : "205,147,96"},${0.035 + (y % 5) * 0.008})`;
        context.lineWidth = 1 + (y % 3);
        context.beginPath();
        for (let x = 0; x <= size; x += 8) {
          const wave = Math.sin(x * 0.036 + y * 0.05) * 4 + Math.sin(x * 0.011) * 3;
          if (x === 0) context.moveTo(x, y + wave);
          else context.lineTo(x, y + wave);
        }
        context.stroke();
      }
      for (let x = 55; x < size; x += 137) {
        const gradient = context.createRadialGradient(x, size * 0.45, 3, x, size * 0.45, 38);
        gradient.addColorStop(0, "#1d0e0875");
        gradient.addColorStop(0.18, "transparent");
        gradient.addColorStop(0.33, "#1d0e0830");
        gradient.addColorStop(1, "transparent");
        context.fillStyle = gradient;
        context.fillRect(x - 42, size * 0.34, 84, 115);
      }
      for (let index = 0; index < 34; index += 1) {
        const x = (index * 89 + 23) % size;
        const y = (index * 151 + 17) % size;
        context.strokeStyle = index % 3 ? "#f3c78d13" : "#1309062b";
        context.lineWidth = index % 4 === 0 ? 2 : 1;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(Math.min(size, x + 18 + index % 31), y + (index % 5) - 2);
        context.stroke();
      }
    }, 3.5, 2);
  }

  function makePaperTexture(edge = false) {
    return canvasTexture(256, (context, size) => {
      context.fillStyle = edge ? "#c7b181" : "#eadbb8";
      context.fillRect(0, 0, size, size);
      for (let y = 2; y < size; y += edge ? 4 : 9) {
        context.fillStyle = edge ? "#8d74472a" : "#72522f10";
        context.fillRect(0, y, size, 1);
      }
      for (let index = 0; index < 90; index += 1) {
        const x = (index * 73) % size;
        const y = (index * 41) % size;
        context.fillStyle = index % 3 ? "#6d512010" : "#fff9dc25";
        context.fillRect(x, y, 1, 1);
      }
      if (!edge) {
        const stain = context.createRadialGradient(size * 0.82, size * 0.14, 2, size * 0.82, size * 0.14, 48);
        stain.addColorStop(0, "#9d713616");
        stain.addColorStop(0.62, "#9d71360a");
        stain.addColorStop(1, "transparent");
        context.fillStyle = stain;
        context.fillRect(0, 0, size, size);
        for (let index = 0; index < 22; index += 1) {
          const x = (index * 97) % size;
          const y = (index * 61) % size;
          context.strokeStyle = "#6a4a2410";
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(Math.min(size, x + 24), y + 2);
          context.stroke();
        }
      }
    }, edge ? 1 : 2, edge ? 5 : 2);
  }

  function makeLeatherTexture(color = "#633f31") {
    return canvasTexture(256, (context, size) => {
      context.fillStyle = color;
      context.fillRect(0, 0, size, size);
      for (let y = 1; y < size; y += 5) {
        context.fillStyle = y % 10 ? "#ffffff08" : "#0000000b";
        context.fillRect(0, y, size, 1);
      }
      for (let index = 0; index < 65; index += 1) {
        const x = (index * 47) % size;
        const y = (index * 83) % size;
        context.fillStyle = index % 2 ? "#ffffff08" : "#00000012";
        context.fillRect(x, y, 9 + (index % 7), 1);
      }
      for (let index = 0; index < 28; index += 1) {
        const x = (index * 101 + 13) % size;
        const y = (index * 67 + 29) % size;
        context.strokeStyle = index % 3 ? "#f7e0b812" : "#12090632";
        context.lineWidth = index % 6 === 0 ? 2 : 1;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(Math.min(size, x + 12 + index % 35), y + (index % 7) - 3);
        context.stroke();
      }
      const wornEdge = context.createLinearGradient(0, 0, size, 0);
      wornEdge.addColorStop(0, "#f1d6a31f");
      wornEdge.addColorStop(0.05, "transparent");
      wornEdge.addColorStop(0.94, "transparent");
      wornEdge.addColorStop(1, "#13090555");
      context.fillStyle = wornEdge;
      context.fillRect(0, 0, size, size);
    }, 2.2, 2.2);
  }

  function makeArtworkTexture() {
    return canvasTexture(512, (context, size) => {
      const sky = context.createLinearGradient(0, 0, 0, size);
      sky.addColorStop(0, "#314942");
      sky.addColorStop(0.54, "#9b815c");
      sky.addColorStop(1, "#3c4936");
      context.fillStyle = sky;
      context.fillRect(0, 0, size, size);
      context.fillStyle = "#d2b97880";
      context.beginPath();
      context.arc(355, 130, 48, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#26382fd0";
      context.beginPath();
      context.moveTo(0, 330);
      context.lineTo(130, 190);
      context.lineTo(250, 332);
      context.lineTo(370, 215);
      context.lineTo(512, 352);
      context.lineTo(512, 512);
      context.lineTo(0, 512);
      context.fill();
    });
  }

  const woodTexture = makeWoodTexture(false);
  const darkWoodTexture = makeWoodTexture(true);
  const paperTexture = makePaperTexture(false);
  const pageEdgeTexture = makePaperTexture(true);
  const leatherTexture = makeLeatherTexture();
  const materials = {
    wall: new THREE.MeshStandardMaterial({ color: 0x1b2925, roughness: 0.98 }),
    wood: new THREE.MeshStandardMaterial({ map: woodTexture, bumpMap: woodTexture, bumpScale: 0.035, roughness: 0.79 }),
    darkWood: new THREE.MeshStandardMaterial({ map: darkWoodTexture, bumpMap: darkWoodTexture, bumpScale: 0.028, roughness: 0.78 }),
    paper: new THREE.MeshStandardMaterial({ map: paperTexture, bumpMap: paperTexture, bumpScale: 0.012, roughness: 0.97 }),
    pageEdge: new THREE.MeshStandardMaterial({ map: pageEdgeTexture, bumpMap: pageEdgeTexture, bumpScale: 0.018, roughness: 1 }),
    leather: new THREE.MeshStandardMaterial({ map: leatherTexture, bumpMap: leatherTexture, bumpScale: 0.045, roughness: 0.87 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb9964d, roughness: 0.3, metalness: 0.78 }),
    artwork: new THREE.MeshStandardMaterial({ map: makeArtworkTexture(), roughness: 0.91 }),
    ink: new THREE.MeshPhysicalMaterial({ color: 0x111817, roughness: 0.22, metalness: 0.08, clearcoat: 0.8 })
  };
  disposableMaterials.push(...Object.values(materials));
  const shelfBookMaterials = ["#49372f", "#394d46", "#5c3c40", "#46526b", "#67552f"].map((color) => {
    const texture = makeLeatherTexture(color);
    const material = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, bumpScale: 0.035, roughness: 0.9 });
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
    scene.add(new THREE.HemisphereLight(0x99aaa4, 0x25150e, 1.05));

    const lamp = new THREE.SpotLight(0xffd18a, 115, 26, Math.PI / 4.4, 0.62, 1.45);
    lamp.position.set(-5.7, 7.4, 7.1);
    lamp.target.position.set(-1.3, 2.5, 0.5);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.bias = -0.00035;
    scene.add(lamp, lamp.target);

    const stackFill = new THREE.PointLight(0xb9d0c8, 13, 14, 2);
    stackFill.position.set(5.6, 5.4, 5.2);
    scene.add(stackFill);

    const shelfGlow = new THREE.PointLight(0xd89d59, 7, 8, 2.2);
    shelfGlow.position.set(6.6, 4.7, -1.9);
    scene.add(shelfGlow);

    const leftShelfGlow = new THREE.PointLight(0xb47a43, 4.5, 7, 2.3);
    leftShelfGlow.position.set(-7.0, 4.4, -1.85);
    scene.add(leftShelfGlow);
  }

  function addRoom() {
    mesh(new THREE.BoxGeometry(20, 10, 0.4), materials.wall, { position: [0, 4.2, -3.45] });
    [-5.3, 0, 5.3].forEach((x) => {
      mesh(new THREE.BoxGeometry(0.1, 8.1, 0.13), materials.darkWood, { position: [x, 4.2, -3.17], cast: false });
    });
    mesh(new THREE.BoxGeometry(20, 0.18, 0.22), materials.brass, { position: [0, 5.65, -3.18], cast: false });
    mesh(new THREE.BoxGeometry(20, 0.7, 8.5), materials.wood, { position: [0, -0.55, 1.05] });
    mesh(new THREE.BoxGeometry(20.2, 0.78, 0.5), materials.darkWood, { position: [0, -0.5, 5.05] });

    addRecessedBookcase(-7.2, 3.55, 3.0);
    addRecessedBookcase(7.2, 3.55, 3.0);

    const lampStem = mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.7, 18), materials.brass, { position: [-6.45, 1.9, -1.3] });
    lampStem.castShadow = true;
    const shade = mesh(new THREE.CylinderGeometry(0.5, 1.05, 1.05, 28, 1, true), materials.brass, { position: [-6.45, 4.55, -1.3] });
    shade.material.side = THREE.DoubleSide;
    const bulbMaterial = new THREE.MeshStandardMaterial({ color: 0xffd89a, emissive: 0xffb95d, emissiveIntensity: 2.5 });
    disposableMaterials.push(bulbMaterial);
    mesh(new THREE.SphereGeometry(0.19, 18, 14), bulbMaterial, { position: [-6.45, 4.28, -1.3], cast: false });
    mesh(new THREE.CylinderGeometry(0.72, 0.9, 0.16, 28), materials.brass, { position: [-6.45, -0.04, -1.3] });

    mesh(new THREE.BoxGeometry(2.35, 2.9, 0.22), materials.darkWood, { position: [4.9, 4.28, -3.08] });
    mesh(new THREE.BoxGeometry(2.03, 2.58, 0.08), materials.artwork, { position: [4.9, 4.28, -2.94], cast: false });

    // A small inkwell gives the desk a useful scale cue without competing with
    // the selector. It remains behind the foremost book-spine plane.
    mesh(new THREE.CylinderGeometry(0.3, 0.37, 0.42, 18), materials.ink, { position: [6.65, 0.06, 2.4] });
    mesh(new THREE.CylinderGeometry(0.17, 0.23, 0.12, 18), materials.brass, { position: [6.65, 0.33, 2.4] });
  }

  function addRecessedBookcase(x, centerY, width) {
    const height = 5.6;
    const frameDepth = -2.9;
    const backMaterial = new THREE.MeshStandardMaterial({ color: 0x0b1210, roughness: 0.99 });
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

    const shelfLevels = [1.25, 2.6, 3.95, 5.3];
    shelfLevels.forEach((level, shelfIndex) => {
      const y = centerY - height / 2 + level;
      mesh(new THREE.BoxGeometry(width + 0.15, 0.16, 0.62), materials.darkWood, {
        position: [x, y, -2.82]
      });

      let cursor = x - width / 2 + 0.25;
      for (let index = 0; index < 8; index += 1) {
        const bookWidth = 0.18 + ((index * 7 + shelfIndex) % 5) * 0.035;
        const bookHeight = 0.58 + ((index * 11 + shelfIndex) % 6) * 0.055;
        const material = shelfBookMaterials[(index + shelfIndex) % shelfBookMaterials.length];
        const geometry = new THREE.BoxGeometry(bookWidth, bookHeight, 0.38);
        disposableGeometries.push(geometry);
        const book = new THREE.Mesh(geometry, material);
        book.position.set(cursor + bookWidth / 2, y + 0.08 + bookHeight / 2, -2.48 - (index % 3) * 0.035);
        book.rotation.z = index % 5 === 0 ? -0.035 : index % 4 === 0 ? 0.025 : 0;
        book.castShadow = true;
        book.receiveShadow = true;
        scene.add(book);
        cursor += bookWidth + 0.055;
      }
    });
  }

  function addReadingStandAndBook() {
    const group = new THREE.Group();
    group.position.set(-2.1, 2.55, 0.15);
    scene.add(group);

    const boardGeometry = new THREE.BoxGeometry(8.55, 5.0, 0.34);
    disposableGeometries.push(boardGeometry);
    const board = new THREE.Mesh(boardGeometry, materials.darkWood);
    board.position.z = -0.3;
    board.castShadow = true;
    board.receiveShadow = true;
    group.add(board);

    const ledgeGeometry = new THREE.BoxGeometry(8.8, 0.28, 0.65);
    disposableGeometries.push(ledgeGeometry);
    const ledge = new THREE.Mesh(ledgeGeometry, materials.wood);
    ledge.position.set(0, -2.35, 0.18);
    ledge.castShadow = true;
    group.add(ledge);

    const supportGeometry = new THREE.BoxGeometry(2.2, 2.2, 0.35);
    disposableGeometries.push(supportGeometry);
    const support = new THREE.Mesh(supportGeometry, materials.darkWood);
    support.position.set(0, -3.1, -0.25);
    support.rotation.z = Math.PI / 4;
    support.castShadow = true;
    group.add(support);

    const halfWidth = BOOK_WIDTH / 2;
    [-1, 1].forEach((side) => {
      const coverGeometry = new THREE.BoxGeometry(halfWidth + 0.16, BOOK_HEIGHT + 0.18, 0.15);
      const pagesGeometry = new THREE.BoxGeometry(halfWidth - 0.08, BOOK_HEIGHT - 0.08, 0.18);
      disposableGeometries.push(coverGeometry, pagesGeometry);

      const cover = new THREE.Mesh(coverGeometry, materials.leather);
      cover.position.set(side * (halfWidth / 2), 0, 0.05);
      cover.rotation.y = side * -0.055;
      cover.castShadow = true;
      cover.receiveShadow = true;
      group.add(cover);

      const pages = new THREE.Mesh(pagesGeometry, materials.pageEdge);
      pages.position.set(side * (halfWidth / 2), 0, 0.18);
      pages.rotation.y = side * -0.055;
      pages.castShadow = true;
      pages.receiveShadow = true;
      group.add(pages);

      const faceGeometry = new THREE.PlaneGeometry(halfWidth - 0.18, BOOK_HEIGHT - 0.18, 14, 8);
      const positions = faceGeometry.attributes.position;
      for (let index = 0; index < positions.count; index += 1) {
        const x = positions.getX(index);
        const normalized = side < 0 ? (x + halfWidth / 2) / halfWidth : (halfWidth / 2 - x) / halfWidth;
        positions.setZ(index, Math.sin(Math.max(0, normalized) * Math.PI) * 0.065);
      }
      faceGeometry.computeVertexNormals();
      disposableGeometries.push(faceGeometry);
      const face = new THREE.Mesh(faceGeometry, materials.paper);
      face.position.set(side * (halfWidth / 2), 0, 0.29);
      face.rotation.y = side * -0.055;
      face.castShadow = true;
      face.receiveShadow = true;
      group.add(face);
    });

    const hingeGeometry = new THREE.CylinderGeometry(0.12, 0.15, BOOK_HEIGHT, 24);
    disposableGeometries.push(hingeGeometry);
    const hinge = new THREE.Mesh(hingeGeometry, materials.leather);
    hinge.position.z = 0.31;
    hinge.castShadow = true;
    group.add(hinge);

    return group;
  }

  function addStack() {
    const widths = [3.7, 3.45, 3.62, 3.38, 3.72, 3.5, 3.66, 3.42, 3.58, 3.48];
    const offsets = [0, -0.12, 0.09, -0.05, 0.13, -0.08, 0.04, -0.1, 0.07, -0.03];
    const thickness = 0.55;
    const gap = 0.06;
    const depth = 2.25;

    records.forEach((record, index) => {
      const level = records.length - index - 1;
      const width = widths[index % widths.length];
      const clothTexture = makeLeatherTexture(record.color);
      const cloth = new THREE.MeshStandardMaterial({ map: clothTexture, bumpMap: clothTexture, bumpScale: 0.055, roughness: 0.9 });
      disposableMaterials.push(cloth);
      const geometry = new THREE.BoxGeometry(width, thickness, depth);
      disposableGeometries.push(geometry);
      const object = new THREE.Mesh(geometry, cloth);
      object.position.set(4.25 + offsets[index % offsets.length], 0.03 + thickness / 2 + level * (thickness + gap), 0.7);
      object.rotation.z = [0.006, -0.009, 0.004, -0.005][index % 4];
      object.castShadow = true;
      object.receiveShadow = true;
      scene.add(object);
      stackBooks.push({ object, width, thickness, depth, homeX: object.position.x });
    });

    mesh(new THREE.BoxGeometry(4.5, 0.24, 2.85), materials.darkWood, { position: [4.25, -0.1, 0.66] });
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
    const bookCorners = [
      new THREE.Vector3(-BOOK_WIDTH / 2 + 0.12, BOOK_HEIGHT / 2 - 0.12, 0.36),
      new THREE.Vector3(BOOK_WIDTH / 2 - 0.12, BOOK_HEIGHT / 2 - 0.12, 0.36),
      new THREE.Vector3(BOOK_WIDTH / 2 - 0.12, -BOOK_HEIGHT / 2 + 0.12, 0.36),
      new THREE.Vector3(-BOOK_WIDTH / 2 + 0.12, -BOOK_HEIGHT / 2 + 0.12, 0.36)
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

    onLayout({ book: projectRectangle(bookCorners), spines: spineBounds });
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
    renderer.render(scene, camera);
    updateDomLayout();
  }

  function setSelected(index, { animate = true } = {}) {
    cancelAnimationFrame(selectionFrame);
    const starts = stackBooks.map(({ object }) => object.position.x);
    const targets = stackBooks.map(({ homeX }, recordIndex) => homeX + (recordIndex === index ? -0.28 : 0));

    if (!animate) {
      stackBooks.forEach(({ object }, recordIndex) => { object.position.x = targets[recordIndex]; });
      renderer.render(scene, camera);
      updateDomLayout();
      return;
    }

    // Each request owns one short animation frame loop. A newer selection
    // cancels this loop and retargets from the current positions, so movement
    // can never queue or restore stale project state.
    const startedAt = performance.now();
    function animateSelection(now) {
      const progress = Math.min(1, (now - startedAt) / 180);
      const eased = 1 - Math.pow(1 - progress, 3);
      stackBooks.forEach(({ object }, recordIndex) => {
        object.position.x = THREE.MathUtils.lerp(starts[recordIndex], targets[recordIndex], eased);
      });
      renderer.render(scene, camera);
      updateDomLayout();
      if (progress < 1) selectionFrame = requestAnimationFrame(animateSelection);
      else selectionFrame = 0;
    }
    selectionFrame = requestAnimationFrame(animateSelection);
  }

  function dispose() {
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

  return { setSelected, resize, dispose };
}
