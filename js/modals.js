/*
 * modals.js — popup (รายละเอียด CPU / วิธีทำงานของอัลกอริทึม / ตั้งค่า) (Role B)
 *
 * ใช้แท็ก <dialog> ของ browser: showModal() เปิดเป็นชั้นบนสุด กด Esc ปิดได้ และโฟกัสอยู่ใน popup ระหว่างเปิด
 * ภาพประกอบใน popup วาดเป็น SVG จากข้อมูลจริง (BT ของ CPU และผลจาก Scheduler) ไม่ใช่ภาพตกแต่งเฉย ๆ
 *
 * ไฟล์นี้ไม่คำนวณ ST / CT / TAT / WT เอง และใช้ตัวแปร/ฟังก์ชันที่ประกาศใน ui.js (app, state, t, createElement ฯลฯ)
 * ฟังก์ชันใน ui.js จะถูกเรียกตอนกดปุ่มเท่านั้น (หลังโหลดครบทุกไฟล์แล้ว) จึงโหลดไฟล์นี้ก่อน ui.js ได้
 */

// popup ที่เปิดอยู่กำลังแสดงอะไร (ใช้วาดใหม่เมื่อเปลี่ยนภาษา)
var dialogState = {
  cpuIndex: null,   // CPU ที่เปิดดูใน popup รายละเอียด
  algorithm: null   // อัลกอริทึมที่เปิดดูใน popup วิธีทำงาน
};

// ข้อความขั้นตอนการทำงานของแต่ละอัลกอริทึม (ชื่อข้อความใน i18n.js)
var ALGORITHM_STEPS = {
  FCFS: ['stepFCFS1', 'stepFCFS2', 'stepFCFS3'],
  SJF: ['stepSJF1', 'stepSJF2', 'stepSJF3'],
  RR: ['stepRR1', 'stepRR2', 'stepRR3']
};

// ---------- ตัวช่วยของ popup ----------

function openDialog(dialog) {
  if (!dialog.open) {
    dialog.showModal();
  }
}

// หัว popup: ป้ายเล็ก + หัวข้อ + ปุ่มปิด (ทุก popup ใช้รูปแบบเดียวกัน)
function createModalHead(eyebrow, title, titleId) {
  var head = createElement('div', 'modal-head');
  var heading = createElement('div');
  heading.appendChild(createElement('p', 'eyebrow', eyebrow));
  var titleElement = createElement('h2', 'modal-title', title);
  titleElement.id = titleId;
  heading.appendChild(titleElement);
  head.appendChild(heading);

  var close = createElement('button', 'icon-button modal-close');
  close.type = 'button';
  close.setAttribute('data-close-dialog', '');
  close.setAttribute('aria-label', t('closeDialog'));
  close.appendChild(createIcon('close'));
  head.appendChild(close);
  return head;
}

// สร้าง element ของ SVG (ภาพประกอบ) พร้อม attribute
function svgElement(tag, attributes) {
  var element = document.createElementNS(SVG_NAMESPACE, tag);
  var names = Object.keys(attributes);
  for (var i = 0; i < names.length; i++) {
    element.setAttribute(names[i], attributes[names[i]]);
  }
  return element;
}

// ไล่สีของโปรเซสในภาพ SVG (D-044) ให้เหมือนแถบ Gantt: สร้าง <linearGradient> แล้วคืนค่า fill ที่ชี้ไปหามัน
// สีปลายที่อ่อนกว่าคำนวณใน CSS (.figure-gradient ใน style.css) สูตรเดียวกับ --process-fill
var figureGradientCount = 0; // นับไว้ตั้ง id ไม่ให้ซ้ำกัน แม้มีหลายภาพในหน้าเดียว

function gradientFill(svg, color) {
  figureGradientCount += 1;
  var id = 'figure-gradient-' + figureGradientCount;
  // x1,y1 → x2,y2 = มุมซ้ายบน → มุมขวาล่างของแท่ง (ทิศเดียวกับ 135deg ใน CSS)
  var gradient = svgElement('linearGradient', { id: id, 'class': 'figure-gradient', x1: 0, y1: 0, x2: 1, y2: 1,
    style: '--process-color: ' + color });
  gradient.appendChild(svgElement('stop', { offset: 0, 'class': 'gradient-start' }));
  gradient.appendChild(svgElement('stop', { offset: 1, 'class': 'gradient-end' }));
  svg.appendChild(gradient);
  return 'url(#' + id + ')';
}

function svgText(x, y, text, className) {
  var element = svgElement('text', { x: x, y: y, 'class': className, 'text-anchor': 'middle' });
  element.textContent = text;
  return element;
}

// กรอบภาพประกอบ + คำบรรยายใต้ภาพ
function createFigure(svg, captionText) {
  var figure = createElement('figure', 'modal-figure');
  figure.appendChild(svg);
  figure.appendChild(createElement('figcaption', '', captionText));
  return figure;
}

// ---------- popup รายละเอียด CPU ----------

function openCpuDialog(index) {
  storeFormInProfile(); // ถ้าเปิดดู CPU ที่เลือกอยู่ ให้เห็นค่าที่เพิ่งพิมพ์
  dialogState.cpuIndex = index;
  renderCpuDialog();
  openDialog(byId('cpu-dialog'));
}

function renderCpuDialog() {
  var index = dialogState.cpuIndex;
  var profile = app.profiles[index];
  var dialog = byId('cpu-dialog');
  dialog.textContent = '';
  dialog.className = 'modal accent-' + (index % 4);

  var panel = createElement('div', 'modal-panel');
  panel.appendChild(createModalHead(t('cpuDialogEyebrow'), profile.name, 'cpu-dialog-title'));
  panel.appendChild(createRenameForm(index)); // ไว้ใต้หัวข้อ เปลี่ยนชื่อได้ทันทีโดยไม่ต้องเลื่อนลงไปท้าย popup (D-038)
  panel.appendChild(createFigure(createBurstChart(profile),
    t('cpuFigureCaption', { count: profile.burstValues.length })));
  panel.appendChild(createCpuFacts(profile));
  panel.appendChild(createLastRunSummary(profile));
  panel.appendChild(createCpuActions(index));
  dialog.appendChild(panel);
}

// ภาพกราฟแท่ง BT ของแต่ละโปรเซส (สีตามโปรเซส) — ช่องที่ยังว่างหรือกรอกผิดเป็นแท่งเตี้ยสีจาง
function createBurstChart(profile) {
  var count = profile.burstValues.length;
  var width = 360;
  var height = 170;
  var chartTop = 22;
  var chartBottom = height - 26;
  var slot = (width - 24) / count;
  var max = 1;
  for (var i = 0; i < count; i++) {
    max = Math.max(max, Number(profile.burstValues[i]) || 0);
  }

  var svg = svgElement('svg', { viewBox: '0 0 ' + width + ' ' + height, 'class': 'figure-svg', role: 'img',
    'aria-label': t('cpuFigureCaption', { count: count }) });
  svg.appendChild(svgElement('line', { x1: 12, y1: chartBottom, x2: width - 12, y2: chartBottom, 'class': 'figure-axis' }));
  for (var j = 0; j < count; j++) {
    var value = Number(profile.burstValues[j]) || 0;
    var barHeight = Math.max(4, (value / max) * (chartBottom - chartTop));
    var x = 12 + j * slot + slot * 0.15;
    svg.appendChild(svgElement('rect', { x: x, y: chartBottom - barHeight, width: slot * 0.7, height: barHeight,
      rx: Math.min(6, slot * 0.2), fill: gradientFill(svg, colorOf(profile, j)), 'class': value > 0 ? 'figure-bar' : 'figure-bar is-empty' }));
    // ชื่อและค่าแสดงเมื่อมีที่พอ (ไม่เกิน 12 โปรเซส) ถ้าเยอะกว่านั้นดูค่าได้ในการ์ดโปรเซส
    if (count <= 12) {
      svg.appendChild(svgText(x + slot * 0.35, chartBottom - barHeight - 6, profile.burstValues[j] || '–', 'figure-value'));
      svg.appendChild(svgText(x + slot * 0.35, height - 8, 'P' + (j + 1), 'figure-label'));
    }
  }
  return svg;
}

// จำนวนโปรเซส / TQ / สถานะ
function createCpuFacts(profile) {
  var status = cpuStatus(profile);
  var facts = [
    [t('factProcesses'), String(profile.burstValues.length)],
    [t('factQuantum'), profile.quantumText],
    [t('factStatus'), t(STATUS_TEXT[status])]
  ];
  var list = createElement('dl', 'modal-facts');
  for (var i = 0; i < facts.length; i++) {
    var item = createElement('div', 'modal-fact');
    item.appendChild(createElement('dt', '', facts[i][0]));
    item.appendChild(createElement('dd', i === facts.length - 1 ? 'status-text is-' + status : '', facts[i][1]));
    list.appendChild(item);
  }
  return list;
}

// ค่าเฉลี่ยของ Run ล่าสุด (ตัวเลขทั้งหมดมาจาก Scheduler ที่เก็บไว้ใน profile.results)
function createLastRunSummary(profile) {
  var section = createElement('section', 'modal-section');
  section.appendChild(createElement('h3', 'modal-section-title', t('lastRunTitle')));
  if (profile.results === null) {
    section.appendChild(createElement('p', 'hint', t('lastRunNone')));
    return section;
  }
  var results = [profile.results.FCFS, profile.results.SJF, profile.results.RR];
  var lowest = lowestOf(results, 'averageWaitingTime');
  var rows = [];
  for (var i = 0; i < results.length; i++) {
    rows.push({ label: algorithmLabel(results[i]), result: results[i], isBest: results[i].averageWaitingTime === lowest });
  }
  section.appendChild(createCompareTable(t('algorithmHeader'), rows));
  if (profile.isStale) {
    section.appendChild(createElement('p', 'hint warning-text', t('lastRunStale')));
  }
  return section;
}

// เปลี่ยนชื่อ: กด Enter หรือปุ่มบันทึก (ชื่อว่างจะใช้ชื่อเดิม ตัดความยาวเกิน 24 ตัวอักษร)
function createRenameForm(index) {
  var form = createElement('form', 'rename-form');
  var label = createElement('label', '', t('renameLabel'));
  label.htmlFor = 'cpu-rename-input';
  var input = document.createElement('input');
  input.type = 'text';
  input.id = 'cpu-rename-input';
  input.autocomplete = 'off';
  input.maxLength = Profiles.MAX_NAME_LENGTH;
  input.value = app.profiles[index].name;
  var save = createElement('button', 'button ghost', t('renameSave'));
  save.type = 'submit';

  form.appendChild(label);
  var row = createElement('div', 'rename-row');
  row.appendChild(input);
  row.appendChild(save);
  form.appendChild(row);
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    renameCpuAt(index, input.value);
    renderCpuDialog();
    byId('cpu-rename-input').focus();
  });
  return form;
}

// ปุ่มด้านล่าง: เปิด CPU นี้ / ทำสำเนา / ลบ (ลบต้องยืนยันอีกครั้งในกล่องที่ขึ้นมา)
function createCpuActions(index) {
  var wrapper = createElement('div', 'modal-actions-wrap');
  var actions = createElement('div', 'modal-actions');
  var isActive = index === app.activeIndex;

  var open = createActionButton('open', isActive ? 'currentCpu' : 'openCpu', 'button primary');
  open.disabled = isActive;
  open.addEventListener('click', function () {
    switchToProfile(index);
    byId('cpu-dialog').close();
  });
  var duplicate = createActionButton('copy', 'duplicateCpu', 'button ghost');
  duplicate.disabled = app.profiles.length >= Profiles.MAX_PROFILES;
  duplicate.addEventListener('click', function () {
    duplicateCpuAt(index);
    byId('cpu-dialog').close();
  });
  var remove = createActionButton('trash', 'deleteCpu', 'button ghost danger');
  remove.disabled = app.profiles.length <= 1;

  actions.appendChild(remove);
  actions.appendChild(duplicate);
  actions.appendChild(open);
  wrapper.appendChild(actions);
  var confirmBox = createDeleteConfirm(index);
  wrapper.appendChild(confirmBox);
  remove.addEventListener('click', function () {
    confirmBox.hidden = false;
    confirmBox.querySelector('button').focus();
  });
  return wrapper;
}

function createActionButton(icon, textKey, className) {
  var button = createElement('button', className);
  button.type = 'button';
  button.appendChild(createIcon(icon));
  button.appendChild(createElement('span', '', t(textKey)));
  return button;
}

// กล่องยืนยันการลบ (ซ่อนไว้จนกดปุ่มลบ) — ลบแล้วย้อนกลับไม่ได้
function createDeleteConfirm(index) {
  var box = createElement('div', 'confirm-box');
  box.setAttribute('role', 'alert');
  box.hidden = true;
  box.appendChild(createElement('p', '', t('deleteConfirm', { name: app.profiles[index].name })));
  var buttons = createElement('div', 'confirm-actions');
  var cancel = createElement('button', 'button ghost small', t('cancel'));
  cancel.type = 'button';
  cancel.addEventListener('click', function () {
    box.hidden = true;
  });
  var confirm = createElement('button', 'button danger-solid small', t('confirmDelete'));
  confirm.type = 'button';
  confirm.addEventListener('click', function () {
    byId('cpu-dialog').close();
    deleteCpuAt(index);
  });
  buttons.appendChild(cancel);
  buttons.appendChild(confirm);
  box.appendChild(buttons);
  return box;
}

// ---------- popup วิธีทำงานของอัลกอริทึม ----------

function openAlgorithmDialog(algorithm) {
  dialogState.algorithm = algorithm;
  renderAlgorithmDialog();
  openDialog(byId('algorithm-dialog'));
}

// ภาพประกอบใช้ผล Run จริงของ CPU ที่เลือก ถ้ายังไม่ได้ Run ให้ Scheduler คำนวณข้อมูลตัวอย่าง TC-01 แล้วบอกไว้ชัด ๆ
function figureSource(algorithm) {
  if (state.results !== null) {
    return { result: state.results[algorithm], color: processColor, caption: t('figureFromCpu', { name: state.name }) };
  }
  var example = computeResults(EXAMPLE_BURST_TIMES, Validation.LIMITS.defaultQuantum)[algorithm];
  return {
    result: example,
    color: function (processId) {
      return defaultColor(processIndex(processId));
    },
    caption: t('figureFromExample')
  };
}

function renderAlgorithmDialog() {
  var algorithm = dialogState.algorithm;
  var facts = ALGORITHM_FACTS[algorithm];
  var source = figureSource(algorithm);
  var dialog = byId('algorithm-dialog');
  dialog.textContent = '';

  var panel = createElement('div', 'modal-panel');
  panel.appendChild(createModalHead(t('algoDialogEyebrow'), ALGORITHM_TITLES[algorithm], 'algorithm-dialog-title'));
  panel.appendChild(createElement('p', 'pill-row', t(facts.type)));
  panel.appendChild(createFigure(createQueueFigure(source), t('queueFigureTitle') + ' — ' + source.caption));
  panel.appendChild(createFigure(createMiniGantt(source), t('ganttFigureTitle')));

  var steps = createElement('ol', 'modal-steps');
  for (var i = 0; i < ALGORITHM_STEPS[algorithm].length; i++) {
    steps.appendChild(createElement('li', '', t(ALGORITHM_STEPS[algorithm][i])));
  }
  var stepSection = createElement('section', 'modal-section');
  stepSection.appendChild(createElement('h3', 'modal-section-title', t('stepsTitle')));
  stepSection.appendChild(steps);
  panel.appendChild(stepSection);

  var list = createElement('dl', 'modal-facts two-columns');
  var labels = ['algoStrengthLabel', 'algoLimitLabel'];
  var values = [facts.strength, facts.limit];
  for (var j = 0; j < labels.length; j++) {
    var item = createElement('div', 'modal-fact');
    item.appendChild(createElement('dt', '', t(labels[j])));
    item.appendChild(createElement('dd', '', t(values[j])));
    list.appendChild(item);
  }
  panel.appendChild(list);
  dialog.appendChild(panel);
}

// ลำดับที่โปรเซสได้ CPU ครั้งแรก (ดูจาก Gantt) → CPU
// RR มีลูกศรวนกลับ เพราะโปรเซสที่ยังไม่เสร็จต้องกลับไปต่อท้ายคิว
function createQueueFigure(source) {
  var order = [];
  for (var i = 0; i < source.result.gantt.length; i++) {
    if (order.indexOf(source.result.gantt[i].id) === -1) {
      order.push(source.result.gantt[i].id);
    }
  }
  var shown = order.slice(0, 7); // แสดงไม่เกิน 7 กล่อง ถ้าเยอะกว่านั้นใส่ "…"
  var width = 380;
  var height = source.result.algorithm === 'RR' ? 130 : 96;
  var svg = svgElement('svg', { viewBox: '0 0 ' + width + ' ' + height, 'class': 'figure-svg', role: 'img',
    'aria-label': t('queueFigureTitle') + ': ' + order.join(', ') });

  svg.appendChild(svgText(130, 16, t('readyQueue'), 'figure-label'));
  for (var j = 0; j < shown.length; j++) {
    var x = 8 + j * 36;
    svg.appendChild(svgElement('rect', { x: x, y: 28, width: 30, height: 34, rx: 7, fill: gradientFill(svg, source.color(shown[j])), 'class': 'figure-bar' }));
    var label = svgText(x + 15, 50, shown[j], 'figure-chip-text');
    svg.appendChild(label);
  }
  if (order.length > shown.length) {
    svg.appendChild(svgText(8 + shown.length * 36 + 8, 50, '…', 'figure-label'));
  }
  svg.appendChild(svgElement('path', { d: 'M266 45h34 M292 38l8 7-8 7', 'class': 'figure-arrow' }));
  svg.appendChild(svgElement('rect', { x: 306, y: 18, width: 66, height: 54, rx: 12, 'class': 'figure-cpu' }));
  svg.appendChild(svgText(339, 50, 'CPU', 'figure-cpu-text'));
  if (source.result.algorithm === 'RR') {
    svg.appendChild(svgElement('path', { d: 'M339 72v30H130v-30 M123 80l7-8 7 8', 'class': 'figure-arrow dashed' }));
    svg.appendChild(svgText(234, 120, t('rrLoopLabel', { quantum: source.result.quantum }), 'figure-label'));
  }
  return svg;
}

// Gantt chart ย่อ: ความกว้างของแต่ละช่วงตามเวลาจริง ตัวเลขใต้แถบคือเวลาเริ่มของแต่ละช่วงและเวลาจบ
function createMiniGantt(source) {
  var gantt = source.result.gantt;
  var total = gantt[gantt.length - 1].end;
  var width = 380;
  var scale = (width - 20) / total;
  var svg = svgElement('svg', { viewBox: '0 0 ' + width + ' 74', 'class': 'figure-svg', role: 'img',
    'aria-label': t('ganttFigureTitle') });
  for (var i = 0; i < gantt.length; i++) {
    var x = 10 + gantt[i].start * scale;
    var slotWidth = (gantt[i].end - gantt[i].start) * scale;
    var color = source.color(gantt[i].id);
    svg.appendChild(svgElement('rect', { x: x + 1, y: 10, width: Math.max(1, slotWidth - 2), height: 32, rx: 6, fill: gradientFill(svg, color), 'class': 'figure-bar' }));
    if (slotWidth >= 24) {
      var label = svgText(x + slotWidth / 2, 31, gantt[i].id, 'figure-chip-text');
      svg.appendChild(label);
    }
    if (gantt.length <= 14) {
      svg.appendChild(svgText(x, 62, String(gantt[i].start), 'figure-label'));
    }
  }
  svg.appendChild(svgText(width - 10, 62, String(total), 'figure-label'));
  return svg;
}

// ---------- popup ตั้งค่า ----------

function openSettingsDialog() {
  byId('reset-confirm').hidden = true;
  openDialog(byId('settings-dialog'));
}

function bindSettingsDialog() {
  var confirmBox = byId('reset-confirm');
  byId('reset-data-button').addEventListener('click', function () {
    confirmBox.hidden = false;
    byId('reset-cancel-button').focus();
  });
  byId('reset-cancel-button').addEventListener('click', function () {
    confirmBox.hidden = true;
    byId('reset-data-button').focus();
  });
  byId('reset-confirm-button').addEventListener('click', function () {
    confirmBox.hidden = true;
    byId('settings-dialog').close();
    resetAllCpus(); // อยู่ใน ui.js
  });
}

// ---------- ผูก event ของทุก popup ----------

// ปุ่มที่มี data-close-dialog ปิด popup / คลิกพื้นหลังมืดนอกกล่อง (ตัว <dialog> เอง) ก็ปิด popup
function bindDialogs() {
  var dialogs = document.querySelectorAll('dialog.modal');
  for (var i = 0; i < dialogs.length; i++) {
    dialogs[i].addEventListener('click', onDialogClick);
  }
  byId('cpu-dialog').addEventListener('close', function () {
    dialogState.cpuIndex = null;
  });
  byId('algorithm-dialog').addEventListener('close', function () {
    dialogState.algorithm = null;
  });
  bindSettingsDialog();
}

function onDialogClick(event) {
  var dialog = event.currentTarget;
  if (event.target === dialog || event.target.closest('[data-close-dialog]')) {
    dialog.close();
  }
}

// เปลี่ยนภาษาขณะ popup เปิดอยู่: วาดเนื้อหาใหม่ด้วยภาษาใหม่ (หน้าตั้งค่าใช้ data-i18n จึงเปลี่ยนเองแล้ว)
function refreshOpenDialogs() {
  if (dialogState.cpuIndex !== null && byId('cpu-dialog').open) {
    renderCpuDialog();
  }
  if (dialogState.algorithm !== null && byId('algorithm-dialog').open) {
    renderAlgorithmDialog();
  }
}
