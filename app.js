const CALIBRATION_KEY = "optotipos.calibration.v2";
const OPTOTYPE_CALIBRATION_KEY = "optotipos.glyph-scale.v1";
const OPTOTYPE_FONT = '"Optician Sans Local", Arial, Helvetica, sans-serif';
const CARD_CALIBRATION_WIDTH_MM = 85.6;
const COLOR_PANEL_WIDTH_MM = 102;
const COLOR_PANEL_HEIGHT_MM = 92;
const COLOR_PANEL_ROWS = [
  { green: "PT", red: "TP", sizeMm: 22, gapMm: 22 },
  { green: "ZNB", red: "BNZ", sizeMm: 18, gapMm: 8 },
  { green: "DAO", red: "OAD", sizeMm: 14, gapMm: 13 },
  { green: "THGF", red: "FGHT", sizeMm: 9, gapMm: 11 },
];

const snellenRows = [
  { denominator: 200, fixed: "E" },
  { denominator: 100, fixed: "HB" },
  { denominator: 60, fixed: "DAOF" },
  { denominator: 40, fixed: "FZBDE" },
  { denominator: 30, fixed: "OFLCT" },
  { denominator: 25, fixed: "APEOTF" },
  { denominator: 20, fixed: "TZVECL" },
  { denominator: 13.3, fixed: "OHPNTZ" },
].map((row) => ({ ...row, count: row.fixed.length }));

const etdrsRows = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0, -0.1, -0.2]
  .map((logMar) => ({ denominator: 20 * (10 ** logMar), count: 5, logMar }));

const sets = {
  letters: ["C", "D", "H", "K", "N", "O", "R", "S", "V", "Z"],
  symbols: ["●", "■", "▲", "◆", "★", "✚", "⬟", "⬢"],
  tumblingE: ["E"],
  numbers: ["2", "3", "4", "5", "6", "7", "8", "9"],
};

const state = {
  distanceMeters: 6, protocol: "snellen", chartType: "letters", sequenceMode: "fixed",
  contrast: 100, showLabels: true, colorPanels: false, singleLine: false, menuCollapsed: false,
  selectedLine: 6, presentationSlide: 6, fullscreenActive: false, seed: Date.now(), pixelsPerMm: null, glyphScale: 1,
};

const elements = Object.fromEntries([
  "appShell", "controlPanel", "customDistance", "chartType", "sequenceMode", "contrast", "contrastValue", "showLabels", "colorPanels", "singleLine", "linePicker", "shuffle", "toggleMenu", "fullscreen", "reset", "chart", "chartPaper", "presentationStage", "sizeTable", "distanceTitle", "chartDistance", "chartName", "calibrationText", "calibrationCard", "calibrationBar", "openCardCalibration", "cardCalibrationModal", "closeCardCalibration", "cancelCardCalibration", "cardCalibration", "cardCalibrationWidth", "cardCalibrationWidthValue", "saveCardCalibration", "measuredBarMm", "saveCalibration", "clearCalibration", "calibrationStatus",
].map((id) => [id, document.querySelector(`#${id}`)]));
elements.distanceButtons = document.querySelectorAll("[data-distance]");
elements.linePickerField = document.querySelector(".line-picker");
elements.chartWorkspace = document.querySelector(".chart-workspace");

function rows() { return state.protocol === "etdrs" ? etdrsRows : snellenRows; }

function optotypeHeightMm(distanceMeters, denominator) {
  const visualAngleRadians = (5 / 60) * (Math.PI / 180) * (denominator / 20);
  return 2 * distanceMeters * 1000 * Math.tan(visualAngleRadians / 2);
}

function lineName(row) {
  const denominator = state.protocol === "snellen" && !Number.isInteger(row.denominator) ? row.denominator.toFixed(1) : Math.round(row.denominator);
  return state.protocol === "etdrs" ? `logMAR ${row.logMar.toFixed(1)} · 20/${denominator}` : `20/${denominator}`;
}

function mulberry32(seed) { return () => { let value = seed += 0x6d2b79f5; value = Math.imul(value ^ (value >>> 15), value | 1); value ^= value + Math.imul(value ^ (value >>> 7), value | 61); return ((value ^ (value >>> 14)) >>> 0) / 4294967296; }; }

function shuffledSequence(source, count, random) {
  const pool = [...source];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return Array.from({ length: count }, (_, index) => pool[index % pool.length]);
}

function buildSequence(row, rowIndex) {
  if (state.protocol === "snellen" && state.chartType === "letters" && state.sequenceMode === "fixed") return row.fixed.split("");
  const source = sets[state.chartType];
  const random = mulberry32(state.seed + rowIndex * 97 + Math.round(row.denominator));
  if (state.chartType === "numbers" || state.chartType === "symbols") {
    return shuffledSequence(source, row.count, random);
  }
  const offset = state.sequenceMode === "balanced" ? rowIndex : Math.floor(random() * source.length);
  return Array.from({ length: row.count }, (_, index) => state.sequenceMode === "random" ? source[Math.floor(random() * source.length)] : source[(offset + index * 3) % source.length]);
}

function rotationForOptotype(rowIndex, index) {
  const directions = [0, 90, 180, 270];
  const random = mulberry32(state.seed + rowIndex * 131 + index * 17);
  let rotation = directions[Math.floor(random() * directions.length)];
  if (index > 0) {
    const previous = rotationForOptotype(rowIndex, index - 1);
    while (rotation === previous) rotation = directions[Math.floor(random() * directions.length)];
  }
  return rotation;
}

function shouldDrawGeometricE(value) {
  return state.chartType === "tumblingE" || (state.chartType === "letters" && value === "E");
}

function optotypeClassName(baseClass, value) {
  const classNames = [baseClass];
  if (state.chartType === "symbols") classNames.push("symbol-optotype");
  if (shouldDrawGeometricE(value)) classNames.push("tumbling-e-optotype");
  if (state.chartType === "tumblingE") classNames.push("directional-optotype");
  return classNames.join(" ");
}

function fillOptotype(symbol, value) {
  if (!shouldDrawGeometricE(value)) {
    symbol.textContent = value;
    return;
  }
  symbol.textContent = "";
  symbol.setAttribute("aria-label", "E");
  ["top", "middle", "bottom", "stem"].forEach((part) => {
    const bar = document.createElement("span");
    bar.className = `tumbling-e-part tumbling-e-${part}`;
    symbol.appendChild(bar);
  });
}

function isPresentationMode() { return state.fullscreenActive || Boolean(document.fullscreenElement) || elements.chartWorkspace.classList.contains("local-fullscreen"); }
function totalSlides() { return rows().length + 1; }
function pxForMm(mm) { return mm * (state.pixelsPerMm || (96 / 25.4)); }

function glyphFontSizePx(value, targetInkHeightPx) {
  // CSS font-size measures an em box, not the black ink that the examiner sees.
  // Measure the ink bounds so the visible optotype height matches the angular size.
  const canvas = glyphFontSizePx.canvas || (glyphFontSizePx.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  if (!context) return targetInkHeightPx * 1.36 * state.glyphScale;
  const sampleSize = 1000;
  context.font = `400 ${sampleSize}px ${OPTOTYPE_FONT}`;
  const metrics = context.measureText(value);
  const inkHeight = (metrics.actualBoundingBoxAscent || 0) + (metrics.actualBoundingBoxDescent || 0);
  if (!inkHeight) return targetInkHeightPx * 1.36 * state.glyphScale;
  return targetInkHeightPx * (sampleSize / inkHeight) * state.glyphScale;
}

function previewScaleForRow(row, sizePx, gapPx) {
  const maxPreviewWidthPx = 300;
  const maxPreviewHeightPx = 245;
  const totalWidthPx = row.count * sizePx + Math.max(row.count - 1, 0) * gapPx;
  return Math.min(1, maxPreviewWidthPx / totalWidthPx, maxPreviewHeightPx / sizePx);
}

function createColorPanelPair(className) {
  const pair = document.createElement("div");
  pair.className = className;
  pair.style.setProperty("--panel-width-px", `${pxForMm(COLOR_PANEL_WIDTH_MM)}px`);
  pair.style.setProperty("--panel-height-px", `${pxForMm(COLOR_PANEL_HEIGHT_MM)}px`);
  pair.style.setProperty("--letter-gap-px", `${pxForMm(3)}px`);
  pair.style.setProperty("--panel-inset-px", `${pxForMm(6)}px`);
  COLOR_PANEL_ROWS.forEach((row, index) => pair.style.setProperty(`--color-row-${index + 1}-px`, `${pxForMm(row.sizeMm)}px`));

  [["green", "green"], ["red", "red"]].forEach(([color, key]) => {
    const panel = document.createElement("div");
    panel.className = `color-block ${color}-block`;
    COLOR_PANEL_ROWS.forEach((row) => {
      const line = document.createElement("div");
      line.className = "color-row";
      line.style.height = `${pxForMm(row.sizeMm)}px`;
      line.style.setProperty("--letter-count", String(row[key].length));
      line.style.setProperty("--row-letter-gap-px", `${pxForMm(row.gapMm)}px`);
      row[key].split("").forEach((letter) => {
        const symbol = document.createElement("span");
        symbol.textContent = letter;
        symbol.style.setProperty("--glyph-size-px", `${glyphFontSizePx(letter, pxForMm(row.sizeMm))}px`);
        line.appendChild(symbol);
      });
      panel.appendChild(line);
    });
    pair.appendChild(panel);
  });
  return pair;
}

function renderChart() {
  const chartRows = rows();
  state.selectedLine = Math.min(state.selectedLine, chartRows.length - 1);
  state.presentationSlide = Math.min(state.presentationSlide, totalSlides() - 1);
  elements.chart.innerHTML = "";
  elements.chartPaper.style.setProperty("--contrast", `${state.contrast}%`);
  elements.chartPaper.classList.toggle("single-line", state.singleLine);
  elements.chartWorkspace.classList.toggle("presentation-mode", isPresentationMode());
  chartRows.forEach((row, rowIndex) => {
    const sizeMm = optotypeHeightMm(state.distanceMeters, row.denominator);
    const rowElement = document.createElement("div");
    rowElement.className = "chart-card";
    rowElement.dataset.slide = String(rowIndex);
    rowElement.classList.toggle("intro-card", rowIndex < 2);
    rowElement.classList.toggle("is-selected", rowIndex === state.selectedLine);
    rowElement.classList.toggle("is-presentation-slide", rowIndex === state.presentationSlide);
    rowElement.style.setProperty("--size-mm", `${sizeMm}mm`);
    const sizePx = pxForMm(sizeMm);
    rowElement.style.setProperty("--size-px", `${sizePx}px`);
    const spacingMm = row.denominator === 100 ? 34 : 17;
    rowElement.style.setProperty("--gap-mm", `${spacingMm}mm`);
    const gapPx = pxForMm(spacingMm);
    rowElement.style.setProperty("--gap-px", `${gapPx}px`);
    const previewScale = previewScaleForRow(row, sizePx, gapPx);
    rowElement.style.setProperty("--preview-size-px", `${sizePx * previewScale}px`);
    rowElement.style.setProperty("--preview-gap-px", `${gapPx * previewScale}px`);
    const acuity = document.createElement("div"); acuity.className = "acuity-label"; acuity.textContent = state.showLabels ? lineName(row) : "";
    const optotypes = document.createElement("div"); optotypes.className = "optotypes";
    buildSequence(row, rowIndex).forEach((value, index) => {
      const symbol = document.createElement("span");
      symbol.className = optotypeClassName("optotype", value);
      fillOptotype(symbol, value);
      const glyphSizePx = glyphFontSizePx(value, sizePx);
      symbol.style.setProperty("--glyph-size-px", `${glyphSizePx}px`);
      symbol.style.setProperty("--preview-glyph-size-px", `${glyphSizePx * previewScale}px`);
      if (state.chartType === "tumblingE") symbol.style.setProperty("--optotype-rotation", `${rotationForOptotype(rowIndex, index)}deg`);
      optotypes.appendChild(symbol);
    });
    const metric = document.createElement("div"); metric.className = "metric-label"; metric.textContent = state.showLabels ? `${sizeMm.toFixed(2)} mm${state.pixelsPerMm ? "" : " teóricos"}` : "";
    const cardHeader = document.createElement("div"); cardHeader.className = "card-header"; cardHeader.append(acuity, metric);
    rowElement.append(cardHeader, optotypes); elements.chart.appendChild(rowElement);
  });

  const colorCard = document.createElement("section");
  colorCard.className = "chart-card color-slide-card";
  colorCard.dataset.slide = String(chartRows.length);
  colorCard.classList.toggle("is-presentation-slide", state.presentationSlide === chartRows.length);
  colorCard.innerHTML = `<div class="card-header"><div class="acuity-label">Painel complementar</div><div class="metric-label">Blocos verde / vermelho</div></div>`;
  colorCard.appendChild(createColorPanelPair("color-slide-preview"));
  elements.chart.appendChild(colorCard);
}

function renderPresentation() {
  const active = isPresentationMode();
  elements.presentationStage.innerHTML = "";
  elements.presentationStage.hidden = !active;
  if (!active) return;

  const row = rows()[state.presentationSlide];
  if (!row) {
    elements.presentationStage.appendChild(createColorPanelPair("presentation-color-slide"));
    return;
  }
  const sizeMm = optotypeHeightMm(state.distanceMeters, row.denominator);
  const slide = document.createElement("div");
  slide.className = "presentation-slide";
  slide.classList.toggle("intro-slide", state.presentationSlide < 2);
  slide.style.setProperty("--size-px", `${pxForMm(sizeMm)}px`);
  slide.style.setProperty("--gap-px", `${pxForMm(row.denominator === 100 ? 34 : 17)}px`);
  slide.style.setProperty("--contrast", `${state.contrast}%`);

  const optotypes = document.createElement("div");
  optotypes.className = "presentation-optotypes";
  buildSequence(row, state.presentationSlide).forEach((value, index) => {
    const symbol = document.createElement("span");
    symbol.className = optotypeClassName("presentation-optotype", value);
    fillOptotype(symbol, value);
    symbol.style.setProperty("--glyph-size-px", `${glyphFontSizePx(value, pxForMm(sizeMm))}px`);
    if (state.chartType === "tumblingE") symbol.style.setProperty("--optotype-rotation", `${rotationForOptotype(state.presentationSlide, index)}deg`);
    optotypes.appendChild(symbol);
  });
  slide.appendChild(optotypes);
  elements.presentationStage.appendChild(slide);
}

function renderReference() {
  elements.sizeTable.innerHTML = "";
  rows().forEach((row) => { const cell = document.createElement("div"); cell.className = "size-cell"; const size = optotypeHeightMm(state.distanceMeters, row.denominator); const pixels = Math.round(pxForMm(size)); const suffix = state.pixelsPerMm ? `${pixels} px calibrados` : `${pixels} px — tamanho físico pendente`; cell.innerHTML = `<strong>${lineName(row)}</strong><span>${size.toFixed(2)} mm teóricos · ${suffix}</span>`; elements.sizeTable.appendChild(cell); });
}

function renderPickers() {
  elements.linePicker.innerHTML = "";
  rows().forEach((row, index) => { const option = document.createElement("option"); option.value = String(index); option.textContent = lineName(row); elements.linePicker.appendChild(option); });
  elements.linePicker.value = String(state.selectedLine);
  elements.linePickerField.hidden = !state.singleLine;
}

function renderCalibration() {
  // The bar must remain fully visible in narrow side panels. Its rendered width,
  // not an assumed CSS width, is used in the calibration calculation.
  elements.calibrationBar.style.width = "min(320px, 100%)";
  const cardWidth = Number(elements.cardCalibrationWidth.value || 324);
  elements.cardCalibration.style.width = `${cardWidth}px`;
  elements.cardCalibrationWidthValue.textContent = `${Math.round(cardWidth)} px`;
  const barPixels = elements.calibrationBar.getBoundingClientRect().width;
  const target = optotypeHeightMm(state.distanceMeters, 20);
  if (state.pixelsPerMm) {
    elements.calibrationText.textContent = `Calibrado · 20/20 = ${target.toFixed(2)} mm`;
    elements.calibrationCard.classList.add("is-calibrated");
    const glyphStatus = state.glyphScale === 1 ? "" : " Conferência da fonte aplicada.";
    elements.calibrationStatus.textContent = `${state.pixelsPerMm.toFixed(3)} px/mm salvo para esta tela. Recalibre se mudar monitor, resolução ou escala.${glyphStatus}`;
  } else {
    elements.calibrationText.textContent = "Calibração pendente — não usar para medição";
    elements.calibrationCard.classList.remove("is-calibrated");
    elements.calibrationStatus.textContent = "";
  }
}

function renderHeader() {
  const names = { letters: "Letras Sloan", symbols: "Símbolos", tumblingE: "E direcional", numbers: "Numeros" };
  elements.distanceTitle.textContent = `${state.distanceMeters} metros`;
  elements.chartDistance.textContent = `${state.protocol.toUpperCase()} · teste a ${state.distanceMeters} m`;
  elements.chartName.textContent = names[state.chartType]; elements.contrastValue.textContent = `${state.contrast}%`;
  elements.appShell.classList.toggle("menu-collapsed", state.menuCollapsed);
  elements.fullscreen.querySelector("span:last-child").textContent = isPresentationMode() ? "Sair" : "Tela cheia";
}

function renderAll() { renderHeader(); renderPickers(); renderCalibration(); renderChart(); renderReference(); renderPresentation(); }

function saveCalibration() {
  const measured = Number(elements.measuredBarMm.value);
  if (!Number.isFinite(measured) || measured < 10 || measured > 300) { elements.calibrationStatus.textContent = "Informe uma medida entre 10 e 300 mm."; return; }
  const barPixels = elements.calibrationBar.getBoundingClientRect().width;
  if (!Number.isFinite(barPixels) || barPixels < 10) { elements.calibrationStatus.textContent = "Não foi possível ler a barra de calibração. Atualize a página e tente novamente."; return; }
  state.pixelsPerMm = barPixels / measured;
  localStorage.setItem(CALIBRATION_KEY, JSON.stringify({ method: "ruler", pixelsPerMm: state.pixelsPerMm, calibratedAt: new Date().toISOString(), barPixels, measuredMm: measured })); renderAll();
}

function saveCardCalibration() {
  const cardPixels = elements.cardCalibration.getBoundingClientRect().width;
  if (!Number.isFinite(cardPixels) || cardPixels < 120) {
    elements.calibrationStatus.textContent = "Não foi possível ler a largura do cartão. Ajuste o controle e tente novamente.";
    return;
  }
  state.pixelsPerMm = cardPixels / CARD_CALIBRATION_WIDTH_MM;
  localStorage.setItem(CALIBRATION_KEY, JSON.stringify({
    method: "card",
    pixelsPerMm: state.pixelsPerMm,
    calibratedAt: new Date().toISOString(),
    cardPixels,
    referenceMm: CARD_CALIBRATION_WIDTH_MM,
  }));
  elements.calibrationStatus.textContent = `Calibrado pelo cartão: ${state.pixelsPerMm.toFixed(3)} px/mm.`;
  closeCardCalibration();
  renderAll();
}

function openCardCalibration() {
  elements.cardCalibrationModal.hidden = false;
  renderCalibration();
}

function closeCardCalibration() {
  elements.cardCalibrationModal.hidden = true;
}

function bindEvents() {
  elements.distanceButtons.forEach((button) => button.addEventListener("click", () => { state.distanceMeters = Number(button.dataset.distance); elements.customDistance.value = state.distanceMeters; elements.distanceButtons.forEach((item) => item.classList.toggle("is-active", item === button)); renderAll(); }));
  elements.customDistance.addEventListener("change", () => { const value = Number(elements.customDistance.value); if (value >= 1 && value <= 20) { state.distanceMeters = value; elements.distanceButtons.forEach((item) => item.classList.toggle("is-active", Number(item.dataset.distance) === value)); renderAll(); } });
  ["chartType", "sequenceMode"].forEach((key) => elements[key].addEventListener("change", () => { state[key] = elements[key].value; state.selectedLine = Math.min(state.selectedLine, rows().length - 1); renderAll(); }));
  elements.contrast.addEventListener("input", () => { state.contrast = Number(elements.contrast.value); renderAll(); });
  elements.showLabels.addEventListener("change", () => { state.showLabels = elements.showLabels.checked; renderAll(); });
  elements.singleLine.addEventListener("change", () => { state.singleLine = elements.singleLine.checked; renderAll(); });
  elements.linePicker.addEventListener("change", () => { state.selectedLine = Number(elements.linePicker.value); state.presentationSlide = state.selectedLine; renderAll(); });
  elements.chart.addEventListener("click", async (event) => {
    const card = event.target.closest(".chart-card");
    if (!card) return;
    const slide = Number(card.dataset.slide);
    if (!Number.isInteger(slide)) return;
    state.presentationSlide = slide;
    if (slide < rows().length) state.selectedLine = slide;
    try {
      state.fullscreenActive = true;
      if (elements.chartWorkspace.requestFullscreen) await elements.chartWorkspace.requestFullscreen();
      else elements.chartWorkspace.classList.add("local-fullscreen");
    } catch {
      elements.chartWorkspace.classList.add("local-fullscreen");
    }
    renderAll();
  });
  elements.shuffle.addEventListener("click", () => { state.seed = Date.now(); renderAll(); });
  elements.openCardCalibration.addEventListener("click", openCardCalibration);
  elements.closeCardCalibration.addEventListener("click", closeCardCalibration);
  elements.cancelCardCalibration.addEventListener("click", closeCardCalibration);
  elements.cardCalibrationModal.addEventListener("click", (event) => { if (event.target === elements.cardCalibrationModal) closeCardCalibration(); });
  elements.cardCalibrationWidth.addEventListener("input", renderCalibration);
  elements.saveCardCalibration.addEventListener("click", saveCardCalibration);
  elements.saveCalibration.addEventListener("click", saveCalibration); elements.clearCalibration.addEventListener("click", () => { state.pixelsPerMm = null; localStorage.removeItem(CALIBRATION_KEY); elements.measuredBarMm.value = ""; renderAll(); });
  elements.toggleMenu.addEventListener("click", () => { state.menuCollapsed = !state.menuCollapsed; renderAll(); });
  elements.fullscreen.addEventListener("click", async () => { try { if (isPresentationMode()) { state.fullscreenActive = false; elements.chartWorkspace.classList.remove("local-fullscreen"); if (document.fullscreenElement) await document.exitFullscreen(); } else if (elements.chartWorkspace.requestFullscreen) { state.fullscreenActive = true; state.presentationSlide = state.selectedLine; await elements.chartWorkspace.requestFullscreen(); } else { state.fullscreenActive = true; elements.chartWorkspace.classList.add("local-fullscreen"); } } catch { state.fullscreenActive = true; elements.chartWorkspace.classList.add("local-fullscreen"); } renderAll(); });
  document.addEventListener("fullscreenchange", () => { state.fullscreenActive = Boolean(document.fullscreenElement); if (!document.fullscreenElement) elements.chartWorkspace.classList.remove("local-fullscreen"); renderAll(); });
  elements.presentationStage.addEventListener("click", (event) => { if (!isPresentationMode()) return; const bounds = elements.presentationStage.getBoundingClientRect(); const direction = event.clientX < bounds.left + bounds.width / 2 ? -1 : 1; state.presentationSlide = (state.presentationSlide + direction + totalSlides()) % totalSlides(); renderAll(); });
  document.addEventListener("keydown", (event) => { if (!isPresentationMode()) return; if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); state.presentationSlide = (state.presentationSlide + 1) % totalSlides(); renderAll(); } if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); state.presentationSlide = (state.presentationSlide - 1 + totalSlides()) % totalSlides(); renderAll(); } });
  elements.reset.addEventListener("click", () => { Object.assign(state, { distanceMeters: 6, protocol: "snellen", chartType: "letters", sequenceMode: "fixed", contrast: 100, showLabels: true, singleLine: false, selectedLine: 6, presentationSlide: 6, seed: Date.now() }); elements.chartType.value = state.chartType; elements.sequenceMode.value = state.sequenceMode; elements.contrast.value = 100; elements.showLabels.checked = true; elements.singleLine.checked = false; elements.customDistance.value = 6; renderAll(); });
}

try { const stored = JSON.parse(localStorage.getItem(CALIBRATION_KEY)); if (stored?.pixelsPerMm > 0) state.pixelsPerMm = stored.pixelsPerMm; } catch { localStorage.removeItem(CALIBRATION_KEY); }
try { const storedGlyphScale = JSON.parse(localStorage.getItem(OPTOTYPE_CALIBRATION_KEY)); if (storedGlyphScale?.glyphScale > 0) state.glyphScale = storedGlyphScale.glyphScale; } catch { localStorage.removeItem(OPTOTYPE_CALIBRATION_KEY); }
bindEvents();
document.fonts.load('400 100px "Optician Sans Local"').catch(() => {}).finally(renderAll);
