const desktopScene = window.matchMedia("(min-width: 841px)");
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

if (desktopScene.matches) {
  import(THREE_URL)
    .then((THREE) => createPortfolioScene(THREE))
    .catch((error) => {
      console.warn("The full 3D scene could not load; using the CSS book scene instead.", error);
    });
}

function createPortfolioScene(THREE) {
  const stage = document.querySelector("#webgl-stage");
  const library = document.querySelector(".library");
  const cards = Array.from(document.querySelectorAll(".project-card"));
  const ui = document.querySelector("#webgl-ui");
  const previousButton = document.querySelector("#webgl-previous");
  const nextButton = document.querySelector("#webgl-next");
  const positionLabel = document.querySelector("#webgl-position");
  const projectLink = document.querySelector("#webgl-project-link");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!stage || !library || !cards.length || !ui) return;

  const books = cards.map((card) => {
    const sourceLink = card.querySelector(":scope > a");
    return {
      kind: card.dataset.kind,
      color: card.dataset.color,
      accent: card.dataset.accent,
      type: card.querySelector(".card-type").textContent.trim(),
      title: card.querySelector("h3").textContent.trim(),
      date: card.querySelector("time").textContent.trim(),
      summary: card.querySelector(".card-summary").textContent.trim(),
      details: card.querySelector(".card-details").textContent.trim(),
      href: sourceLink ? sourceLink.href : "",
      linkText: sourceLink ? sourceLink.textContent.trim() : "",
      target: sourceLink ? sourceLink.target : ""
    };
  });

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (error) {
    console.warn("WebGL is unavailable; using the CSS book scene instead.", error);
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111918);
  scene.fog = new THREE.Fog(0x111918, 14, 28);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  const cameraHome = new THREE.Vector3(-0.15, 8.1, 11.8);
  const cameraTarget = new THREE.Vector3(0, 1.1, 0.15);
  camera.position.copy(cameraHome);
  camera.lookAt(cameraTarget);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  stage.appendChild(renderer.domElement);

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(2, 2);
  const actionPoint = new THREE.Vector3();
  const clickableSpines = [];
  const stackBooks = [];
  let selectedIndex = 0;
  let pointerDown = null;
  let sceneRunning = true;

  addEnvironment();
  const openBook = createOpenBook();
  books.forEach((book, index) => createClosedBook(book, index));
  selectBook3D(0, false);
  resize();

  ui.hidden = false;
  document.body.classList.add("webgl-ready");

  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("portfolio:select", (event) => {
    selectBook3D(Number(event.detail.index), true);
  });
  previousButton.addEventListener("click", () => requestSelection(selectedIndex - 1));
  nextButton.addEventListener("click", () => requestSelection(selectedIndex + 1));
  renderer.domElement.addEventListener("pointermove", handlePointerMove, { passive: true });
  renderer.domElement.addEventListener("pointerdown", (event) => {
    pointerDown = { x: event.clientX, y: event.clientY };
  });
  renderer.domElement.addEventListener("pointerup", handlePointerUp);
  renderer.domElement.addEventListener("pointerleave", () => {
    pointer.set(2, 2);
    renderer.domElement.classList.remove("is-over-book");
  });
  document.addEventListener("visibilitychange", updateRenderState);
  desktopScene.addEventListener("change", updateRenderState);
  renderer.setAnimationLoop(render);

  function addEnvironment() {
    const hemisphere = new THREE.HemisphereLight(0x8da69b, 0x29170f, 1.05);
    scene.add(hemisphere);

    const keyLight = new THREE.SpotLight(0xffd792, 85, 28, Math.PI / 5, 0.58, 1.4);
    keyLight.position.set(-4.8, 9.5, 6.2);
    keyLight.target.position.set(-0.9, 0, 0.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight, keyLight.target);

    const stackLight = new THREE.PointLight(0x9ebfc4, 16, 16, 2);
    stackLight.position.set(6.5, 5, 4);
    scene.add(stackLight);

    const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x4d2d1f, roughness: 0.72, metalness: 0.02 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(19, 0.5, 10.5), deskMaterial);
    desk.position.set(0, -0.42, 0.65);
    desk.receiveShadow = true;
    scene.add(desk);

    const deskEdge = new THREE.Mesh(
      new THREE.BoxGeometry(19.2, 0.72, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x2c1710, roughness: 0.62 })
    );
    deskEdge.position.set(0, -0.38, 5.45);
    deskEdge.receiveShadow = true;
    scene.add(deskEdge);

    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(22, 11, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x1a2522, roughness: 1 })
    );
    wall.position.set(0, 4.65, -4.65);
    wall.receiveShadow = true;
    scene.add(wall);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.18, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x7a5636, roughness: 0.7 })
    );
    trim.position.set(0, 2.45, -4.42);
    scene.add(trim);

    const lampStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 4.6, 16),
      new THREE.MeshStandardMaterial({ color: 0x8d7344, roughness: 0.34, metalness: 0.7 })
    );
    lampStem.position.set(-7.2, 2.05, -1.8);
    lampStem.castShadow = true;
    scene.add(lampStem);

    const lampShade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 1.1, 1.15, 32, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xb28a52, roughness: 0.45, metalness: 0.35, side: THREE.DoubleSide })
    );
    lampShade.position.set(-7.2, 4.55, -1.8);
    lampShade.castShadow = true;
    scene.add(lampShade);
  }

  function createClosedBook(book, index) {
    const group = new THREE.Group();
    const level = books.length - index - 1;
    const widths = [5.2, 4.7, 5.45, 4.95, 5.3, 4.65, 5.15, 4.85, 5.4, 4.75];
    const offsets = [0, -0.18, 0.12, -0.08, 0.2, -0.12, 0.06, -0.2, 0.14, -0.04];
    const tilts = [-0.012, 0.018, -0.016, 0.009];
    const width = widths[index % widths.length];
    const depth = 2.55;
    const thickness = 0.55;
    const cloth = new THREE.Color(book.color);
    const coverMaterial = new THREE.MeshStandardMaterial({ color: cloth, roughness: 0.78, metalness: 0.01 });
    const paperMaterial = new THREE.MeshStandardMaterial({ color: 0xd8c9a7, roughness: 0.96 });

    const pageBlock = new THREE.Mesh(new THREE.BoxGeometry(width - 0.1, thickness - 0.14, depth - 0.08), paperMaterial);
    pageBlock.castShadow = true;
    pageBlock.receiveShadow = true;
    group.add(pageBlock);

    const topCover = new THREE.Mesh(new THREE.BoxGeometry(width, 0.075, depth), coverMaterial);
    topCover.position.y = thickness / 2 - 0.035;
    topCover.castShadow = true;
    group.add(topCover);

    const bottomCover = topCover.clone();
    bottomCover.position.y = -thickness / 2 + 0.035;
    group.add(bottomCover);

    const spineTexture = makeSpineTexture(book);
    const spineMaterial = new THREE.MeshStandardMaterial({ map: spineTexture, roughness: 0.72 });
    const spine = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, 0.12), spineMaterial);
    spine.position.z = depth / 2;
    spine.userData.bookIndex = index;
    spine.castShadow = true;
    group.add(spine);
    clickableSpines.push(spine);

    group.position.set(4.05 + offsets[index % offsets.length], 0.02 + level * 0.5, 0.65);
    group.rotation.y = tilts[index % tilts.length];
    group.userData.homeX = group.position.x;
    group.userData.homeZ = group.position.z;
    group.userData.index = index;
    stackBooks.push(group);
    scene.add(group);
  }

  function createOpenBook() {
    const group = new THREE.Group();
    group.position.set(-2.15, 0.02, 0.55);
    group.rotation.y = -0.035;

    const cloth = new THREE.MeshStandardMaterial({ color: 0x674637, roughness: 0.8 });
    const paperEdges = new THREE.MeshStandardMaterial({ color: 0xcbb991, roughness: 1 });
    const coverGeometry = new THREE.BoxGeometry(3.35, 0.12, 3.75);

    const leftCover = new THREE.Mesh(coverGeometry, cloth);
    leftCover.position.set(-1.64, 0.04, 0);
    leftCover.rotation.z = -0.025;
    leftCover.castShadow = true;
    leftCover.receiveShadow = true;
    group.add(leftCover);

    const rightCover = new THREE.Mesh(coverGeometry, cloth);
    rightCover.position.set(1.64, 0.04, 0);
    rightCover.rotation.z = 0.025;
    rightCover.castShadow = true;
    rightCover.receiveShadow = true;
    group.add(rightCover);

    const leftPages = new THREE.Mesh(new THREE.BoxGeometry(3.18, 0.15, 3.55), paperEdges);
    leftPages.position.set(-1.58, 0.15, 0);
    leftPages.rotation.z = -0.02;
    leftPages.castShadow = true;
    group.add(leftPages);

    const rightPages = leftPages.clone();
    rightPages.position.x = 1.58;
    rightPages.rotation.z = 0.02;
    group.add(rightPages);

    const hinge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.14, 3.7, 24),
      new THREE.MeshStandardMaterial({ color: 0x4a3027, roughness: 0.7 })
    );
    hinge.rotation.x = Math.PI / 2;
    hinge.position.y = 0.16;
    hinge.castShadow = true;
    group.add(hinge);

    const leftPage = new THREE.Mesh(createPageGeometry("left"), createPageMaterial(books[0], "left"));
    leftPage.position.y = 0.19;
    leftPage.castShadow = true;
    leftPage.receiveShadow = true;
    group.add(leftPage);

    const rightPage = new THREE.Mesh(createPageGeometry("right"), createPageMaterial(books[0], "right"));
    rightPage.position.y = 0.19;
    rightPage.castShadow = true;
    rightPage.receiveShadow = true;
    group.add(rightPage);

    group.userData.leftPage = leftPage;
    group.userData.rightPage = rightPage;
    group.userData.restY = group.position.y;
    scene.add(group);
    return group;
  }

  function createPageGeometry(side) {
    const width = 3.16;
    const depth = 3.5;
    const columns = 18;
    const rows = 10;
    const sign = side === "left" ? -1 : 1;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let row = 0; row <= rows; row += 1) {
      const v = row / rows;
      for (let column = 0; column <= columns; column += 1) {
        const t = column / columns;
        const x = sign * t * width;
        const y = 0.04 + Math.sin(t * Math.PI) * 0.16 + (1 - t) * 0.08;
        const z = -depth / 2 + v * depth;
        positions.push(x, y, z);
        uvs.push(side === "left" ? 1 - t : t, 1 - v);
      }
    }

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const a = row * (columns + 1) + column;
        const b = a + 1;
        const c = a + columns + 1;
        const d = c + 1;
        if (side === "left") indices.push(a, b, c, b, d, c);
        else indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function createPageMaterial(book, side) {
    const texture = makePageTexture(book, side);
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: texture,
      roughness: 0.98,
      metalness: 0,
      side: THREE.DoubleSide
    });
  }

  function makeSpineTexture(book) {
    const canvas = document.createElement("canvas");
    canvas.width = 1536;
    canvas.height = 192;
    const context = canvas.getContext("2d");
    context.fillStyle = book.color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(255,255,255,0.045)";
    for (let y = 3; y < canvas.height; y += 7) context.fillRect(0, y, canvas.width, 1);
    context.fillStyle = book.accent;
    context.fillRect(46, 18, 5, canvas.height - 36);
    context.fillRect(canvas.width - 51, 18, 5, canvas.height - 36);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff8e8";
    context.font = "700 68px Georgia";
    drawFittedText(context, book.title, canvas.width / 2, 76, canvas.width - 210, 68);
    context.fillStyle = book.accent;
    context.font = "600 32px Arial";
    context.fillText(book.date.toUpperCase(), canvas.width / 2, 137);
    return finishTexture(canvas);
  }

  function makePageTexture(book, side) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1120;
    const context = canvas.getContext("2d");
    context.fillStyle = "#efe3c5";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(103,75,39,0.035)";
    for (let y = 4; y < canvas.height; y += 11) context.fillRect(0, y, canvas.width, 1);
    context.strokeStyle = "rgba(100,70,35,0.24)";
    context.lineWidth = 2;
    context.strokeRect(46, 46, canvas.width - 92, canvas.height - 92);
    context.textBaseline = "top";

    if (side === "left") drawLeftPage(context, book);
    else drawRightPage(context, book);

    return finishTexture(canvas);
  }

  function drawLeftPage(context, book) {
    context.fillStyle = "#895b45";
    context.font = "600 25px Arial";
    context.fillText(book.kind === "info" ? "WELCOME" : book.type.toUpperCase(), 86, 96);
    context.fillStyle = "#29231d";
    const titleSize = book.title.length > 24 ? 72 : 84;
    context.font = `700 ${titleSize}px Georgia`;
    const titleEnd = drawWrappedText(context, book.title, 86, 162, 820, titleSize * 1.06, 3);
    context.fillStyle = "#706355";
    context.font = "italic 40px Georgia";
    context.fillText(book.date, 86, titleEnd + 34);
    context.fillStyle = "#a56b4d";
    context.fillRect(86, titleEnd + 104, 92, 5);
    context.fillStyle = "#342d25";
    context.font = "44px Georgia";
    drawWrappedText(context, book.summary, 86, titleEnd + 154, 820, 68, 7);
  }

  function drawRightPage(context, book) {
    context.fillStyle = "#817462";
    context.font = "600 22px Arial";
    context.fillText("PROJECT RECORD", 88, 96);
    context.fillStyle = "#342d25";
    context.font = "44px Georgia";
    drawWrappedText(context, book.details, 88, 250, 815, 66, 7);
    if (book.href) {
      context.strokeStyle = "#764839";
      context.lineWidth = 4;
      context.strokeRect(88, 795, 815, 112);
      context.fillStyle = "#764839";
      context.font = "600 28px Arial";
      context.fillText("OPEN FINISHED PROJECT  ↗", 126, 834);
    }
    context.fillStyle = "#725143";
    context.font = "600 22px Arial";
    context.fillText("COMPLETE PROJECT INDEX  ↓", 88, 978);
  }

  function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    const visibleLines = lines.slice(0, maxLines);
    if (lines.length > maxLines) visibleLines[maxLines - 1] += "…";
    visibleLines.forEach((visibleLine, index) => context.fillText(visibleLine, x, y + index * lineHeight));
    return y + visibleLines.length * lineHeight;
  }

  function drawFittedText(context, text, x, y, maxWidth, initialSize) {
    let size = initialSize;
    while (context.measureText(text).width > maxWidth && size > 30) {
      size -= 2;
      context.font = `700 ${size}px Georgia`;
    }
    context.fillText(text, x, y);
  }

  function finishTexture(canvas) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, maxAnisotropy);
    return texture;
  }

  function selectBook3D(index, animate) {
    selectedIndex = THREE.MathUtils.clamp(index, 0, books.length - 1);
    const book = books[selectedIndex];
    updatePage(openBook.userData.leftPage, book, "left");
    updatePage(openBook.userData.rightPage, book, "right");
    positionLabel.textContent = `Book ${selectedIndex + 1} of ${books.length} · ${book.title}`;
    previousButton.disabled = selectedIndex === 0;
    nextButton.disabled = selectedIndex === books.length - 1;

    if (book.href) {
      projectLink.hidden = false;
      projectLink.href = book.href;
      projectLink.target = book.target;
      projectLink.rel = book.target === "_blank" ? "noopener" : "";
      projectLink.textContent = `${book.linkText} ↗`;
    } else {
      projectLink.hidden = true;
      projectLink.removeAttribute("href");
      projectLink.removeAttribute("target");
    }

    if (animate && !reducedMotion.matches) {
      openBook.position.y = openBook.userData.restY + 0.38;
      openBook.rotation.y = -0.12;
    } else {
      openBook.position.y = openBook.userData.restY;
      openBook.rotation.y = -0.035;
    }
  }

  function updatePage(page, book, side) {
    const oldTexture = page.material.map;
    page.material.map = makePageTexture(book, side);
    page.material.needsUpdate = true;
    if (oldTexture) oldTexture.dispose();
  }

  function requestSelection(index) {
    const boundedIndex = THREE.MathUtils.clamp(index, 0, books.length - 1);
    document.dispatchEvent(new CustomEvent("portfolio:request-select", {
      detail: { index: boundedIndex }
    }));
  }

  function handlePointerMove(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const overBook = raycaster.intersectObjects(clickableSpines, false).length > 0;
    renderer.domElement.classList.toggle("is-over-book", overBook);
  }

  function handlePointerUp(event) {
    if (!pointerDown || Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 7) return;
    raycaster.setFromCamera(pointer, camera);
    const [intersection] = raycaster.intersectObjects(clickableSpines, false);
    if (intersection) requestSelection(intersection.object.userData.bookIndex);
    pointerDown = null;
  }

  function resize() {
    const bounds = library.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width / height < 1.55 ? 46 : 40;
    camera.updateProjectionMatrix();
  }

  function updateRenderState() {
    const shouldRun = !document.hidden && desktopScene.matches;
    if (sceneRunning === shouldRun) return;
    sceneRunning = shouldRun;
    renderer.setAnimationLoop(shouldRun ? render : null);
    if (shouldRun) resize();
  }

  function render() {
    const motion = reducedMotion.matches ? 1 : 0.12;
    stackBooks.forEach((group) => {
      const selected = group.userData.index === selectedIndex;
      const targetX = group.userData.homeX + (selected ? -0.48 : 0);
      const targetZ = group.userData.homeZ + (selected ? 0.25 : 0);
      group.position.x = THREE.MathUtils.lerp(group.position.x, targetX, motion);
      group.position.z = THREE.MathUtils.lerp(group.position.z, targetZ, motion);
    });

    openBook.position.y = THREE.MathUtils.lerp(openBook.position.y, openBook.userData.restY, motion);
    openBook.rotation.y = THREE.MathUtils.lerp(openBook.rotation.y, -0.035, motion);

    if (!reducedMotion.matches) {
      const pointerActive = Math.abs(pointer.x) <= 1 && Math.abs(pointer.y) <= 1;
      const targetX = cameraHome.x + (pointerActive ? pointer.x * 0.18 : 0);
      const targetY = cameraHome.y + (pointerActive ? pointer.y * 0.08 : 0);
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.035);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.035);
      camera.lookAt(cameraTarget);
    }

    positionProjectAction();
    renderer.render(scene, camera);
  }

  function positionProjectAction() {
    if (projectLink.hidden) return;
    actionPoint.set(1.72, 0.43, 0.96);
    openBook.localToWorld(actionPoint);
    actionPoint.project(camera);
    const bounds = library.getBoundingClientRect();
    const x = (actionPoint.x * 0.5 + 0.5) * bounds.width;
    const y = (-actionPoint.y * 0.5 + 0.5) * bounds.height;
    ui.style.setProperty("--action-x", `${x.toFixed(1)}px`);
    ui.style.setProperty("--action-y", `${y.toFixed(1)}px`);
  }
}
