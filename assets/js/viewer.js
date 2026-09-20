/**
 * Render Viewer + Project Modal
 * -----------------------------------------------------------------
 * 1) initViewer(root): la misma lógica de siempre (standard / wireframe
 *    / texturizado / comparar / mezclar) para un bloque .render-viewer,
 *    ahora con aspect-ratio dinámico según la imagen real (evita
 *    recortes en renders 2K con proporciones distintas).
 *
 * 2) PROJECTS + modal: agrupa varios "planos" (ángulos de cámara) de
 *    un mismo trabajo bajo una sola tarjeta. Al abrir el proyecto, se
 *    reutiliza UN visor y solo se cambian las rutas de imagen al
 *    cambiar de plano — así no hay que duplicar el visor N veces.
 * -----------------------------------------------------------------
 *
 * EDITA ESTE OBJETO con tus proyectos reales. Cada plano necesita al
 * menos 1 imagen (standard/wireframe/textured); si te falta alguna,
 * simplemente no pongas esa clave y el botón correspondiente se
 * ocultará solo.
 */
const PROJECTS = {
  // AJUSTA los planos: en el ejemplo hay 2 ("General" y "Ordenador"),
  // añade/quita bloques {label, standard, wireframe, textured} según
  // cuántos objetos/ángulos tenga tu escena. Revisa MAYÚSCULAS/minúsculas
  // exactas de cada archivo — GitHub Pages distingue entre ellas.
  "habitacion-cartoon": {
    title: "Subway Shelter",
    description: "Interior environment",
    thumb: "assets/img/Habitacion/General_Texturizado.jpg",
    planes: [
      {
        label: "General",
        standard: "assets/img/Habitacion/General_Standard.jpg",
        wireframe: "assets/img/Habitacion/General_Wireframe.jpg",
        textured: "assets/img/Habitacion/General_Texturizado.jpg",
      },
      {
        label: "Ordenador",
        standard: "assets/img/Habitacion/Ordenador_Standard.jpg",
        wireframe: "assets/img/Habitacion/Ordenador_Wireframe.jpg",
        textured: "assets/img/Habitacion/Ordenador_Texturizado.jpg",
      },
    ],
  },
  criatura: {
    title: "Criatura",
    description: "Monstruo de fantasía",
    thumb: "assets/img/Enemigo_textured.png",
    planes: [
      {
        label: "Plano único",
        standard: "assets/img/Enemigo_standard.png",
        wireframe: "assets/img/Enemigo_wireframe.png",
        textured: "assets/img/Enemigo_textured.png",
      },
    ],
  },
  busto: {
    title: "Busto",
    description: "Busto de un señor mayor para práctica de anatomía",
    thumb: "assets/img/busto_textured.png",
    planes: [
      {
        label: "Plano único",
        standard: "assets/img/busto_standard.png",
        wireframe: "assets/img/busto_wireframe.png",
        textured: "assets/img/busto_textured.png",
      },
    ],
  },
  monje: {
    title: "Monje",
    description: "Personaje fantasía",
    thumb: "assets/img/KahlFrente_textured.png",
    planes: [
      {
        label: "Plano único",
        standard: "assets/img/KahlFrente_standard.png",
        wireframe: "assets/img/KahlFrente_wireframe.png",
        textured: "assets/img/KahlFrente_textured.png",
      },
    ],
  },
};

/* ------------------------------------------------------------------
 * Núcleo del visor: reutilizable tanto para bloques fijos en la
 * página como para el visor dentro del modal.
 * ------------------------------------------------------------------ */
function createViewerController(root) {
  const canvas = root.querySelector(".render-viewer__canvas");
  const layers = Array.from(root.querySelectorAll(".render-viewer__layer"));
  const modeButtons = Array.from(root.querySelectorAll(".render-viewer__mode-btn"));
  const handle = root.querySelector(".render-viewer__handle");
  const blendSlider = root.querySelector(".render-viewer__blend input[type='range']");

  const layerByName = {};
  layers.forEach((img) => (layerByName[img.dataset.layer] = img));
  let mode = modeButtons[0]?.dataset.mode || Object.keys(layerByName)[0];

  function applyAspectFrom(img) {
    if (!img) return;
    const set = () => {
      if (img.naturalWidth && img.naturalHeight) {
        canvas.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
      }
    };
    if (img.complete && img.naturalWidth) set();
    else img.addEventListener("load", set, { once: true });
  }

  function setModeButtonsVisibility() {
    modeButtons.forEach((btn) => {
      const m = btn.dataset.mode;
      if (m === "compare" || m === "blend") {
        btn.style.display = Object.keys(layerByName).length >= 2 ? "" : "none";
      } else {
        btn.style.display = layerByName[m] ? "" : "none";
      }
    });
  }

  layers.forEach((img) => {
    img.addEventListener("error", () => {
      console.warn(`[render-viewer] No se pudo cargar: ${img.src}`);
      img.classList.add("render-viewer__layer--missing");
      delete layerByName[img.dataset.layer];
      setModeButtonsVisibility();
      if (mode === img.dataset.layer) {
        const remaining = Object.keys(layerByName);
        if (remaining.length) setSingleMode(remaining[0]);
      }
    });
  });

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
    if (layer) {
      layer.classList.add("is-active");
      applyAspectFrom(layer);
    }
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
    applyAspectFrom(back);
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
    applyAspectFrom(layerByName[names[0]]);
    if (blendSlider) applyBlend(Number(blendSlider.value));
  }

  function applyBlend(value) {
    const names = layers.map((l) => l.dataset.layer);
    if (names.length < 2) return;
    const topName = names[names.length - 1];
    const baseNames = names.slice(0, -1);
    baseNames.forEach((n) => {
      if (layerByName[n]) layerByName[n].style.opacity = "1";
    });
    if (layerByName[topName]) layerByName[topName].style.opacity = String(value / 100);
  }

  function setSplit(percent) {
    const clamped = Math.max(0, Math.min(100, percent));
    canvas.style.setProperty("--split", clamped + "%");
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeButtons.forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      const action = btn.dataset.mode;
      if (action === "compare") {
        // Antes: comparaba la primera capa contra la última (standard vs
        // textured). Ahora fuerza wireframe vs textured si ambas existen;
        // si falta alguna, cae de vuelta al comportamiento automático.
        const names = Object.keys(layerByName);
        if (layerByName.wireframe && layerByName.textured) {
          setCompareMode("wireframe", "textured");
        } else {
          setCompareMode(names[0], names[names.length - 1]);
        }
      } else if (action === "blend") {
        setBlendMode(Object.keys(layerByName));
      } else {
        setSingleMode(action);
      }
    });
  });

  if (handle) {
    let dragging = false;
    const onMove = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      setSplit(((clientX - rect.left) / rect.width) * 100);
    };
    handle.addEventListener("pointerdown", (e) => {
      dragging = true;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", (e) => dragging && onMove(e.clientX));
    handle.addEventListener("pointerup", () => (dragging = false));
    handle.addEventListener("pointercancel", () => (dragging = false));
    canvas.addEventListener("pointerdown", (e) => {
      if (canvas.dataset.compare === "true") onMove(e.clientX);
    });
  }

  if (blendSlider) {
    blendSlider.addEventListener("input", (e) => applyBlend(Number(e.target.value)));
  }

  setModeButtonsVisibility();
  setSingleMode(mode);

  return {
    /** Cambia las imágenes de las 3 capas sin reconstruir el DOM (usado al cambiar de plano en el modal) */
    setLayerSources(sources) {
      layers.forEach((img) => {
        const name = img.dataset.layer;
        img.classList.remove("render-viewer__layer--missing");
        if (sources[name]) {
          img.src = sources[name];
          layerByName[name] = img;
        } else {
          delete layerByName[name];
          img.removeAttribute("src");
        }
      });
      modeButtons.forEach((b) => b.setAttribute("aria-pressed", "false"));
      setModeButtonsVisibility();
      const firstAvailable = Object.keys(layerByName)[0];
      if (firstAvailable) {
        setSingleMode(firstAvailable);
        const btn = root.querySelector(`[data-mode="${firstAvailable}"]`);
        if (btn) btn.setAttribute("aria-pressed", "true");
      }
    },
  };
}

function initViewer(root) {
  createViewerController(root);
}

/* ------------------------------------------------------------------
 * Grid de proyectos + modal ampliado con pestañas de plano
 * ------------------------------------------------------------------ */
function initProjectGrid() {
  const grid = document.querySelector(".project-grid");
  const modal = document.querySelector(".project-modal");
  if (!grid || !modal) return;

  const titleEl = modal.querySelector(".project-modal__title");
  const descEl = modal.querySelector(".project-modal__desc");
  const planesEl = modal.querySelector(".project-modal__planes");
  const viewerSlot = modal.querySelector(".project-modal__viewer-slot");
  const closeBtn = modal.querySelector(".project-modal__close");

  // El visor del modal se crea UNA vez y se reutiliza para todos los proyectos/planos
  const modalViewerRoot = viewerSlot.querySelector(".render-viewer");
  const modalController = createViewerController(modalViewerRoot);

  function openProject(id) {
    const project = PROJECTS[id];
    if (!project) {
      console.warn(`[project-grid] Proyecto no encontrado: ${id}`);
      return;
    }
    titleEl.textContent = project.title;
    descEl.textContent = project.description || "";

    planesEl.innerHTML = "";
    const showTabs = project.planes.length > 1;
    planesEl.classList.toggle("has-planes", showTabs);

    function selectPlane(index) {
      const plane = project.planes[index];
      modalController.setLayerSources({
        standard: plane.standard,
        wireframe: plane.wireframe,
        textured: plane.textured,
      });
      planesEl.querySelectorAll(".project-modal__plane-btn").forEach((b, i) => {
        b.setAttribute("aria-pressed", i === index ? "true" : "false");
      });
    }

    project.planes.forEach((plane, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "project-modal__plane-btn";
      btn.textContent = plane.label || `Plano ${index + 1}`;
      btn.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      btn.addEventListener("click", () => selectPlane(index));
      planesEl.appendChild(btn);
    });

    selectPlane(0);
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  grid.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("click", () => openProject(card.dataset.project));
  });

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Visores sueltos que no formen parte del grid de proyectos (si los hay)
  document.querySelectorAll(".render-viewer").forEach((root) => {
    if (!root.closest(".project-modal")) initViewer(root);
  });
  initProjectGrid();
});
