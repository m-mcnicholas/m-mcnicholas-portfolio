// The page is complete without this file. It only adds a restrained reveal as
// project sections scroll into view, and does nothing when the visitor prefers
// reduced motion (the stylesheet never hides anything in that case either).
const items = document.querySelectorAll(".reveal");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function showAll() {
  items.forEach((item) => item.classList.add("is-visible"));
}

if (reduceMotion.matches || !("IntersectionObserver" in window)) {
  showAll();
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
  );
  items.forEach((item) => observer.observe(item));
}

window.addEventListener("beforeprint", showAll);
