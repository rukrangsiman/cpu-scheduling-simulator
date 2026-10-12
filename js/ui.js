/*
 * ui.js — ส่วนติดต่อผู้ใช้ (Role B)
 *
 * ขั้นตอนหลัก: อ่านค่าจากหน้าเว็บ → ตรวจด้วย Validation → คำนวณด้วย Scheduler → แสดงผล
 * ไฟล์นี้ไม่คำนวณ ST / CT / TAT / WT เอง ทุกตัวเลขในตารางมาจาก Scheduler
 *
 * ต้องโหลด scheduler.js และ validation.js ก่อนไฟล์นี้ (ดูท้าย index.html)
 */

// ---------- สถานะของโปรแกรม ----------

var state = {
  burstTimes: null,   // ชุด BT ที่ใช้คำนวณครั้งล่าสุด เช่น [5, 3, 8, 6]
  results: null,      // { FCFS: ..., SJF: ..., RR: ... } ผลจาก Scheduler
  rrHistory: [],      // ผล RR ของหลายค่า TQ บนชุดข้อมูลเดียวกัน ใช้ในแท็บเปรียบเทียบ
  activeTab: 'FCFS',
  showFormulas: false
};

// ข้อมูลตัวอย่าง TC-01 ใน docs/TEST_CASES.md
var EXAMPLE_BURST_TIMES = [5, 3, 8, 6];

var ALGORITHM_TITLES = {
  FCFS: 'First-Come, First-Served (FCFS)',
  SJF: 'Shortest Job First (SJF) — Non-preemptive',
  RR: 'Round Robin (RR)'
};

// ---------- ตัวช่วยเล็ก ๆ ----------

function byId(id) {
  return document.getElementById(id);
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

// สีของแต่ละโปรเซสใน Gantt: หมุนเฉดสีทีละ 137.5 องศา (golden angle) ทำให้ 20 โปรเซสสีไม่ซ้ำกัน
function processHue(processId) {
  var index = Number(processId.slice(1)) - 1;
  return Math.round((index * 137.5 + 210) % 360);
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

// ---------- ข้อความแจ้งเตือน ----------

function showErrors(messages) {
  var list = byId('error-list');
  list.textContent = '';
  for (var i = 0; i < messages.length; i++) {
    list.appendChild(createElement('li', '', messages[i]));
  }
  var box = byId('error-box');
  box.hidden = false;
  // กล่องแจ้งเตือนอยู่ใต้ปุ่มคำนวณ บนจอเล็กอาจมองไม่เห็น จึงเลื่อนหน้าให้เห็นกล่องนี้
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

// ---------- ตาราง Burst Time ----------

function getBurstInputs() {
  return Array.prototype.slice.call(document.querySelectorAll('#burst-grid input'));
}

function getBurstMode() {
  return document.querySelector('input[name="burst-mode"]:checked').value; // 'random' หรือ 'manual'
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

// สร้างช่องกรอก BT ของ P1..Pn
function buildBurstGrid(count) {
  var grid = byId('burst-grid');
  grid.textContent = '';

  for (var i = 0; i < count; i++) {
    var processId = 'P' + (i + 1);
    var item = createElement('div', 'burst-item');

    var label = createElement('label', '', processId);
    label.htmlFor = 'bt-' + processId;

    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'bt-' + processId;
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Burst Time ของ ' + processId);

    item.appendChild(label);
    item.appendChild(input);
    grid.appendChild(item);
  }

  byId('burst-section').hidden = false;
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

  if (isRandom && inputs.length > 0) {
    fillRandomBurstTimes();
  }
}

function onBuildTable() {
  clearErrors();
  var countInput = byId('process-count');
  var countResult = Validation.validateProcessCount(countInput.value);
  if (!countResult.ok) {
    markInvalid(countInput);
    showErrors([countResult.message]);
    return;
  }
  buildBurstGrid(countResult.value);
  markResultsStale();

  var firstInput = getBurstInputs()[0];
  if (getBurstMode() === 'manual' && firstInput) {
    firstInput.focus();
  }
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

// ---------- คำนวณ ----------

function onCalculate() {
  clearErrors();
  var messages = [];

  // 1) จำนวนโปรเซส
  var countInput = byId('process-count');
  var countResult = Validation.validateProcessCount(countInput.value);
  if (!countResult.ok) {
    markInvalid(countInput);
    messages.push(countResult.message);
  }

  // 2) Burst Time — ถ้าเปลี่ยนจำนวนโปรเซสแต่ยังไม่กดสร้างตาราง จำนวนช่องจะไม่ตรง
  var burstInputs = getBurstInputs();
  if (countResult.ok && burstInputs.length > 0 && burstInputs.length !== countResult.value) {
    markInvalid(countInput);
    messages.push('จำนวนโปรเซสเป็น ' + countResult.value + ' แต่ตารางมี ' + burstInputs.length +
      ' ช่อง กรุณากด "สร้างตาราง" อีกครั้ง');
  }

  var burstTexts = [];
  for (var i = 0; i < burstInputs.length; i++) {
    burstTexts.push(burstInputs[i].value);
  }
  var burstResult = Validation.validateBurstTimes(burstTexts);
  if (!burstResult.ok) {
    messages = messages.concat(burstResult.message.split('\n'));
    var invalidIndexes = burstResult.invalidIndexes || [];
    for (var j = 0; j < invalidIndexes.length; j++) {
      markInvalid(burstInputs[invalidIndexes[j]]);
    }
  }

  // 3) Time Quantum
  var quantumInput = byId('quantum');
  var quantumResult = Validation.validateQuantum(quantumInput.value);
  if (!quantumResult.ok) {
    markInvalid(quantumInput);
    messages.push(quantumResult.message);
  }

  // แสดงข้อผิดพลาดทุกข้อพร้อมกัน ผู้ใช้จะได้แก้ครั้งเดียว
  if (messages.length > 0) {
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

  renderResults();
  byId('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
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

// ---------- แสดงผล ----------

function renderResults() {
  byId('results').hidden = false;
  byId('stale-note').hidden = true;
  byId('rr-tab').textContent = 'Round Robin (TQ = ' + state.results.RR.quantum + ')';
  renderDataset();
  selectTab(state.activeTab);
}

function renderDataset() {
  var chips = byId('dataset-chips');
  chips.textContent = '';
  var total = 0;
  for (var i = 0; i < state.burstTimes.length; i++) {
    chips.appendChild(createElement('span', 'chip', 'P' + (i + 1) + ' = ' + state.burstTimes[i]));
    total += state.burstTimes[i];
  }
  chips.appendChild(createElement('span', 'chip total', 'รวม BT = ' + total));
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
    return 'มาก่อนได้ก่อน: ทุกโปรเซสมาถึงพร้อมกัน (AT = 0) จึงได้ CPU ตามลำดับ P1 → Pn และรันจนเสร็จทีละโปรเซส';
  }
  if (result.algorithm === 'SJF') {
    return 'งานสั้นได้ก่อน: เลือกโปรเซสที่ BT น้อยที่สุดก่อนและรันจนเสร็จ ถ้า BT เท่ากันให้หมายเลขน้อยกว่าได้ก่อน';
  }
  return 'ผลัดกันใช้ CPU ครั้งละไม่เกิน ' + result.quantum +
    ' หน่วยเวลา ถ้ายังไม่เสร็จให้กลับไปต่อท้ายคิว ST คือเวลาที่ได้ CPU ครั้งแรก';
}

function renderAlgorithmPanel(panel, result) {
  panel.appendChild(createElement('h3', '', ALGORITHM_TITLES[result.algorithm]));
  panel.appendChild(createElement('p', 'description', describeAlgorithm(result)));

  var order = [];
  for (var i = 0; i < result.gantt.length; i++) {
    order.push(result.gantt[i].id);
  }
  panel.appendChild(createElement('p', 'order', 'ลำดับการได้ CPU: ' + order.join(' → ')));

  panel.appendChild(createElement('h4', '', 'Gantt Chart'));
  panel.appendChild(createGanttChart(result.gantt));

  panel.appendChild(createElement('h4', '', 'ตารางผลลัพธ์'));
  panel.appendChild(createResultTable(result));
  panel.appendChild(createSummary(result));
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
    block.style.setProperty('--hue', String(processHue(slot.id)));
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
    ['Process', 'ชื่อโปรเซส'],
    ['AT', 'Arrival Time — เวลาที่มาถึง'],
    ['BT', 'Burst Time — เวลาที่ต้องใช้ CPU'],
    ['ST', 'Start Time — เวลาที่ได้ CPU ครั้งแรก'],
    ['CT', 'Completion Time — เวลาที่ทำงานเสร็จ'],
    ['TAT', 'Turnaround Time = CT − AT'],
    ['WT', 'Waiting Time = TAT − BT']
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
    tr.appendChild(createElement('td', '', row.id));
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
  var label = createElement('td', '', 'ค่าเฉลี่ย');
  label.colSpan = 5;
  footRow.appendChild(label);
  footRow.appendChild(createElement('td', '', formatAverage(result.averageTurnaroundTime)));
  footRow.appendChild(createElement('td', '', formatAverage(result.averageWaitingTime)));
  tfoot.appendChild(footRow);
  table.appendChild(tfoot);

  wrapper.appendChild(table);
  return wrapper;
}

// กล่องสรุป AVG WT / AVG TAT พร้อมแสดงที่มาของตัวเลข เช่น (0 + 5 + 8 + 16) ÷ 4 = 7.25
function createSummary(result) {
  var summary = createElement('div', 'summary');
  summary.appendChild(createStat('AVG WT (Average Waiting Time)', result, 'waitingTime', result.averageWaitingTime));
  summary.appendChild(createStat('AVG TAT (Average Turnaround Time)', result, 'turnaroundTime', result.averageTurnaroundTime));
  return summary;
}

function createStat(title, result, key, average) {
  var values = [];
  for (var i = 0; i < result.rows.length; i++) {
    values.push(result.rows[i][key]);
  }

  var stat = createElement('div', 'stat');
  stat.appendChild(createElement('div', 'stat-label', title));
  stat.appendChild(createElement('div', 'stat-value', formatAverage(average)));
  stat.appendChild(createElement('div', 'stat-formula',
    '(' + values.join(' + ') + ') ÷ ' + values.length + ' = ' + formatAverage(average)));
  return stat;
}

// ---------- แท็บเปรียบเทียบ ----------

function renderComparePanel(panel) {
  var results = [state.results.FCFS, state.results.SJF, state.results.RR];

  panel.appendChild(createElement('h3', '', 'เปรียบเทียบ 3 อัลกอริทึม (ชุดข้อมูลเดียวกัน)'));

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
  panel.appendChild(createElement('h4', '', 'AVG WT (ยิ่งน้อยยิ่งดี)'));
  panel.appendChild(createBarChart(labels, averages));

  var rows = [];
  for (var k = 0; k < results.length; k++) {
    rows.push({
      label: algorithmLabel(results[k]),
      result: results[k],
      isBest: results[k].averageWaitingTime === lowest
    });
  }
  panel.appendChild(createElement('h4', '', 'สรุปค่าเฉลี่ย'));
  panel.appendChild(createCompareTable('อัลกอริทึม', rows));

  var bestNames = [];
  for (var m = 0; m < rows.length; m++) {
    if (rows[m].isBest) {
      bestNames.push(rows[m].label);
    }
  }
  panel.appendChild(createElement('p', 'note',
    'AVG WT ต่ำสุดสำหรับชุดข้อมูลนี้: ' + bestNames.join(', ') + ' (' + formatAverage(lowest) + ')'));

  renderRrHistory(panel);
}

function algorithmLabel(result) {
  if (result.algorithm === 'RR') {
    return 'RR (TQ = ' + result.quantum + ')';
  }
  return result.algorithm;
}

function renderRrHistory(panel) {
  panel.appendChild(createElement('h4', '', 'Round Robin เมื่อเปลี่ยน Time Quantum'));

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
  panel.appendChild(createCompareTable('Time Quantum', rows, 'กำลังแสดง'));

  panel.appendChild(createElement('p', 'note',
    'เปลี่ยนค่า Time Quantum แล้วกด "คำนวณ" อีกครั้ง ระบบจะใช้ชุด BT เดิมและเพิ่มแถวในตารางนี้ ' +
    '(ถ้าชุด BT เปลี่ยน ตารางนี้จะเริ่มใหม่)'));
}

// ตารางสรุป: ชื่อ | AVG WT | AVG TAT | จำนวนครั้งที่สลับโปรเซส
function createCompareTable(firstHeader, rows, badgeText) {
  var wrapper = createElement('div', 'table-scroll');
  var table = document.createElement('table');

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  var headers = [firstHeader, 'AVG WT', 'AVG TAT', 'จำนวนครั้งที่สลับโปรเซส'];
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
      nameCell.appendChild(createElement('span', 'badge', badgeText || 'ต่ำสุด'));
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

function init() {
  byId('build-button').addEventListener('click', onBuildTable);
  byId('example-button').addEventListener('click', onLoadExample);
  byId('reroll-button').addEventListener('click', fillRandomBurstTimes);

  // กด Enter ในช่องจำนวนโปรเซส = สร้างตาราง
  byId('process-count').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      onBuildTable();
    }
  });

  var modeRadios = document.querySelectorAll('input[name="burst-mode"]');
  for (var i = 0; i < modeRadios.length; i++) {
    modeRadios[i].addEventListener('change', applyBurstMode);
  }

  // ปุ่ม "คำนวณ" เป็น submit ของ form จึงกด Enter ในช่อง BT / TQ เพื่อคำนวณได้
  var form = byId('input-form');
  form.addEventListener('submit', function (event) {
    event.preventDefault(); // ไม่ให้ browser โหลดหน้าใหม่
    onCalculate();
  });
  form.addEventListener('input', markResultsStale);

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
}

init();
