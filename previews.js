(() => {
  const button = document.querySelector(".preview-toggle");
  const images = document.querySelectorAll(".game-preview img");
  if (!button || !images.length) return;
  const pageURL = new URL(location.href);
  if (pageURL.pathname.endsWith("/quiz")) pageURL.pathname += "/";
  for (const source of document.querySelectorAll(".game-preview source")) {
    source.srcset = new URL(source.getAttribute("srcset"), pageURL).href;
  }
  for (const image of images) {
    image.dataset.animation = new URL(image.dataset.animation, pageURL).href;
    image.dataset.still = new URL(image.dataset.still, pageURL).href;
  }
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = false;
  function update() {
    button.hidden = motion.matches;
    for (const image of images) image.src = paused || motion.matches ? image.dataset.still : image.dataset.animation;
    button.textContent = paused ? "Play previews" : "Pause previews";
    button.setAttribute("aria-pressed", String(paused));
  }
  button.addEventListener("click", () => { paused = !paused; update(); });
  motion.addEventListener("change", update);
  update();
})();
