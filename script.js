import { createStudyScene } from "./scene.js";
import { getBindingProfile } from "./bindings.js";

const desktopQuery = matchMedia("(min-width: 1100px) and (min-height: 650px)");
const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");
const DEFAULT_TITLE = "Michael McNicholas — Project Archive";
const directText = (el, selector, fallback = "") => el.querySelector(`:scope > ${selector}`)?.textContent.trim() || fallback;

function readPage(element, fallbackSlug = "") {
  const link = element.querySelector(":scope > a");
  const contents = Array.from(
    element.querySelectorAll(":scope > .record-summary .record-contents > li"),
    (item, index) => `${index + 1}. ${item.textContent.trim()}`
  );
  return {
    slug: element.dataset.slug || fallbackSlug,
    type: directText(element, ".record-type", "Project"),
    title: directText(element, "h2, h3", "Untitled project"),
    date: directText(element, "time", "Undated"),
    summary: contents.length ? contents.join("\n") : directText(element, ".record-summary"),
    details: directText(element, ".record-details"),
    href: link?.getAttribute("href") || "",
    linkText: link?.textContent.trim() || "Open project",
    layout: element.dataset.layout || "project"
  };
}

function readRecords() {
  return Array.from(document.querySelectorAll(".project-record"), (element) => {
    const page = readPage(element, element.dataset.slug || "");
    const nested = Array.from(element.querySelectorAll(":scope > .collection-pages > .project-page"));
    return {
      element,
      kind: element.dataset.kind || "project",
      slug: element.dataset.slug || "",
      color: element.dataset.color || "#71483a",
      accent: element.dataset.accent || "#d8b968",
      binding: element.dataset.binding || "",
      ...page,
      pages: nested.length ? nested.map((child) => readPage(child)) : [page]
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
    button.dataset.recordIndex = index;
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

function parseProjectHash(records) {
  const parts = location.hash.slice(1).split("/").map(decodeURIComponent);
  if (parts.length !== 2) return null;
  const recordIndex = records.findIndex(({ slug }) => slug === parts[0]);
  if (recordIndex < 0) return null;
  const pageIndex = records[recordIndex].pages.findIndex(({ slug }) => slug === parts[1]);
  return pageIndex < 0 ? null : { recordIndex, pageIndex };
}

const projectHash = (record, page) => `#${encodeURIComponent(record.slug)}/${encodeURIComponent(page.slug)}`;

async function initializeDesktopStudy() {
  if (!desktopQuery.matches || document.documentElement.dataset.webglAttempted === "true") return;
  document.documentElement.dataset.webglAttempted = "true";
  const records = readRecords();
  if (!records.length || records.some((record) => !record.title || !record.date || record.pages.some((page) => !page.title || !page.summary))) return;

  document.documentElement.classList.add("webgl-preparing");
  const spineControls = createSpineControls(records);
  const readingBook = document.querySelector("#reading-book");
  const showArchive = document.querySelector("#show-archive");
  if (!readingBook || !showArchive || spineControls.length !== records.length) return;

  try {
    const scene = createStudyScene(records, ({ book, spines, drawer }) => {
      for (const [name, value] of Object.entries(book)) readingBook.style.setProperty(`--book-${name}`, `${value}px`);
      spineControls.forEach((button, index) => Object.assign(button.style, {
        left: `${spines[index].left}px`, top: `${spines[index].top}px`, width: `${spines[index].width}px`, height: `${spines[index].height}px`
      }));
      for (const [name, value] of Object.entries(drawer)) showArchive.style.setProperty(`--drawer-${name}`, `${value}px`);
    });
    window.__portfolioScene = scene;
    scene.resize();
    document.documentElement.classList.remove("webgl-preparing");
    document.documentElement.classList.add("webgl-revealing");
    await new Promise((resolve) => setTimeout(resolve, 550));
    document.documentElement.classList.add("webgl-ready");
    document.documentElement.dataset.mode = "study";
    document.documentElement.classList.remove("webgl-revealing");
    scene.resize();

    const get = (id) => document.querySelector(id);
    const fields = {
      type: get("#selected-type"), title: get("#selected-title"), date: get("#selected-date"),
      summary: get("#selected-summary"), details: get("#selected-details"), link: get("#selected-link"),
      linkLabel: get("#selected-link-label"), folio: get("#collection-folio"), previous: get("#page-previous"),
      next: get("#page-next"), status: get("#selection-status")
    };
    const returnToStudy = get("#return-to-study");
    const rememberedPages = new Map();
    let selectedIndex = 0;
    let pageIndex = 0;
    let pageTurnToken = 0;
    let pageTurning = false;
    let swipeStart = null;

    const canvas = get("#scene-canvas canvas");
    if (!canvas) throw new Error("The initialized renderer canvas is missing.");
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      pageTurnToken += 1;
      readingBook.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
      scene.dispose();
      window.__portfolioScene = null;
      spineControls.forEach((button) => button.remove());
      document.documentElement.classList.remove("webgl-ready");
      document.documentElement.dataset.mode = "archive";
      returnToStudy.hidden = true;
      console.warn("The WebGL context was lost; switched to the semantic archive.");
    }, { once: true });

    function updatePageControls(record, index) {
      const multiple = record.pages.length > 1;
      fields.previous.hidden = !multiple || index === 0;
      fields.next.hidden = !multiple || index === record.pages.length - 1;
      fields.previous.disabled = pageTurning;
      fields.next.disabled = pageTurning;
      fields.folio.hidden = !multiple;
      fields.folio.textContent = multiple ? `${record.title} · ${index + 1} of ${record.pages.length}` : "";
      readingBook.dataset.pageCount = record.pages.length;
      readingBook.dataset.pageIndex = index;
      readingBook.setAttribute("aria-label", multiple ? `${record.title}, page ${index + 1} of ${record.pages.length}` : record.title);
    }

    function renderPage(record, index, { announce = true, animate = false } = {}) {
      const page = record.pages[index];
      pageIndex = index;
      rememberedPages.set(selectedIndex, index);
      readingBook.dataset.pageLayout = page.layout;
      for (const key of ["type", "title", "date", "summary", "details"]) fields[key].textContent = page[key];
      fields.link.hidden = !page.href;
      if (page.href) {
        fields.link.href = page.href;
        fields.linkLabel.textContent = page.linkText;
      } else fields.link.removeAttribute("href");
      updatePageControls(record, index);
      document.title = record.kind === "info" ? DEFAULT_TITLE
        : page.layout === "contents" ? `${record.title} — Michael McNicholas`
          : record.pages.length > 1 ? `${page.title} — ${record.title}` : `${page.title} — Michael McNicholas`;
      readingBook.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
      if (animate && !reducedMotionQuery.matches) {
        readingBook.querySelectorAll(".reading-page").forEach((element, side) => element.animate(
          [{ opacity: 0.54, transform: `translateX(${side ? -3 : 3}px)` }, { opacity: 1, transform: "translateX(0)" }],
          { duration: 180, easing: "cubic-bezier(.2,.72,.25,1)" }
        ));
      }
      if (announce) fields.status.textContent = record.pages.length > 1
        ? `Now reading ${page.title} in ${record.title}, page ${index + 1} of ${record.pages.length}.`
        : `Now reading ${page.title}, ${page.date}.`;
    }

    function selectRecord(requestedIndex, options = {}) {
      const index = Math.max(0, Math.min(records.length - 1, requestedIndex));
      const record = records[index];
      const binding = getBindingProfile(record, index);
      pageTurnToken += 1;
      pageTurning = false;
      selectedIndex = index;
      const requestedPage = Number.isInteger(options.pageIndex) ? options.pageIndex : rememberedPages.get(index) || 0;
      const nextPage = Math.max(0, Math.min(record.pages.length - 1, requestedPage));
      spineControls.forEach((button, buttonIndex) => button.setAttribute("aria-pressed", String(buttonIndex === index)));
      readingBook.dataset.binding = binding.kind;
      readingBook.dataset.foil = binding.foil;
      readingBook.style.setProperty("--selected-binding", record.color);
      renderPage(record, nextPage, { announce: options.announce !== false, animate: options.animate !== false });
      scene.setSelected(index, { animate: options.animate !== false && !reducedMotionQuery.matches });
      if (options.updateHistory && record.pages.length > 1) history.pushState(null, "", projectHash(record, record.pages[nextPage]));
      if (options.focus) spineControls[index].focus();
    }

    async function turnPage(direction, options = {}) {
      const record = records[selectedIndex];
      const destination = pageIndex + (direction === "next" ? 1 : -1);
      if (pageTurning || record.pages.length < 2 || destination < 0 || destination >= record.pages.length) return false;
      const token = ++pageTurnToken;
      pageTurning = true;
      updatePageControls(record, pageIndex);
      let changed = false;
      const exchange = () => {
        if (token !== pageTurnToken || selectedIndex !== records.indexOf(record)) return;
        changed = true;
        renderPage(record, destination, { announce: options.announce !== false, animate: true });
      };
      if (reducedMotionQuery.matches) exchange();
      else await scene.turnPage(direction, { onMidpoint: exchange });
      if (token !== pageTurnToken) return false;
      if (!changed) exchange();
      pageTurning = false;
      updatePageControls(record, destination);
      if (options.updateHistory !== false) history.pushState(null, "", projectHash(record, record.pages[destination]));
      return true;
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
      selectRecord(destination, { focus: true, updateHistory: true });
    }
    spineControls.forEach((button, index) => {
      button.addEventListener("click", () => selectRecord(index, { updateHistory: true }));
      button.addEventListener("keydown", handleSpineKeydown);
    });
    fields.previous.addEventListener("click", () => turnPage("previous"));
    fields.next.addEventListener("click", () => turnPage("next"));
    readingBook.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      turnPage(event.key === "ArrowRight" ? "next" : "previous");
    });
    readingBook.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" || event.target.closest("a, button")) return;
      swipeStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }, { passive: true });
    readingBook.addEventListener("pointerup", (event) => {
      if (!swipeStart || swipeStart.id !== event.pointerId) return;
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(dx) >= 55 && Math.abs(dx) >= Math.abs(dy) * 1.35) turnPage(dx < 0 ? "next" : "previous");
    }, { passive: true });
    readingBook.addEventListener("pointercancel", () => { swipeStart = null; }, { passive: true });

    showArchive.addEventListener("click", () => {
      document.documentElement.dataset.mode = "archive";
      returnToStudy.hidden = false;
    });
    returnToStudy.addEventListener("click", (event) => {
      if (!desktopQuery.matches) return;
      event.preventDefault();
      document.documentElement.dataset.mode = "study";
      history.replaceState(null, "", `${location.pathname}${location.search}#study`);
      scene.resize();
      showArchive.focus();
    });
    function restoreHash() {
      const destination = parseProjectHash(records);
      if (destination) {
        document.documentElement.dataset.mode = "study";
        returnToStudy.hidden = true;
        selectRecord(destination.recordIndex, { pageIndex: destination.pageIndex, animate: false });
      } else if (location.hash === "#archive") {
        pageTurnToken += 1;
        scene.cancelPageTurn();
        document.documentElement.dataset.mode = "archive";
        returnToStudy.hidden = false;
      }
    }
    addEventListener("popstate", restoreHash);

    const initial = parseProjectHash(records);
    if (initial) selectRecord(initial.recordIndex, { pageIndex: initial.pageIndex, announce: false, animate: false });
    else {
      if (location.hash === "#archive") {
        document.documentElement.dataset.mode = "archive";
        returnToStudy.hidden = false;
      }
      selectRecord(0, { announce: false, animate: false });
    }
  } catch (error) {
    console.warn("The 3D study could not initialize; the semantic archive remains available.", error);
    document.documentElement.classList.remove("webgl-preparing", "webgl-revealing");
    document.querySelector("#spine-controls")?.replaceChildren();
  }
}

initializeDesktopStudy();
desktopQuery.addEventListener("change", ({ matches }) => { if (matches) initializeDesktopStudy(); });
