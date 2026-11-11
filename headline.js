// Homepage-only place rotation. Every quiz remains a self-contained HTML file.
(() => {
  const word = document.getElementById("rotating-place");
  if (!word) return;
  const line = word.parentElement;
  const button = line.querySelector(".rotation-toggle");
  const places = [
    "NYC", "Brooklyn", "Astoria", "Queens", "Harlem", "Manhattan",
    "Bed-Stuy", "The Bronx", "Flushing", "Staten Island", "Williamsburg",
    "Park Slope", "Coney Island", "SoHo", "Bushwick", "Jackson Heights",
    "Greenpoint", "Washington Heights", "Lower East Side",
  ];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let index = 0, timer = null, transition = null, paused = false;

  function fit() {
    word.style.fontSize = "100%";
    const available = line.clientWidth - (button.hidden ? 0 : 40);
    const natural = word.getBoundingClientRect().width;
    if (natural > available && available > 0) word.style.fontSize = `${available / natural * 100}%`;
  }

  function stop() {
    clearTimeout(timer); clearTimeout(transition);
    timer = transition = null;
    word.classList.remove("is-changing");
  }
  function schedule() {
    stop();
    if (paused || motion.matches || document.hidden) return;
    timer = setTimeout(() => {
      word.classList.add("is-changing");
      transition = setTimeout(() => {
        index = (index + 1) % places.length;
        word.textContent = places[index];
        fit();
        word.classList.remove("is-changing");
        schedule();
      }, 160);
    }, 2000);
  }
  button.addEventListener("click", () => {
    paused = !paused;
    button.setAttribute("aria-pressed", String(paused));
    button.setAttribute("aria-label", `${paused ? "Resume" : "Pause"} place name rotation`);
    button.title = button.getAttribute("aria-label");
    button.firstElementChild.textContent = paused ? "▶" : "Ⅱ";
    schedule();
  });
  function preferences() {
    button.hidden = motion.matches;
    if (motion.matches) { index = 0; word.textContent = places[index]; }
    fit(); schedule();
  }
  document.addEventListener("visibilitychange", schedule);
  motion.addEventListener("change", preferences);
  new ResizeObserver(fit).observe(line);
  document.fonts.ready.then(fit);
  preferences();
})();
