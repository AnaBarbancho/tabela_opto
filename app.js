const CALIBRATION_KEY = "optotipos.calibration.v2";
const RESULTS_KEY = "optotipos.results.v1";
const OPTOTYPE_FONT = '"Optician Sans", "Optician Sans Bold", Arial, Helvetica, sans-serif';

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
  landoltC: ["C"],
};

const state = {
  distanceMeters: 6, protocol: "snellen", chartType: "letters", sequenceMode: "fixed",
  contrast: 100, showLabels: true, colorPanels: false, singleLine: false, menuCollapsed: false,
  selectedLine: 6, presentationSlide: 6, fullscreenActive: false, seed: Date.now(), pixelsPerMm: null,
};

const elements = Object.fromEntries([
  "appShell", "controlPanel", "protocol", "customDistance", "chartType", "sequenceMode", "contrast", "contrastValue", "showLabels", "colorPanels", "singleLine", "linePicker", "shuffle", "printChart", "toggleMenu", "fullscreen", "reset", "chart", "chartPaper", "presentationStage", "sizeTable", "distanceTitle", "chartDistance", "chartName", "calibrationText", "calibrationCard", "calibrationBar", "measuredBarMm", "saveCalibration", "clearCalibration", "calibrationStatus", "patientId", "eye", "correction", "resultLine", "errors", "saveResult", "exportResults", "sessionStatus",
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

function buildSequence(row, rowIndex) {
  if (state.protocol === "snellen" && state.chartType === "letters" && state.sequenceMode === "fixed") return row.fixed.split("");
  const source = sets[state.chartType];
  const random = mulberry32(state.seed + rowIndex * 97 + Math.round(row.denominator));
  const offset = state.sequenceMode === "balanced" ? rowIndex : Math.floor(random() * source.length);
  return Array.from({ length: row.count }, (_, index) => state.sequenceMode === "random" ? source[Math.floor(random() * source.length)] : source[(offset + index * 3) % source.length]);
}

function isPresentationMode() { return state.fullscreenActive || Boolean(document.fullscreenElement) || elements.chartWorkspace.classList.contains("local-fullscreen"); }
function pxForMm(mm) { return mm * (state.pixelsPerMm || (96 / 25.4)); }

function glyphFontSizePx(value, targetInkHeightPx) {
  // CSS font-size measures an em box, not the black ink that the examiner sees.
  // Measure the ink bounds so the visible optotype height matches the angular size.
  const canvas = glyphFontSizePx.canvas || (glyphFontSizePx.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  if (!context) return targetInkHeightPx * 1.36;
  const sampleSize = 1000;
  context.font = `800 ${sampleSize}px ${OPTOTYPE_FONT}`;
  const metrics = context.measureText(value);
  const inkHeight = (metrics.actualBoundingBoxAscent || 0) + (metrics.actualBoundingBoxDescent || 0);
  if (!inkHeight) return targetInkHeightPx * 1.36;
  return targetInkHeightPx * (sampleSize / inkHeight);
}

function renderChart() {
  const chartRows = rows();
  state.selectedLine = Math.min(state.selectedLine, chartRows.length - 1);
  state.presentationSlide = Math.min(state.presentationSlide, chartRows.length - 1);
  elements.chart.innerHTML = "";
  elements.chartPaper.style.setProperty("--contrast", `${state.contrast}%`);
  elements.chartPaper.classList.toggle("single-line", state.singleLine);
  elements.chartWorkspace.classList.toggle("presentation-mode", isPresentationMode());
  chartRows.forEach((row, rowIndex) => {
    const sizeMm = optotypeHeightMm(state.distanceMeters, row.denominator);
    const rowElement = document.createElement("div");
    rowElement.className = "chart-row";
    rowElement.classList.toggle("is-selected", rowIndex === state.selectedLine);
    rowElement.classList.toggle("is-presentation-slide", rowIndex === state.presentationSlide);
    rowElement.style.setProperty("--size-mm", `${sizeMm}mm`);
    rowElement.style.setProperty("--size-px", `${pxForMm(sizeMm)}px`);
    rowElement.style.setProperty("--gap-mm", `${Math.max(sizeMm * 0.22, 3)}mm`);
    rowElement.style.setProperty("--gap-px", `${pxForMm(Math.max(sizeMm * 0.22, 3))}px`);
    const acuity = document.createElement("div"); acuity.className = "acuity-label"; acuity.textContent = state.showLabels ? lineName(row) : "";
    const optotypes = document.createElement("div"); optotypes.className = "optotypes";
    buildSequence(row, rowIndex).forEach((value, index) => {
      const symbol = document.createElement("span");
      symbol.className = `optotype ${state.chartType === "symbols" ? "symbol-optotype" : ""}`;
      symbol.textContent = value;
      symbol.style.setProperty("--glyph-size-px", `${glyphFontSizePx(value, pxForMm(sizeMm))}px`);
      if (state.chartType === "tumblingE" || state.chartType === "landoltC") symbol.style.transform = `rotate(${[0, 90, 180, 270][(rowIndex + index * 3 + state.seed) % 4]}deg)`;
      optotypes.appendChild(symbol);
    });
    const metric = document.createElement("div"); metric.className = "metric-label"; metric.textContent = state.showLabels ? `${sizeMm.toFixed(2)} mm${state.pixelsPerMm ? "" : " teóricos"}` : "";
    rowElement.append(acuity, optotypes, metric); elements.chart.appendChild(rowElement);
  });
}

function renderPresentation() {
  const active = isPresentationMode();
  elements.presentationStage.innerHTML = "";
  elements.presentationStage.hidden = !active;
  if (!active) return;

  const row = rows()[state.presentationSlide];
  if (!row) return;
  const sizeMm = optotypeHeightMm(state.distanceMeters, row.denominator);
  const slide = document.createElement("div");
  slide.className = "presentation-slide";
  slide.style.setProperty("--size-px", `${pxForMm(sizeMm)}px`);
  slide.style.setProperty("--gap-px", `${pxForMm(Math.max(sizeMm * 0.22, 3))}px`);
  slide.style.setProperty("--contrast", `${state.contrast}%`);

  const optotypes = document.createElement("div");
  optotypes.className = "presentation-optotypes";
  buildSequence(row, state.presentationSlide).forEach((value, index) => {
    const symbol = document.createElement("span");
    symbol.className = `presentation-optotype ${state.chartType === "symbols" ? "symbol-optotype" : ""}`;
    symbol.textContent = value;
    symbol.style.setProperty("--glyph-size-px", `${glyphFontSizePx(value, pxForMm(sizeMm))}px`);
    if (state.chartType === "tumblingE" || state.chartType === "landoltC") symbol.style.transform = `rotate(${[0, 90, 180, 270][(state.presentationSlide + index * 3 + state.seed) % 4]}deg)`;
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
  [elements.linePicker, elements.resultLine].forEach((picker) => { picker.innerHTML = ""; rows().forEach((row, index) => { const option = document.createElement("option"); option.value = String(index); option.textContent = lineName(row); picker.appendChild(option); }); });
  elements.linePicker.value = String(state.selectedLine); elements.resultLine.value = String(state.selectedLine); elements.linePickerField.hidden = !state.singleLine;
}

function renderCalibration() {
  // The bar must remain fully visible in narrow side panels. Its rendered width,
  // not an assumed CSS width, is used in the calibration calculation.
  elements.calibrationBar.style.width = "min(320px, 100%)";
  const barPixels = elements.calibrationBar.getBoundingClientRect().width;
  const target = optotypeHeightMm(state.distanceMeters, 20);
  if (state.pixelsPerMm) {
    elements.calibrationText.textContent = `Calibrado · 20/20 = ${target.toFixed(2)} mm`;
    elements.calibrationCard.classList.add("is-calibrated");
    elements.calibrationStatus.textContent = `${state.pixelsPerMm.toFixed(3)} px/mm salvo para esta tela. Recalibre se mudar monitor, resolução ou escala.`;
  } else {
    elements.calibrationText.textContent = "Calibração pendente — não usar para medição";
    elements.calibrationCard.classList.remove("is-calibrated");
    elements.calibrationStatus.textContent = "";
  }
}

function renderHeader() {
  const names = { letters: "Letras Sloan", symbols: "Símbolos", tumblingE: "E direcional", landoltC: "C de Landolt" };
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
  localStorage.setItem(CALIBRATION_KEY, JSON.stringify({ pixelsPerMm: state.pixelsPerMm, calibratedAt: new Date().toISOString(), barPixels, measuredMm: measured })); renderAll();
}

function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function saveResult() {
  if (!state.pixelsPerMm) { elements.sessionStatus.textContent = "Calibre o monitor antes de registrar o resultado."; return; }
  const selected = rows()[Number(elements.resultLine.value)];
  const record = { timestamp: new Date().toISOString(), patientId: elements.patientId.value.trim(), eye: elements.eye.value, correction: elements.correction.value, protocol: state.protocol, distanceMeters: state.distanceMeters, result: lineName(selected), errors: Number(elements.errors.value), calibratedPixelsPerMm: state.pixelsPerMm };
  const records = JSON.parse(localStorage.getItem(RESULTS_KEY) || "[]"); records.push(record); localStorage.setItem(RESULTS_KEY, JSON.stringify(records)); elements.sessionStatus.textContent = `Resultado registrado localmente às ${new Date().toLocaleTimeString("pt-BR")}.`;
}
function exportResults() {
  const records = JSON.parse(localStorage.getItem(RESULTS_KEY) || "[]");
  if (!records.length) { elements.sessionStatus.textContent = "Não há resultados locais para exportar."; return; }
  const keys = Object.keys(records[0]); const csv = [keys.join(","), ...records.map((record) => keys.map((key) => csvCell(record[key])).join(","))].join("\r\n");
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); link.download = `resultados-optotipos-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
}

function bindEvents() {
  elements.distanceButtons.forEach((button) => button.addEventListener("click", () => { state.distanceMeters = Number(button.dataset.distance); elements.customDistance.value = state.distanceMeters; elements.distanceButtons.forEach((item) => item.classList.toggle("is-active", item === button)); renderAll(); }));
  elements.customDistance.addEventListener("change", () => { const value = Number(elements.customDistance.value); if (value >= 1 && value <= 20) { state.distanceMeters = value; elements.distanceButtons.forEach((item) => item.classList.toggle("is-active", Number(item.dataset.distance) === value)); renderAll(); } });
  ["protocol", "chartType", "sequenceMode"].forEach((key) => elements[key].addEventListener("change", () => { state[key] = elements[key].value; state.selectedLine = Math.min(state.selectedLine, rows().length - 1); renderAll(); }));
  elements.contrast.addEventListener("input", () => { state.contrast = Number(elements.contrast.value); renderAll(); });
  elements.showLabels.addEventListener("change", () => { state.showLabels = elements.showLabels.checked; renderAll(); });
  elements.singleLine.addEventListener("change", () => { state.singleLine = elements.singleLine.checked; renderAll(); });
  elements.linePicker.addEventListener("change", () => { state.selectedLine = Number(elements.linePicker.value); state.presentationSlide = state.selectedLine; renderAll(); });
  elements.shuffle.addEventListener("click", () => { state.seed = Date.now(); renderAll(); }); elements.printChart.addEventListener("click", () => window.print());
  elements.saveCalibration.addEventListener("click", saveCalibration); elements.clearCalibration.addEventListener("click", () => { state.pixelsPerMm = null; localStorage.removeItem(CALIBRATION_KEY); elements.measuredBarMm.value = ""; renderAll(); });
  elements.saveResult.addEventListener("click", saveResult); elements.exportResults.addEventListener("click", exportResults);
  elements.toggleMenu.addEventListener("click", () => { state.menuCollapsed = !state.menuCollapsed; renderAll(); });
  elements.fullscreen.addEventListener("click", async () => { try { if (isPresentationMode()) { state.fullscreenActive = false; elements.chartWorkspace.classList.remove("local-fullscreen"); if (document.fullscreenElement) await document.exitFullscreen(); } else if (elements.chartWorkspace.requestFullscreen) { state.fullscreenActive = true; state.presentationSlide = state.selectedLine; await elements.chartWorkspace.requestFullscreen(); } else { state.fullscreenActive = true; elements.chartWorkspace.classList.add("local-fullscreen"); } } catch { state.fullscreenActive = true; elements.chartWorkspace.classList.add("local-fullscreen"); } renderAll(); });
  document.addEventListener("fullscreenchange", () => { state.fullscreenActive = Boolean(document.fullscreenElement); if (!document.fullscreenElement) elements.chartWorkspace.classList.remove("local-fullscreen"); renderAll(); });
  elements.presentationStage.addEventListener("click", (event) => { if (!isPresentationMode()) return; const bounds = elements.presentationStage.getBoundingClientRect(); const direction = event.clientX < bounds.left + bounds.width / 2 ? -1 : 1; state.presentationSlide = (state.presentationSlide + direction + rows().length) % rows().length; renderAll(); });
  document.addEventListener("keydown", (event) => { if (!isPresentationMode()) return; if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); state.presentationSlide = (state.presentationSlide + 1) % rows().length; renderAll(); } if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); state.presentationSlide = (state.presentationSlide - 1 + rows().length) % rows().length; renderAll(); } });
  elements.reset.addEventListener("click", () => { Object.assign(state, { distanceMeters: 6, protocol: "snellen", chartType: "letters", sequenceMode: "fixed", contrast: 100, showLabels: true, singleLine: false, selectedLine: 6, presentationSlide: 6, seed: Date.now() }); elements.protocol.value = state.protocol; elements.chartType.value = state.chartType; elements.sequenceMode.value = state.sequenceMode; elements.contrast.value = 100; elements.showLabels.checked = true; elements.singleLine.checked = false; elements.customDistance.value = 6; renderAll(); });
}

try { const stored = JSON.parse(localStorage.getItem(CALIBRATION_KEY)); if (stored?.pixelsPerMm > 0) state.pixelsPerMm = stored.pixelsPerMm; } catch { localStorage.removeItem(CALIBRATION_KEY); }
bindEvents(); renderAll();
