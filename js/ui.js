/*
 * ui.js — ส่วนติดต่อผู้ใช้ (Role B)
 *
 * หน้าเว็บแบ่งเป็น 4 ขั้น แสดงทีละขั้น:
 *   1) จำนวนโปรเซส  2) Burst Time และสี  3) Time Quantum  4) ผลลัพธ์
 *
 * ขั้นตอนหลัก: อ่านค่าจากหน้าเว็บ → ตรวจด้วย Validation → คำนวณด้วย Scheduler → แสดงผล
 * ไฟล์นี้ไม่คำนวณ ST / CT / TAT / WT เอง ทุกตัวเลขในตารางมาจาก Scheduler
 * ข้อความบนหน้าเว็บมาจาก I18n.t() เพื่อให้สลับภาษาไทย / อังกฤษได้
 *
 * ต้องโหลด scheduler.js, validation.js และ i18n.js ก่อนไฟล์นี้ (ดูท้าย index.html)
 */

// ---------- สถานะของโปรแกรม ----------

var state = {
  burstTimes: null,   // ชุด BT ที่ใช้คำนวณครั้งล่าสุด เช่น [5, 3, 8, 6]
  results: null,      // { FCFS: ..., SJF: ..., RR: ... } ผลจาก Scheduler
  rrHistory: [],      // ผล RR ของหลายค่า TQ บนชุดข้อมูลเดียวกัน ใช้ในแท็บเปรียบเทียบ
  activeTab: 'FCFS',
  showFormulas: false,
  formulaProcessId: 'P1', // โปรเซสที่ใช้แทนค่าในส่วน "สูตรการคำนวณ"
  currentStep: 1,     // ขั้นที่กำลังแสดง (1–4)
  furthestStep: 1,    // ขั้นที่ไกลที่สุดที่ผ่านการตรวจแล้ว ใช้กำหนดว่ากดแถบขั้นตอนไปขั้นไหนได้
  processColors: [],  // สีที่ผู้ใช้เลือก index 0 = P1 (ถ้าไม่ได้เลือกจะใช้ DEFAULT_COLORS)
  colorPopoverIndex: null // กล่องเลือกสีเปิดอยู่ให้โปรเซส index ไหน (null = ปิดอยู่)
};

var STEP_COUNT = 4;

// ข้อมูลตัวอย่าง TC-01 ใน docs/TEST_CASES.md
var EXAMPLE_BURST_TIMES = [5, 3, 8, 6];

// สีเริ่มต้นของ P1..P20 (ไม่ซ้ำกัน และอ่านตัวอักษรบนสีได้ทั้งธีมมืดและสว่าง)
// ชุดเดียวกันนี้แสดงเป็น "สีตัวอย่าง" ในกล่องเลือกสี
var DEFAULT_COLORS = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
  '#a0cbe8', '#ffbe7d', '#ff9d9a', '#86bcb6', '#8cd17d',
  '#f1ce63', '#d4a6c8', '#fabfd2', '#d7b5a6', '#79706e'
];

var ALGORITHM_TITLES = {
  FCFS: 'First-Come, First-Served (FCFS)',
  SJF: 'Shortest Job First (SJF) — Non-preemptive',
  RR: 'Round Robin (RR)'
};

// ---------- ตัวช่วยเล็ก ๆ ----------

function byId(id) {
  return document.getElementById(id);
}

// ข้อความตามภาษาที่เลือก (ดู js/i18n.js)
function t(key, values) {
  return I18n.t(key, values);
}

// สร้าง element พร้อม class และข้อความ
// ใช้ textContent เสมอ (ไม่ใช้ innerHTML) เพื่อให้ข้อความที่ผู้ใช้พิมพ์แสดงเป็นตัวอักษรธรรมดา
function createElement(tag, className, text) {
  var element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function formatAverage(value) {
  return value.toFixed(2);
}

function sameNumbers(a, b) {
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

// ---------- สีของโปรเซส ----------

// 'P3' → 2 (ตำแหน่งในอาร์เรย์)
function processIndex(processId) {
  return Number(processId.slice(1)) - 1;
}

function defaultColor(index) {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

function processColor(processId) {
  var index = processIndex(processId);
  return state.processColors[index] || defaultColor(index);
}

// เลือกสีตัวอักษร (ดำ/ขาว) ให้อ่านออกบนพื้นสีที่ผู้ใช้เลือก
function textColorOn(hexColor) {
  var red = parseInt(hexColor.slice(1, 3), 16);
  var green = parseInt(hexColor.slice(3, 5), 16);
  var blue = parseInt(hexColor.slice(5, 7), 16);
  // สูตรความสว่างโดยประมาณ ตาคนไวต่อสีเขียวมากที่สุด จึงให้น้ำหนักสีเขียวมากที่สุด
  var brightness = (red * 299 + green * 587 + blue * 114) / 1000;
  return brightness > 150 ? '#1c2430' : '#ffffff';
}

// จุดสีเล็ก ๆ หน้าชื่อโปรเซส ใช้ในตารางและชุดข้อมูล
function createSwatch(processId) {
  var swatch = createElement('span', 'swatch');
  swatch.style.backgroundColor = processColor(processId);
  return swatch;
}

// ช่องสีหน้าชื่อโปรเซสในขั้นที่ 2 (เป็นปุ่ม กดแล้วเปิดกล่องเลือกสี)
function colorButtonAt(index) {
  return document.querySelector('#burst-grid .color-button[data-index="' + index + '"]');
}

function paintColorButton(button) {
  var processId = 'P' + (Number(button.getAttribute('data-index')) + 1);
  var color = processColor(processId);
  button.style.backgroundColor = color;
  button.setAttribute('aria-label', t('colorButtonLabel', { id: processId, color: color.toUpperCase() }));
}

function setProcessColor(index, color) {
  state.processColors[index] = color;
  var button = colorButtonAt(index);
  if (button) {
    paintColorButton(button);
  }
}

function resetColors() {
  closeColorPopover(false);
  state.processColors = [];
  var buttons = document.querySelectorAll('#burst-grid .color-button');
  for (var i = 0; i < buttons.length; i++) {
    paintColorButton(buttons[i]);
  }
}

// ---------- กล่องเลือกสี (สีตัวอย่าง + กำหนดเองแบบ RGB) ----------

function onColorButtonClick(event) {
  var button = event.currentTarget;
  var index = Number(button.getAttribute('data-index'));
  // กดช่องสีเดิมซ้ำ = ปิดกล่อง
  if (state.colorPopoverIndex === index) {
    closeColorPopover(true);
    return;
  }
  openColorPopover(button);
}

function openColorPopover(button) {
  closeColorPopover(false);
  var index = Number(button.getAttribute('data-index'));
  var processId = 'P' + (index + 1);
  var color = processColor(processId);

  state.colorPopoverIndex = index;
  byId('color-popover-title').textContent = t('colorPopoverTitle', { id: processId });
  renderPresetColors(color);
  byId('custom-color').value = color;
  byId('custom-color-value').textContent = color.toUpperCase();

  var popover = byId('color-popover');
  popover.hidden = false;
  positionPopover(popover, button);
  button.setAttribute('aria-expanded', 'true');

  var selected = popover.querySelector('.preset-color[aria-pressed="true"]');
  (selected || popover.querySelector('.preset-color')).focus();
}

// returnFocus = true เมื่อปิดด้วยคีย์บอร์ด เพื่อให้ผู้ใช้กลับมาอยู่ที่ช่องสีเดิม
function closeColorPopover(returnFocus) {
  if (state.colorPopoverIndex === null) {
    return;
  }
  var button = colorButtonAt(state.colorPopoverIndex);
  byId('color-popover').hidden = true;
  state.colorPopoverIndex = null;
  if (button) {
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) {
      button.focus();
    }
  }
}

// วางกล่องไว้ใต้ช่องสีที่กด และไม่ให้ล้นขอบจอด้านขวา (สำคัญบนมือถือ)
function positionPopover(popover, anchor) {
  var gutter = 16;
  var rect = anchor.getBoundingClientRect();
  var left = rect.left + window.scrollX;
  var maxLeft = window.scrollX + document.documentElement.clientWidth - popover.offsetWidth - gutter;
  if (left > maxLeft) {
    left = maxLeft;
  }
  if (left < gutter) {
    left = gutter;
  }
  popover.style.left = left + 'px';
  popover.style.top = (rect.bottom + window.scrollY + 6) + 'px';
}

function renderPresetColors(selectedColor) {
  var container = byId('preset-colors');
  container.textContent = '';
  for (var i = 0; i < DEFAULT_COLORS.length; i++) {
    var color = DEFAULT_COLORS[i];
    var swatch = createElement('button', 'preset-color');
    swatch.type = 'button';
    swatch.style.backgroundColor = color;
    swatch.setAttribute('data-color', color);
    swatch.setAttribute('aria-label', t('presetColorLabel', { color: color.toUpperCase() }));
    swatch.setAttribute('aria-pressed', color.toLowerCase() === selectedColor.toLowerCase() ? 'true' : 'false');
    swatch.addEventListener('click', onPresetColorClick);
    container.appendChild(swatch);
  }
}

function onPresetColorClick(event) {
  setProcessColor(state.colorPopoverIndex, event.currentTarget.getAttribute('data-color'));
  closeColorPopover(true);
}

// เลือกสีเองจากกล่อง RGB ของ browser: เปลี่ยนสีทันทีระหว่างเลื่อน แต่ยังไม่ปิดกล่อง
function onCustomColorInput(event) {
  var color = event.target.value;
  setProcessColor(state.colorPopoverIndex, color);
  byId('custom-color-value').textContent = color.toUpperCase();
  renderPresetColors(color);
}

// คลิกที่อื่นนอกกล่อง = ปิดกล่อง (ยกเว้นคลิกช่องสีเดิม ซึ่ง onColorButtonClick จัดการเอง)
function onDocumentMouseDown(event) {
  if (state.colorPopoverIndex === null) {
    return;
  }
  var popover = byId('color-popover');
  var activeButton = colorButtonAt(state.colorPopoverIndex);
  if (popover.contains(event.target) || (activeButton && activeButton.contains(event.target))) {
    return;
  }
  closeColorPopover(false);
}

function onDocumentKeydown(event) {
  if (event.key === 'Escape') {
    closeColorPopover(true);
  }
}

// ---------- ข้อความแจ้งเตือน ----------

function showErrors(messages) {
  var list = byId('error-list');
  list.textContent = '';
  for (var i = 0; i < messages.length; i++) {
    list.appendChild(createElement('li', '', messages[i]));
  }
  var box = byId('error-box');
  box.hidden = false;
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearErrors() {
  byId('error-box').hidden = true;
  var invalidInputs = document.querySelectorAll('input.invalid');
  for (var i = 0; i < invalidInputs.length; i++) {
    invalidInputs[i].classList.remove('invalid');
    invalidInputs[i].removeAttribute('aria-invalid');
  }
}

function markInvalid(input) {
  input.classList.add('invalid');
  input.setAttribute('aria-invalid', 'true');
}

// ---------- การเปลี่ยนขั้น ----------

// แสดงเฉพาะหน้าของขั้นที่เลือก แล้วซ่อนขั้นอื่น
function goToStep(stepNumber) {
  closeColorPopover(false);
  state.currentStep = stepNumber;
  // ขั้นที่ 4 ไม่นับ เพราะกดดูผลลัพธ์ได้เมื่อมีผลแล้วเท่านั้น (ดู canVisitStep)
  if (stepNumber <= 3 && stepNumber > state.furthestStep) {
    state.furthestStep = stepNumber;
  }

  for (var step = 1; step <= STEP_COUNT; step++) {
    byId('step-' + step).hidden = step !== stepNumber;
  }
  if (stepNumber === 4) {
    renderResults(); // วาดใหม่ทุกครั้ง เผื่อผู้ใช้เปลี่ยนสีโปรเซสมา
  }
  updateStepper();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  var firstBurstInput = getBurstInputs()[0];
  if (stepNumber === 2 && getBurstMode() === 'manual' && firstBurstInput) {
    firstBurstInput.focus();
  }
}

function canVisitStep(stepNumber) {
  if (stepNumber === 4) {
    return state.results !== null;
  }
  return stepNumber <= state.furthestStep;
}

function updateStepper() {
  var links = document.querySelectorAll('.step-link');
  for (var i = 0; i < links.length; i++) {
    var step = Number(links[i].getAttribute('data-step'));
    var isCurrent = step === state.currentStep;
    links[i].classList.toggle('is-current', isCurrent);
    links[i].classList.toggle('is-done', step < state.currentStep);
    links[i].disabled = !isCurrent && !canVisitStep(step);
    if (isCurrent) {
      links[i].setAttribute('aria-current', 'step');
    } else {
      links[i].removeAttribute('aria-current');
    }
  }

  // ปุ่มย้อนกลับท้ายหน้าใช้กติกาเดียวกับแถบขั้นตอน (เช่น แก้จำนวนโปรเซสแล้วข้ามไปขั้นที่ 3 ไม่ได้)
  var backButtons = document.querySelectorAll('[data-go-step]');
  for (var j = 0; j < backButtons.length; j++) {
    backButtons[j].disabled = !canVisitStep(Number(backButtons[j].getAttribute('data-go-step')));
  }
}

// ผู้ใช้กดแถบขั้นตอนหรือปุ่มย้อนกลับ
function onNavigate(stepNumber) {
  if (!canVisitStep(stepNumber)) {
    return;
  }
  clearErrors();
  goToStep(stepNumber);
}

// ---------- ขั้นที่ 1: จำนวนโปรเซส ----------

function getBurstMode() {
  return document.querySelector('input[name="burst-mode"]:checked').value; // 'random' หรือ 'manual'
}

// ตรวจช่องจำนวนโปรเซส ถ้าผิดจะไฮไลต์ช่องไว้
function checkProcessCount() {
  var countInput = byId('process-count');
  var countResult = Validation.validateProcessCount(countInput.value, I18n.getLanguage());
  if (!countResult.ok) {
    markInvalid(countInput);
  }
  return countResult;
}

function onStep1Next() {
  clearErrors();
  var countResult = checkProcessCount();
  if (!countResult.ok) {
    showErrors([countResult.message]);
    return;
  }
  // สร้างช่องใหม่เฉพาะเมื่อจำนวนเปลี่ยน ค่า BT ที่กรอกไว้จะไม่หายเมื่อกดย้อนกลับแล้วกดถัดไป
  if (getBurstInputs().length !== countResult.value) {
    buildBurstGrid(countResult.value);
    markResultsStale();
  }
  goToStep(2);
}

// แก้จำนวนโปรเซสแล้ว ขั้นที่ 2–3 ต้องผ่านปุ่ม "ถัดไป" ใหม่ (เพื่อสร้างช่อง BT ให้ตรงจำนวน)
function onProcessCountInput() {
  state.furthestStep = 1;
  updateStepper();
}

// ใส่ข้อมูลตัวอย่าง TC-01 แล้วคำนวณทันที (ใช้ตอนสาธิต)
function onLoadExample() {
  byId('process-count').value = String(EXAMPLE_BURST_TIMES.length);
  document.querySelector('input[name="burst-mode"][value="manual"]').checked = true;
  buildBurstGrid(EXAMPLE_BURST_TIMES.length);

  var inputs = getBurstInputs();
  for (var i = 0; i < inputs.length; i++) {
    inputs[i].value = String(EXAMPLE_BURST_TIMES[i]);
  }
  byId('quantum').value = String(Validation.LIMITS.defaultQuantum);
  onCalculate();
}

// ---------- ขั้นที่ 2: Burst Time และสี ----------

function getBurstInputs() {
  return Array.prototype.slice.call(document.querySelectorAll('#burst-grid input.burst-input'));
}

function randomBurstTime() {
  var min = Validation.LIMITS.randomBurstMin;
  var max = Validation.LIMITS.randomBurstMax;
  // Math.random() ได้ 0 ถึง 0.999... คูณจำนวนค่าที่เป็นไปได้แล้วปัดลง จะได้จำนวนเต็ม min..max
  return min + Math.floor(Math.random() * (max - min + 1));
}

function fillRandomBurstTimes() {
  var inputs = getBurstInputs();
  for (var i = 0; i < inputs.length; i++) {
    inputs[i].value = String(randomBurstTime());
  }
  clearErrors();
  markResultsStale();
}

// สร้างช่องสี + ช่องกรอก BT ของ P1..Pn
function buildBurstGrid(count) {
  closeColorPopover(false);
  var grid = byId('burst-grid');
  grid.textContent = '';

  for (var i = 0; i < count; i++) {
    var processId = 'P' + (i + 1);
    var item = createElement('div', 'burst-item');

    var colorButton = createElement('button', 'color-button');
    colorButton.type = 'button';
    colorButton.setAttribute('data-index', String(i));
    colorButton.setAttribute('aria-haspopup', 'dialog');
    colorButton.setAttribute('aria-expanded', 'false');
    colorButton.addEventListener('click', onColorButtonClick);
    paintColorButton(colorButton);

    var label = createElement('label', '', processId);
    label.htmlFor = 'bt-' + processId;

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'burst-input';
    input.id = 'bt-' + processId;
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', t('burstInputLabel', { id: processId }));

    item.appendChild(colorButton);
    item.appendChild(label);
    item.appendChild(input);
    grid.appendChild(item);
  }

  applyBurstMode();
}

// โหมดสุ่ม: ช่องแก้ไม่ได้และสุ่มค่าให้ / โหมดกรอกเอง: แก้ได้ (เก็บค่าเดิมไว้ให้แก้ต่อ)
function applyBurstMode() {
  var isRandom = getBurstMode() === 'random';
  var inputs = getBurstInputs();
  for (var i = 0; i < inputs.length; i++) {
    inputs[i].readOnly = isRandom;
  }
  byId('reroll-button').hidden = !isRandom;
  updateBurstModeNote();

  if (isRandom && inputs.length > 0) {
    fillRandomBurstTimes();
  }
}

function updateBurstModeNote() {
  var limits = Validation.LIMITS;
  if (getBurstMode() === 'random') {
    byId('burst-mode-note').textContent = t('burstNoteRandom', { min: limits.randomBurstMin, max: limits.randomBurstMax });
  } else {
    byId('burst-mode-note').textContent = t('burstNoteManual', { max: limits.maxBurstTime });
  }
}

// ตรวจช่อง BT ทุกช่อง และไฮไลต์ช่องที่ผิด
function checkBurstInputs() {
  var burstInputs = getBurstInputs();
  var burstTexts = [];
  for (var i = 0; i < burstInputs.length; i++) {
    burstTexts.push(burstInputs[i].value);
  }
  var burstResult = Validation.validateBurstTimes(burstTexts, I18n.getLanguage());
  if (!burstResult.ok) {
    var invalidIndexes = burstResult.invalidIndexes || [];
    for (var j = 0; j < invalidIndexes.length; j++) {
      markInvalid(burstInputs[invalidIndexes[j]]);
    }
  }
  return burstResult;
}

function onStep2Next() {
  clearErrors();
  var burstResult = checkBurstInputs();
  if (!burstResult.ok) {
    showErrors(burstResult.message.split('\n'));
    return;
  }
  goToStep(3);
}

// ---------- ขั้นที่ 3: Time Quantum และคำนวณ ----------

function checkQuantum() {
  var quantumInput = byId('quantum');
  var quantumResult = Validation.validateQuantum(quantumInput.value, I18n.getLanguage());
  if (!quantumResult.ok) {
    markInvalid(quantumInput);
  }
  return quantumResult;
}

// ตรวจข้อมูลทุกขั้นอีกครั้งก่อนคำนวณ เพราะผู้ใช้อาจย้อนกลับไปแก้ขั้นก่อนหน้าแล้วข้ามมาที่ขั้นนี้
function onCalculate() {
  clearErrors();
  var messages = [];
  var errorSteps = []; // ขั้นที่มีข้อผิดพลาด ใช้เลือกว่าจะพาผู้ใช้กลับไปขั้นไหน

  var countResult = checkProcessCount();
  if (!countResult.ok) {
    messages.push(countResult.message);
    errorSteps.push(1);
  }

  // ถ้าแก้จำนวนโปรเซสแต่ยังไม่กด "ถัดไป" ในขั้นที่ 1 จำนวนช่อง BT จะไม่ตรง
  var burstCount = getBurstInputs().length;
  if (countResult.ok && burstCount !== countResult.value) {
    markInvalid(byId('process-count'));
    messages.push(t('countMismatch', { count: countResult.value, burstCount: burstCount }));
    errorSteps.push(1);
  }

  var burstResult = checkBurstInputs();
  if (!burstResult.ok) {
    messages = messages.concat(burstResult.message.split('\n'));
    errorSteps.push(2);
  }

  var quantumResult = checkQuantum();
  if (!quantumResult.ok) {
    messages.push(quantumResult.message);
    errorSteps.push(3);
  }

  // พาไปขั้นแรกที่มีปัญหา แล้วแสดงข้อผิดพลาดทุกข้อพร้อมกัน ผู้ใช้จะได้แก้ครั้งเดียว
  if (messages.length > 0) {
    goToStep(errorSteps[0]);
    showErrors(messages);
    return;
  }

  runAllAlgorithms(burstResult.values, quantumResult.value);
}

function runAllAlgorithms(burstTimes, quantum) {
  // ถ้าชุด BT เปลี่ยน ให้ล้างประวัติ RR เพราะเทียบผลข้ามชุดข้อมูลไม่ได้ (DECISIONS D-008)
  if (!sameNumbers(burstTimes, state.burstTimes)) {
    state.rrHistory = [];
  }

  var processes = [];
  for (var i = 0; i < burstTimes.length; i++) {
    processes.push({ id: 'P' + (i + 1), arrivalTime: 0, burstTime: burstTimes[i] });
  }

  // ทั้ง 3 อัลกอริทึมใช้ processes ชุดเดียวกัน จึงเปรียบเทียบกันได้ (โจทย์ข้อ 1.4)
  state.burstTimes = burstTimes.slice();
  state.results = {
    FCFS: Scheduler.fcfs(processes),
    SJF: Scheduler.sjf(processes),
    RR: Scheduler.roundRobin(processes, quantum)
  };
  addToRrHistory(state.results.RR);

  // ถ้าจำนวนโปรเซสลดลงจนไม่มีโปรเซสที่เลือกไว้แทนค่าสูตร ให้กลับไปใช้ P1
  if (processIndex(state.formulaProcessId) >= burstTimes.length) {
    state.formulaProcessId = 'P1';
  }

  // ข้อมูลทุกขั้นผ่านการตรวจแล้ว ผู้ใช้กดย้อนไปขั้นใดก็ได้
  state.furthestStep = 3;
  byId('stale-note').hidden = true;
  goToStep(4);
}

// เก็บผล RR ไว้หนึ่งแถวต่อหนึ่งค่า TQ เรียงจาก TQ น้อยไปมาก
function addToRrHistory(rrResult) {
  var history = [];
  for (var i = 0; i < state.rrHistory.length; i++) {
    if (state.rrHistory[i].quantum !== rrResult.quantum) {
      history.push(state.rrHistory[i]);
    }
  }
  history.push(rrResult);
  history.sort(function (a, b) {
    return a.quantum - b.quantum;
  });
  state.rrHistory = history;
}

function markResultsStale() {
  if (state.results) {
    byId('stale-note').hidden = false;
  }
}

// ---------- ขั้นที่ 4: แสดงผล ----------

function renderResults() {
  byId('rr-tab').textContent = t('rrTab', { quantum: state.results.RR.quantum });
  renderDataset();
  selectTab(state.activeTab);
}

function renderDataset() {
  var chips = byId('dataset-chips');
  chips.textContent = '';
  var total = 0;
  for (var i = 0; i < state.burstTimes.length; i++) {
    var processId = 'P' + (i + 1);
    var chip = createElement('span', 'chip');
    chip.appendChild(createSwatch(processId));
    chip.appendChild(document.createTextNode(processId + ' = ' + state.burstTimes[i]));
    chips.appendChild(chip);
    total += state.burstTimes[i];
  }
  chips.appendChild(createElement('span', 'chip total', t('totalBurst', { total: total })));
}

function selectTab(tabName) {
  state.activeTab = tabName;

  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    var isActive = tabs[i].getAttribute('data-tab') === tabName;
    tabs[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
    tabs[i].tabIndex = isActive ? 0 : -1;
  }

  var panel = byId('result-panel');
  panel.textContent = '';
  if (tabName === 'COMPARE') {
    renderComparePanel(panel);
  } else {
    renderAlgorithmPanel(panel, state.results[tabName]);
  }
}

function describeAlgorithm(result) {
  if (result.algorithm === 'FCFS') {
    return t('describeFCFS');
  }
  if (result.algorithm === 'SJF') {
    return t('describeSJF');
  }
  return t('describeRR', { quantum: result.quantum });
}

function renderAlgorithmPanel(panel, result) {
  panel.appendChild(createElement('h3', '', ALGORITHM_TITLES[result.algorithm]));
  panel.appendChild(createElement('p', 'description', describeAlgorithm(result)));

  var order = [];
  for (var i = 0; i < result.gantt.length; i++) {
    order.push(result.gantt[i].id);
  }
  panel.appendChild(createElement('p', 'order', t('cpuOrder', { order: order.join(' → ') })));

  panel.appendChild(createElement('h4', '', t('ganttTitle')));
  panel.appendChild(createGanttChart(result.gantt));

  panel.appendChild(createElement('h4', '', t('resultTableTitle')));
  panel.appendChild(createResultTable(result));
  panel.appendChild(createSummary(result));
  panel.appendChild(createFormulaSection(result));
}

function createGanttChart(gantt) {
  var scroll = createElement('div', 'gantt-scroll');
  var chart = createElement('div', 'gantt');
  chart.setAttribute('role', 'img');

  var labels = [];
  for (var i = 0; i < gantt.length; i++) {
    var slot = gantt[i];
    var block = createElement('div', 'gantt-slot', slot.id);
    // ความกว้างของแถบเป็นสัดส่วนกับเวลาที่ใช้ CPU
    block.style.flexGrow = String(slot.end - slot.start);
    var color = processColor(slot.id);
    block.style.backgroundColor = color;
    block.style.color = textColorOn(color);
    block.title = slot.id + ': ' + slot.start + ' – ' + slot.end;

    block.appendChild(createElement('span', 'gantt-time start', String(slot.start)));
    if (i === gantt.length - 1) {
      block.appendChild(createElement('span', 'gantt-time end', String(slot.end)));
    }
    chart.appendChild(block);
    labels.push(slot.id + ' ' + slot.start + '–' + slot.end);
  }

  chart.setAttribute('aria-label', 'Gantt chart: ' + labels.join(', '));
  scroll.appendChild(chart);
  return scroll;
}

// ช่อง TAT / WT: ถ้าเปิด "แสดงวิธีคำนวณ" จะแสดงเป็น "16 − 0 = 16"
function createFormulaCell(left, right, answer) {
  var cell = document.createElement('td');
  if (state.showFormulas) {
    cell.appendChild(createElement('span', 'formula', left + ' − ' + right + ' = '));
  }
  cell.appendChild(document.createTextNode(String(answer)));
  return cell;
}

function createResultTable(result) {
  var wrapper = createElement('div', 'table-scroll');
  var table = document.createElement('table');

  var headers = [
    ['Process', t('headerProcess')],
    ['AT', t('headerAT')],
    ['BT', t('headerBT')],
    ['ST', t('headerST')],
    ['CT', t('headerCT')],
    ['TAT', t('headerTAT')],
    ['WT', t('headerWT')]
  ];
  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  for (var h = 0; h < headers.length; h++) {
    var th = document.createElement('th');
    th.scope = 'col';
    var abbr = createElement('abbr', '', headers[h][0]);
    abbr.title = headers[h][1];
    th.appendChild(abbr);
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  for (var i = 0; i < result.rows.length; i++) {
    var row = result.rows[i];
    var tr = document.createElement('tr');
    var nameCell = document.createElement('td');
    nameCell.appendChild(createSwatch(row.id));
    nameCell.appendChild(document.createTextNode(row.id));
    tr.appendChild(nameCell);
    tr.appendChild(createElement('td', '', String(row.arrivalTime)));
    tr.appendChild(createElement('td', '', String(row.burstTime)));
    tr.appendChild(createElement('td', '', String(row.startTime)));
    tr.appendChild(createElement('td', '', String(row.completionTime)));
    tr.appendChild(createFormulaCell(row.completionTime, row.arrivalTime, row.turnaroundTime));
    tr.appendChild(createFormulaCell(row.turnaroundTime, row.burstTime, row.waitingTime));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  var tfoot = document.createElement('tfoot');
  var footRow = document.createElement('tr');
  var label = createElement('td', '', t('average'));
  label.colSpan = 5;
  footRow.appendChild(label);
  footRow.appendChild(createElement('td', '', formatAverage(result.averageTurnaroundTime)));
  footRow.appendChild(createElement('td', '', formatAverage(result.averageWaitingTime)));
  tfoot.appendChild(footRow);
  table.appendChild(tfoot);

  wrapper.appendChild(table);
  return wrapper;
}

// ที่มาของค่าเฉลี่ย เช่น "(0 + 5 + 8 + 16) ÷ 4 = 7.25"
function averageExplanation(result, key, average) {
  var values = [];
  for (var i = 0; i < result.rows.length; i++) {
    values.push(result.rows[i][key]);
  }
  return '(' + values.join(' + ') + ') ÷ ' + values.length + ' = ' + formatAverage(average);
}

// กล่องสรุป AVG WT / AVG TAT พร้อมแสดงที่มาของตัวเลข
function createSummary(result) {
  var summary = createElement('div', 'summary');
  summary.appendChild(createStat(t('avgWtTitle'), averageExplanation(result, 'waitingTime', result.averageWaitingTime), result.averageWaitingTime));
  summary.appendChild(createStat(t('avgTatTitle'), averageExplanation(result, 'turnaroundTime', result.averageTurnaroundTime), result.averageTurnaroundTime));
  return summary;
}

function createStat(title, explanation, average) {
  var stat = createElement('div', 'stat');
  stat.appendChild(createElement('div', 'stat-label', title));
  stat.appendChild(createElement('div', 'stat-value', formatAverage(average)));
  stat.appendChild(createElement('div', 'stat-formula', explanation));
  return stat;
}

// ---------- สูตรการคำนวณของแต่ละค่า (แทนค่าด้วยโปรเซสที่เลือก) ----------

function createFormulaSection(result) {
  var row = findRow(result, state.formulaProcessId);

  var section = createElement('div', 'formula-section');
  var header = createElement('div', 'formula-header');
  header.appendChild(createElement('h4', '', t('formulaTitle')));
  header.appendChild(createFormulaProcessPicker(result));
  section.appendChild(header);

  var wrapper = createElement('div', 'table-scroll');
  var table = createElement('table', 'formula-table');
  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  var headers = [t('formulaVariable'), t('formulaMeaning'), t('formulaRule'), t('formulaExample', { id: row.id })];
  for (var h = 0; h < headers.length; h++) {
    var th = createElement('th', '', headers[h]);
    th.scope = 'col';
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  var lines = buildFormulaLines(result, row);
  for (var i = 0; i < lines.length; i++) {
    var tr = document.createElement('tr');
    tr.appendChild(createElement('th', 'formula-name', lines[i].name));
    tr.appendChild(createElement('td', 'formula-meaning', lines[i].meaning));
    tr.appendChild(createElement('td', 'formula-rule', lines[i].rule));
    tr.appendChild(createElement('td', 'formula-example', lines[i].example));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  wrapper.appendChild(table);
  section.appendChild(wrapper);
  return section;
}

function findRow(result, processId) {
  for (var i = 0; i < result.rows.length; i++) {
    if (result.rows[i].id === processId) {
      return result.rows[i];
    }
  }
  return result.rows[0];
}

// ตัวเลือก "แทนค่าด้วยข้อมูลของ P1 / P2 / …"
function createFormulaProcessPicker(result) {
  var label = createElement('label', 'formula-picker');
  label.appendChild(document.createTextNode(t('formulaExampleFor') + ' '));

  var select = document.createElement('select');
  select.id = 'formula-process';
  for (var i = 0; i < result.rows.length; i++) {
    var option = createElement('option', '', result.rows[i].id);
    option.value = result.rows[i].id;
    select.appendChild(option);
  }
  select.value = findRow(result, state.formulaProcessId).id;
  select.addEventListener('change', function () {
    state.formulaProcessId = select.value;
    selectTab(state.activeTab);
    byId('formula-process').focus(); // วาดแท็บใหม่แล้ว ให้โฟกัสกลับมาที่ตัวเลือกเดิม
  });

  label.appendChild(select);
  return label;
}

// แต่ละบรรทัด: ชื่อค่า / ความหมาย / สูตร / ตัวอย่างแทนค่า (ตัวเลขทุกตัวมาจากผลของ Scheduler)
function buildFormulaLines(result, row) {
  var isRoundRobin = result.algorithm === 'RR';
  return [
    { name: 'AT', meaning: t('meaningAT'), rule: t('ruleAT'), example: 'AT = ' + row.arrivalTime },
    { name: 'BT', meaning: t('meaningBT'), rule: t('ruleBT'), example: 'BT = ' + row.burstTime },
    {
      name: 'ST',
      meaning: t('meaningST'),
      rule: t(isRoundRobin ? 'ruleSTRoundRobin' : 'ruleSTInOrder'),
      example: explainStartTime(result, row)
    },
    {
      name: 'CT',
      meaning: t('meaningCT'),
      rule: t(isRoundRobin ? 'ruleCTRoundRobin' : 'ruleCTInOrder'),
      example: explainCompletionTime(result, row)
    },
    {
      name: 'TAT',
      meaning: t('meaningTAT'),
      rule: t('ruleTAT'),
      example: 'TAT = ' + row.completionTime + ' − ' + row.arrivalTime + ' = ' + row.turnaroundTime
    },
    {
      name: 'WT',
      meaning: t('meaningWT'),
      rule: t('ruleWT'),
      example: 'WT = ' + row.turnaroundTime + ' − ' + row.burstTime + ' = ' + row.waitingTime
    },
    {
      name: 'AVG TAT',
      meaning: t('meaningAvgTAT'),
      rule: t('ruleAvgTAT'),
      example: averageExplanation(result, 'turnaroundTime', result.averageTurnaroundTime)
    },
    {
      name: 'AVG WT',
      meaning: t('meaningAvgWT'),
      rule: t('ruleAvgWT'),
      example: averageExplanation(result, 'waitingTime', result.averageWaitingTime)
    }
  ];
}

// ช่วงเวลาทั้งหมดที่โปรเซสนี้ได้ CPU เรียงตามเวลา (FCFS/SJF มีช่วงเดียว, RR อาจมีหลายช่วง)
function slotsOf(gantt, processId) {
  var slots = [];
  for (var i = 0; i < gantt.length; i++) {
    if (gantt[i].id === processId) {
      slots.push(gantt[i]);
    }
  }
  return slots;
}

function explainStartTime(result, row) {
  if (result.algorithm === 'RR') {
    var firstSlot = slotsOf(result.gantt, row.id)[0];
    return t('exampleSTRoundRobin', { value: row.startTime, start: firstSlot.start, end: firstSlot.end });
  }

  // FCFS / SJF: ดูว่าโปรเซสนี้อยู่ลำดับที่เท่าไรใน Gantt แล้วอ้างถึงโปรเซสที่รันก่อนหน้า
  var position = 0;
  while (result.gantt[position].id !== row.id) {
    position++;
  }
  if (position === 0) {
    return t('exampleSTFirst');
  }
  return t('exampleSTAfter', { previous: result.gantt[position - 1].id, value: row.startTime });
}

function explainCompletionTime(result, row) {
  if (result.algorithm === 'RR') {
    var slots = slotsOf(result.gantt, row.id);
    var lastSlot = slots[slots.length - 1];
    return t('exampleCTRoundRobin', {
      value: row.completionTime,
      start: lastSlot.start,
      end: lastSlot.end,
      count: slots.length
    });
  }
  return 'CT = ' + row.startTime + ' + ' + row.burstTime + ' = ' + row.completionTime;
}

// ---------- แท็บเปรียบเทียบ ----------

function renderComparePanel(panel) {
  var results = [state.results.FCFS, state.results.SJF, state.results.RR];

  panel.appendChild(createElement('h3', '', t('compareTitle')));

  // หา AVG WT ต่ำสุด (ถ้าเท่ากันหลายอัลกอริทึมจะไฮไลต์ทุกตัว)
  var lowest = results[0].averageWaitingTime;
  for (var i = 1; i < results.length; i++) {
    lowest = Math.min(lowest, results[i].averageWaitingTime);
  }

  var labels = [];
  var averages = [];
  for (var j = 0; j < results.length; j++) {
    labels.push(algorithmLabel(results[j]));
    averages.push(results[j].averageWaitingTime);
  }
  panel.appendChild(createElement('h4', '', t('avgWtChartTitle')));
  panel.appendChild(createBarChart(labels, averages));

  var rows = [];
  for (var k = 0; k < results.length; k++) {
    rows.push({
      label: algorithmLabel(results[k]),
      result: results[k],
      isBest: results[k].averageWaitingTime === lowest
    });
  }
  panel.appendChild(createElement('h4', '', t('summaryTitle')));
  panel.appendChild(createCompareTable(t('algorithmHeader'), rows));

  var bestNames = [];
  for (var m = 0; m < rows.length; m++) {
    if (rows[m].isBest) {
      bestNames.push(rows[m].label);
    }
  }
  panel.appendChild(createElement('p', 'note',
    t('lowestNote', { names: bestNames.join(', '), value: formatAverage(lowest) })));

  renderRrHistory(panel);
}

function algorithmLabel(result) {
  if (result.algorithm === 'RR') {
    return 'RR (TQ = ' + result.quantum + ')';
  }
  return result.algorithm;
}

function renderRrHistory(panel) {
  panel.appendChild(createElement('h4', '', t('rrHistoryTitle')));

  var currentQuantum = state.results.RR.quantum;
  var rows = [];
  for (var i = 0; i < state.rrHistory.length; i++) {
    var result = state.rrHistory[i];
    rows.push({
      label: 'TQ = ' + result.quantum,
      result: result,
      isBest: result.quantum === currentQuantum
    });
  }
  panel.appendChild(createCompareTable('Time Quantum', rows, t('badgeShowing')));
  panel.appendChild(createElement('p', 'note', t('rrHistoryNote')));
}

// ตารางสรุป: ชื่อ | AVG WT | AVG TAT | จำนวนครั้งที่สลับโปรเซส
function createCompareTable(firstHeader, rows, badgeText) {
  var wrapper = createElement('div', 'table-scroll');
  var table = document.createElement('table');

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  var headers = [firstHeader, 'AVG WT', 'AVG TAT', t('contextSwitchHeader')];
  for (var h = 0; h < headers.length; h++) {
    var th = createElement('th', '', headers[h]);
    th.scope = 'col';
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  for (var i = 0; i < rows.length; i++) {
    var tr = document.createElement('tr');
    if (rows[i].isBest) {
      tr.className = 'best-row';
    }
    var nameCell = createElement('td', '', rows[i].label);
    if (rows[i].isBest) {
      nameCell.appendChild(createElement('span', 'badge', badgeText || t('badgeLowest')));
    }
    tr.appendChild(nameCell);
    tr.appendChild(createElement('td', '', formatAverage(rows[i].result.averageWaitingTime)));
    tr.appendChild(createElement('td', '', formatAverage(rows[i].result.averageTurnaroundTime)));
    tr.appendChild(createElement('td', '', String(Scheduler.countContextSwitches(rows[i].result.gantt))));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  wrapper.appendChild(table);
  return wrapper;
}

function createBarChart(labels, values) {
  var max = 0;
  for (var i = 0; i < values.length; i++) {
    max = Math.max(max, values[i]);
  }

  var chart = createElement('div', 'bars');
  for (var j = 0; j < values.length; j++) {
    var row = createElement('div', 'bar-row');
    row.appendChild(createElement('span', '', labels[j]));

    var track = createElement('div', 'bar-track');
    var fill = createElement('div', 'bar-fill');
    // ถ้าทุกค่าเป็น 0 (เช่นมีโปรเซสเดียว) ไม่ต้องหาร ให้แถบยาว 0
    fill.style.width = max > 0 ? (values[j] / max * 100) + '%' : '0';
    track.appendChild(fill);
    row.appendChild(track);

    row.appendChild(createElement('span', 'bar-value', formatAverage(values[j])));
    chart.appendChild(row);
  }
  return chart;
}

// ---------- เปลี่ยนภาษา ----------

function onLanguageClick(event) {
  I18n.setLanguage(event.currentTarget.getAttribute('data-language'));
  refreshLanguage();
}

// ข้อความคงที่ i18n.js เปลี่ยนให้แล้ว ส่วนนี้เปลี่ยนข้อความที่ ui.js สร้างเอง
function refreshLanguage() {
  updateLanguageButtons();
  updateBurstModeNote();
  closeColorPopover(false);

  var burstInputs = getBurstInputs();
  for (var i = 0; i < burstInputs.length; i++) {
    burstInputs[i].setAttribute('aria-label', t('burstInputLabel', { id: 'P' + (i + 1) }));
  }
  var colorButtons = document.querySelectorAll('#burst-grid .color-button');
  for (var j = 0; j < colorButtons.length; j++) {
    paintColorButton(colorButtons[j]);
  }

  // ข้อความแจ้งเตือนเดิมเป็นภาษาเก่า จึงซ่อนไว้ (ช่องที่ผิดยังเป็นสีแดง กดถัดไปอีกครั้งจะได้ข้อความภาษาใหม่)
  byId('error-box').hidden = true;

  if (state.results) {
    renderResults();
  }
}

function updateLanguageButtons() {
  var buttons = document.querySelectorAll('.language-option');
  for (var i = 0; i < buttons.length; i++) {
    var isActive = buttons[i].getAttribute('data-language') === I18n.getLanguage();
    buttons[i].setAttribute('aria-pressed', isActive ? 'true' : 'false');
  }
}

// ---------- ผูก event กับปุ่มต่าง ๆ ----------

function onTabKeydown(event) {
  // ใช้ลูกศรซ้าย/ขวาเลื่อนแท็บได้ (การเข้าถึงด้วยคีย์บอร์ด)
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
    return;
  }
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var index = tabs.indexOf(event.target);
  var step = event.key === 'ArrowRight' ? 1 : -1;
  var next = tabs[(index + step + tabs.length) % tabs.length];
  selectTab(next.getAttribute('data-tab'));
  next.focus();
}

// แต่ละขั้นเป็น <form> แยกกัน จึงกด Enter ในช่องกรอกเพื่อไปขั้นถัดไปได้
// ทุกการแก้ข้อมูลในฟอร์มทำให้ผลลัพธ์เดิมไม่ตรงกับข้อมูล (กล่องเลือกสีอยู่นอกฟอร์ม จึงไม่นับการเปลี่ยนสี)
function bindStepForm(formId, onSubmit) {
  var form = byId(formId);
  form.addEventListener('submit', function (event) {
    event.preventDefault(); // ไม่ให้ browser โหลดหน้าใหม่
    onSubmit();
  });
  form.addEventListener('input', markResultsStale);
}

// ปุ่มทุกปุ่มที่มี data-go-step และแถบขั้นตอนด้านบน ใช้พาไปขั้นที่ระบุ
function bindNavigationButtons() {
  var buttons = document.querySelectorAll('[data-go-step], .step-link');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function (event) {
      var target = event.currentTarget;
      var stepNumber = target.getAttribute('data-go-step') || target.getAttribute('data-step');
      onNavigate(Number(stepNumber));
    });
  }
}

function bindColorPopover() {
  byId('custom-color').addEventListener('input', onCustomColorInput);
  document.addEventListener('mousedown', onDocumentMouseDown);
  document.addEventListener('keydown', onDocumentKeydown);
  window.addEventListener('resize', function () {
    closeColorPopover(false);
  });
}

function init() {
  // ใส่ข้อความตามภาษาที่เคยเลือกไว้ก่อนผูก event อื่น
  I18n.applyToPage();
  updateLanguageButtons();
  var languageButtons = document.querySelectorAll('.language-option');
  for (var k = 0; k < languageButtons.length; k++) {
    languageButtons[k].addEventListener('click', onLanguageClick);
  }

  bindStepForm('step-1', onStep1Next);
  bindStepForm('step-2', onStep2Next);
  bindStepForm('step-3', onCalculate);
  bindNavigationButtons();
  bindColorPopover();

  byId('example-button').addEventListener('click', onLoadExample);
  byId('reroll-button').addEventListener('click', fillRandomBurstTimes);
  byId('reset-colors-button').addEventListener('click', resetColors);
  byId('process-count').addEventListener('input', onProcessCountInput);

  var modeRadios = document.querySelectorAll('input[name="burst-mode"]');
  for (var i = 0; i < modeRadios.length; i++) {
    modeRadios[i].addEventListener('change', applyBurstMode);
  }

  var tabs = document.querySelectorAll('.tab');
  for (var j = 0; j < tabs.length; j++) {
    tabs[j].addEventListener('click', function (event) {
      selectTab(event.currentTarget.getAttribute('data-tab'));
    });
    tabs[j].addEventListener('keydown', onTabKeydown);
  }

  byId('show-formulas').addEventListener('change', function (event) {
    state.showFormulas = event.target.checked;
    selectTab(state.activeTab);
  });

  updateStepper();
}

init();
