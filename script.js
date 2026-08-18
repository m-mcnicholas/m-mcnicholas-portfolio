(function () {
  "use strict";

  const cards = Array.from(document.querySelectorAll(".project-card"));
  const stack = document.querySelector("#book-stack");

  if (!cards.length || !stack) return;

  const selected = {
    type: document.querySelector("#selected-type"),
    title: document.querySelector("#selected-title"),
    date: document.querySelector("#selected-date"),
    summary: document.querySelector("#selected-summary"),
    details: document.querySelector("#selected-details"),
    link: document.querySelector("#selected-link"),
    linkLabel: document.querySelector("#selected-link-label")
  };
  const previousButton = document.querySelector("#previous-book");
  const nextButton = document.querySelector("#next-book");
  const position = document.querySelector("#book-position");
  const openBook = document.querySelector("#selected-book");
  const library = document.querySelector(".library");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const books = cards.map((card, index) => {
    const sourceLink = card.querySelector(":scope > a");
    const book = {
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

    card.style.setProperty("--card-color", book.color);

    const spine = document.createElement("button");
    const level = cards.length - index - 1;
    const offsets = [4, 22, 0, 13, 31, 8, 25, 3, 18, 10, 28];
    const tilts = ["-0.25deg", "0.45deg", "-0.35deg", "0.2deg"];
    spine.type = "button";
    spine.className = "spine";
    spine.dataset.bookIndex = String(index);
    spine.setAttribute("aria-pressed", String(index === 0));
    spine.setAttribute("aria-label", `Select ${book.title}, ${book.date}`);
    spine.style.setProperty("--level", String(level));
    spine.style.setProperty("--depth", `${(level * 0.7).toFixed(1)}px`);
    spine.style.setProperty("--offset", `${offsets[index % offsets.length]}px`);
    spine.style.setProperty("--tilt", tilts[index % tilts.length]);
    spine.style.setProperty("--book-color", book.color);
    spine.style.setProperty("--book-accent", book.accent);
    spine.innerHTML = `<span class="spine-title"></span><span class="spine-date"></span>`;
    spine.querySelector(".spine-title").textContent = book.title;
    spine.querySelector(".spine-date").textContent = book.date;
    spine.addEventListener("click", () => selectBook(index));
    spine.addEventListener("keydown", handleSpineKeys);
    stack.appendChild(spine);

    return { ...book, spine };
  });

  let currentIndex = 0;

  function selectBook(index, options = {}) {
    currentIndex = Math.max(0, Math.min(books.length - 1, index));
    const book = books[currentIndex];

    books.forEach((item, itemIndex) => {
      item.spine.setAttribute("aria-pressed", String(itemIndex === currentIndex));
    });

    selected.type.textContent = book.kind === "info" ? "Welcome" : book.type;
    selected.title.textContent = book.title;
    selected.date.textContent = book.date;
    selected.summary.textContent = book.summary;
    selected.details.textContent = book.details;

    if (book.href) {
      selected.link.hidden = false;
      selected.link.href = book.href;
      selected.link.target = book.target;
      selected.link.rel = book.target === "_blank" ? "noopener" : "";
      selected.linkLabel.textContent = book.linkText;
    } else {
      selected.link.hidden = true;
      selected.link.removeAttribute("href");
      selected.link.removeAttribute("target");
      selected.link.removeAttribute("rel");
    }

    position.textContent = `Book ${currentIndex + 1} of ${books.length}`;
    previousButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === books.length - 1;
    document.title = currentIndex === 0
      ? "Michael McNicholas — Project Archive"
      : `${book.title} — Michael McNicholas`;

    if (options.focusSpine) book.spine.focus();
    openBook.dataset.selectedIndex = String(currentIndex);

    if (!reducedMotion.matches && options.animate !== false) {
      openBook.classList.remove("is-settling");
      void openBook.offsetWidth;
      openBook.classList.add("is-settling");
    }

    document.dispatchEvent(new CustomEvent("portfolio:select", {
      detail: { index: currentIndex, book }
    }));
  }

  function handleSpineKeys(event) {
    const index = Number(event.currentTarget.dataset.bookIndex);
    let destination = null;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") destination = index + 1;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") destination = index - 1;
    if (event.key === "Home") destination = 0;
    if (event.key === "End") destination = books.length - 1;

    if (destination !== null) {
      event.preventDefault();
      selectBook(destination, { focusSpine: true });
    }
  }

  previousButton.addEventListener("click", () => selectBook(currentIndex - 1, { focusSpine: true }));
  nextButton.addEventListener("click", () => selectBook(currentIndex + 1, { focusSpine: true }));
  document.addEventListener("portfolio:request-select", (event) => {
    selectBook(Number(event.detail.index));
  });

  if (library && !reducedMotion.matches && window.matchMedia("(pointer: fine)").matches) {
    let pointerFrame = 0;
    let pointerX = 0.5;
    let pointerY = 0.5;

    function renderPointerDepth() {
      const rotateX = 5 + (pointerY - 0.5) * -2.2;
      const rotateY = (pointerX - 0.5) * 3.2;
      library.style.setProperty("--scene-rotate-x", `${rotateX.toFixed(2)}deg`);
      library.style.setProperty("--scene-rotate-y", `${rotateY.toFixed(2)}deg`);
      library.style.setProperty("--light-x", `${42 + pointerX * 12}%`);
      library.style.setProperty("--light-y", `${16 + pointerY * 10}%`);
      library.style.setProperty("--glow-x", `${(pointerX - 0.5) * 26}px`);
      library.style.setProperty("--glow-y", `${(pointerY - 0.5) * 14}px`);
      pointerFrame = 0;
    }

    library.addEventListener("pointermove", (event) => {
      const bounds = library.getBoundingClientRect();
      pointerX = (event.clientX - bounds.left) / bounds.width;
      pointerY = (event.clientY - bounds.top) / bounds.height;
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderPointerDepth);
    }, { passive: true });

    library.addEventListener("pointerleave", () => {
      pointerX = 0.5;
      pointerY = 0.5;
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderPointerDepth);
    });
  }

  selectBook(0, { animate: false });
})();
