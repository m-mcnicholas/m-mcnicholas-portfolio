import { createStudyScene } from "./scene.js";
import { getBindingProfile } from "./bindings.js";

const desktopQuery = window.matchMedia("(min-width: 1100px) and (min-height: 650px)");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function readRecords() {
  return Array.from(document.querySelectorAll(".project-record")).map((element) => {
    const link = element.querySelector(":scope > a");
    return {
      element,
      kind: element.dataset.kind || "project",
      color: element.dataset.color || "#71483a",
      accent: element.dataset.accent || "#d8b968",
      type: element.querySelector(".record-type")?.textContent.trim() || "Project",
      title: element.querySelector("h2")?.textContent.trim() || "Untitled project",
      date: element.querySelector("time")?.textContent.trim() || "Undated",
      summary: element.querySelector(".record-summary")?.textContent.trim() || "",
      details: element.querySelector(".record-details")?.textContent.trim() || "",
      href: link?.getAttribute("href") || "",
      linkText: link?.textContent.trim() || "Open project",
      binding: element.dataset.binding || ""
    };
  });
}

function createSpineControls(records) {
  const container = document.querySelector("#spine-controls");
  if (!container) return [];

  return records.map((record, index) => {
    const binding = getBindingProfile(record, index);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "spine-control";
    button.dataset.recordIndex = String(index);
    button.dataset.binding = binding.kind;
    button.dataset.foil = binding.foil;
    button.setAttribute("aria-pressed", String(index === 0));
    button.setAttribute("aria-controls", "reading-book");
    button.setAttribute("aria-label", `Read ${record.title}, ${record.date}`);
    button.style.setProperty("--cloth", record.color);
    button.style.setProperty("--gilt", record.accent);
    button.innerHTML = `<span class="spine-title"></span><span class="spine-date"></span>`;
    button.querySelector(".spine-title").textContent = record.title;
    button.querySelector(".spine-date").textContent = record.kind === "info" ? "Archive guide" : record.date;
    container.append(button);
    return button;
  });
}

async function initializeDesktopStudy() {
  if (!desktopQuery.matches || document.documentElement.dataset.webglAttempted === "true") return;
  document.documentElement.dataset.webglAttempted = "true";

  const records = readRecords();
  if (records.length < 2 || records.some((record) => !record.title || !record.date || !record.summary)) return;

  // Give the renderer a full-size but invisible stage so textures and projected
  // semantic controls settle before the fallback is replaced on screen.
  document.documentElement.classList.add("webgl-preparing");
  const spineControls = createSpineControls(records);
  const readingBook = document.querySelector("#reading-book");
  if (!readingBook || spineControls.length !== records.length) return;

  try {
    const scene = createStudyScene(records, ({ book, spines }) => {
      readingBook.style.setProperty("--book-left", `${book.left}px`);
      readingBook.style.setProperty("--book-top", `${book.top}px`);
      readingBook.style.setProperty("--book-width", `${book.width}px`);
      readingBook.style.setProperty("--book-height", `${book.height}px`);

      spineControls.forEach((button, index) => {
        const bounds = spines[index];
        button.style.left = `${bounds.left}px`;
        button.style.top = `${bounds.top}px`;
        button.style.width = `${bounds.width}px`;
        button.style.height = `${bounds.height}px`;
      });
    });

    window.__portfolioScene = scene;
    scene.resize();
    document.documentElement.classList.remove("webgl-preparing");
    document.documentElement.classList.add("webgl-revealing");
    await new Promise((resolve) => setTimeout(resolve, 550));
    document.documentElement.classList.add("webgl-ready");
    document.documentElement.dataset.mode = "study";
    document.documentElement.classList.remove("webgl-revealing");
    // The stage is hidden until initialization succeeds, so project the DOM
    // overlays only after the enhanced layout has acquired real dimensions.
    scene.resize();

    const fields = {
      type: document.querySelector("#selected-type"),
      title: document.querySelector("#selected-title"),
      date: document.querySelector("#selected-date"),
      summary: document.querySelector("#selected-summary"),
      details: document.querySelector("#selected-details"),
      link: document.querySelector("#selected-link"),
      linkLabel: document.querySelector("#selected-link-label"),
      status: document.querySelector("#selection-status")
    };
    const showArchive = document.querySelector("#show-archive");
    const returnToStudy = document.querySelector("#return-to-study");
    let selectedIndex = 0;

    rendererCanvas().addEventListener("webglcontextlost", handleContextLoss, { once: true });

    function rendererCanvas() {
      const canvas = document.querySelector("#scene-canvas canvas");
      if (!canvas) throw new Error("The initialized renderer canvas is missing.");
      return canvas;
    }

    function handleContextLoss(event) {
      event.preventDefault();
      readingBook.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
      scene.dispose();
      window.__portfolioScene = null;
      spineControls.forEach((button) => button.remove());
      document.documentElement.classList.remove("webgl-ready");
      document.documentElement.dataset.mode = "archive";
      returnToStudy.hidden = true;
      console.warn("The WebGL context was lost; switched to the semantic archive.");
    }

    function selectRecord(requestedIndex, options = {}) {
      const index = Math.max(0, Math.min(records.length - 1, requestedIndex));
      const record = records[index];
      const binding = getBindingProfile(record, index);
      selectedIndex = index;

      spineControls.forEach((button, buttonIndex) => {
        button.setAttribute("aria-pressed", String(buttonIndex === index));
      });

      fields.type.textContent = record.type;
      fields.title.textContent = record.title;
      fields.date.textContent = record.date;
      fields.summary.textContent = record.summary;
      fields.details.textContent = record.details;
      readingBook.dataset.binding = binding.kind;
      readingBook.dataset.foil = binding.foil;
      readingBook.style.setProperty("--selected-binding", record.color);

      if (record.href) {
        fields.link.hidden = false;
        fields.link.href = record.href;
        fields.linkLabel.textContent = record.linkText;
      } else {
        fields.link.hidden = true;
        fields.link.removeAttribute("href");
      }

      scene.setSelected(index, { animate: options.animate !== false && !reducedMotionQuery.matches });
      readingBook.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
      if (options.animate !== false && !reducedMotionQuery.matches) {
        readingBook.querySelectorAll(".reading-page").forEach((page, pageIndex) => {
          page.animate(
            [
              { opacity: 0.62, transform: `translateY(${pageIndex ? 3 : 2}px)` },
              { opacity: 1, transform: "translateY(0)" }
            ],
            { duration: 240, easing: "cubic-bezier(.2,.72,.25,1)" }
          );
        });
      }
      document.title = index === 0
        ? "Michael McNicholas — Project Archive"
        : `${record.title} — Michael McNicholas`;

      if (options.focus) spineControls[index].focus();
      if (options.announce !== false) fields.status.textContent = `Now reading ${record.title}, ${record.date}.`;
    }

    function handleSpineKeydown(event) {
      const index = Number(event.currentTarget.dataset.recordIndex);
      let destination;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") destination = index + 1;
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") destination = index - 1;
      if (event.key === "Home") destination = 0;
      if (event.key === "End") destination = records.length - 1;
      if (destination === undefined) return;
      event.preventDefault();
      selectRecord(destination, { focus: true });
    }

    spineControls.forEach((button, index) => {
      button.addEventListener("click", () => selectRecord(index));
      button.addEventListener("keydown", handleSpineKeydown);
    });

    showArchive.addEventListener("click", () => {
      document.documentElement.dataset.mode = "archive";
      returnToStudy.hidden = false;
    });

    returnToStudy.addEventListener("click", (event) => {
      if (!desktopQuery.matches) return;
      event.preventDefault();
      document.documentElement.dataset.mode = "study";
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#study`);
      scene.resize();
      showArchive.focus();
    });

    if (window.location.hash === "#archive") {
      document.documentElement.dataset.mode = "archive";
      returnToStudy.hidden = false;
    }

    selectRecord(0, { announce: false, animate: false });
  } catch (error) {
    console.warn("The 3D study could not initialize; the semantic archive remains available.", error);
    document.documentElement.classList.remove("webgl-preparing", "webgl-revealing");
    document.querySelector("#spine-controls")?.replaceChildren();
  }
}

initializeDesktopStudy();
desktopQuery.addEventListener("change", (event) => {
  if (event.matches) initializeDesktopStudy();
});
