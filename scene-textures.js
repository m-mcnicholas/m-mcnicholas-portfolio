import * as THREE from "three";

function mulberry32(seed) {
  return () => {
    let value = seed += 0x6d2b79f5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function createTextureTools(renderer, disposableTextures) {
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

  return { canvasTexture, makeWoodTextures, makePaperTextures, makeBindingTextures, makeArtworkTexture, pbrMaterial, mulberry32 };
}
