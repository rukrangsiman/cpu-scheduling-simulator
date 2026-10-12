/*
 * compare.js — หน้าเปรียบเทียบ CPU (เทียบผล Run ของหลายชุดข้อมูล) (Role B, DECISIONS D-039)
 *
 * ใช้ตอบโจทย์ "เปรียบเทียบเมื่อเปลี่ยน BT หรือ TQ": ทำสำเนา CPU → แก้ BT หรือ TQ ของสำเนา → Run → เปิดหน้านี้
 * กดปุ่ม "เปรียบเทียบ CPU" ในแถบซ้าย แล้วพื้นที่ตรงกลางเปลี่ยนจากผลของ CPU ที่เลือก เป็นหน้านี้
 *
 * ตัวเลขทุกตัวมาจากผล Run ล่าสุดของแต่ละ CPU (profile.results ที่ Scheduler คำนวณไว้แล้ว)
 * ไฟล์นี้ไม่คำนวณ ST / CT / TAT / WT เอง แค่หาค่าต่ำสุดเพื่อไฮไลต์ (เหมือน lowestOf ใน ui.js)
 *
 * ใช้ตัวแปร/ฟังก์ชันที่ประกาศใน ui.js (app, t, createElement, createCard, createBar, cpuStatus ฯลฯ)
 * ฟังก์ชันใน ui.js ถูกเรียกตอนกดปุ่มเท่านั้น (หลังโหลดครบทุกไฟล์แล้ว) จึงโหลดไฟล์นี้ก่อน ui.js ได้ (เหมือน modals.js)
 */

var cpuCompare = {
  isOpen: false,
  metric: 'averageWaitingTime',  // ค่าที่เทียบ: averageWaitingTime (AVG WT) หรือ averageTurnaroundTime (AVG TAT)
  excluded: []                    // CPU ที่ผู้ใช้เอาเครื่องหมายถูกออก — เก็บเป็นตัว object ของ CPU
                                  // (ไม่ใช่ index) เพราะ index เปลี่ยนเมื่อทำสำเนาหรือลบ CPU ตัวที่อยู่ก่อนหน้า
};

// อัลกอริทึมเรียงตามแท่งในกราฟและคอลัมน์ในตาราง (class ของแท่งกำหนดสีใน css/style.css)
var COMPARE_ALGORITHMS = [
  { key: 'FCFS', barClass: 'bar-fcfs' },
  { key: 'SJF', barClass: 'bar-sjf' },
  { key: 'RR', barClass: 'bar-rr' }
];

var COMPARE_METRIC_NAMES = {
  averageWaitingTime: 'AVG WT',
  averageTurnaroundTime: 'AVG TAT'
};

// ---------- เปิด / ปิด ----------

function openCpuCompare() {
  cpuCompare.isOpen = true;
  closeColorPopover(false);
  hideGanttTooltip();
  closeColumnHelp(false);
  byId('results-area').hidden = true;
  byId('cpu-compare-area').hidden = false;
  updateCpuCompareButton();
  renderCpuCompare(false);
  scrollToCompareIfHidden();
}

// returnFocus = true เมื่อปิดด้วยปุ่ม × (ปุ่มนั้นหายไปพร้อมหน้า จึงย้ายโฟกัสไปที่ปุ่มในแถบซ้ายแทน)
function closeCpuCompare(returnFocus) {
  cpuCompare.isOpen = false;
  byId('cpu-compare-area').hidden = true;
  byId('results-area').hidden = false;
  updateCpuCompareButton();
  if (returnFocus) {
    byId('compare-cpus-button').focus();
  }
}

function onCpuCompareButtonClick() {
  if (cpuCompare.isOpen) {
    closeCpuCompare(false);
  } else {
    openCpuCompare();
  }
}

function updateCpuCompareButton() {
  byId('compare-cpus-button').setAttribute('aria-pressed', cpuCompare.isOpen ? 'true' : 'false');
}

// จอแคบ: แถบ CPU อยู่เหนือพื้นที่ตรงกลาง ถ้าหัวหน้าเปรียบเทียบอยู่ต่ำเกินไป ให้เลื่อนลงไปให้เห็น (เหมือน scrollToResultsIfHidden)
function scrollToCompareIfHidden() {
  var area = byId('cpu-compare-area');
  if (area.getBoundingClientRect().top > window.innerHeight * 0.6) {
    area.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  }
}

// ข้อมูลของ CPU เปลี่ยน (Run / แก้ข้อมูล / เพิ่ม / ลบ / เปลี่ยนชื่อ / เปลี่ยนภาษา) — วาดใหม่ถ้าหน้านี้เปิดอยู่
// ไม่เล่น animation ซ้ำ เพราะถูกเรียกทุกครั้งที่พิมพ์ในแผงตั้งค่า
function refreshCpuCompare() {
  if (cpuCompare.isOpen) {
    renderCpuCompare(true);
  }
}

// ---------- เลือก CPU ที่จะเทียบ ----------

function isExcludedFromCompare(profile) {
  return cpuCompare.excluded.indexOf(profile) !== -1;
}

// CPU ที่ Run แล้วและมีเครื่องหมายถูก เรียงตามลำดับในแถบซ้าย (index ใช้ตอนกดชื่อ CPU เพื่อเปิดผล)
function selectedCompareEntries() {
  var entries = [];
  for (var i = 0; i < app.profiles.length; i++) {
    var profile = app.profiles[i];
    if (profile.results !== null && !isExcludedFromCompare(profile)) {
      entries.push({ profile: profile, index: i });
    }
  }
  return entries;
}

function onComparePickChange(event) {
  var profile = app.profiles[Number(event.currentTarget.getAttribute('data-index'))];
  var position = cpuCompare.excluded.indexOf(profile);
  if (event.currentTarget.checked && position !== -1) {
    cpuCompare.excluded.splice(position, 1);
  } else if (!event.currentTarget.checked && position === -1) {
    cpuCompare.excluded.push(profile);
  }
  renderCpuCompare(true);
  // checkbox ถูกสร้างใหม่ จึงย้ายโฟกัสกลับมาให้ผู้ใช้คีย์บอร์ด
  var checkbox = document.querySelector('.compare-pick input[data-index="' + event.currentTarget.getAttribute('data-index') + '"]');
  if (checkbox) {
    checkbox.focus();
  }
}

// ---------- แท็บ AVG WT / AVG TAT ----------

function onCompareMetricClick(event) {
  cpuCompare.metric = event.currentTarget.getAttribute('data-metric');
  updateCompareMetricTabs();
  renderCpuCompare(true);
}

function updateCompareMetricTabs() {
  var tabs = document.querySelectorAll('.compare-metric');
  for (var i = 0; i < tabs.length; i++) {
    var isSelected = tabs[i].getAttribute('data-metric') === cpuCompare.metric;
    tabs[i].setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  }
}

// ---------- วาดหน้าเปรียบเทียบ ----------

// การ์ดเลือก CPU → (กราฟ + ตาราง) หรือคำแนะนำ ถ้าเลือกไว้ไม่ถึง 2 ตัว
function renderCpuCompare(isStatic) {
  var container = byId('cpu-compare-content');
  container.textContent = '';
  var view = createElement('div', isStatic ? 'results-view is-static' : 'results-view');
  var entries = selectedCompareEntries();

  view.appendChild(createComparePicker(entries.length));
  if (entries.length < 2) {
    view.appendChild(createCompareHowTo());
  } else {
    view.appendChild(createCpuCompareChart(entries));
    view.appendChild(createCpuCompareTableCard(entries));
  }
  container.appendChild(view);
}

function createComparePicker(selectedCount) {
  var card = createCard('compare-picker-card', t('cpuComparePickEyebrow'), t('cpuComparePickTitle'));
  var badges = createElement('div', 'card-badges');
  badges.appendChild(createElement('span', 'pill accent',
    t('cpuCompareSelected', { count: selectedCount, total: app.profiles.length })));
  card.querySelector('.card-header').appendChild(badges);

  var list = createElement('div', 'compare-picks');
  for (var i = 0; i < app.profiles.length; i++) {
    list.appendChild(createComparePick(app.profiles[i], i));
  }
  card.appendChild(list);
  return card;
}

// CPU หนึ่งตัว = checkbox + ชื่อ + จำนวนโปรเซส / TQ หรือสถานะ (CPU ที่ยังไม่ Run เลือกไม่ได้ เพราะยังไม่มีผล)
function createComparePick(profile, index) {
  var status = cpuStatus(profile);
  var label = createElement('label', 'compare-pick is-' + status);

  var checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.setAttribute('data-index', String(index));
  checkbox.disabled = status === 'idle';
  checkbox.checked = status !== 'idle' && !isExcludedFromCompare(profile);
  checkbox.addEventListener('change', onComparePickChange);
  label.appendChild(checkbox);

  var text = createElement('span', 'compare-pick-text');
  text.appendChild(createElement('span', 'compare-pick-name', profile.name));
  text.appendChild(createElement('span', 'compare-pick-meta', comparePickMeta(profile, status)));
  label.appendChild(text);
  return label;
}

// ใช้จำนวนโปรเซสและ TQ ของชุดที่ Run (ไม่ใช่ค่าในช่องกรอก) ให้ตรงกับตัวเลขในกราฟและตาราง
function comparePickMeta(profile, status) {
  if (status === 'idle') {
    return t('statusIdle');
  }
  var meta = t('cpuMeta', { count: profile.burstTimes.length, quantum: profile.results.RR.quantum });
  if (status === 'stale') {
    meta += ' · ' + t('statusStale');
  }
  return meta;
}

function createCompareHowTo() {
  var box = createElement('div', 'card empty-state compare-empty');
  box.appendChild(createElement('h4', '', t('cpuCompareNeedTwo')));
  box.appendChild(createElement('p', '', t('cpuCompareHowTo')));
  return box;
}

// ---------- กราฟแท่ง ----------

// กลุ่มละหนึ่ง CPU กลุ่มละ 3 แท่ง ใช้สเกลเดียวกันทั้งกราฟ แท่งยาวเท่ากัน = ค่าเท่ากัน แม้อยู่คนละ CPU
function createCpuCompareChart(entries) {
  var metricName = COMPARE_METRIC_NAMES[cpuCompare.metric];
  var card = createCard('compare-card', t('cpuCompareEyebrow'), t('cpuCompareChartTitle', { metric: metricName }));
  card.appendChild(createElement('h5', 'card-subtitle', t('cpuCompareChartHint')));

  var max = 0;
  for (var i = 0; i < entries.length; i++) {
    for (var a = 0; a < COMPARE_ALGORITHMS.length; a++) {
      max = Math.max(max, entries[i].profile.results[COMPARE_ALGORITHMS[a].key][cpuCompare.metric]);
    }
  }

  var chart = createElement('div', 'bar-chart');
  for (var j = 0; j < entries.length; j++) {
    chart.appendChild(createCpuCompareGroup(entries[j].profile, max));
  }
  card.appendChild(chart);
  return card;
}

function createCpuCompareGroup(profile, max) {
  var results = resultsInCompareOrder(profile);
  var lowest = lowestOf(results, cpuCompare.metric); // ค่าต่ำสุดภายใน CPU นี้ (lowestOf อยู่ใน ui.js)

  var group = createElement('div', 'bar-group is-triple');
  group.appendChild(createCompareGroupLabel(profile));
  for (var i = 0; i < results.length; i++) {
    var value = results[i][cpuCompare.metric];
    group.appendChild(createBar(COMPARE_ALGORITHMS[i].key, value, max, COMPARE_ALGORITHMS[i].barClass, value === lowest));
  }
  return group;
}

// ชื่อ CPU + TQ ที่ใช้ Run + ป้ายผลเก่า (ชุด BT เต็ม ๆ อยู่ในตารางด้านล่าง)
function createCompareGroupLabel(profile) {
  var label = createElement('div', 'bar-group-label compare-group-label');
  label.appendChild(createElement('span', 'compare-group-name', profile.name));
  label.appendChild(createElement('span', 'compare-group-meta', 'TQ ' + profile.results.RR.quantum));
  if (profile.isStale) {
    label.appendChild(createElement('span', 'compare-stale-tag', t('statusStale')));
  }
  return label;
}

function resultsInCompareOrder(profile) {
  var results = [];
  for (var i = 0; i < COMPARE_ALGORITHMS.length; i++) {
    results.push(profile.results[COMPARE_ALGORITHMS[i].key]);
  }
  return results;
}

// ---------- ตาราง ----------

function createCpuCompareTableCard(entries) {
  var metricName = COMPARE_METRIC_NAMES[cpuCompare.metric];
  var card = createCard('summary-card', t('cpuCompareEyebrow'), t('cpuCompareTableTitle', { metric: metricName }));
  card.appendChild(createCpuCompareTable(entries));
  card.appendChild(createElement('p', 'note', t('cpuCompareNote')));

  for (var i = 0; i < entries.length; i++) {
    if (entries[i].profile.isStale) {
      card.appendChild(createElement('p', 'note warning-note', t('cpuCompareStaleNote')));
      break; // หมายเหตุนี้แสดงครั้งเดียวพอ แม้มี CPU ผลเก่าหลายตัว
    }
  }
  card.appendChild(createElement('p', 'note muted', t('cpuCompareSjfNote', { metric: metricName })));
  return card;
}

// CPU | Burst Time | TQ | FCFS | SJF | RR
function createCpuCompareTable(entries) {
  var wrapper = createElement('div', 'table-scroll');
  var table = createElement('table', 'cpu-compare-table');

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  var headers = ['CPU', 'Burst Time', 'TQ', 'FCFS', 'SJF', 'RR'];
  for (var h = 0; h < headers.length; h++) {
    var th = createElement('th', h >= 2 ? 'num' : '', headers[h]);
    th.scope = 'col';
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  for (var i = 0; i < entries.length; i++) {
    tbody.appendChild(createCpuCompareRow(entries[i]));
  }
  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}

function createCpuCompareRow(entry) {
  var profile = entry.profile;
  var results = resultsInCompareOrder(profile);
  var lowest = lowestOf(results, cpuCompare.metric);
  var row = document.createElement('tr');

  var nameCell = document.createElement('th');
  nameCell.scope = 'row';
  nameCell.appendChild(createOpenCpuButton(profile, entry.index));
  if (profile.isStale) {
    nameCell.appendChild(createElement('span', 'compare-stale-tag', t('statusStale')));
  }
  row.appendChild(nameCell);

  // ชุด BT ที่ใช้ Run (ไม่ใช่ค่าในช่องกรอกตอนนี้) จึงตรงกับตัวเลขในแถวเดียวกันเสมอ
  row.appendChild(createElement('td', 'compare-bt', profile.burstTimes.join(', ')));
  row.appendChild(createElement('td', 'num', String(profile.results.RR.quantum)));

  for (var i = 0; i < results.length; i++) {
    var value = results[i][cpuCompare.metric];
    var cell = createElement('td', 'num', formatAverage(value));
    if (value === lowest) {
      cell.className = 'num is-lowest';
      // สีพื้นบอกได้เฉพาะคนที่มองเห็น จึงมีข้อความซ่อนให้โปรแกรมอ่านหน้าจอด้วย
      cell.appendChild(createElement('span', 'visually-hidden', ' (' + t('badgeLowest') + ')'));
    }
    row.appendChild(cell);
  }
  return row;
}

// ชื่อ CPU ในตาราง = ปุ่มเปิดผลของ CPU นั้น (ปิดหน้าเปรียบเทียบแล้วเลือก CPU นั้นในแถบซ้าย)
function createOpenCpuButton(profile, index) {
  var button = createElement('button', 'compare-open-cpu', profile.name);
  button.type = 'button';
  button.title = t('cpuCompareOpen', { name: profile.name });
  button.addEventListener('click', function () {
    closeCpuCompare(false);
    if (index !== app.activeIndex) {
      switchToProfile(index);
    }
    focusCpuItem(app.activeIndex);
  });
  return button;
}

// ---------- ผูก event (เรียกจาก init ใน ui.js) ----------

function bindCpuCompare() {
  byId('compare-cpus-button').addEventListener('click', onCpuCompareButtonClick);
  byId('close-compare-button').addEventListener('click', function () {
    closeCpuCompare(true);
  });
  var tabs = document.querySelectorAll('.compare-metric');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', onCompareMetricClick);
  }
}
