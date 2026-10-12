/*
 * i18n.js — ข้อความบนหน้าเว็บสองภาษา (ไทย / อังกฤษ)
 *
 * วิธีใช้:
 *   - ข้อความคงที่ใน index.html: ใส่ data-i18n="ชื่อข้อความ" ที่แท็ก แล้ว applyToPage() จะเปลี่ยนให้
 *     (data-i18n-placeholder / data-i18n-aria-label ใช้กับ placeholder และ aria-label)
 *   - ข้อความที่ ui.js สร้างเอง: เรียก I18n.t('ชื่อข้อความ', { ค่า: ... })
 *     เช่น t('rrTab', { quantum: 2 }) → 'Round Robin (TQ = 2)'
 *
 * ข้อความแจ้งเตือนการกรอกข้อมูลอยู่ใน validation.js (ส่งภาษาเป็นพารามิเตอร์)
 */

var I18n = (function () {
  'use strict';

  var STORAGE_KEY = 'cpu-scheduler-language';

  var TEXTS = {
    th: {
      // ---------- ส่วนหัว ----------
      subtitle: 'จำลองการจัดลำดับการใช้ CPU ด้วย FCFS · SJF (Non-preemptive) · Round Robin — ทุกโปรเซสมี Arrival Time = 0',
      themeSwitch: 'โหมดมืด',
      languageGroup: 'เลือกภาษา',
      footer: 'Term Project — CPU Scheduling Simulator',

      // ---------- แถบขั้นตอน ----------
      stepperLabel: 'ขั้นตอนการใช้งาน',
      step1Name: 'จำนวนโปรเซส',
      step2Name: 'Burst Time และสี',
      step3Name: 'Time Quantum',
      step4Name: 'ผลลัพธ์',
      errorTitle: 'กรุณาแก้ไขข้อมูลต่อไปนี้',
      nextButton: 'ถัดไป →',
      backButton: '← ย้อนกลับ',

      // ---------- ขั้นที่ 1 ----------
      step1Title: 'ขั้นที่ 1 — กำหนดจำนวนโปรเซส',
      step1Description: 'ระบบจะตั้งชื่อโปรเซสเป็น P1, P2, …, Pn และทุกโปรเซสมาถึงพร้อมกัน (AT = 0)',
      processCountLabel: 'จำนวนโปรเซส',
      processCountPlaceholder: 'เช่น 3, 5, 10',
      processCountHint: 'จำนวนเต็ม 1–20',
      burstModeLegend: 'วิธีกำหนด Burst Time',
      burstModeRandom: 'ให้ระบบสุ่ม (1–10)',
      burstModeManual: 'กรอกเอง',
      exampleButton: 'ใช้ข้อมูลตัวอย่าง',
      countMismatch: 'จำนวนโปรเซสเป็น {count} แต่มีช่อง Burst Time {burstCount} ช่อง กรุณากด "ถัดไป" ในขั้นที่ 1 เพื่อสร้างช่องใหม่',

      // ---------- ขั้นที่ 2 ----------
      step2Title: 'ขั้นที่ 2 — Burst Time และสีของแต่ละโปรเซส',
      burstNoteRandom: 'ระบบสุ่ม Burst Time ให้แล้ว (จำนวนเต็ม {min}–{max}) ถ้าต้องการกรอกเอง ให้ย้อนกลับไปเลือก "กรอกเอง" ในขั้นที่ 1',
      burstNoteManual: 'กรอก Burst Time ของแต่ละโปรเซส เป็นจำนวนเต็ม 1–{max}',
      rerollButton: 'สุ่ม Burst Time ใหม่',
      resetColorsButton: 'ใช้สีเริ่มต้น',
      colorHint: 'กดที่ช่องสีหน้าชื่อโปรเซสเพื่อเลือกสีที่ใช้ใน Gantt chart และตารางผลลัพธ์',
      burstInputLabel: 'Burst Time ของ {id}',
      colorButtonLabel: 'เลือกสีของ {id} (ตอนนี้ {color})',
      colorPopoverTitle: 'สีของ {id}',
      presetColors: 'สีตัวอย่าง',
      customColor: 'กำหนดเอง (RGB)',
      presetColorLabel: 'สี {color}',

      // ---------- ขั้นที่ 3 ----------
      step3Title: 'ขั้นที่ 3 — Time Quantum สำหรับ Round Robin',
      step3Description: 'FCFS และ SJF ไม่ใช้ค่านี้ ระบบจะคำนวณทั้ง 3 อัลกอริทึมจากชุด Burst Time เดียวกัน',
      quantumLabel: 'Time Quantum (TQ)',
      quantumHint: 'จำนวนเต็มบวก ค่าเริ่มต้น 2 — เปลี่ยนค่าแล้วกดคำนวณใหม่เพื่อเทียบผลบนชุดข้อมูลเดิม',
      calculateButton: 'คำนวณทั้ง 3 อัลกอริทึม',

      // ---------- ขั้นที่ 4 ----------
      resultsTitle: 'ผลลัพธ์',
      showFormulas: 'แสดงวิธีคำนวณ TAT / WT ในตาราง',
      staleNote: 'ข้อมูลถูกแก้ไขหลังการคำนวณครั้งล่าสุด ผลด้านล่างยังเป็นของชุดข้อมูลเดิม — ทำขั้นที่ 1–3 ให้ครบแล้วกด "คำนวณทั้ง 3 อัลกอริทึม" อีกครั้งเพื่ออัปเดต',
      datasetLabel: 'ชุดข้อมูลที่ใช้คำนวณ',
      totalBurst: 'รวม BT = {total}',
      tabsLabel: 'เลือกดูผลของแต่ละอัลกอริทึม',
      rrTab: 'Round Robin (TQ = {quantum})',
      compareTab: 'เปรียบเทียบ',
      changeQuantumButton: '← เปลี่ยน Time Quantum',
      editProcessesButton: 'แก้ไขโปรเซส / Burst Time',

      describeFCFS: 'มาก่อนได้ก่อน: ทุกโปรเซสมาถึงพร้อมกัน (AT = 0) จึงได้ CPU ตามลำดับ P1 → Pn และรันจนเสร็จทีละโปรเซส',
      describeSJF: 'งานสั้นได้ก่อน: เลือกโปรเซสที่ BT น้อยที่สุดก่อนและรันจนเสร็จ ถ้า BT เท่ากันให้หมายเลขน้อยกว่าได้ก่อน',
      describeRR: 'ผลัดกันใช้ CPU ครั้งละไม่เกิน {quantum} หน่วยเวลา ถ้ายังไม่เสร็จให้กลับไปต่อท้ายคิว ST คือเวลาที่ได้ CPU ครั้งแรก',
      cpuOrder: 'ลำดับการได้ CPU: {order}',
      ganttTitle: 'Gantt Chart',
      resultTableTitle: 'ตารางผลลัพธ์',
      headerProcess: 'ชื่อโปรเซส',
      headerAT: 'Arrival Time — เวลาที่มาถึง',
      headerBT: 'Burst Time — เวลาที่ต้องใช้ CPU',
      headerST: 'Start Time — เวลาที่ได้ CPU ครั้งแรก',
      headerCT: 'Completion Time — เวลาที่ทำงานเสร็จ',
      headerTAT: 'Turnaround Time = CT − AT',
      headerWT: 'Waiting Time = TAT − BT',
      average: 'ค่าเฉลี่ย',
      avgWtTitle: 'AVG WT (Average Waiting Time)',
      avgTatTitle: 'AVG TAT (Average Turnaround Time)',

      // ---------- สูตรการคำนวณ ----------
      formulaTitle: 'สูตรการคำนวณของแต่ละค่า',
      formulaExampleFor: 'แทนค่าด้วยข้อมูลของ',
      formulaVariable: 'ค่า',
      formulaMeaning: 'ความหมาย',
      formulaRule: 'สูตร / วิธีหา',
      formulaExample: 'แทนค่า ({id})',
      meaningAT: 'Arrival Time — เวลาที่โปรเซสมาถึง',
      meaningBT: 'Burst Time — เวลาที่ต้องใช้ CPU',
      meaningST: 'Start Time — เวลาที่ได้ CPU ครั้งแรก',
      meaningCT: 'Completion Time — เวลาที่ทำงานเสร็จ',
      meaningTAT: 'Turnaround Time — เวลาตั้งแต่มาถึงจนเสร็จ',
      meaningWT: 'Waiting Time — เวลาที่รออยู่ในคิว',
      meaningAvgTAT: 'ค่าเฉลี่ย TAT ของทุกโปรเซส',
      meaningAvgWT: 'ค่าเฉลี่ย WT ของทุกโปรเซส',
      ruleAT: 'AT = 0 (โจทย์กำหนดให้ทุกโปรเซสมาถึงพร้อมกัน)',
      ruleBT: 'ได้จากการสุ่มหรือผู้ใช้กรอก',
      ruleSTInOrder: 'ST = CT ของโปรเซสที่ได้ CPU ก่อนหน้า (โปรเซสแรก ST = 0)',
      ruleSTRoundRobin: 'ST = เวลาเริ่มของช่วงแรกที่โปรเซสได้ CPU ใน Gantt chart',
      ruleCTInOrder: 'CT = ST + BT (รันรวดเดียวจนเสร็จ)',
      ruleCTRoundRobin: 'CT = เวลาสิ้นสุดของช่วงสุดท้ายที่โปรเซสได้ CPU ใน Gantt chart',
      ruleTAT: 'TAT = CT − AT',
      ruleWT: 'WT = TAT − BT',
      ruleAvgTAT: 'AVG TAT = (TAT ของทุกโปรเซสรวมกัน) ÷ n',
      ruleAvgWT: 'AVG WT = (WT ของทุกโปรเซสรวมกัน) ÷ n',
      exampleSTFirst: 'ST = 0 (ได้ CPU เป็นลำดับแรก)',
      exampleSTAfter: 'ST = CT ของ {previous} = {value}',
      exampleSTRoundRobin: 'ST = {value} (ช่วงแรก {start}–{end})',
      exampleCTRoundRobin: 'CT = {value} (ช่วงสุดท้าย {start}–{end}, ได้ CPU ทั้งหมด {count} ครั้ง)',

      // ---------- แท็บเปรียบเทียบ ----------
      compareTitle: 'เปรียบเทียบ 3 อัลกอริทึม (ชุดข้อมูลเดียวกัน)',
      avgWtChartTitle: 'AVG WT (ยิ่งน้อยยิ่งดี)',
      summaryTitle: 'สรุปค่าเฉลี่ย',
      algorithmHeader: 'อัลกอริทึม',
      contextSwitchHeader: 'จำนวนครั้งที่สลับโปรเซส',
      badgeLowest: 'ต่ำสุด',
      lowestNote: 'AVG WT ต่ำสุดสำหรับชุดข้อมูลนี้: {names} ({value})',
      rrHistoryTitle: 'Round Robin เมื่อเปลี่ยน Time Quantum',
      badgeShowing: 'กำลังแสดง',
      rrHistoryNote: 'กดปุ่ม "← เปลี่ยน Time Quantum" ด้านล่าง ใส่ค่าใหม่แล้วกดคำนวณ ระบบจะใช้ชุด BT เดิมและเพิ่มแถวในตารางนี้ (ถ้าชุด BT เปลี่ยน ตารางนี้จะเริ่มใหม่)'
    },

    en: {
      // ---------- Header ----------
      subtitle: 'Simulates CPU scheduling with FCFS · SJF (Non-preemptive) · Round Robin — every process has Arrival Time = 0',
      themeSwitch: 'Dark mode',
      languageGroup: 'Language',
      footer: 'Term Project — CPU Scheduling Simulator',

      // ---------- Stepper ----------
      stepperLabel: 'Steps',
      step1Name: 'Processes',
      step2Name: 'Burst Time & colors',
      step3Name: 'Time Quantum',
      step4Name: 'Results',
      errorTitle: 'Please fix the following',
      nextButton: 'Next →',
      backButton: '← Back',

      // ---------- Step 1 ----------
      step1Title: 'Step 1 — Number of processes',
      step1Description: 'Processes are named P1, P2, …, Pn and all arrive at the same time (AT = 0)',
      processCountLabel: 'Number of processes',
      processCountPlaceholder: 'e.g. 3, 5, 10',
      processCountHint: 'Whole number 1–20',
      burstModeLegend: 'How to set Burst Time',
      burstModeRandom: 'Random (1–10)',
      burstModeManual: 'Enter manually',
      exampleButton: 'Use sample data',
      countMismatch: 'Number of processes is {count} but there are {burstCount} Burst Time fields. Please press "Next" in step 1 to rebuild them',

      // ---------- Step 2 ----------
      step2Title: 'Step 2 — Burst Time and color of each process',
      burstNoteRandom: 'Burst Times were generated randomly (whole numbers {min}–{max}). To type them yourself, go back and choose "Enter manually" in step 1',
      burstNoteManual: 'Enter the Burst Time of each process as a whole number 1–{max}',
      rerollButton: 'Randomize again',
      resetColorsButton: 'Default colors',
      colorHint: 'Click the color box next to a process name to choose its color in the Gantt chart and result table',
      burstInputLabel: 'Burst Time of {id}',
      colorButtonLabel: 'Choose color of {id} (currently {color})',
      colorPopoverTitle: 'Color of {id}',
      presetColors: 'Sample colors',
      customColor: 'Custom (RGB)',
      presetColorLabel: 'Color {color}',

      // ---------- Step 3 ----------
      step3Title: 'Step 3 — Time Quantum for Round Robin',
      step3Description: 'FCFS and SJF do not use this value. All 3 algorithms are calculated from the same Burst Times',
      quantumLabel: 'Time Quantum (TQ)',
      quantumHint: 'Positive whole number, default 2 — change it and calculate again to compare on the same data',
      calculateButton: 'Calculate all 3 algorithms',

      // ---------- Step 4 ----------
      resultsTitle: 'Results',
      showFormulas: 'Show TAT / WT calculation in the table',
      staleNote: 'The data was changed after the last calculation, so the results below are for the old data — complete steps 1–3 and press "Calculate all 3 algorithms" again to update',
      datasetLabel: 'Data used',
      totalBurst: 'Total BT = {total}',
      tabsLabel: 'Choose an algorithm to view',
      rrTab: 'Round Robin (TQ = {quantum})',
      compareTab: 'Compare',
      changeQuantumButton: '← Change Time Quantum',
      editProcessesButton: 'Edit processes / Burst Time',

      describeFCFS: 'First come, first served: all processes arrive together (AT = 0), so they get the CPU in order P1 → Pn and each runs to completion',
      describeSJF: 'Shortest job first: the process with the smallest BT runs first, to completion. If BTs are equal, the lower process number goes first',
      describeRR: 'Processes take turns using the CPU for at most {quantum} time units. An unfinished process goes back to the end of the queue. ST is the first time it gets the CPU',
      cpuOrder: 'CPU order: {order}',
      ganttTitle: 'Gantt Chart',
      resultTableTitle: 'Result table',
      headerProcess: 'Process name',
      headerAT: 'Arrival Time',
      headerBT: 'Burst Time — CPU time needed',
      headerST: 'Start Time — first time on the CPU',
      headerCT: 'Completion Time — time it finishes',
      headerTAT: 'Turnaround Time = CT − AT',
      headerWT: 'Waiting Time = TAT − BT',
      average: 'Average',
      avgWtTitle: 'AVG WT (Average Waiting Time)',
      avgTatTitle: 'AVG TAT (Average Turnaround Time)',

      // ---------- Formulas ----------
      formulaTitle: 'Formula for each value',
      formulaExampleFor: 'Plug in the data of',
      formulaVariable: 'Value',
      formulaMeaning: 'Meaning',
      formulaRule: 'Formula / how to find',
      formulaExample: 'Worked example ({id})',
      meaningAT: 'Arrival Time — when the process arrives',
      meaningBT: 'Burst Time — CPU time the process needs',
      meaningST: 'Start Time — first time it gets the CPU',
      meaningCT: 'Completion Time — when it finishes',
      meaningTAT: 'Turnaround Time — from arrival to completion',
      meaningWT: 'Waiting Time — time spent waiting in the queue',
      meaningAvgTAT: 'Average TAT of all processes',
      meaningAvgWT: 'Average WT of all processes',
      ruleAT: 'AT = 0 (all processes arrive together)',
      ruleBT: 'Generated randomly or entered by the user',
      ruleSTInOrder: 'ST = CT of the process that ran before it (the first process has ST = 0)',
      ruleSTRoundRobin: 'ST = start of the first CPU slot of the process in the Gantt chart',
      ruleCTInOrder: 'CT = ST + BT (runs to completion in one go)',
      ruleCTRoundRobin: 'CT = end of the last CPU slot of the process in the Gantt chart',
      ruleTAT: 'TAT = CT − AT',
      ruleWT: 'WT = TAT − BT',
      ruleAvgTAT: 'AVG TAT = (sum of TAT of all processes) ÷ n',
      ruleAvgWT: 'AVG WT = (sum of WT of all processes) ÷ n',
      exampleSTFirst: 'ST = 0 (first to get the CPU)',
      exampleSTAfter: 'ST = CT of {previous} = {value}',
      exampleSTRoundRobin: 'ST = {value} (first slot {start}–{end})',
      exampleCTRoundRobin: 'CT = {value} (last slot {start}–{end}, {count} CPU turns in total)',

      // ---------- Compare tab ----------
      compareTitle: 'Comparing the 3 algorithms (same data)',
      avgWtChartTitle: 'AVG WT (lower is better)',
      summaryTitle: 'Average summary',
      algorithmHeader: 'Algorithm',
      contextSwitchHeader: 'Process switches',
      badgeLowest: 'lowest',
      lowestNote: 'Lowest AVG WT for this data: {names} ({value})',
      rrHistoryTitle: 'Round Robin with different Time Quantum',
      badgeShowing: 'showing',
      rrHistoryNote: 'Press "← Change Time Quantum" below, enter a new value and calculate. The same BTs are used and a row is added to this table (the table restarts if the BTs change)'
    }
  };

  var currentLanguage = 'th';

  function loadSavedLanguage() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null; // browser ปิด localStorage ไว้ ใช้ภาษาไทยตามเดิม
    }
  }

  function saveLanguage(language) {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      // จำค่าไม่ได้ก็ไม่เป็นไร ภาษายังเปลี่ยนในหน้านี้ตามปกติ
    }
  }

  // ดึงข้อความตามภาษาปัจจุบัน แล้วแทน {ชื่อ} ด้วยค่าใน values
  function t(key, values) {
    var text = TEXTS[currentLanguage][key];
    if (text === undefined) {
      text = TEXTS.th[key]; // ลืมแปลภาษาอังกฤษ ให้แสดงภาษาไทยแทนการแสดงช่องว่าง
    }
    if (text === undefined) {
      return key;
    }
    if (values) {
      var names = Object.keys(values);
      for (var i = 0; i < names.length; i++) {
        text = text.split('{' + names[i] + '}').join(String(values[names[i]]));
      }
    }
    return text;
  }

  // เปลี่ยนข้อความคงที่ทุกจุดใน index.html ที่มี data-i18n
  function applyToPage() {
    document.documentElement.lang = currentLanguage;

    var textElements = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < textElements.length; i++) {
      textElements[i].textContent = t(textElements[i].getAttribute('data-i18n'));
    }
    var placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < placeholderElements.length; j++) {
      placeholderElements[j].placeholder = t(placeholderElements[j].getAttribute('data-i18n-placeholder'));
    }
    var labelledElements = document.querySelectorAll('[data-i18n-aria-label]');
    for (var k = 0; k < labelledElements.length; k++) {
      labelledElements[k].setAttribute('aria-label', t(labelledElements[k].getAttribute('data-i18n-aria-label')));
    }
  }

  function getLanguage() {
    return currentLanguage;
  }

  function setLanguage(language) {
    if (!TEXTS[language]) {
      return;
    }
    currentLanguage = language;
    saveLanguage(language);
    applyToPage();
  }

  // ใช้ภาษาที่เคยเลือกไว้ (ถ้ามี) ตั้งแต่โหลดไฟล์
  var savedLanguage = loadSavedLanguage();
  if (savedLanguage && TEXTS[savedLanguage]) {
    currentLanguage = savedLanguage;
  }

  return {
    t: t,
    applyToPage: applyToPage,
    getLanguage: getLanguage,
    setLanguage: setLanguage
  };
})();
