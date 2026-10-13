/*
 * ui.js — ส่วนติดต่อผู้ใช้ (Role B)
 *
 * โครงหน้า (DECISIONS D-014 / D-016 / D-017):
 *   แถบซ้าย  = รายการ CPU หลายตัว (การ์ดลอย) กดการ์ด = เลือก CPU / กดปุ่มลูกศร = การตั้งค่าการจำลอง
 *              (จำนวน, BT, สี, TQ, Run) กางลงมาเป็น dropdown ใต้การ์ด
 *   ตรงกลาง  = ผลลัพธ์ของ CPU ที่เลือก (แท็บ FCFS / SJF / RR / เปรียบเทียบ)
 *   popup    = รายละเอียด CPU, วิธีทำงานของอัลกอริทึม, ตั้งค่า (อยู่ใน modals.js)
 *   ปุ่ม "เปรียบเทียบ CPU" = พื้นที่ตรงกลางเปลี่ยนเป็นหน้าเปรียบเทียบผลหลาย CPU (อยู่ใน compare.js, D-039)
 *
 * ขั้นตอนหลัก: อ่านค่าจากหน้าเว็บ → ตรวจด้วย Validation → คำนวณด้วย Scheduler → แสดงผล
 * ไฟล์นี้ไม่คำนวณ ST / CT / TAT / WT เอง ทุกตัวเลขในตารางมาจาก Scheduler
 * ข้อความบนหน้าเว็บมาจาก I18n.t() เพื่อให้สลับภาษาไทย / อังกฤษได้
 * ข้อมูลของ CPU แต่ละตัว (สร้าง / ทำสำเนา / บันทึก) อยู่ใน profiles.js
 *
 * ต้องโหลด scheduler.js, validation.js, i18n.js, profiles.js, modals.js และ compare.js ก่อนไฟล์นี้ (ดูท้าย index.html)
 */

// ---------- สถานะของโปรแกรม ----------

var app = {
  profiles: [],    // CPU ทุกตัว (โครงสร้างของแต่ละตัวดู Profiles.createProfile ใน profiles.js)
  activeIndex: 0,  // CPU ที่เลือกอยู่ในแถบซ้าย
  nextNumber: 1    // เลขที่ใช้ตั้งชื่อ CPU ตัวถัดไป ("CPU 3") ไม่ลดลงเมื่อลบ จึงไม่ได้ชื่อซ้ำ
};

// state = CPU ที่เลือกอยู่ (ชี้ไปที่ app.profiles[app.activeIndex])
// ทุกฟังก์ชันที่แสดงผลอ่านจาก state จึงไม่ต้องรู้ว่ามี CPU กี่ตัว
var state = null;

// กล่องเลือกสีเปิดอยู่ให้โปรเซส index ไหน (null = ปิดอยู่) เป็นสถานะของหน้าเว็บ ไม่ใช่ข้อมูลของ CPU
var colorPopoverIndex = null;

// แผงตั้งค่า (dropdown ใต้การ์ด CPU ที่เลือก) กางอยู่หรือไม่ — กดปุ่มลูกศรบนการ์ดเพื่อพับ/กาง
var settingsPanelOpen = true;

// จำนวนโปรเซสเริ่มต้นของ CPU ใหม่
var NEW_CPU_PROCESS_COUNT = 4;

// ข้อความสถานะของ CPU: ยังไม่ Run / Run แล้ว / แก้ข้อมูลหลัง Run (ผลเก่า)
var STATUS_TEXT = { idle: 'statusIdle', done: 'statusDone', stale: 'statusStale' };
// ไอคอนในป้ายสถานะบนการ์ด CPU: ยังไม่ Run = นาฬิกา (รออยู่) / Run แล้ว = เครื่องหมายถูก / ผลเก่า = ลูกศรวน (ต้อง Run ใหม่)
var STATUS_ICON = { idle: 'clock', done: 'check', stale: 'refresh' };

// ข้อมูลตัวอย่าง TC-01 ใน docs/TEST_CASES.md — ใช้วาดภาพใน popup "วิธีทำงาน" เมื่อ CPU ยังไม่ได้ Run (modals.js)
var EXAMPLE_BURST_TIMES = [5, 3, 8, 6];

// สีเริ่มต้นของ P1..P10 และ "สีตัวอย่าง" ในกล่องเลือกสี (D-045 — ชุดสีที่ผู้ใช้เลือกเอง แทนชุดของ D-044)
// โทนสว่างสดใส หนึ่งสีต่อหนึ่งโปรเซส ไม่ซ้ำกัน — เพราะสีสว่าง ตัวอักษรบนแถบ Gantt จึงเป็นสีเข้ม (--process-text ใน style.css)
// ซึ่งได้ contrast ≥ 4.5:1 กับทุกสีตามสูตร WCAG (ถ้าเป็นตัวขาวจะได้แค่ 1.7–3.6:1)
// ส่วนการไล่สีไปยังเฉดที่สว่างกว่า ทำใน CSS (--process-fill ใน style.css)
// Coral Red, Electric Blue, Teal, Violet, Amber / Lime Green, Sky Blue, Rose Pink, Indigo, Soft Orange
var DEFAULT_COLORS = [
  '#ff6b6b', '#4d8dff', '#20c9b7', '#b276ff', '#ffb547',
  '#a3d957', '#36bffa', '#f05ca8', '#7775ff', '#ff875e'
];

var ALGORITHM_TITLES = {
  FCFS: 'First-Come, First-Served (FCFS)',
  SJF: 'Shortest Job First (SJF) — Non-preemptive',
  RR: 'Round Robin (RR)'
};

// ชื่อข้อความใน i18n.js ที่ใช้อธิบายแต่ละอัลกอริทึมในการ์ดอัลกอริทึม
var ALGORITHM_FACTS = {
  FCFS: { summary: 'summaryFCFS', type: 'typeNonPreemptive', strength: 'strengthFCFS', limit: 'limitFCFS' },
  SJF: { summary: 'summarySJF', type: 'typeNonPreemptive', strength: 'strengthSJF', limit: 'limitSJF' },
  RR: { summary: 'summaryRR', type: 'typePreemptive', strength: 'strengthRR', limit: 'limitRR' }
};

// ไอคอนเส้นขนาด 24×24 (แต่ละตัวคือคำสั่งวาดเส้นของ SVG path) สีตามตัวอักษรของกล่องที่อยู่
// ไอคอนในเมนูซ้ายของ index.html ใช้ path ชุดเดียวกัน
var ICONS = {
  hourglass: 'M6 3h12 M6 21h12 M7 3c0 5 10 5 10 9s-10 4-10 9 M17 3c0 5-10 5-10 9s10 4 10 9',
  flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 7v5l3 2',
  switch: 'M4 8h13 M14 5l3 3-3 3 M20 16H7 M10 13l-3 3 3 3',
  chip: 'M7 7h10v10H7z M10 10h4v4h-4z M9 3v4 M15 3v4 M9 17v4 M15 17v4 M3 9h4 M3 15h4 M17 9h4 M17 15h4',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  chevron: 'M6 9l6 6 6-6',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 11v6 M12 7.5h.01',
  close: 'M6 6l12 12 M18 6L6 18',
  edit: 'M4 20h4L19 9l-4-4L4 16z M14 6l4 4',
  copy: 'M9 9h11v11H9z M5 15H4V4h11v1',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
  open: 'M5 12h14 M13 6l6 6-6 6',
  check: 'M5 12l5 5 9-10',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7'
};

var SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

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

// สร้างไอคอนจากชื่อใน ICONS เช่น createIcon('clock')
function createIcon(name) {
  var svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  var path = document.createElementNS(SVG_NAMESPACE, 'path');
  path.setAttribute('d', ICONS[name]);
  svg.appendChild(path);
  return svg;
}

// กล่องย่อยพร้อมหัวกล่อง (ป้ายเล็ก + หัวข้อ) ใช้กับทุกกล่องในหน้าต่างผลลัพธ์
// หัวข้อเป็น h4 เพราะอยู่ใต้หัวหน้าต่าง (h3) อีกชั้นหนึ่ง
function createCard(className, eyebrow, title) {
  var card = createElement('section', 'card ' + className);
  var header = createElement('header', 'card-header');
  var heading = createElement('div');
  heading.appendChild(createElement('p', 'card-eyebrow', eyebrow));
  heading.appendChild(createElement('h4', 'card-title', title));
  header.appendChild(heading);
  card.appendChild(header);
  return card;
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

// ถ้าเครื่องตั้งค่า "ลดการเคลื่อนไหว" ให้เลื่อนหน้าทันทีแทนการเลื่อนแบบนุ่มนวล
function scrollBehavior() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

// ---------- สีของโปรเซส ----------

// 'P3' → 2 (ตำแหน่งในอาร์เรย์)
function processIndex(processId) {
  return Number(processId.slice(1)) - 1;
}

function defaultColor(index) {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

// สีของโปรเซสลำดับ index ใน CPU ใดก็ได้ (ใช้วาดแท่งเล็กในแถบซ้ายของ CPU ที่ไม่ได้เลือกด้วย)
function colorOf(profile, index) {
  return profile.processColors[index] || defaultColor(index);
}

function processColor(processId) {
  return colorOf(state, processIndex(processId));
}

// จุดสีเล็ก ๆ หน้าชื่อโปรเซส ใช้ในตาราง legend และตัวเลือกในส่วนสูตร
function createSwatch(processId) {
  var swatch = createElement('span', 'swatch');
  swatch.style.backgroundColor = processColor(processId);
  swatch.style.setProperty('--process-color', processColor(processId)); // ใช้ทำแสงเรืองรอบจุดสี (CSS)
  return swatch;
}

// แถบสีบนการ์ดโปรเซส (เป็นปุ่ม กดแล้วเปิดกล่องเลือกสี)
function colorButtonAt(index) {
  return document.querySelector('#burst-grid .color-button[data-index="' + index + '"]');
}

// ระบายสีทั้งแถบสีและขอบของการ์ดโปรเซส (การ์ดอ่านสีจากตัวแปร CSS --process-color)
function paintColorButton(button) {
  var processId = 'P' + (Number(button.getAttribute('data-index')) + 1);
  var color = processColor(processId);
  button.style.backgroundColor = color;
  button.parentNode.style.setProperty('--process-color', color);
  var label = t('colorButtonLabel', { id: processId, color: color.toUpperCase() });
  button.setAttribute('aria-label', label);
  button.title = label; // ชี้เมาส์แล้วบอกว่ากดเปลี่ยนสีได้ (แทนข้อความแนะนำใต้การ์ดที่เคยมี)
}

// เปลี่ยนสีแล้ววาดผลลัพธ์ใหม่ทันที เพื่อให้สีใน Gantt chart ตาราง สูตร และแถบ CPU ตรงกับการ์ดโปรเซสเสมอ
function setProcessColor(index, color) {
  state.processColors[index] = color;
  var button = colorButtonAt(index);
  if (button) {
    paintColorButton(button);
  }
  renderResults(true);
  updateActiveCpuCard();
  saveProfiles();
}

function resetColors() {
  closeColorPopover(false);
  state.processColors = [];
  var buttons = document.querySelectorAll('#burst-grid .color-button');
  for (var i = 0; i < buttons.length; i++) {
    paintColorButton(buttons[i]);
  }
  renderResults(true);
  updateActiveCpuCard();
  saveProfiles();
}

// ---------- กล่องเลือกสี (สีตัวอย่าง + กำหนดเองแบบ RGB) ----------

function onColorButtonClick(event) {
  var button = event.currentTarget;
  var index = Number(button.getAttribute('data-index'));
  // กดช่องสีเดิมซ้ำ = ปิดกล่อง
  if (colorPopoverIndex === index) {
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

  colorPopoverIndex = index;
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
  if (colorPopoverIndex === null) {
    return;
  }
  var button = colorButtonAt(colorPopoverIndex);
  byId('color-popover').hidden = true;
  colorPopoverIndex = null;
  if (button) {
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) {
      button.focus();
    }
  }
}

// วางกล่องไว้ใต้จุดสีที่กด (ตำแหน่งบนจอ เพราะกล่องเป็น position: fixed)
// ถ้าด้านล่างไม่พอให้วางเหนือจุดสีแทน และไม่ให้ล้นขอบจอซ้าย/ขวา (สำคัญบนมือถือ)
function positionPopover(popover, anchor) {
  var gutter = 16;
  var rect = anchor.getBoundingClientRect();
  var left = rect.left;
  var maxLeft = document.documentElement.clientWidth - popover.offsetWidth - gutter;
  if (left > maxLeft) {
    left = maxLeft;
  }
  if (left < gutter) {
    left = gutter;
  }
  var top = rect.bottom + 6;
  if (top + popover.offsetHeight > window.innerHeight - gutter) {
    top = Math.max(gutter, rect.top - popover.offsetHeight - 6);
  }
  popover.style.left = left + 'px';
  popover.style.top = top + 'px';
}

// รายการ CPU หรือหน้าเว็บเลื่อน: ให้กล่องเลือกสีเลื่อนตามจุดสีไปด้วย
// ถ้าจุดสีเลื่อนพ้นส่วนที่มองเห็นของรายการ CPU แล้ว ปิดกล่องไปเลย (กล่องจะได้ไม่ลอยค้างโดยไม่มีที่มา)
function onPopoverAnchorScroll() {
  if (colorPopoverIndex === null) {
    return;
  }
  var button = colorButtonAt(colorPopoverIndex);
  var listRect = byId('cpu-list').getBoundingClientRect();
  var rect = button.getBoundingClientRect();
  if (rect.bottom < listRect.top || rect.top > listRect.bottom) {
    closeColorPopover(false);
    return;
  }
  positionPopover(byId('color-popover'), button);
}

function renderPresetColors(selectedColor) {
  var container = byId('preset-colors');
  container.textContent = '';
  for (var i = 0; i < DEFAULT_COLORS.length; i++) {
    var color = DEFAULT_COLORS[i];
    var swatch = createElement('button', 'preset-color');
    swatch.type = 'button';
    swatch.style.backgroundColor = color;
    swatch.style.setProperty('--process-color', color);
    swatch.setAttribute('data-color', color);
    swatch.setAttribute('aria-label', t('presetColorLabel', { color: color.toUpperCase() }));
    swatch.setAttribute('aria-pressed', color.toLowerCase() === selectedColor.toLowerCase() ? 'true' : 'false');
    swatch.addEventListener('click', onPresetColorClick);
    container.appendChild(swatch);
  }
}

function onPresetColorClick(event) {
  setProcessColor(colorPopoverIndex, event.currentTarget.getAttribute('data-color'));
  closeColorPopover(true);
}

// เลือกสีเองจากกล่อง RGB ของ browser: เปลี่ยนสีทันทีระหว่างเลื่อน แต่ยังไม่ปิดกล่อง
function onCustomColorInput(event) {
  var color = event.target.value;
  setProcessColor(colorPopoverIndex, color);
  byId('custom-color-value').textContent = color.toUpperCase();
  renderPresetColors(color);
}

// คลิกที่อื่นนอกกล่อง = ปิดกล่อง (ยกเว้นคลิกช่องสีเดิม ซึ่ง onColorButtonClick จัดการเอง)
function onDocumentMouseDown(event) {
  if (colorPopoverIndex === null) {
    return;
  }
  var popover = byId('color-popover');
  var activeButton = colorButtonAt(colorPopoverIndex);
  if (popover.contains(event.target) || (activeButton && activeButton.contains(event.target))) {
    return;
  }
  closeColorPopover(false);
}

function onDocumentKeydown(event) {
  if (event.key === 'Escape') {
    closeColorPopover(true);
    closeColumnHelp(true);
    hideGanttTooltip();
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
  box.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
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

// ---------- หน้าต่างโปรเซส: จำนวนโปรเซส ----------

// ตรวจช่องจำนวนโปรเซส ถ้าผิดจะไฮไลต์ช่องไว้
function checkProcessCount() {
  var countInput = byId('process-count');
  var countResult = Validation.validateProcessCount(countInput.value, I18n.getLanguage());
  if (!countResult.ok) {
    markInvalid(countInput);
  }
  return countResult;
}

// พิมพ์จำนวนโปรเซสแล้ว ถ้าเป็นค่าที่ถูกต้องให้ปรับจำนวนแถวทันที (ไม่ต้องกดปุ่มถัดไปเหมือนหน้าเดิม)
// ถ้ายังพิมพ์ไม่เสร็จหรือผิด ให้คงแถวเดิมไว้ก่อน แล้วไปแจ้งเตือนตอนกด Run
function onProcessCountInput() {
  var countResult = Validation.validateProcessCount(byId('process-count').value, I18n.getLanguage());
  if (countResult.ok) {
    syncProcessRows(countResult.value);
  }
}

// ปุ่ม − / + ข้างช่องจำนวนโปรเซส
function onCountStepClick(event) {
  var step = Number(event.currentTarget.getAttribute('data-count-step'));
  var countInput = byId('process-count');
  var countResult = Validation.validateProcessCount(countInput.value, I18n.getLanguage());
  // ถ้าช่องว่างหรือผิดอยู่ ให้นับต่อจากจำนวนแถวที่มีอยู่
  var current = countResult.ok ? countResult.value : getBurstInputs().length;
  var next = Math.min(Validation.LIMITS.maxProcesses, Math.max(1, current + step));

  countInput.value = String(next);
  countInput.classList.remove('invalid');
  countInput.removeAttribute('aria-invalid');
  syncProcessRows(next);
  onFormEdited(); // ปุ่ม − / + ไม่ใช่ช่องกรอก จึงไม่เกิด event "input" ของฟอร์ม ต้องเรียกเอง
}

function updateCountButtons() {
  var count = getBurstInputs().length;
  var buttons = document.querySelectorAll('[data-count-step]');
  for (var i = 0; i < buttons.length; i++) {
    var step = Number(buttons[i].getAttribute('data-count-step'));
    buttons[i].disabled = step < 0 ? count <= 1 : count >= Validation.LIMITS.maxProcesses;
  }
}

// ---------- หน้าต่างโปรเซส: Burst Time และสี ----------

function getBurstInputs() {
  return Array.prototype.slice.call(document.querySelectorAll('#burst-grid input.burst-input'));
}

function randomBurstTime() {
  var min = Validation.LIMITS.randomBurstMin;
  var max = Validation.LIMITS.randomBurstMax;
  // Math.random() ได้ 0 ถึง 0.999... คูณจำนวนค่าที่เป็นไปได้แล้วปัดลง จะได้จำนวนเต็ม min..max
  return min + Math.floor(Math.random() * (max - min + 1));
}

// ปุ่มสุ่ม: ใส่ตัวเลขสุ่มลงในช่อง BT ทุกช่อง (ทับค่าเดิม) หลังจากนั้นผู้ใช้ยังแก้ค่าเองได้ตามปกติ
function fillRandomBurstTimes() {
  var inputs = getBurstInputs();
  for (var i = 0; i < inputs.length; i++) {
    inputs[i].value = String(randomBurstTime());
  }
  clearErrors();
  onFormEdited(); // ใส่ค่าด้วยโค้ด ไม่เกิด event "input" ของฟอร์ม ต้องเรียกเอง
}

// ชุด BT แบบสุ่มเป็นข้อความ (ใช้กับ CPU ที่สร้างใหม่)
function randomBurstValues(count) {
  var values = [];
  for (var i = 0; i < count; i++) {
    values.push(String(randomBurstTime()));
  }
  return values;
}

// เพิ่มหรือลบการ์ดโปรเซสที่ท้ายรายการให้เท่ากับ count
// การ์ดที่มีอยู่แล้วไม่ถูกสร้างใหม่ ค่า BT และสีที่ผู้ใช้กำหนดไว้จึงไม่หาย
// การ์ดใหม่ได้ BT สุ่มไว้ก่อน (แก้เองได้) กด Run ได้ทันทีโดยไม่ต้องกรอกช่องที่เพิ่มมา
function syncProcessRows(count) {
  closeColorPopover(false);
  var grid = byId('burst-grid');
  while (grid.children.length > count) {
    grid.removeChild(grid.lastElementChild);
  }
  for (var i = grid.children.length; i < count; i++) {
    var tile = createProcessTile(i);
    grid.appendChild(tile);
    tile.querySelector('input').value = String(randomBurstTime());
  }
  updateCountButtons();
}

// สร้างการ์ดโปรเซสใหม่ทั้งหมดจากค่าที่ CPU เก็บไว้ (ใช้ตอนสลับ CPU)
function rebuildProcessRows(values) {
  closeColorPopover(false);
  var grid = byId('burst-grid');
  grid.textContent = '';
  for (var i = 0; i < values.length; i++) {
    var tile = createProcessTile(i);
    grid.appendChild(tile);
    tile.querySelector('input').value = values[i];
  }
  updateCountButtons();
}

// แถวเล็กของโปรเซสหนึ่งตัว: จุดสี (กดเพื่อเลือกสี) | ชื่อ | ช่องกรอก BT
// ทำให้เตี้ยและแคบ เรียงได้ 2 คอลัมน์ในแผงตั้งค่า มีครบ 10 โปรเซสก็เป็นแค่ 5 แถว
// (AT = 0 ทุกโปรเซส บอกไว้ที่หัวแผงตั้งค่าแล้ว จึงไม่แสดงซ้ำในทุกแถว)
function createProcessTile(index) {
  var processId = 'P' + (index + 1);
  var tile = createElement('div', 'process-tile');

  var colorButton = createElement('button', 'color-button');
  colorButton.type = 'button';
  colorButton.setAttribute('data-index', String(index));
  colorButton.setAttribute('aria-haspopup', 'dialog');
  colorButton.setAttribute('aria-expanded', 'false');
  colorButton.addEventListener('click', onColorButtonClick);

  var label = createElement('label', 'process-name', processId);
  label.htmlFor = 'bt-' + processId;

  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'burst-input';
  input.id = 'bt-' + processId;
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.setAttribute('aria-label', t('burstInputLabel', { id: processId }));

  tile.appendChild(colorButton);
  tile.appendChild(label);
  tile.appendChild(input);
  paintColorButton(colorButton); // ต้องอยู่ในแถวก่อน เพราะระบายสีขอบแถวด้วย
  return tile;
}

// คำอธิบายใต้หัวข้อ Burst Time (ใส่ตัวเลขขอบเขตจาก Validation.LIMITS จึงต้องสร้างข้อความในโค้ด)
function updateBurstNote() {
  var limits = Validation.LIMITS;
  byId('burst-note').textContent = t('burstNote', {
    max: limits.maxBurstTime,
    randomMin: limits.randomBurstMin,
    randomMax: limits.randomBurstMax
  });
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

// ---------- Time Quantum และแท็บอัลกอริทึม ----------

function checkQuantum() {
  var quantumInput = byId('quantum');
  var quantumResult = Validation.validateQuantum(quantumInput.value, I18n.getLanguage());
  if (!quantumResult.ok) {
    markInvalid(quantumInput);
  }
  return quantumResult;
}

// เลือกแท็บอัลกอริทึม = เปลี่ยนผลที่แสดงทันที ไม่ต้องคำนวณใหม่ เพราะ Run คำนวณไว้ครบทั้ง 3 แล้ว
function onAlgorithmClick(event) {
  state.selectedAlgorithm = event.currentTarget.getAttribute('data-algorithm');
  state.showCompare = false;
  updateAlgorithmPicker();
  renderAlgorithmInfo();
  updateCompareButton();
  renderResults();
  saveProfiles();
}

// แท็บที่ถูกเลือกค้างไว้ (ขณะแสดงหน้าเปรียบเทียบ ไม่มีแท็บอัลกอริทึมไหนถูกเลือก)
function updateAlgorithmPicker() {
  var options = document.querySelectorAll('.algorithm-option');
  for (var i = 0; i < options.length; i++) {
    var isSelected = !state.showCompare && options[i].getAttribute('data-algorithm') === state.selectedAlgorithm;
    options[i].setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  }
  // เน้นช่อง Time Quantum เมื่อเลือก RR (ช่องยังแก้ได้ทุกเวลา เพราะ Run คำนวณ RR ด้วยเสมอ)
  byId('quantum-field').classList.toggle('is-active', state.selectedAlgorithm === 'RR');
}

// แถบสั้น ๆ ใต้แท็บ: ชื่อเต็ม + คำอธิบาย 1 บรรทัด + ปุ่มเปิด popup "วิธีทำงาน"
// รายละเอียด (ประเภท จุดเด่น ข้อจำกัด ภาพประกอบ) อยู่ใน popup เพื่อไม่ให้หน้าหลักรก (ดู modals.js)
function renderAlgorithmInfo() {
  var facts = ALGORITHM_FACTS[state.selectedAlgorithm];
  var info = byId('algorithm-info');
  info.textContent = '';
  info.hidden = state.showCompare; // หน้าเปรียบเทียบดูทั้ง 3 อัลกอริทึม จึงไม่แสดงคำอธิบายของตัวเดียว

  var text = createElement('div', 'algorithm-text');
  text.appendChild(createElement('h4', 'algorithm-name', ALGORITHM_TITLES[state.selectedAlgorithm]));
  text.appendChild(createElement('p', 'algorithm-summary', t(facts.summary)));
  info.appendChild(text);

  var button = createElement('button', 'button ghost small');
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'dialog');
  button.appendChild(createIcon('info'));
  button.appendChild(createElement('span', '', t('howItWorks')));
  button.addEventListener('click', function () {
    openAlgorithmDialog(state.selectedAlgorithm);
  });
  info.appendChild(button);
}

// ---------- Run และเปรียบเทียบ ----------

// ตรวจข้อมูลทุกช่องก่อนคำนวณ แล้วแสดงข้อผิดพลาดทุกข้อพร้อมกัน ผู้ใช้จะได้แก้ครั้งเดียว
function onRun() {
  clearErrors();
  var messages = [];

  var countResult = checkProcessCount();
  if (!countResult.ok) {
    messages.push(countResult.message);
  }

  var burstResult = checkBurstInputs();
  if (!burstResult.ok) {
    messages = messages.concat(burstResult.message.split('\n'));
  }

  var quantumResult = checkQuantum();
  if (!quantumResult.ok) {
    messages.push(quantumResult.message);
  }

  if (messages.length > 0) {
    showErrors(messages);
    return;
  }
  runAllAlgorithms(burstResult.values, quantumResult.value);
}

// [5, 3] → [{ id: 'P1', arrivalTime: 0, burstTime: 5 }, { id: 'P2', ... }] ตาม data contract ของ Scheduler
function buildProcesses(burstTimes) {
  var processes = [];
  for (var i = 0; i < burstTimes.length; i++) {
    processes.push({ id: 'P' + (i + 1), arrivalTime: 0, burstTime: burstTimes[i] });
  }
  return processes;
}

// ทั้ง 3 อัลกอริทึมใช้ processes ชุดเดียวกัน จึงเปรียบเทียบกันได้ (โจทย์ข้อ 1.4)
function computeResults(burstTimes, quantum) {
  var processes = buildProcesses(burstTimes);
  return {
    FCFS: Scheduler.fcfs(processes),
    SJF: Scheduler.sjf(processes),
    RR: Scheduler.roundRobin(processes, quantum)
  };
}

function runAllAlgorithms(burstTimes, quantum) {
  // ถ้าชุด BT เปลี่ยน ให้ล้างประวัติ RR เพราะเทียบผลข้ามชุดข้อมูลไม่ได้ (DECISIONS D-008)
  if (!sameNumbers(burstTimes, state.burstTimes)) {
    state.rrHistory = [];
  }

  state.burstTimes = burstTimes.slice();
  state.results = computeResults(burstTimes, quantum);
  addToRrHistory(state, state.results.RR);
  state.isStale = false;

  // ถ้าจำนวนโปรเซสลดลงจนไม่มีโปรเซสที่เลือกไว้แทนค่าสูตร ให้กลับไปใช้ P1
  if (processIndex(state.formulaProcessId) >= burstTimes.length) {
    state.formulaProcessId = 'P1';
  }

  updateStaleNote();
  updateCompareButton();
  renderResults();
  refreshCpuSummary();
  scrollToResultsIfHidden();
}

// ผลลัพธ์อยู่ใต้หน้าต่างโปรเซส ถ้าหัวหน้าต่างผลลัพธ์ยังอยู่ต่ำกว่าครึ่งล่างของจอ ให้เลื่อนลงไปให้เห็นทันที
// (ถ้าเห็นอยู่แล้วไม่ต้องเลื่อน หน้าจะได้ไม่กระโดดทุกครั้งที่กด Run ซ้ำเพื่อลอง TQ ใหม่)
function scrollToResultsIfHidden() {
  var resultsArea = byId('results-area');
  if (resultsArea.getBoundingClientRect().top > window.innerHeight * 0.6) {
    resultsArea.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  }
}

// เก็บผล RR ไว้หนึ่งแถวต่อหนึ่งค่า TQ เรียงจาก TQ น้อยไปมาก
function addToRrHistory(profile, rrResult) {
  var history = [];
  for (var i = 0; i < profile.rrHistory.length; i++) {
    if (profile.rrHistory[i].quantum !== rrResult.quantum) {
      history.push(profile.rrHistory[i]);
    }
  }
  history.push(rrResult);
  history.sort(function (a, b) {
    return a.quantum - b.quantum;
  });
  profile.rrHistory = history;
}

// ข้อมูลถูกแก้หลัง Run: จำไว้ว่าผลที่แสดงเป็นผลเก่า แล้วแสดงข้อความเตือนและเน้นปุ่ม Run
function markResultsStale() {
  if (state.results) {
    state.isStale = true;
  }
  updateStaleNote();
}

function updateStaleNote() {
  var isStale = state.results !== null && state.isStale;
  byId('stale-note').hidden = !isStale;
  byId('run-button').classList.toggle('needs-run', isStale);
}

// แท็บ "เปรียบเทียบ" เปิดหน้าเปรียบเทียบ — เลือกแท็บอัลกอริทึมเพื่อกลับ
function onCompareClick() {
  if (state.results === null || state.showCompare) {
    return;
  }
  state.showCompare = true;
  updateAlgorithmPicker();
  renderAlgorithmInfo();
  updateCompareButton();
  renderResults();
  saveProfiles();
}

// เปรียบเทียบได้เมื่อ Run แล้วเท่านั้น และแท็บค้างสถานะ "เลือกอยู่" ขณะแสดงการเปรียบเทียบ
function updateCompareButton() {
  var button = byId('compare-button');
  button.disabled = state.results === null;
  button.setAttribute('aria-pressed', state.showCompare ? 'true' : 'false');
}

// ---------- หน้าต่างผลลัพธ์ ----------

// วาดผลใหม่ทั้งหมด ใช้เมื่อ Run, เลือกแท็บ, เปลี่ยนสี, เปลี่ยนภาษา หรือสลับ CPU
// isStatic = true เมื่อข้อมูลเดิมแค่เปลี่ยนสี/ภาษา ไม่ต้องเล่น animation ซ้ำ (ไม่ให้แถบกะพริบระหว่างเลื่อนเลือกสี)
function renderResults(isStatic) {
  hideGanttTooltip();
  closeColumnHelp(false);
  var hasResults = state.results !== null;
  byId('empty-state').hidden = hasResults;
  var container = byId('results');
  container.hidden = !hasResults;
  container.textContent = '';
  if (!hasResults) {
    return;
  }

  // สร้าง element ใหม่ทุกครั้ง CSS จึงเล่น animation ค่อย ๆ ปรากฏให้ทุกครั้งที่เปลี่ยนมุมมอง
  var view = createElement('div', isStatic ? 'results-view is-static' : 'results-view');
  if (state.showCompare) {
    renderComparePanel(view);
  } else {
    renderAlgorithmView(view, state.results[state.selectedAlgorithm]);
  }
  container.appendChild(view);
}

// Gantt chart → ค่าสรุป 4 ช่อง → ตาราง → สูตร (พับได้) เรียงจากบนลงล่าง อ่านทีละเรื่อง
function renderAlgorithmView(view, result) {
  view.appendChild(createGanttCard(result));
  view.appendChild(createKpiGrid(result));
  view.appendChild(createTableCard(result));
  view.appendChild(createFormulaSection(result));
}

function algorithmLabel(result) {
  if (result.algorithm === 'RR') {
    return 'RR (TQ = ' + result.quantum + ')';
  }
  return result.algorithm;
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

// เวลาที่โปรเซสสุดท้ายทำงานเสร็จ = เวลาสิ้นสุดของช่วงสุดท้ายใน Gantt chart
function totalTimeOf(result) {
  return result.gantt[result.gantt.length - 1].end;
}

// ---------- Gantt chart ----------

function createGanttCard(result) {
  var card = createCard('gantt-card', t('ganttEyebrow'), t('ganttTitle'));
  var badges = createElement('div', 'card-badges');
  badges.appendChild(createElement('span', 'pill accent', algorithmLabel(result)));
  badges.appendChild(createElement('span', 'pill', t('totalTime', { value: totalTimeOf(result) })));
  card.querySelector('.card-header').appendChild(badges);

  card.appendChild(createElement('p', 'card-description', describeAlgorithm(result)));
  card.appendChild(createGanttChart(result));
  card.appendChild(createOrderList(result));
  return card;
}

function createGanttChart(result) {
  var scroll = createElement('div', 'gantt-scroll');
  var chart = createElement('div', 'gantt');
  chart.setAttribute('role', 'list');
  chart.setAttribute('aria-label', t('ganttTitle') + ' — ' + algorithmLabel(result));
  // แต่ละช่วงกว้างอย่างน้อย 44px ให้อ่านชื่อได้ ถ้าช่วงเยอะ (เช่น RR) กล่องจะเลื่อนแนวนอนได้แทนการบีบแถบ
  chart.style.minWidth = (result.gantt.length * 44) + 'px';

  for (var i = 0; i < result.gantt.length; i++) {
    chart.appendChild(createGanttSlot(result, i));
  }
  scroll.appendChild(chart);
  scroll.addEventListener('scroll', hideGanttTooltip);
  return scroll;
}

// หนึ่งช่วงเวลาที่โปรเซสได้ CPU (RR อาจมีหลายช่วงของโปรเซสเดียวกัน ใช้สีเดียวกันทุกช่วง)
function createGanttSlot(result, index) {
  var slot = result.gantt[index];
  var duration = slot.end - slot.start;

  var item = createElement('div', 'gantt-slot');
  // ความกว้างของแถบเป็นสัดส่วนกับเวลาที่ใช้ CPU
  item.style.flexGrow = String(duration);
  item.tabIndex = 0; // กด Tab มาที่แถบเพื่อดูรายละเอียดได้
  item.setAttribute('role', 'listitem');
  item.setAttribute('aria-label', t('slotLabel', { id: slot.id, start: slot.start, end: slot.end, duration: duration }));
  item.setAttribute('data-id', slot.id);
  item.setAttribute('data-start', String(slot.start));
  item.setAttribute('data-end', String(slot.end));
  item.setAttribute('data-algorithm', algorithmLabel(result));

  var bar = createElement('div', 'gantt-bar', slot.id);
  var color = processColor(slot.id);
  bar.style.backgroundColor = color; // ตัวอักษรบนแถบเป็นสีเข้มเสมอ (กำหนดใน CSS)
  bar.style.setProperty('--process-color', color); // ใช้ไล่สีและทำแสงเรืองใต้แถบ (CSS)
  // แถบปรากฏทีละแถบจากซ้ายไปขวา หน่วงรวมไม่เกิน 0.6 วินาทีแม้มีหลายช่วง
  bar.style.animationDelay = Math.min(index * 40, 600) + 'ms';
  item.appendChild(bar);

  item.appendChild(createElement('span', 'gantt-time start', String(slot.start)));
  if (index === result.gantt.length - 1) {
    item.appendChild(createElement('span', 'gantt-time end', String(slot.end)));
  }

  item.addEventListener('mouseenter', showGanttTooltip);
  item.addEventListener('focus', showGanttTooltip);
  item.addEventListener('mouseleave', hideGanttTooltip);
  item.addEventListener('blur', hideGanttTooltip);
  return item;
}

function showGanttTooltip(event) {
  var item = event.currentTarget;
  var processId = item.getAttribute('data-id');
  var start = Number(item.getAttribute('data-start'));
  var end = Number(item.getAttribute('data-end'));

  var tooltip = byId('gantt-tooltip');
  tooltip.textContent = '';
  var title = createElement('strong', 'tooltip-title');
  title.appendChild(createSwatch(processId));
  title.appendChild(document.createTextNode(processId + ' · ' + item.getAttribute('data-algorithm')));
  tooltip.appendChild(title);
  tooltip.appendChild(createTooltipRow(t('tooltipStart'), start));
  tooltip.appendChild(createTooltipRow(t('tooltipEnd'), end));
  tooltip.appendChild(createTooltipRow(t('tooltipDuration'), end - start));

  tooltip.hidden = false;
  positionTooltip(tooltip, item);
}

function createTooltipRow(label, value) {
  var row = createElement('div', 'tooltip-row');
  row.appendChild(createElement('span', '', label));
  row.appendChild(createElement('span', 'tooltip-value', String(value)));
  return row;
}

// วางกล่องไว้เหนือแถบ ถ้าด้านบนไม่มีที่ให้วางใต้แถบ และไม่ให้ล้นขอบจอซ้าย/ขวา
function positionTooltip(tooltip, anchor) {
  var gutter = 8;
  var rect = anchor.getBoundingClientRect();
  var left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
  var maxLeft = document.documentElement.clientWidth - tooltip.offsetWidth - gutter;
  left = Math.max(gutter, Math.min(left, maxLeft));

  var top = rect.top - tooltip.offsetHeight - 10;
  if (top < gutter) {
    top = rect.bottom + 10;
  }
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}

function hideGanttTooltip() {
  byId('gantt-tooltip').hidden = true;
}

// ลำดับการได้ CPU เป็นเม็ดสีของโปรเซส เรียงตาม Gantt chart (แทนข้อความ "P1 → P2 → ...")
// RR มีหลายช่วงต่อโปรเซส จึงมีเม็ดซ้ำได้ แต่ละเม็ดบอกว่ารอบนั้นใช้ CPU นานเท่าไร
function createOrderList(result) {
  var list = createElement('ol', 'order-list');
  list.setAttribute('aria-label', t('orderLabel'));
  for (var i = 0; i < result.gantt.length; i++) {
    var slot = result.gantt[i];
    var item = createElement('li', 'order-item');
    item.appendChild(createSwatch(slot.id));
    item.appendChild(createElement('span', 'order-id', slot.id));
    item.appendChild(createElement('span', 'order-time', orderTimeText(result, slot)));
    list.appendChild(item);
  }

  var total = 0;
  for (var j = 0; j < state.burstTimes.length; j++) {
    total += state.burstTimes[j];
  }
  list.appendChild(createElement('li', 'order-item total', t('totalBurst', { total: total })));
  return list;
}

// FCFS / SJF รันจนเสร็จในครั้งเดียว ระยะเวลาจึงเท่ากับ BT ส่วน RR แสดงเวลาที่ใช้ในรอบนั้น
function orderTimeText(result, slot) {
  var duration = slot.end - slot.start;
  if (result.algorithm === 'RR') {
    return t('orderRun', { duration: duration });
  }
  return 'BT ' + duration;
}

// ---------- ค่าสรุป (KPI cards) ----------

function createKpiGrid(result) {
  var grid = createElement('section', 'kpi-grid');
  grid.setAttribute('aria-label', t('kpiGroup', { name: algorithmLabel(result) }));

  grid.appendChild(createKpiCard('kpi-orange', 'hourglass', t('avgWtTitle'), t('avgWtFull'),
    formatAverage(result.averageWaitingTime), createKpiBars(result, 'waitingTime')));
  grid.appendChild(createKpiCard('kpi-violet', 'flag', t('avgTatTitle'), t('avgTatFull'),
    formatAverage(result.averageTurnaroundTime), createKpiBars(result, 'turnaroundTime')));
  grid.appendChild(createKpiCard('kpi-teal', 'clock', t('kpiTotalTitle'), t('kpiTotalFull'),
    String(totalTimeOf(result)), createKpiBars(result, 'completionTime')));
  grid.appendChild(createKpiCard('kpi-cyan', 'switch', t('kpiSwitchTitle'), t('kpiSwitchFull'),
    String(Scheduler.countContextSwitches(result.gantt)), createKpiStrip(result)));
  return grid;
}

// การ์ดค่าสรุป: หัว (ไอคอน + ชื่อ) แล้วแถวล่างเป็นตัวเลขทางซ้าย + กราฟจิ๋วทางขวา (กันการ์ดดูโล่ง)
function createKpiCard(colorClass, icon, title, fullName, value, chart) {
  var card = createElement('article', 'kpi-card ' + colorClass);
  var top = createElement('div', 'kpi-top');
  top.appendChild(createIcon(icon));
  var labels = createElement('div', 'kpi-labels');
  labels.appendChild(createElement('span', 'kpi-title', title));
  labels.appendChild(createElement('span', 'kpi-full', fullName));
  top.appendChild(labels);

  var body = createElement('div', 'kpi-body');
  body.appendChild(createElement('div', 'kpi-value', value));
  body.appendChild(chart);

  card.appendChild(top);
  card.appendChild(body);
  return card;
}

// กราฟแท่งจิ๋ว: หนึ่งแท่งต่อโปรเซส (P1..Pn) สีของโปรเซสนั้น สูงตามค่าในตาราง (WT, TAT หรือ CT)
// เป็นภาพประกอบเท่านั้น ใช้ค่าจาก result ที่ scheduler คำนวณไว้แล้ว ไม่ได้คำนวณใหม่
function createKpiBars(result, key) {
  var chart = createElement('div', 'kpi-chart kpi-bars');
  chart.setAttribute('aria-hidden', 'true');
  var maxValue = 0;
  for (var i = 0; i < result.rows.length; i++) {
    maxValue = Math.max(maxValue, result.rows[i][key]);
  }
  for (var j = 0; j < result.rows.length; j++) {
    var row = result.rows[j];
    var bar = createElement('span', 'kpi-bar');
    // ค่า 0 (เช่น WT ของโปรเซสแรก) ยังเห็นเป็นแท่งเตี้ย ๆ
    var percent = maxValue > 0 ? (row[key] / maxValue) * 100 : 0;
    bar.style.height = Math.max(percent, 8) + '%';
    bar.style.backgroundColor = processColor(row.id);
    bar.style.setProperty('--process-color', processColor(row.id)); // ใช้ไล่สี (CSS)
    bar.title = row.id + ' = ' + row[key];
    chart.appendChild(bar);
  }
  return chart;
}

// แถบ Gantt จิ๋ว: ทุกจุดที่สีเปลี่ยน = CPU สลับไปรันโปรเซสอื่นหนึ่งครั้ง
function createKpiStrip(result) {
  var chart = createElement('div', 'kpi-chart kpi-strip');
  chart.setAttribute('aria-hidden', 'true');
  for (var i = 0; i < result.gantt.length; i++) {
    var slot = result.gantt[i];
    var piece = createElement('span', 'kpi-strip-piece');
    piece.style.flexGrow = String(slot.end - slot.start);
    piece.style.backgroundColor = processColor(slot.id);
    piece.style.setProperty('--process-color', processColor(slot.id)); // ใช้ไล่สี (CSS)
    chart.appendChild(piece);
  }
  return chart;
}

// ที่มาของค่าเฉลี่ย เช่น "(0 + 5 + 8 + 16) ÷ 4 = 7.25"
function averageExplanation(result, key, average) {
  var values = [];
  for (var i = 0; i < result.rows.length; i++) {
    values.push(result.rows[i][key]);
  }
  return '(' + values.join(' + ') + ') ÷ ' + values.length + ' = ' + formatAverage(average);
}

// ---------- ตารางผลลัพธ์ ----------

function createTableCard(result) {
  var card = createCard('table-card', algorithmLabel(result), t('resultTableTitle'));

  var toggle = createElement('label', 'toggle');
  var checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = state.showFormulas;
  toggle.appendChild(checkbox);
  toggle.appendChild(createElement('span', '', t('showFormulas')));
  card.querySelector('.card-header').appendChild(toggle);

  var table = createResultTable(result);
  card.appendChild(table);

  // วาดใหม่เฉพาะตาราง (ไม่วาดทั้งหน้า) Gantt chart จึงไม่เล่น animation ซ้ำ
  checkbox.addEventListener('change', function () {
    state.showFormulas = checkbox.checked;
    var freshTable = createResultTable(result);
    card.replaceChild(freshTable, table);
    table = freshTable;
  });
  return card;
}

// ช่อง TAT / WT: ถ้าเปิด "แสดงวิธีคำนวณ" จะแสดงเป็น "16 − 0 = 16"
function createFormulaCell(left, right, answer) {
  var cell = createElement('td', 'num key-metric');
  if (state.showFormulas) {
    cell.appendChild(createElement('span', 'formula', left + ' − ' + right + ' = '));
  }
  cell.appendChild(document.createTextNode(String(answer)));
  return cell;
}

function createResultTable(result) {
  var wrapper = createElement('div', 'table-scroll');
  var table = createElement('table', 'result-table');
  table.appendChild(createResultTableColumns());
  table.appendChild(createResultTableHead(result));

  var tbody = document.createElement('tbody');
  for (var i = 0; i < result.rows.length; i++) {
    var row = result.rows[i];
    var tr = document.createElement('tr');
    var nameCell = createElement('th', 'process-cell');
    nameCell.scope = 'row';
    nameCell.style.setProperty('--process-color', processColor(row.id)); // แถบสีซ้ายของแถว (CSS)
    nameCell.appendChild(createSwatch(row.id));
    nameCell.appendChild(document.createTextNode(row.id));
    tr.appendChild(nameCell);
    tr.appendChild(createElement('td', 'num', String(row.arrivalTime)));
    tr.appendChild(createElement('td', 'num', String(row.burstTime)));
    tr.appendChild(createElement('td', 'num', String(row.startTime)));
    tr.appendChild(createElement('td', 'num', String(row.completionTime)));
    tr.appendChild(createFormulaCell(row.completionTime, row.arrivalTime, row.turnaroundTime));
    tr.appendChild(createFormulaCell(row.turnaroundTime, row.burstTime, row.waitingTime));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  var tfoot = document.createElement('tfoot');
  var footRow = document.createElement('tr');
  var label = createElement('th', '', t('average'));
  label.scope = 'row';
  label.colSpan = 5;
  footRow.appendChild(label);
  footRow.appendChild(createElement('td', 'num', formatAverage(result.averageTurnaroundTime)));
  footRow.appendChild(createElement('td', 'num', formatAverage(result.averageWaitingTime)));
  tfoot.appendChild(footRow);
  table.appendChild(tfoot);

  wrapper.appendChild(table);
  // จอแคบตารางเลื่อนแนวนอนได้ กล่องคำอธิบายหัวคอลัมน์จึงต้องเลื่อนตามด้วย
  wrapper.addEventListener('scroll', onColumnHelpScroll);
  return wrapper;
}

// กำหนดความกว้างแต่ละคอลัมน์ไว้ล่วงหน้า (ร่วมกับ table-layout: fixed ใน CSS)
// เปิด "แสดงวิธีคำนวณ" แล้วช่อง TAT / WT ยาวขึ้น แต่คอลัมน์อื่นไม่ขยับ เพราะความกว้างไม่ได้คิดจากเนื้อหา
function createResultTableColumns() {
  var columnNames = ['process', 'at', 'bt', 'st', 'ct', 'tat', 'wt'];
  var colgroup = document.createElement('colgroup');
  for (var i = 0; i < columnNames.length; i++) {
    colgroup.appendChild(createElement('col', 'col-' + columnNames[i]));
  }
  return colgroup;
}

// หัวตาราง: ตัวย่อภาษาอังกฤษตามโจทย์ แต่ละหัวเป็นปุ่ม กดแล้วเปิดกล่องบอกความหมาย สูตร และตัวอย่างแทนค่า
function createResultTableHead(result) {
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
    var th = createElement('th', h === 0 ? '' : 'num');
    th.scope = 'col';
    th.appendChild(createColumnHelpButton(headers[h][0], headers[h][1], result));
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  return thead;
}

// ---------- กล่องคำอธิบายหัวตาราง ----------

var columnHelpButton = null; // ปุ่มหัวคอลัมน์ที่เปิดกล่องอยู่ (null = ปิดอยู่)

function createColumnHelpButton(name, fullName, result) {
  var button = createElement('button', 'th-help');
  button.type = 'button';
  button.title = fullName;
  button.setAttribute('aria-label', t('columnHelpLabel', { name: name }));
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'column-help');
  button.appendChild(createElement('span', 'th-help-text', name));
  var mark = createElement('span', 'th-help-mark', '?');
  mark.setAttribute('aria-hidden', 'true');
  button.appendChild(mark);
  button.addEventListener('click', function () {
    toggleColumnHelp(button, name, result);
  });
  return button;
}

// กดหัวเดิมซ้ำ = ปิด / กดหัวอื่น = เปลี่ยนเนื้อหาและย้ายกล่องไปใต้หัวนั้น
function toggleColumnHelp(button, name, result) {
  if (columnHelpButton === button) {
    closeColumnHelp(true);
    return;
  }
  closeColumnHelp(false);
  fillColumnHelp(columnHelpContent(name, result));
  var box = byId('column-help');
  box.hidden = false;
  positionPopover(box, button);
  button.setAttribute('aria-expanded', 'true');
  columnHelpButton = button;
}

// เนื้อหาของคอลัมน์ ใช้ชุดเดียวกับส่วน "สูตรการคำนวณ" (buildFormulaLines) ตัวเลขจึงมาจากผลของ Scheduler เสมอ
// แทนค่าด้วยโปรเซสเดียวกับที่เลือกไว้ในส่วนสูตร (ค่าเริ่มต้น P1)
function columnHelpContent(name, result) {
  if (name === 'Process') {
    return { name: name, meaning: t('meaningProcess'), rule: t('ruleProcess'), exampleLabel: '', example: '' };
  }
  var row = findRow(result, state.formulaProcessId);
  var lines = buildFormulaLines(result, row);
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].name === name) {
      return {
        name: name,
        meaning: lines[i].meaning,
        rule: lines[i].rule,
        exampleLabel: t('formulaExample', { id: row.id }),
        example: lines[i].example
      };
    }
  }
  return null;
}

function fillColumnHelp(content) {
  var box = byId('column-help');
  box.textContent = '';
  var title = createElement('strong', 'column-help-title', content.meaning);
  title.id = 'column-help-title';
  box.appendChild(title);

  box.appendChild(createElement('span', 'column-help-label', t('formulaRule')));
  box.appendChild(createElement('code', 'column-help-rule', content.rule));
  if (content.example) {
    box.appendChild(createElement('span', 'column-help-label', content.exampleLabel));
    box.appendChild(createElement('code', 'column-help-example', content.example));
  }
  box.appendChild(createElement('p', 'column-help-tip', t('columnHelpTip')));
}

// returnFocus = true เมื่อปิดด้วยคีย์บอร์ด เพื่อให้ผู้ใช้กลับมาอยู่ที่หัวคอลัมน์เดิม
function closeColumnHelp(returnFocus) {
  if (columnHelpButton === null) {
    return;
  }
  var button = columnHelpButton;
  columnHelpButton = null;
  byId('column-help').hidden = true;
  button.setAttribute('aria-expanded', 'false');
  if (returnFocus && document.body.contains(button)) {
    button.focus();
  }
}

// คลิกนอกกล่อง (และไม่ใช่หัวคอลัมน์ที่เปิดอยู่) = ปิด
function onColumnHelpOutsideClick(event) {
  if (columnHelpButton === null) {
    return;
  }
  if (byId('column-help').contains(event.target) || columnHelpButton.contains(event.target)) {
    return;
  }
  closeColumnHelp(false);
}

// หน้าหรือตารางเลื่อน: กล่องเลื่อนตามหัวคอลัมน์ ถ้าหัวคอลัมน์พ้นจอไปแล้วให้ปิด
function onColumnHelpScroll() {
  if (columnHelpButton === null) {
    return;
  }
  var rect = columnHelpButton.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
    closeColumnHelp(false);
    return;
  }
  positionPopover(byId('column-help'), columnHelpButton);
}

// ---------- สูตรการคำนวณของแต่ละค่า (แทนค่าด้วยโปรเซสที่เลือก) ----------

// ใช้ <details> พับเก็บได้ เพื่อไม่ให้ Dashboard ยาวเกินไป (พับไว้เป็นค่าเริ่มต้น จำไว้แยกตาม CPU)
function createFormulaSection(result) {
  var row = findRow(result, state.formulaProcessId);

  var details = createElement('details', 'card formula-card');
  details.id = 'formula-section';
  details.open = state.formulaOpen;
  details.addEventListener('toggle', function () {
    state.formulaOpen = details.open;
  });

  var summary = createElement('summary', 'formula-summary');
  var heading = createElement('div');
  heading.appendChild(createElement('p', 'card-eyebrow', algorithmLabel(result)));
  heading.appendChild(createElement('h4', 'card-title', t('formulaTitle')));
  summary.appendChild(heading);
  details.appendChild(summary);

  var body = createElement('div', 'formula-body');
  body.appendChild(createFormulaProcessPicker(result));
  var list = createElement('ol', 'formula-list');
  var lines = buildFormulaLines(result, row);
  for (var i = 0; i < lines.length; i++) {
    list.appendChild(createFormulaTile(lines[i], row));
  }
  body.appendChild(list);
  details.appendChild(body);
  return details;
}

// กล่องของค่าหนึ่งตัว: ชื่อย่อ + ความหมาย / สูตร / แทนค่า
function createFormulaTile(line, row) {
  var tile = createElement('li', 'formula-tile');
  var head = createElement('div', 'formula-tile-head');
  head.appendChild(createElement('span', 'formula-name', line.name));
  head.appendChild(createElement('span', 'formula-meaning', line.meaning));
  tile.appendChild(head);

  // ค่าเฉลี่ยใช้ข้อมูลทุกโปรเซส ไม่ใช่เฉพาะโปรเซสที่เลือก
  var exampleLabel = line.usesAllProcesses ? t('formulaExampleAll') : t('formulaExample', { id: row.id });
  tile.appendChild(createFormulaLine(t('formulaRule'), line.rule, 'formula-rule'));
  tile.appendChild(createFormulaLine(exampleLabel, line.example, 'formula-example'));
  return tile;
}

function createFormulaLine(label, text, className) {
  var line = createElement('div', 'formula-line ' + className);
  line.appendChild(createElement('span', 'formula-line-label', label));
  line.appendChild(createElement('code', '', text));
  return line;
}

function findRow(result, processId) {
  for (var i = 0; i < result.rows.length; i++) {
    if (result.rows[i].id === processId) {
      return result.rows[i];
    }
  }
  return result.rows[0];
}

// ตัวเลือก "แทนค่าด้วยข้อมูลของ P1 / P2 / …" พร้อมจุดสีของโปรเซสที่เลือก
function createFormulaProcessPicker(result) {
  var label = createElement('label', 'formula-picker');
  label.appendChild(document.createTextNode(t('formulaExampleFor') + ' '));
  label.appendChild(createSwatch(findRow(result, state.formulaProcessId).id));

  var select = document.createElement('select');
  select.id = 'formula-process';
  for (var i = 0; i < result.rows.length; i++) {
    var option = createElement('option', '', result.rows[i].id);
    option.value = result.rows[i].id;
    select.appendChild(option);
  }
  select.value = findRow(result, state.formulaProcessId).id;

  // วาดใหม่เฉพาะส่วนสูตร แล้วให้โฟกัสกลับมาที่ตัวเลือกเดิม
  select.addEventListener('change', function () {
    state.formulaProcessId = select.value;
    var oldSection = byId('formula-section');
    oldSection.parentNode.replaceChild(createFormulaSection(result), oldSection);
    byId('formula-process').focus();
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
      example: averageExplanation(result, 'turnaroundTime', result.averageTurnaroundTime),
      usesAllProcesses: true
    },
    {
      name: 'AVG WT',
      meaning: t('meaningAvgWT'),
      rule: t('ruleAvgWT'),
      example: averageExplanation(result, 'waitingTime', result.averageWaitingTime),
      usesAllProcesses: true
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

// ---------- เปรียบเทียบอัลกอริทึม ----------

function renderComparePanel(view) {
  var results = [state.results.FCFS, state.results.SJF, state.results.RR];

  var chartCard = createCard('compare-card', t('compareEyebrow'), t('compareTitle'));
  chartCard.appendChild(createElement('h5', 'card-subtitle', t('avgChartTitle')));
  chartCard.appendChild(createGroupedBarChart(results));
  view.appendChild(chartCard);

  view.appendChild(createSummaryCard(results));
  view.appendChild(createRrHistoryCard());
}

// ค่าที่น้อยที่สุดของ key ในผลทุกอัลกอริทึม (ถ้าเท่ากันหลายตัวจะไฮไลต์ทุกตัว)
function lowestOf(results, key) {
  var lowest = results[0][key];
  for (var i = 1; i < results.length; i++) {
    lowest = Math.min(lowest, results[i][key]);
  }
  return lowest;
}

// กราฟแท่งจัดกลุ่ม: แต่ละอัลกอริทึมมีแท่ง AVG WT และ AVG TAT ใช้สเกลเดียวกันทั้งกราฟ
function createGroupedBarChart(results) {
  var max = 0;
  for (var i = 0; i < results.length; i++) {
    max = Math.max(max, results[i].averageWaitingTime, results[i].averageTurnaroundTime);
  }
  var lowestWaiting = lowestOf(results, 'averageWaitingTime');
  var lowestTurnaround = lowestOf(results, 'averageTurnaroundTime');

  var chart = createElement('div', 'bar-chart');
  for (var j = 0; j < results.length; j++) {
    var result = results[j];
    var group = createElement('div', 'bar-group');
    group.appendChild(createElement('span', 'bar-group-label', algorithmLabel(result)));
    group.appendChild(createBar('AVG WT', result.averageWaitingTime, max, 'bar-wt',
      result.averageWaitingTime === lowestWaiting));
    group.appendChild(createBar('AVG TAT', result.averageTurnaroundTime, max, 'bar-tat',
      result.averageTurnaroundTime === lowestTurnaround));
    chart.appendChild(group);
  }
  return chart;
}

function createBar(metricName, value, max, className, isLowest) {
  var row = createElement('div', 'bar-row ' + className);
  row.appendChild(createElement('span', 'bar-metric', metricName));

  var track = createElement('div', 'bar-track');
  var fill = createElement('div', 'bar-fill');
  // ถ้าทุกค่าเป็น 0 (เช่นมีโปรเซสเดียว) ไม่ต้องหาร ให้แถบยาว 0
  fill.style.width = max > 0 ? (value / max * 100) + '%' : '0';
  track.appendChild(fill);
  row.appendChild(track);

  var valueText = createElement('span', 'bar-value', formatAverage(value));
  if (isLowest) {
    valueText.appendChild(createElement('span', 'badge', t('badgeLowest')));
  }
  row.appendChild(valueText);
  return row;
}

function createSummaryCard(results) {
  var card = createCard('summary-card', t('compareEyebrow'), t('summaryTitle'));
  var lowest = lowestOf(results, 'averageWaitingTime');

  var rows = [];
  var bestNames = [];
  for (var i = 0; i < results.length; i++) {
    var isBest = results[i].averageWaitingTime === lowest;
    rows.push({ label: algorithmLabel(results[i]), result: results[i], isBest: isBest });
    if (isBest) {
      bestNames.push(algorithmLabel(results[i]));
    }
  }
  card.appendChild(createCompareTable(t('algorithmHeader'), rows));
  card.appendChild(createElement('p', 'note', t('lowestNote', { names: bestNames.join(', '), value: formatAverage(lowest) })));
  card.appendChild(createElement('p', 'note muted', t('compareCaveat')));
  return card;
}

function createRrHistoryCard() {
  var card = createCard('history-card', 'Round Robin', t('rrHistoryTitle'));
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
  card.appendChild(createCompareTable('Time Quantum', rows, t('badgeShowing')));
  card.appendChild(createElement('p', 'note', t('rrHistoryNote')));
  return card;
}

// ตารางสรุป: ชื่อ | AVG WT | AVG TAT | จำนวนครั้งที่สลับโปรเซส
function createCompareTable(firstHeader, rows, badgeText) {
  var wrapper = createElement('div', 'table-scroll');
  var table = document.createElement('table');

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  var headers = [firstHeader, 'AVG WT', 'AVG TAT', t('contextSwitchHeader')];
  for (var h = 0; h < headers.length; h++) {
    var th = createElement('th', h === 0 ? '' : 'num', headers[h]);
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
    var nameCell = createElement('th', '', rows[i].label);
    nameCell.scope = 'row';
    if (rows[i].isBest) {
      nameCell.appendChild(createElement('span', 'badge', badgeText || t('badgeLowest')));
    }
    tr.appendChild(nameCell);
    tr.appendChild(createElement('td', 'num', formatAverage(rows[i].result.averageWaitingTime)));
    tr.appendChild(createElement('td', 'num', formatAverage(rows[i].result.averageTurnaroundTime)));
    tr.appendChild(createElement('td', 'num', String(Scheduler.countContextSwitches(rows[i].result.gantt))));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  wrapper.appendChild(table);
  return wrapper;
}

// ---------- CPU หลายตัว: เก็บ / แสดง / สลับ ----------

// เก็บค่าที่อยู่ในหน้าต่างโปรเซสตอนนี้ลงใน CPU ที่เลือกอยู่ (ทำก่อนสลับ CPU และก่อนบันทึกทุกครั้ง)
// ค่า BT เก็บเป็นข้อความตามที่พิมพ์ไว้ แม้จะยังกรอกผิด สลับกลับมาแล้วจะได้แก้ต่อจากเดิม
function storeFormInProfile() {
  state.processCountText = byId('process-count').value;
  state.quantumText = byId('quantum').value;
  var inputs = getBurstInputs();
  state.burstValues = [];
  for (var i = 0; i < inputs.length; i++) {
    state.burstValues.push(inputs[i].value);
  }
}

// แสดงข้อมูลของ CPU ที่เลือก (state) ในหน้าต่างโปรเซส หัวพื้นที่ทำงาน และหน้าต่างผลลัพธ์
function showProfile() {
  closeColorPopover(false);
  hideGanttTooltip();
  clearErrors(); // ข้อความเตือนเป็นของ CPU ตัวก่อน
  byId('process-count').value = state.processCountText;
  byId('quantum').value = state.quantumText;
  rebuildProcessRows(state.burstValues);
  updateStaleNote();
  updateAlgorithmPicker();
  renderAlgorithmInfo();
  updateCompareButton();
  renderWorkspaceHeader();
  renderResults();
}

function switchToProfile(index) {
  storeFormInProfile(); // ต้องเก็บก่อนเปลี่ยน state ไม่อย่างนั้นค่าที่พิมพ์ไว้จะหาย
  app.activeIndex = index;
  state = app.profiles[index];
  showProfile();
  renderCpuList();
  saveProfiles();
  refreshCpuCompare(); // CPU ที่เพิ่งเพิ่ม / ทำสำเนา ต้องขึ้นในหน้าเปรียบเทียบด้วย (ถ้าเปิดอยู่)
}

// รายการในแถบซ้ายถูกวาดใหม่ทุกครั้ง จึงต้องย้ายโฟกัสไปที่การ์ดใหม่ให้ผู้ใช้คีย์บอร์ด
function focusCpuItem(index) {
  var button = document.querySelector('.cpu-card[data-index="' + index + '"]');
  if (button) {
    button.focus();
  }
}

// กดการ์ด CPU = เลือก CPU นั้นเพื่อดูผลลัพธ์ (ยังไม่กางการตั้งค่า — กางด้วยปุ่มลูกศรเท่านั้น)
// ถ้าหน้าเปรียบเทียบ CPU เปิดอยู่ ให้ปิดก่อน แม้กดการ์ดของ CPU ที่เลือกอยู่แล้ว (= กลับไปดูผลของ CPU นั้น)
function onCpuItemClick(event) {
  var index = Number(event.currentTarget.getAttribute('data-index'));
  if (cpuCompare.isOpen) {
    closeCpuCompare(false);
  }
  if (index !== app.activeIndex) {
    settingsPanelOpen = false;
    switchToProfile(index);
    focusCpuItem(index);
  }
}

// ปุ่มลูกศรบนการ์ด = พับ / กาง dropdown การตั้งค่า
// ถ้ากดที่ CPU ตัวอื่น ให้เลือก CPU นั้นแล้วกางการตั้งค่าของมันเลย
function onCpuToggleClick(event) {
  var index = Number(event.currentTarget.getAttribute('data-index'));
  closeColorPopover(false);
  if (index === app.activeIndex) {
    settingsPanelOpen = !settingsPanelOpen;
    renderCpuList();
  } else {
    settingsPanelOpen = true;
    switchToProfile(index);
  }
  var toggle = document.querySelector('.cpu-toggle[data-index="' + index + '"]');
  if (toggle) {
    toggle.focus(); // ปุ่มถูกสร้างใหม่ จึงย้ายโฟกัสกลับมาให้ผู้ใช้คีย์บอร์ด
  }
}

// ปุ่ม "⋯" บนการ์ด CPU = เปิด popup รายละเอียดของ CPU นั้น (ยังไม่สลับ CPU)
function onCpuMoreClick(event) {
  openCpuDialog(Number(event.currentTarget.getAttribute('data-index')));
}

// CPU ใหม่: 4 โปรเซส สุ่ม BT, TQ = 2 ชื่อ "CPU n" โดย n ไม่ซ้ำกับตัวที่เคยสร้าง
function onAddCpu() {
  if (app.profiles.length >= Profiles.MAX_PROFILES) {
    return;
  }
  var profile = Profiles.createProfile('CPU ' + app.nextNumber, randomBurstValues(NEW_CPU_PROCESS_COUNT));
  app.nextNumber++;
  app.profiles.push(profile);
  settingsPanelOpen = true; // CPU ใหม่ต้องตั้งค่าก่อน จึงกางการตั้งค่าให้เลย
  switchToProfile(app.profiles.length - 1);
  focusCpuItem(app.activeIndex);
  scrollCpuListTo(app.activeIndex);
}

// เลื่อนรายการ CPU (ในแถบซ้าย) ให้หัวการ์ดของ CPU นี้อยู่บนสุด เช่น CPU ที่เพิ่งสร้างซึ่งอยู่ท้ายรายการ
// เลื่อนเฉพาะรายการ ไม่เลื่อนทั้งหน้า (บนจอแคบรายการไม่มีแถบเลื่อนของตัวเอง คำสั่งนี้จึงไม่มีผล)
function scrollCpuListTo(index) {
  var list = byId('cpu-list');
  var item = list.children[index];
  if (!item) {
    return;
  }
  list.scrollTo({ top: item.offsetTop - list.offsetTop - 6, behavior: scrollBehavior() });
}

// ---------- CPU หลายตัว: เปลี่ยนชื่อ / ทำสำเนา / ลบ (เรียกจาก popup ใน modals.js) ----------
// รับ index ของ CPU เพราะ popup เปิดดู CPU ตัวไหนก็ได้ ไม่จำเป็นต้องเป็นตัวที่เลือกอยู่

function renameCpuAt(index, text) {
  var profile = app.profiles[index];
  profile.name = Profiles.cleanName(text, profile.name);
  renderWorkspaceHeader();
  renderCpuList();
  saveProfiles();
  refreshCpuCompare();
}

// ทำสำเนา (ข้อมูล สี และผลลัพธ์) วางไว้ถัดจากตัวเดิมแล้วเลือกตัวใหม่ เช่น ใช้ลองค่า TQ อื่นโดยไม่แตะตัวเดิม
function duplicateCpuAt(index) {
  if (app.profiles.length >= Profiles.MAX_PROFILES) {
    return;
  }
  storeFormInProfile(); // ถ้าทำสำเนาตัวที่เลือกอยู่ ต้องได้ค่าที่เพิ่งพิมพ์ด้วย
  var source = app.profiles[index];
  var name = Profiles.cleanName(t('copyName', { name: source.name }), source.name);
  app.profiles.splice(index + 1, 0, Profiles.duplicateProfile(source, name));
  if (app.activeIndex > index) {
    app.activeIndex++; // ตัวที่เลือกอยู่ถูกดันลงไปหนึ่งตำแหน่ง
  }
  switchToProfile(index + 1);
}

// ต้องเหลือ CPU อย่างน้อย 1 ตัวเสมอ (popup ถามยืนยันก่อนเรียกฟังก์ชันนี้)
function deleteCpuAt(index) {
  if (app.profiles.length <= 1) {
    return;
  }
  storeFormInProfile();
  app.profiles.splice(index, 1);
  if (app.activeIndex > index) {
    app.activeIndex--; // ตัวที่เลือกอยู่เลื่อนขึ้นมาหนึ่งตำแหน่ง
  }
  app.activeIndex = Math.min(app.activeIndex, app.profiles.length - 1);
  state = app.profiles[app.activeIndex];
  showProfile();
  renderCpuList();
  saveProfiles();
  refreshCpuCompare();
}

// ล้างข้อมูล CPU ทั้งหมด แล้วเริ่มใหม่ที่ CPU 1 (เรียกจาก popup ตั้งค่า หลังผู้ใช้ยืนยัน)
function resetAllCpus() {
  app.profiles = [Profiles.createProfile('CPU 1', randomBurstValues(NEW_CPU_PROCESS_COUNT))];
  app.activeIndex = 0;
  app.nextNumber = 2;
  state = app.profiles[0];
  showProfile();
  renderCpuList();
  saveProfiles();
  refreshCpuCompare();
}

// ---------- CPU หลายตัว: แถบซ้ายและหัวของ CPU ----------

// idle = ยังไม่ Run / done = ผลตรงกับข้อมูล / stale = แก้ข้อมูลหลัง Run
function cpuStatus(profile) {
  if (profile.results === null) {
    return 'idle';
  }
  return profile.isStale ? 'stale' : 'done';
}

// วาดรายการ CPU ใหม่ทั้งหมด แล้ววางแผงตั้งค่าไว้ใต้การ์ดของ CPU ที่เลือก (ถ้ากางอยู่)
// ใช้เมื่อโครงรายการเปลี่ยน (สลับ / เพิ่ม / ลบ / เปลี่ยนชื่อ / เปลี่ยนภาษา)
// ระหว่างพิมพ์ในแผงตั้งค่าห้ามเรียกฟังก์ชันนี้ เพราะการย้ายแผงทำให้ช่องที่กำลังพิมพ์หลุดโฟกัส — ใช้ updateActiveCpuCard แทน
function renderCpuList() {
  var list = byId('cpu-list');
  var panel = byId('cpu-panel');
  // ย้ายแผงออกมาพักก่อน ไม่อย่างนั้นแผงจะหายไปพร้อม <li> เดิมที่กำลังถูกลบ
  byId('panel-home').appendChild(panel);
  list.textContent = '';
  for (var i = 0; i < app.profiles.length; i++) {
    list.appendChild(createCpuItem(app.profiles[i], i));
  }
  if (settingsPanelOpen) {
    list.children[app.activeIndex].appendChild(panel);
  }

  var isFull = app.profiles.length >= Profiles.MAX_PROFILES;
  byId('cpu-count').textContent = app.profiles.length + ' / ' + Profiles.MAX_PROFILES;
  byId('add-cpu-button').disabled = isFull;
  byId('cpu-limit-note').hidden = !isFull;
  byId('cpu-limit-note').textContent = t('cpuLimitNote', { max: Profiles.MAX_PROFILES });
}

// CPU หนึ่งตัว = การ์ดลอย (กดเพื่อเลือก) + ปุ่ม "⋯" มุมขวาบน (เปิด popup รายละเอียด)
//              + ปุ่มลูกศรมุมขวาล่าง (พับ/กางการตั้งค่า) — แยกเป็นปุ่มคนละปุ่มใน <li> เดียวกัน เพราะห้ามวางปุ่มซ้อนในปุ่ม
function createCpuItem(profile, index) {
  var isActive = index === app.activeIndex;
  var item = createElement('li', 'cpu-item accent-' + (index % 4));
  item.classList.toggle('is-active', isActive);
  item.classList.toggle('is-open', isActive && settingsPanelOpen);

  var card = createElement('button', 'cpu-card');
  card.type = 'button';
  card.setAttribute('data-index', String(index));
  card.setAttribute('aria-current', isActive ? 'true' : 'false');
  card.addEventListener('click', onCpuItemClick);
  fillCpuCard(card, profile);

  // กรอบของการ์ด + ปุ่ม ⋯ + ปุ่มลูกศร (ปุ่มทั้งสองวางทับมุมการ์ด) แยกจากแผงตั้งค่าที่ต่อท้าย <li>
  var head = createElement('div', 'cpu-item-head');
  head.appendChild(card);

  var more = createElement('button', 'cpu-more');
  more.type = 'button';
  more.setAttribute('data-index', String(index));
  more.setAttribute('aria-haspopup', 'dialog');
  more.setAttribute('aria-label', t('cpuDetailsOf', { name: profile.name }));
  more.title = t('cpuDetailsOf', { name: profile.name });
  more.appendChild(createIcon('more'));
  more.addEventListener('click', onCpuMoreClick);
  head.appendChild(more);
  head.appendChild(createCpuToggle(profile, index, isActive && settingsPanelOpen));
  item.appendChild(head);
  return item;
}

// ปุ่มลูกศรมุมขวาล่างของการ์ด: ชี้ลง = การตั้งค่าพับอยู่ / ชี้ขึ้น = กางอยู่
function createCpuToggle(profile, index, isOpen) {
  var toggle = createElement('button', 'cpu-toggle');
  toggle.type = 'button';
  toggle.setAttribute('data-index', String(index));
  toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  toggle.setAttribute('aria-controls', 'cpu-panel');
  toggle.setAttribute('aria-label', t('toggleSettings', { name: profile.name }));
  toggle.title = t('toggleSettings', { name: profile.name });
  toggle.appendChild(createIcon('chevron'));
  toggle.addEventListener('click', onCpuToggleClick);
  return toggle;
}

// เนื้อหาในการ์ด: ไอคอนชิป | ชื่อ + จำนวนโปรเซส + TQ | ป้ายสถานะ (D-034)
function fillCpuCard(card, profile) {
  card.textContent = '';
  var badge = createElement('span', 'cpu-card-icon');
  badge.appendChild(createIcon('chip'));
  card.appendChild(badge);

  var text = createElement('span', 'cpu-card-text');
  text.appendChild(createElement('span', 'cpu-card-name', profile.name));
  text.appendChild(createElement('span', 'cpu-card-meta',
    t('cpuMeta', { count: profile.burstValues.length, quantum: profile.quantumText })));
  card.appendChild(text);
  card.appendChild(createStatusBadge(cpuStatus(profile)));
}

// ป้ายสถานะด้านขวาของการ์ด: สี + ไอคอน + ข้อความ ต่างกันทั้งสามอย่าง จึงแยกออกได้แม้มองไม่เห็นสี
function createStatusBadge(status) {
  var badge = createElement('span', 'cpu-card-status is-' + status);
  badge.appendChild(createIcon(STATUS_ICON[status]));
  badge.appendChild(createElement('span', '', t(STATUS_TEXT[status])));
  return badge;
}

// อัปเดตเฉพาะการ์ดของ CPU ที่เลือก (ใช้ขณะพิมพ์ในแผงตั้งค่า / Run / เปลี่ยนสี) — แผงตั้งค่าไม่ถูกย้าย โฟกัสจึงไม่หลุด
function updateActiveCpuCard() {
  var card = document.querySelector('.cpu-card[data-index="' + app.activeIndex + '"]');
  if (card) {
    fillCpuCard(card, state);
  }
}

// ชื่อ CPU ตัวใหญ่ + ป้ายจำนวนโปรเซส / TQ / สถานะ
function renderWorkspaceHeader() {
  var status = cpuStatus(state);
  byId('cpu-name').textContent = state.name;

  var meta = byId('cpu-meta');
  meta.textContent = '';
  meta.appendChild(createElement('li', 'meta-chip', t('metaProcesses', { count: state.burstValues.length })));
  meta.appendChild(createElement('li', 'meta-chip', 'TQ ' + state.quantumText));
  meta.appendChild(createElement('li', 'meta-chip status is-' + status, t(STATUS_TEXT[status])));
}

// บันทึก CPU ทุกตัวลง localStorage (ปิดหน้าเว็บแล้วเปิดใหม่ยังอยู่)
function saveProfiles() {
  storeFormInProfile();
  Profiles.save(app.profiles, app.activeIndex, app.nextNumber);
}

// ข้อมูลของ CPU ที่เลือกเปลี่ยน: อัปเดตการ์ดในแถบซ้าย หัวผลลัพธ์ หน้าเปรียบเทียบ CPU แล้วบันทึก
function refreshCpuSummary() {
  storeFormInProfile();
  updateActiveCpuCard();
  renderWorkspaceHeader();
  refreshCpuCompare(); // ใน compare.js — วาดใหม่เฉพาะตอนที่หน้าเปรียบเทียบเปิดอยู่
  saveProfiles();
}

// ทุกการแก้ข้อมูลในหน้าต่างโปรเซส: ผลเดิมไม่ตรงกับข้อมูลแล้ว + อัปเดตสรุปของ CPU
function onFormEdited() {
  markResultsStale();
  refreshCpuSummary();
}

// คำนวณผลของ CPU ที่เคย Run ไว้ใหม่จากชุด BT และค่า TQ ที่บันทึกไว้
// (Scheduler ให้ผลเหมือนเดิมทุกครั้งสำหรับข้อมูลชุดเดิม จึงไม่ต้องบันทึกตารางผลลัพธ์)
function restoreSavedRun(profile) {
  var savedRun = profile.savedRun;
  delete profile.savedRun;
  if (!savedRun) {
    return;
  }
  profile.burstTimes = savedRun.burstTimes;
  profile.results = computeResults(savedRun.burstTimes, savedRun.quantum);
  profile.rrHistory = [];
  var processes = buildProcesses(savedRun.burstTimes);
  for (var i = 0; i < savedRun.historyQuantums.length; i++) {
    addToRrHistory(profile, Scheduler.roundRobin(processes, savedRun.historyQuantums[i]));
  }
  addToRrHistory(profile, profile.results.RR);
}

// เปิดหน้าเว็บ: ใช้ CPU ที่บันทึกไว้ ถ้าไม่มี (เปิดครั้งแรก) สร้าง "CPU 1" ที่สุ่ม BT ไว้ให้
function loadProfiles() {
  var loaded = Profiles.load();
  if (loaded) {
    app.profiles = loaded.profiles;
    app.activeIndex = loaded.activeIndex;
    app.nextNumber = loaded.nextNumber;
    for (var i = 0; i < app.profiles.length; i++) {
      restoreSavedRun(app.profiles[i]);
    }
  } else {
    app.profiles = [Profiles.createProfile('CPU 1', randomBurstValues(NEW_CPU_PROCESS_COUNT))];
    app.activeIndex = 0;
    app.nextNumber = 2;
  }
  state = app.profiles[app.activeIndex];
}

// ---------- เปลี่ยนภาษา ----------

function onLanguageClick(event) {
  I18n.setLanguage(event.currentTarget.getAttribute('data-language'));
  refreshLanguage();
}

// ข้อความคงที่ i18n.js เปลี่ยนให้แล้ว ส่วนนี้เปลี่ยนข้อความที่ ui.js สร้างเอง (ข้อมูลโปรเซสและผลลัพธ์ไม่หาย)
function refreshLanguage() {
  closeColumnHelp(false);
  updateLanguageButtons();
  updateSidebarToggle();
  updateBurstNote();
  closeColorPopover(false);

  var burstInputs = getBurstInputs();
  for (var i = 0; i < burstInputs.length; i++) {
    burstInputs[i].setAttribute('aria-label', t('burstInputLabel', { id: 'P' + (i + 1) }));
  }
  var colorButtons = document.querySelectorAll('#burst-grid .color-button');
  for (var j = 0; j < colorButtons.length; j++) {
    paintColorButton(colorButtons[j]);
  }

  // ข้อความแจ้งเตือนเดิมเป็นภาษาเก่า จึงซ่อนไว้ (ช่องที่ผิดยังเป็นสีแดง กด Run อีกครั้งจะได้ข้อความภาษาใหม่)
  byId('error-box').hidden = true;

  renderCpuList();
  renderWorkspaceHeader();
  renderAlgorithmInfo();
  renderResults(true);
  refreshCpuCompare();
  refreshOpenDialogs(); // popup ที่เปิดอยู่ (เช่นหน้าตั้งค่า) เปลี่ยนภาษาตามทันที
}

function updateLanguageButtons() {
  var buttons = document.querySelectorAll('.language-option');
  for (var i = 0; i < buttons.length; i++) {
    var isActive = buttons[i].getAttribute('data-language') === I18n.getLanguage();
    buttons[i].setAttribute('aria-pressed', isActive ? 'true' : 'false');
  }
}

// ---------- ผูก event กับปุ่มต่าง ๆ ----------

// หน้าต่างโปรเซสเป็น <form> เดียว จึงกด Enter ในช่องกรอกใดก็ได้เพื่อ Run
// ทุกการแก้ข้อมูลในฟอร์มทำให้ผลลัพธ์เดิมไม่ตรงกับข้อมูล (กล่องเลือกสีอยู่นอกฟอร์ม จึงไม่นับการเปลี่ยนสี)
function bindConfigForm() {
  var form = byId('config-form');
  form.addEventListener('submit', function (event) {
    event.preventDefault(); // ไม่ให้ browser โหลดหน้าใหม่
    onRun();
  });
  form.addEventListener('input', onFormEdited);

  byId('process-count').addEventListener('input', onProcessCountInput);
  var stepButtons = document.querySelectorAll('[data-count-step]');
  for (var i = 0; i < stepButtons.length; i++) {
    stepButtons[i].addEventListener('click', onCountStepClick);
  }
  var algorithmOptions = document.querySelectorAll('.algorithm-option');
  for (var k = 0; k < algorithmOptions.length; k++) {
    algorithmOptions[k].addEventListener('click', onAlgorithmClick);
  }

  byId('reroll-button').addEventListener('click', fillRandomBurstTimes);
  byId('reset-colors-button').addEventListener('click', resetColors);
  byId('compare-button').addEventListener('click', onCompareClick);
}

function bindColorPopover() {
  byId('custom-color').addEventListener('input', onCustomColorInput);
  document.addEventListener('mousedown', onDocumentMouseDown);
  document.addEventListener('mousedown', onColumnHelpOutsideClick);
  document.addEventListener('keydown', onDocumentKeydown);
  window.addEventListener('resize', function () {
    closeColorPopover(false);
    closeColumnHelp(false);
    hideGanttTooltip();
  });
  window.addEventListener('scroll', function () {
    hideGanttTooltip();
    onPopoverAnchorScroll();
    onColumnHelpScroll();
  });
  byId('cpu-list').addEventListener('scroll', onPopoverAnchorScroll);
}

// ---------- ซ่อน/แสดงแถบ CPU (กดที่โลโก้) ----------
// เหมือนแถบแชตของแอป AI: ซ่อนแล้วเหลือแถบแคบที่มีแค่โลโก้ พื้นที่ผลลัพธ์จึงกว้างขึ้น
// สถานะจำไว้ในเครื่อง (localStorage) — ถ้าเครื่องปิด localStorage ไว้ก็ยังกดซ่อน/แสดงได้ตามปกติ

var SIDEBAR_STORAGE_KEY = 'cpu-scheduler-sidebar';

function isSidebarCollapsed() {
  return document.body.classList.contains('sidebar-collapsed');
}

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  updateSidebarToggle();
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? 'collapsed' : 'open');
  } catch (error) {
    // จำค่าไม่ได้ก็ไม่เป็นไร แถบยังซ่อน/แสดงในหน้านี้ตามปกติ
  }
}

// ข้อความของปุ่มโลโก้บอกสิ่งที่จะเกิดเมื่อกด (เรียกซ้ำตอนเปลี่ยนภาษา)
function updateSidebarToggle() {
  var button = byId('sidebar-toggle');
  var label = t(isSidebarCollapsed() ? 'sidebarShow' : 'sidebarHide');
  button.setAttribute('aria-expanded', isSidebarCollapsed() ? 'false' : 'true');
  button.setAttribute('aria-label', label);
  button.title = label;
}

function onSidebarToggleClick(event) {
  var button = event.currentTarget;
  var collapsing = !isSidebarCollapsed();
  closeColorPopover(false);
  // หมุนโลโก้หนึ่งรอบ: ตอนซ่อนหมุนทวนเข็ม ตอนแสดงหมุนตามเข็ม
  // ลบ class เดิมแล้วอ่าน offsetWidth ก่อนใส่ใหม่ เพื่อบังคับให้ browser เริ่มหมุนใหม่แม้กดรัว ๆ
  button.classList.remove('spin-open', 'spin-close');
  void button.offsetWidth;
  button.classList.add(collapsing ? 'spin-close' : 'spin-open');
  setSidebarCollapsed(collapsing);
}

// ตอนเปิดหน้า: ใช้สถานะเดิมทันทีโดยไม่เล่น animation (ไม่อย่างนั้นแถบจะยุบให้เห็นทุกครั้งที่เปิดหน้า)
function restoreSidebarState() {
  var saved = null;
  try {
    saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  } catch (error) {
    saved = null;
  }
  document.body.classList.add('sidebar-instant');
  document.body.classList.toggle('sidebar-collapsed', saved === 'collapsed');
  updateSidebarToggle();
  // รอให้ browser วาดสถานะแรกเสร็จ (2 เฟรม) แล้วจึงเปิด animation กลับมา
  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () {
      document.body.classList.remove('sidebar-instant');
    });
  });
}

function bindCpuControls() {
  byId('sidebar-toggle').addEventListener('click', onSidebarToggleClick);
  byId('sidebar-toggle').addEventListener('animationend', function (event) {
    event.currentTarget.classList.remove('spin-open', 'spin-close');
  });
  byId('add-cpu-button').addEventListener('click', onAddCpu);
  byId('cpu-details-button').addEventListener('click', function () {
    openCpuDialog(app.activeIndex);
  });
  byId('settings-button').addEventListener('click', openSettingsDialog); // อยู่ใน modals.js
}

function init() {
  // ใส่ข้อความตามภาษาที่เคยเลือกไว้ก่อนผูก event อื่น
  I18n.applyToPage();
  updateLanguageButtons();
  updateBurstNote();
  var languageButtons = document.querySelectorAll('.language-option');
  for (var i = 0; i < languageButtons.length; i++) {
    languageButtons[i].addEventListener('click', onLanguageClick);
  }

  bindConfigForm();
  bindColorPopover();
  bindCpuControls();
  bindDialogs(); // อยู่ใน modals.js
  bindCpuCompare(); // อยู่ใน compare.js
  restoreSidebarState();

  // ใช้ CPU ที่บันทึกไว้ (หรือสร้าง CPU 1 ใหม่) แล้วแสดง CPU ที่เลือกไว้ล่าสุด
  loadProfiles();
  showProfile();
  renderCpuList();
  saveProfiles();
}

init();
