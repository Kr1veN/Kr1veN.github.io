/**
 * Render Viewer
 * Componente reutilizable para comparar renders (standard / wireframe / textura)
 * de un mismo modelo 3D. Sin dependencias.
 *
 * Uso en HTML — ver plantilla en index-demo.html. Cada .render-viewer
 * necesita 2-3 <img class="render-viewer__layer" data-layer="standard|wireframe|textured">
 * dentro de un .render-viewer__canvas.
 */
(function () {
  function initViewer(root) {
    const canvas = root.querySelector(".render-viewer__canvas");
    const layers = Array.from(root.querySelectorAll(".render-viewer__layer"));
    const modeButtons = Array.from(root.querySelectorAll(".render-viewer__mode-btn"));
    const handle = root.querySelector(".render-viewer__handle");
    const blendSlider = root.querySelector(".render-viewer__blend input[type='range']");

    const layerByName = {};
    layers.forEach((img) => (layerByName[img.dataset.layer] = img));

    let mode = modeButtons[0]?.dataset.mode || Object.keys(layerByName)[0];
    let compareWith = null; // segunda capa cuando estamos en modo "comparar"

    function clearLayers() {
      layers.forEach((img) => {
        img.classList.remove("is-active", "is-front");
        img.style.opacity = "";
      });
      canvas.dataset.compare = "false";
      root.dataset.blendActive = "false";
    }

    function setSingleMode(name) {
      clearLayers();
      const layer = layerByName[name];
      if (layer) layer.classList.add("is-active");
      mode = name;
    }

    function setCompareMode(backName, frontName) {
      clearLayers();
      const back = layerByName[backName];
      const front = layerByName[frontName];
      if (!back || !front) return;
      back.classList.add("is-active");
      front.classList.add("is-active", "is-front");
      canvas.dataset.compare = "true";
      mode = "compare";
      compareWith = { backName, frontName };
      setSplit(50);
    }

    function setBlendMode(names) {
      clearLayers();
      names.forEach((n) => {
        const layer = layerByName[n];
        if (layer) {
          layer.classList.add("is-active");
          layer.style.opacity = "1";
        }
      });
      root.dataset.blendActive = "true";
      mode = "blend";
      if (blendSlider) applyBlend(Number(blendSlider.value));
    }

    function applyBlend(value) {
      // value 0-100: 0 = solo la primera capa listada, 100 = solo la última
      const names = layers.map((l) => l.dataset.layer);
      if (names.length < 2) return;
      const topName = names[names.length - 1];
      const baseNames = names.slice(0, -1);
      baseNames.forEach((n) => {
        if (layerByName[n]) layerByName[n].style.opacity = "1";
      });
      if (layerByName[topName]) {
        layerByName[topName].style.opacity = String(value / 100);
      }
    }

    function setSplit(percent) {
      const clamped = Math.max(0, Math.min(100, percent));
      canvas.style.setProperty("--split", clamped + "%");
    }

    // --- Botones de modo ---
    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        modeButtons.forEach((b) => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");

        const action = btn.dataset.mode;
        if (action === "compare") {
          const names = layers.map((l) => l.dataset.layer);
          setCompareMode(names[0], names[names.length - 1]);
        } else if (action === "blend") {
          setBlendMode(layers.map((l) => l.dataset.layer));
        } else {
          setSingleMode(action);
        }
      });
    });

    // --- Arrastrar el divisor en modo comparar ---
    if (handle) {
      let dragging = false;

      const onMove = (clientX) => {
        const rect = canvas.getBoundingClientRect();
        const percent = ((clientX - rect.left) / rect.width) * 100;
        setSplit(percent);
      };

      handle.addEventListener("pointerdown", (e) => {
        dragging = true;
        handle.setPointerCapture(e.pointerId);
      });
      handle.addEventListener("pointermove", (e) => {
        if (dragging) onMove(e.clientX);
      });
      handle.addEventListener("pointerup", () => (dragging = false));
      handle.addEventListener("pointercancel", () => (dragging = false));

      // También permite hacer click/touch en cualquier punto del canvas
      canvas.addEventListener("pointerdown", (e) => {
        if (canvas.dataset.compare === "true") onMove(e.clientX);
      });
    }

    // --- Slider de mezcla ---
    if (blendSlider) {
      blendSlider.addEventListener("input", (e) => {
        applyBlend(Number(e.target.value));
      });
    }

    // Estado inicial: primera capa visible
    setSingleMode(mode);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".render-viewer").forEach(initViewer);
  });
})();
