const snellenRows = [
  { denominator: 200, count: 1, fixed: "E" },
  { denominator: 100, count: 2, fixed: "FP" },
  { denominator: 70, count: 3, fixed: "TOZ" },
  { denominator: 50, count: 4, fixed: "LPED" },
  { denominator: 40, count: 5, fixed: "PECFD" },
  { denominator: 30, count: 6, fixed: "EDFCZP" },
  { denominator: 25, count: 7, fixed: "FELOPZD" },
  { denominator: 20, count: 8, fixed: "DEFPOTEC" },
  { denominator: 15, count: 8, fixed: "LEFODPCT" },
  { denominator: 10, count: 8, fixed: "FDPLTCEO" },
];

const sets = {
  letters: ["C", "D", "H", "K", "N", "O", "R", "S", "V", "Z"],
  symbols: ["●", "■", "▲", "◆", "★", "✚", "⬟", "⬢"],
  tumblingE: ["E"],
  landoltC: ["C"],
};

const state = {
  distanceMeters: 6,
  chartType: "letters",
  sequenceMode: "balanced",
  contrast: 100,
  showLabels: true,
  colorPanels: true,
  singleLine: false,
  menuCollapsed: false,
  selectedLine: 7,
  selectedOptotype: 0,
  presentationSlide: 7,
  fullscreenActive: false,
  seed: Date.now(),
};

const elements = {
  appShell: document.querySelector("#appShell"),
  chartWorkspace: document.querySelector(".chart-workspace"),
  distanceButtons: document.querySelectorAll("[data-distance]"),
  chartType: document.querySelector("#chartType"),
  sequenceMode: document.querySelector("#sequenceMode"),
  contrast: document.querySelector("#contrast"),
  contrastValue: document.querySelector("#contrastValue"),
  showLabels: document.querySelector("#showLabels"),
  colorPanels: document.querySelector("#colorPanels"),
  singleLine: document.querySelector("#singleLine"),
  linePicker: document.querySelector("#linePicker"),
  linePickerField: document.querySelector(".line-picker"),
  shuffle: document.querySelector("#shuffle"),
  printChart: document.querySelector("#printChart"),
  toggleMenu: document.querySelector("#toggleMenu"),
  fullscreen: document.querySelector("#fullscreen"),
  reset: document.querySelector("#reset"),
  chart: document.querySelector("#chart"),
  chartPaper: document.querySelector("#chartPaper"),
  sizeTable: document.querySelector("#sizeTable"),
  distanceTitle: document.querySelector("#distanceTitle"),
  chartDistance: document.querySelector("#chartDistance"),
  chartName: document.querySelector("#chartName"),
  calibrationText: document.querySelector("#calibrationText"),
};

function optotypeHeightMm(distanceMeters, denominator) {
  const snellenNumeratorFeet = 20;
  const minimumAngleRatio = denominator / snellenNumeratorFeet;
  const visualAngleRadians = (5 / 60) * (Math.PI / 180) * minimumAngleRatio;
  return 2 * distanceMeters * 1000 * Math.tan(visualAngleRadians / 2);
}

function mulberry32(seed) {
  return function nextRandom() {
    let value = seed += 0x6d2b79f5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSequence(row, rowIndex) {
  if (state.sequenceMode === "fixed" && state.chartType === "letters") {
    return row.fixed.slice(0, row.count).split("");
  }

  const source = sets[state.chartType];
  const random = mulberry32(state.seed + rowIndex * 97 + row.denominator);
  const offset = state.sequenceMode === "balanced" ? rowIndex : Math.floor(random() * source.length);

  return Array.from({ length: row.count }, (_, index) => {
    if (state.sequenceMode === "random") {
      return source[Math.floor(random() * source.length)];
    }
    return source[(offset + index * 3) % source.length];
  });
}

function visibleSequence(row, rowIndex) {
  const sequence = buildSequence(row, rowIndex);
  if (!state.singleLine || rowIndex !== state.selectedLine) return sequence;
  return sequence;
}

function lineName(row) {
  return `20/${row.denominator}`;
}

function totalSlides() {
  return snellenRows.length + (state.colorPanels ? 1 : 0);
}

function normalizePresentationSlide() {
  const maximumSlide = totalSlides() - 1;
  state.presentationSlide = Math.max(0, Math.min(state.presentationSlide, maximumSlide));
  if (isPresentationMode() && state.presentationSlide < snellenRows.length) {
    state.selectedLine = state.presentationSlide;
  }
}

function setRotation(element, rowIndex, index) {
  if (state.chartType !== "tumblingE" && state.chartType !== "landoltC") return;
  const rotations = [0, 90, 180, 270];
  const rotation = rotations[(rowIndex + index * 2 + state.seed) % rotations.length];
  element.style.transform = `rotate(${rotation}deg)`;
}

function isPresentationMode() {
  return state.fullscreenActive || Boolean(document.fullscreenElement) || elements.chartWorkspace.classList.contains("local-fullscreen");
}

function renderChart() {
  elements.chart.innerHTML = "";
  normalizePresentationSlide();
  elements.chartPaper.style.setProperty("--contrast", `${state.contrast}%`);
  elements.chartPaper.classList.toggle("single-line", state.singleLine);
  elements.chartPaper.classList.toggle("with-color-panels", state.colorPanels);
  elements.chartWorkspace.classList.toggle("single-line-mode", state.singleLine);
  elements.chartWorkspace.classList.toggle("presentation-mode", false);

  snellenRows.forEach((row, rowIndex) => {
    const sizeMm = optotypeHeightMm(state.distanceMeters, row.denominator);
    const rowElement = document.createElement("div");
    rowElement.className = "chart-row";
    rowElement.classList.toggle("is-selected", rowIndex === state.selectedLine);
    rowElement.classList.toggle("is-presentation-slide", rowIndex === state.presentationSlide);
    rowElement.style.setProperty("--size", `${sizeMm}mm`);
    rowElement.style.setProperty("--gap", `${Math.max(sizeMm * 0.22, 3)}mm`);

    const acuity = document.createElement("div");
    acuity.className = "acuity-label";
    acuity.textContent = state.showLabels ? lineName(row) : "";

    const optotypes = document.createElement("div");
    optotypes.className = "optotypes";
    visibleSequence(row, rowIndex).forEach((value, index) => {
      const symbol = document.createElement("span");
      symbol.className = `optotype ${state.chartType === "symbols" ? "symbol-optotype" : ""}`;
      if (state.chartType === "landoltC") symbol.classList.add("landolt");
      if (state.chartType === "tumblingE") symbol.classList.add("tumbling");
      symbol.textContent = value;
      setRotation(symbol, rowIndex, index);
      optotypes.appendChild(symbol);
    });

    const metric = document.createElement("div");
    metric.className = "metric-label";
    metric.textContent = state.showLabels ? `${sizeMm.toFixed(1)} mm` : "";

    rowElement.append(acuity, optotypes, metric);
    elements.chart.appendChild(rowElement);
  });

  if (state.colorPanels) {
    renderColorPanels();
  }
}

function renderColorPanels() {
  const panelSlide = snellenRows.length;

  const panel = document.createElement("section");
  panel.className = "color-panel traditional-panel";
  panel.classList.toggle("is-presentation-slide", state.presentationSlide === panelSlide);
  panel.innerHTML = `
    <div class="duo-panel">
      <div class="duo-column green-panel">
        <strong>P T</strong>
        <span>Z N B</span>
        <small>D A O</small>
        <small>T H G F</small>
      </div>
      <div class="duo-column red-panel">
        <strong>T P</strong>
        <span>B N Z</span>
        <small>O A D</small>
        <small>F G H T</small>
      </div>
    </div>
    <div class="symbol-panel">
      <div class="dot-grid" aria-label="Pontos coloridos">
        <span class="dot red-dot"></span>
        <span class="dot green-dot"></span>
        <span class="dot green-dot"></span>
        <span class="dot white-dot"></span>
      </div>
      <div class="contrast-symbols" aria-label="Simbolos de contraste">
        <span>◉</span>
        <span>●</span>
        <span>○</span>
      </div>
    </div>
  `;

  elements.chart.append(panel);
}

function renderReference() {
  elements.sizeTable.innerHTML = "";
  snellenRows.forEach((row) => {
    const cell = document.createElement("div");
    cell.className = "size-cell";
    const sizeMm = optotypeHeightMm(state.distanceMeters, row.denominator);
    cell.innerHTML = `<strong>${lineName(row)}</strong><span>${sizeMm.toFixed(2)} mm</span>`;
    elements.sizeTable.appendChild(cell);
  });
}

function renderLinePicker() {
  elements.linePicker.innerHTML = "";
  snellenRows.forEach((row, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${lineName(row)} - ${optotypeHeightMm(state.distanceMeters, row.denominator).toFixed(1)} mm`;
    elements.linePicker.appendChild(option);
  });
  elements.linePicker.value = String(state.selectedLine);
  elements.linePickerField.hidden = !state.singleLine;
}

function renderHeader() {
  const distanceLabel = `${state.distanceMeters} metros`;
  const twentyTwenty = optotypeHeightMm(state.distanceMeters, 20);
  const names = {
    letters: "Optotipos Snellen",
    symbols: "Simbolos infantis",
    tumblingE: "E direcional",
    landoltC: "C de Landolt",
  };

  elements.distanceTitle.textContent = distanceLabel;
  elements.chartDistance.textContent = `Teste a ${state.distanceMeters} m`;
  elements.chartName.textContent = names[state.chartType];
  elements.calibrationText.textContent = `A linha 20/20 deve medir ${twentyTwenty.toFixed(2)} mm`;
  elements.contrastValue.textContent = `${state.contrast}%`;
  elements.appShell.classList.toggle("menu-collapsed", state.menuCollapsed);
  elements.toggleMenu.setAttribute("aria-expanded", String(!state.menuCollapsed));
  elements.toggleMenu.classList.toggle("is-active", state.menuCollapsed);
  elements.toggleMenu.querySelector("span:last-child").textContent = state.menuCollapsed ? "Mostrar menu" : "Menu";
  const isFullscreen = isPresentationMode();
  elements.fullscreen.classList.toggle("is-active", isFullscreen);
  elements.fullscreen.querySelector("span:last-child").textContent = isFullscreen ? "Sair" : "Tela cheia";
  elements.shuffle.textContent = state.singleLine ? "Embaralhar linha" : "Embaralhar";
}

function renderAll() {
  renderHeader();
  renderLinePicker();
  renderChart();
  renderReference();
}

function bindEvents() {
  elements.distanceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.distanceMeters = Number(button.dataset.distance);
      elements.distanceButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      renderAll();
    });
  });

  elements.chartType.addEventListener("change", () => {
    state.chartType = elements.chartType.value;
    renderAll();
  });

  elements.sequenceMode.addEventListener("change", () => {
    state.sequenceMode = elements.sequenceMode.value;
    renderAll();
  });

  elements.contrast.addEventListener("input", () => {
    state.contrast = Number(elements.contrast.value);
    renderAll();
  });

  elements.showLabels.addEventListener("change", () => {
    state.showLabels = elements.showLabels.checked;
    renderAll();
  });

  elements.colorPanels.addEventListener("change", () => {
    state.colorPanels = elements.colorPanels.checked;
    normalizePresentationSlide();
    renderAll();
  });

  elements.singleLine.addEventListener("change", () => {
    state.singleLine = elements.singleLine.checked;
    state.selectedOptotype = 0;
    renderAll();
  });

  elements.linePicker.addEventListener("change", () => {
    state.selectedLine = Number(elements.linePicker.value);
    state.presentationSlide = state.selectedLine;
    state.selectedOptotype = 0;
    renderAll();
  });

  elements.shuffle.addEventListener("click", () => {
    state.seed = Date.now();
    state.selectedOptotype = 0;
    renderAll();
  });

  elements.printChart.addEventListener("click", () => window.print());

  elements.toggleMenu.addEventListener("click", () => {
    state.menuCollapsed = !state.menuCollapsed;
    renderAll();
  });

  elements.fullscreen.addEventListener("click", async () => {
    try {
      if (state.fullscreenActive || elements.chartWorkspace.classList.contains("local-fullscreen")) {
        state.fullscreenActive = false;
        elements.chartWorkspace.classList.remove("local-fullscreen");
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } else if (document.fullscreenEnabled && elements.chartWorkspace.requestFullscreen) {
        state.fullscreenActive = true;
        state.presentationSlide = state.selectedLine;
        await elements.chartWorkspace.requestFullscreen();
      } else {
        state.fullscreenActive = true;
        state.presentationSlide = state.selectedLine;
        elements.chartWorkspace.classList.add("local-fullscreen");
      }
    } catch (error) {
      state.fullscreenActive = true;
      elements.chartWorkspace.classList.add("local-fullscreen");
    }
    renderAll();
  });

  elements.chartWorkspace.addEventListener("click", (event) => {
    if (!isPresentationMode() || event.target.closest("button")) return;
    const bounds = elements.chartWorkspace.getBoundingClientRect();
    const direction = event.clientX < bounds.left + bounds.width / 2 ? -1 : 1;
    movePresentation(direction);
  });

  document.addEventListener("keydown", (event) => {
    if (!isPresentationMode()) return;
    if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
      event.preventDefault();
      movePresentation(1);
    }
    if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      movePresentation(-1);
    }
  });

  document.addEventListener("fullscreenchange", () => {
    state.fullscreenActive = Boolean(document.fullscreenElement);
    if (!document.fullscreenElement) {
      elements.chartWorkspace.classList.remove("local-fullscreen");
    }
    renderAll();
  });

  elements.reset.addEventListener("click", () => {
    Object.assign(state, {
      distanceMeters: 6,
      chartType: "letters",
      sequenceMode: "balanced",
      contrast: 100,
      showLabels: true,
      colorPanels: true,
      singleLine: false,
      menuCollapsed: false,
      selectedLine: 7,
      selectedOptotype: 0,
      presentationSlide: 7,
      seed: Date.now(),
    });

    elements.chartType.value = state.chartType;
    elements.sequenceMode.value = state.sequenceMode;
    elements.contrast.value = String(state.contrast);
    elements.showLabels.checked = state.showLabels;
    elements.colorPanels.checked = state.colorPanels;
    elements.singleLine.checked = state.singleLine;
    elements.distanceButtons.forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.distance) === state.distanceMeters);
    });
    renderAll();
  });
}

function movePresentation(direction) {
  state.presentationSlide = (state.presentationSlide + direction + totalSlides()) % totalSlides();
  if (state.presentationSlide < snellenRows.length) {
    state.selectedLine = state.presentationSlide;
    state.selectedOptotype = 0;
  }
  renderAll();
}

bindEvents();
renderAll();
