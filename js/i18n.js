/*
 * i18n.js — ข้อความบนหน้าเว็บสองภาษา (ไทย / อังกฤษ)
 *
 * วิธีใช้:
 *   - ข้อความคงที่ใน index.html: ใส่ data-i18n="ชื่อข้อความ" ที่แท็ก แล้ว applyToPage() จะเปลี่ยนให้
 *     (data-i18n-placeholder / data-i18n-aria-label / data-i18n-title ใช้กับ placeholder, aria-label และ title)
 *   - ข้อความที่ ui.js สร้างเอง: เรียก I18n.t('ชื่อข้อความ', { ค่า: ... })
 *     เช่น t('totalTime', { value: 22 }) → 'เวลารวม 22'
 *
 * ข้อความแจ้งเตือนการกรอกข้อมูลอยู่ใน validation.js (ส่งภาษาเป็นพารามิเตอร์)
 */

var I18n = (function () {
  'use strict';

  var STORAGE_KEY = 'cpu-scheduler-language';

  var TEXTS = {
    th: {
      // ---------- ส่วนหัวหน้าหลัก ----------
      introBadge: 'OS Term Project',

      // ---------- แถบ CPU และแผงตั้งค่า ----------
      sidebarHide: 'ซ่อนแถบ CPU (ดูผลลัพธ์เต็มจอ)',
      sidebarShow: 'แสดงแถบ CPU',
      brandTagline: 'Simulation Studio',
      cpuDetailsOf: 'รายละเอียดของ {name}',
      toggleSettings: 'แสดง / ซ่อนการตั้งค่าของ {name}',
      simulationSettings: 'ตั้งค่าการจำลอง',
      resultsOf: 'ผลการจำลองของ',
      settingsButton: 'ตั้งค่า',

      // ---------- ส่วนหลัก ----------
      manageCpu: 'จัดการ CPU',
      howItWorks: 'วิธีทำงาน',

      // ---------- popup ----------
      closeDialog: 'ปิด',
      cancel: 'ยกเลิก',
      cpuDialogEyebrow: 'รายละเอียด CPU',
      cpuFigureCaption: 'Burst Time ของแต่ละโปรเซส ({count} โปรเซส) สีตามที่เลือกไว้',
      factProcesses: 'จำนวนโปรเซส',
      factQuantum: 'Time Quantum',
      factStatus: 'สถานะ',
      lastRunTitle: 'ผลการ Run ล่าสุด',
      lastRunNone: 'ยังไม่ได้ Run — กด Run ในหน้าหลักเพื่อดูผลของ CPU นี้',
      lastRunStale: 'ข้อมูลถูกแก้หลัง Run ครั้งล่าสุด ค่าด้านบนยังเป็นของข้อมูลเดิม',
      renameLabel: 'ชื่อ CPU',
      renameSave: 'บันทึกชื่อ',
      openCpu: 'เปิด CPU นี้',
      currentCpu: 'กำลังเปิดอยู่',
      confirmDelete: 'ยืนยันการลบ',
      algoDialogEyebrow: 'วิธีทำงาน',
      readyQueue: 'คิวพร้อมทำงาน (ลำดับที่ได้ CPU ครั้งแรก)',
      queueFigureTitle: 'ลำดับการได้ CPU',
      ganttFigureTitle: 'Gantt chart ย่อ — ความกว้างตามเวลาที่ใช้ CPU',
      figureFromCpu: 'จากผล Run ของ {name}',
      figureFromExample: 'CPU นี้ยังไม่ได้ Run จึงคำนวณจากข้อมูลตัวอย่าง TC-01 (BT = 5, 3, 8, 6, TQ = 2)',
      rrLoopLabel: 'ยังไม่เสร็จหลังใช้ CPU ครบ {quantum} หน่วย → กลับไปต่อท้ายคิว',
      stepsTitle: 'ขั้นตอน',
      stepFCFS1: 'เรียงคิวตามลำดับที่มาถึง — ทุกโปรเซสมาถึงพร้อมกัน (AT = 0) จึงเป็น P1 → Pn',
      stepFCFS2: 'ให้โปรเซสหน้าคิวใช้ CPU จนทำงานเสร็จ',
      stepFCFS3: 'ทำซ้ำกับโปรเซสถัดไปจนหมดคิว',
      stepSJF1: 'ดูโปรเซสที่ยังรออยู่ทั้งหมด',
      stepSJF2: 'เลือกตัวที่ BT น้อยที่สุด (ถ้าเท่ากัน หมายเลขน้อยกว่าได้ก่อน)',
      stepSJF3: 'ให้ใช้ CPU จนเสร็จ แล้วเลือกตัวถัดไปแบบเดิม',
      stepRR1: 'เริ่มคิวที่ P1 → Pn',
      stepRR2: 'โปรเซสหน้าคิวใช้ CPU ได้ไม่เกิน Time Quantum',
      stepRR3: 'ถ้ายังไม่เสร็จ กลับไปต่อท้ายคิว ทำจนทุกโปรเซสเสร็จ',

      // ---------- ตั้งค่า ----------
      settingsEyebrow: 'การตั้งค่า',
      settingsTitle: 'ตั้งค่าโปรแกรม',
      settingsLanguage: 'ภาษา',
      settingsLanguageHint: 'ข้อความบนหน้าเว็บทั้งหมด',
      settingsTheme: 'โหมดมืด',
      settingsThemeHint: 'ถ้าไม่เคยเลือก จะใช้ตามการตั้งค่าของเครื่อง',
      settingsReset: 'ล้างข้อมูล CPU ที่บันทึกไว้',
      settingsResetHint: 'ลบ CPU ทุกตัวแล้วเริ่มใหม่ที่ CPU 1 (ภาษาและธีมไม่เปลี่ยน)',
      settingsResetButton: 'ล้างข้อมูล',
      settingsResetConfirm: 'ลบ CPU ทุกตัวและผลการจำลองทั้งหมดหรือไม่? ย้อนกลับไม่ได้',
      confirmReset: 'ยืนยันล้างข้อมูล',

      // ---------- แถบ CPU ด้านซ้าย ----------
      cpuListTitle: 'CPU ของฉัน',
      addCpu: 'เพิ่ม CPU',
      cpuLimitNote: 'สร้างได้สูงสุด {max} ตัว ลบตัวที่ไม่ใช้ก่อนจึงจะเพิ่มได้',
      cpuMeta: '{count} โปรเซส · TQ {quantum}',
      statusIdle: 'ยังไม่ Run',
      statusDone: 'Run แล้ว',
      statusStale: 'ผลเก่า',

      // ---------- หัวพื้นที่ทำงาน ----------
      activeCpuLabel: 'CPU ที่เลือก',
      duplicateCpu: 'ทำสำเนา',
      deleteCpu: 'ลบ CPU นี้',
      deleteConfirm: 'ลบ "{name}" และข้อมูลทั้งหมดของ CPU นี้หรือไม่? ลบแล้วย้อนกลับไม่ได้',
      copyName: '{name} (สำเนา)',
      metaProcesses: '{count} โปรเซส',
      themeSwitch: 'โหมดมืด',
      languageGroup: 'เลือกภาษา',
      footer: 'CPU Scheduling Simulator · FCFS · SJF (Non-preemptive) · Round Robin · ทุกโปรเซสมี AT = 0',
      errorTitle: 'กรุณาแก้ไขข้อมูลต่อไปนี้',

      // ---------- หน้าต่างโปรเซส ----------
      processWindowTitle: 'โปรเซสและ Burst Time',
      processCountLabel: 'จำนวนโปรเซส',
      processCountHint: 'จำนวนเต็ม 1–10',
      decreaseCount: 'ลดจำนวนโปรเซส',
      increaseCount: 'เพิ่มจำนวนโปรเซส',
      burstLegend: 'Burst Time',
      burstNote: 'กรอกจำนวนเต็ม 1–{max} ในแต่ละช่อง หรือกดปุ่มสุ่มให้ใส่ตัวเลข {randomMin}–{randomMax} ลงในช่องทั้งหมด แล้วแก้ต่อได้',
      rerollButton: 'สุ่ม Burst Time (1–10)',
      resetColorsButton: 'ใช้สีเริ่มต้น',
      burstInputLabel: 'Burst Time ของ {id}',
      colorButtonLabel: 'กดเพื่อเปลี่ยนสีของ {id} (ตอนนี้ {color})',
      colorPopoverTitle: 'สีของ {id}',
      presetColors: 'สีตัวอย่าง',
      customColor: 'กำหนดเอง (RGB)',
      presetColorLabel: 'สี {color}',

      // ---------- แท็บอัลกอริทึม ----------
      algorithmGroup: 'เลือกอัลกอริทึมที่จะแสดงผล',
      algoTypeLabel: 'ประเภท',
      algoStrengthLabel: 'จุดเด่น',
      algoLimitLabel: 'ข้อจำกัด',
      typeNonPreemptive: 'Non-preemptive — ได้ CPU แล้วรันจนเสร็จ',
      typePreemptive: 'Preemptive — ถูกพักเมื่อครบ Time Quantum',
      summaryFCFS: 'โปรเซสได้ CPU ตามลำดับ P1 → Pn และรันจนเสร็จทีละโปรเซส',
      summarySJF: 'เลือกโปรเซสที่ BT น้อยที่สุดก่อน ถ้า BT เท่ากันให้หมายเลขน้อยกว่าได้ก่อน',
      summaryRR: 'ผลัดกันใช้ CPU ครั้งละไม่เกิน Time Quantum ถ้ายังไม่เสร็จให้กลับไปต่อท้ายคิว',
      strengthFCFS: 'เข้าใจง่าย ไม่มีโปรเซสไหนถูกแซงคิว',
      strengthSJF: 'ได้ AVG WT ต่ำที่สุดเมื่อทุกโปรเซสมาถึงพร้อมกัน',
      strengthRR: 'ทุกโปรเซสได้ใช้ CPU เร็ว และผลัดกันอย่างเท่าเทียม',
      limitFCFS: 'ถ้างานยาวมาก่อน งานสั้นต้องรอนาน (Convoy effect)',
      limitSJF: 'ต้องรู้ BT ล่วงหน้า และงานยาวอาจต้องรอนาน',
      limitRR: 'สลับโปรเซสบ่อย และผลขึ้นกับค่า Time Quantum',
      quantumLabel: 'Time Quantum (TQ)',
      quantumHint: 'ใช้กับ Round Robin (จำนวนเต็ม 1–100)',

      // ---------- แถบ Run ----------
      runButton: 'RUN',
      runButtonTitle: 'คำนวณ FCFS, SJF และ Round Robin พร้อมกัน',
      compareButton: 'เปรียบเทียบ',

      // ---------- พื้นที่ผลลัพธ์ ----------
      resultsWindowTitle: 'ผลการจำลอง',
      emptyTitle: 'CPU นี้ยังไม่มีผลการจำลอง',
      emptyText: 'ตั้งค่าโปรเซสในการ์ด CPU ทางซ้าย แล้วกด Run เพื่อดู Gantt chart ค่าสรุป และตารางผลลัพธ์',
      staleNote: 'ข้อมูลถูกแก้ไขหลัง Run ครั้งล่าสุด ผลด้านล่างยังเป็นของชุดข้อมูลเดิม — กด Run อีกครั้งเพื่ออัปเดต',
      totalBurst: 'รวม BT = {total}',

      // ---------- Gantt chart ----------
      ganttEyebrow: 'ไทม์ไลน์การใช้ CPU',
      ganttTitle: 'Gantt Chart',
      totalTime: 'เวลารวม {value}',
      describeFCFS: 'มาก่อนได้ก่อน: ทุกโปรเซสมาถึงพร้อมกัน (AT = 0) จึงได้ CPU ตามลำดับ P1 → Pn และรันจนเสร็จทีละโปรเซส',
      describeSJF: 'งานสั้นได้ก่อน: เลือกโปรเซสที่ BT น้อยที่สุดก่อนและรันจนเสร็จ ถ้า BT เท่ากันให้หมายเลขน้อยกว่าได้ก่อน',
      describeRR: 'ผลัดกันใช้ CPU ครั้งละไม่เกิน {quantum} หน่วยเวลา ถ้ายังไม่เสร็จให้กลับไปต่อท้ายคิว ST คือเวลาที่ได้ CPU ครั้งแรก',
      orderLabel: 'ลำดับการได้ CPU',
      orderRun: 'รัน {duration}',
      slotLabel: '{id} ได้ CPU ช่วง {start}–{end} นาน {duration} หน่วยเวลา',
      tooltipStart: 'เริ่ม',
      tooltipEnd: 'สิ้นสุด',
      tooltipDuration: 'ระยะเวลา',

      // ---------- ค่าสรุป (KPI) ----------
      kpiGroup: 'ค่าสรุปของ {name}',
      avgWtTitle: 'AVG WT',
      avgWtFull: 'Average Waiting Time',
      avgTatTitle: 'AVG TAT',
      avgTatFull: 'Average Turnaround Time',
      kpiTotalTitle: 'เวลารวม',
      kpiTotalFull: 'Total time',
      kpiSwitchTitle: 'สลับโปรเซส',
      kpiSwitchFull: 'Process switches',

      // ---------- ตารางผลลัพธ์ ----------
      resultTableTitle: 'ตารางผลลัพธ์ของแต่ละโปรเซส',
      showFormulas: 'แสดงวิธีคำนวณ TAT / WT ในตาราง',
      headerProcess: 'ชื่อโปรเซส',
      columnHelpLabel: 'ดูความหมายและสูตรของ {name}',
      meaningProcess: 'Process — ชื่อของโปรเซสแต่ละตัว',
      ruleProcess: 'ระบบตั้งชื่อให้อัตโนมัติ P1, P2, …, Pn ตามลำดับ (ตารางเรียงตามชื่อเสมอ ไม่ใช่ตามลำดับที่ได้ CPU)',
      columnHelpTip: 'ดูทุกค่าพร้อมแทนค่าของโปรเซสอื่นได้ในส่วน "สูตรการคำนวณของแต่ละค่า" ใต้ตาราง',
      headerAT: 'Arrival Time — เวลาที่มาถึง',
      headerBT: 'Burst Time — เวลาที่ต้องใช้ CPU',
      headerST: 'Start Time — เวลาที่ได้ CPU ครั้งแรก',
      headerCT: 'Completion Time — เวลาที่ทำงานเสร็จ',
      headerTAT: 'Turnaround Time = CT − AT',
      headerWT: 'Waiting Time = TAT − BT',
      average: 'ค่าเฉลี่ย',

      // ---------- สูตรการคำนวณ ----------
      formulaTitle: 'สูตรการคำนวณของแต่ละค่า',
      formulaExampleFor: 'แทนค่าด้วยข้อมูลของ',
      formulaRule: 'สูตร / วิธีหา',
      formulaExample: 'แทนค่า ({id})',
      formulaExampleAll: 'แทนค่า (ทุกโปรเซส)',
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

      // ---------- เปรียบเทียบ ----------
      compareEyebrow: 'ชุดข้อมูลเดียวกัน',
      compareTitle: 'เปรียบเทียบ 3 อัลกอริทึม',
      avgChartTitle: 'AVG WT และ AVG TAT (ยิ่งน้อยยิ่งดี)',
      summaryTitle: 'สรุปค่าเฉลี่ย',
      algorithmHeader: 'อัลกอริทึม',
      contextSwitchHeader: 'จำนวนครั้งที่สลับโปรเซส',
      badgeLowest: 'ต่ำสุด',
      lowestNote: 'AVG WT ต่ำสุดสำหรับชุดข้อมูลนี้: {names} ({value})',
      compareCaveat: 'ค่าต่ำสุดในชุดข้อมูลนี้ไม่ได้แปลว่าอัลกอริทึมนั้นดีที่สุดในทุกสถานการณ์',
      rrHistoryTitle: 'Round Robin เมื่อเปลี่ยน Time Quantum',
      badgeShowing: 'กำลังแสดง',
      rrHistoryNote: 'เปลี่ยนค่า Time Quantum ท้ายหน้าต่างโปรเซส แล้วกด Run อีกครั้ง ระบบจะใช้ชุด BT เดิมและเพิ่มแถวในตารางนี้ (ถ้าชุด BT เปลี่ยน ตารางนี้จะเริ่มใหม่) ถ้าอยากเก็บข้อมูลหลายแบบไว้เทียบกัน ให้กด "ทำสำเนา" CPU นี้',

      // ---------- เปรียบเทียบ CPU (D-039) ----------
      compareCpus: 'เปรียบเทียบ CPU',
      cpuCompareEyebrow: 'ต่างชุดข้อมูล',
      cpuCompareIntro: 'เทียบผล Run ล่าสุดของหลาย CPU เช่น ชุด BT ต่างกัน หรือ TQ ต่างกัน',
      cpuCompareMetricGroup: 'ค่าที่ใช้เปรียบเทียบ',
      cpuCompareClose: 'ปิดการเปรียบเทียบ',
      cpuComparePickEyebrow: 'ชุดข้อมูล',
      cpuComparePickTitle: 'เลือก CPU ที่จะเปรียบเทียบ',
      cpuCompareSelected: 'เลือก {count} / {total}',
      cpuCompareNeedTwo: 'เลือก CPU ที่ Run แล้วอย่างน้อย 2 ตัว',
      cpuCompareHowTo: 'อยากเทียบเมื่อเปลี่ยน BT หรือ TQ: กด ⋯ บนการ์ด CPU → ทำสำเนา แล้วแก้ Burst Time หรือ TQ ของสำเนา กด Run — CPU นั้นจะขึ้นในหน้านี้ทันที',
      cpuCompareChartTitle: '{metric} ของแต่ละ CPU',
      cpuCompareChartHint: 'ยิ่งสั้นยิ่งดี · ทุกแท่งใช้สเกลเดียวกัน จึงเทียบข้าม CPU ได้',
      cpuCompareTableTitle: 'ตาราง {metric}',
      cpuCompareNote: 'ตัวเลขมาจากผล Run ล่าสุดของแต่ละ CPU (ชุด BT และ TQ ในตารางคือชุดที่ใช้ Run) · ช่องสีเขียว = ค่าต่ำสุดของ CPU นั้น · กดชื่อ CPU เพื่อดูผลละเอียด',
      cpuCompareStaleNote: 'CPU ที่ขึ้นว่า "ผลเก่า" ถูกแก้ข้อมูลหลัง Run — ตัวเลขยังเป็นของชุดเดิม กด Run ใน CPU นั้นอีกครั้งเพื่ออัปเดต',
      cpuCompareSjfNote: 'เมื่อทุกโปรเซสมาถึงพร้อมกัน (AT = 0) SJF ได้ {metric} ต่ำที่สุด (หรือเท่ากับต่ำที่สุด) เสมอ สิ่งที่น่าดูคือ FCFS และ RR ห่างจาก SJF แค่ไหนเมื่อชุด BT หรือ TQ เปลี่ยน',
      cpuCompareOpen: 'ดูผลของ {name}'
    },

    en: {
      // ---------- Main header ----------
      introBadge: 'OS Term Project',

      // ---------- CPU sidebar and settings panel ----------
      sidebarHide: 'Hide CPU sidebar (full-width results)',
      sidebarShow: 'Show CPU sidebar',
      brandTagline: 'Simulation Studio',
      cpuDetailsOf: 'Details of {name}',
      toggleSettings: 'Show / hide settings of {name}',
      simulationSettings: 'Simulation settings',
      resultsOf: 'Results for',
      settingsButton: 'Settings',

      // ---------- Main area ----------
      manageCpu: 'Manage CPU',
      howItWorks: 'How it works',

      // ---------- Popups ----------
      closeDialog: 'Close',
      cancel: 'Cancel',
      cpuDialogEyebrow: 'CPU details',
      cpuFigureCaption: 'Burst Time of each process ({count} processes) in their chosen colors',
      factProcesses: 'Processes',
      factQuantum: 'Time Quantum',
      factStatus: 'Status',
      lastRunTitle: 'Latest run',
      lastRunNone: 'Not run yet — press Run on the main page to see results for this CPU',
      lastRunStale: 'The data changed after the last Run, so these values are for the old data',
      renameLabel: 'CPU name',
      renameSave: 'Save name',
      openCpu: 'Open this CPU',
      currentCpu: 'Currently open',
      confirmDelete: 'Delete',
      algoDialogEyebrow: 'How it works',
      readyQueue: 'Ready queue (order of first CPU turn)',
      queueFigureTitle: 'CPU order',
      ganttFigureTitle: 'Mini Gantt chart — width follows CPU time',
      figureFromCpu: 'from the latest run of {name}',
      figureFromExample: 'This CPU has not been run, so this uses sample data TC-01 (BT = 5, 3, 8, 6, TQ = 2)',
      rrLoopLabel: 'Not finished after {quantum} time units → back to the end of the queue',
      stepsTitle: 'Steps',
      stepFCFS1: 'Queue processes in arrival order — all arrive together (AT = 0), so P1 → Pn',
      stepFCFS2: 'The process at the front uses the CPU until it finishes',
      stepFCFS3: 'Repeat with the next process until the queue is empty',
      stepSJF1: 'Look at every waiting process',
      stepSJF2: 'Pick the one with the smallest BT (ties go to the lower process number)',
      stepSJF3: 'Run it to completion, then pick the next one the same way',
      stepRR1: 'Start the queue as P1 → Pn',
      stepRR2: 'The process at the front uses the CPU for at most one Time Quantum',
      stepRR3: 'If it is not finished, it goes to the end of the queue. Repeat until all finish',

      // ---------- Settings ----------
      settingsEyebrow: 'Settings',
      settingsTitle: 'Preferences',
      settingsLanguage: 'Language',
      settingsLanguageHint: 'All text on the page',
      settingsTheme: 'Dark mode',
      settingsThemeHint: 'Follows your device setting until you choose',
      settingsReset: 'Clear saved CPUs',
      settingsResetHint: 'Delete every CPU and start again with CPU 1 (language and theme stay)',
      settingsResetButton: 'Clear data',
      settingsResetConfirm: 'Delete every CPU and all simulation results? This cannot be undone',
      confirmReset: 'Clear everything',

      // ---------- CPU list (left) ----------
      cpuListTitle: 'My CPUs',
      addCpu: 'Add CPU',
      cpuLimitNote: 'Up to {max} CPUs. Delete one you no longer need to add another',
      cpuMeta: '{count} processes · TQ {quantum}',
      statusIdle: 'Not run yet',
      statusDone: 'Up to date',
      statusStale: 'Out of date',

      // ---------- Workspace header ----------
      activeCpuLabel: 'Selected CPU',
      duplicateCpu: 'Duplicate',
      deleteCpu: 'Delete this CPU',
      deleteConfirm: 'Delete "{name}" and all of its data? This cannot be undone',
      copyName: '{name} (copy)',
      metaProcesses: '{count} processes',
      themeSwitch: 'Dark mode',
      languageGroup: 'Language',
      footer: 'CPU Scheduling Simulator · FCFS · SJF (Non-preemptive) · Round Robin · every process has AT = 0',
      errorTitle: 'Please fix the following',

      // ---------- Process window ----------
      processWindowTitle: 'Processes & Burst Time',
      processCountLabel: 'Number of processes',
      processCountHint: 'Whole number 1–10',
      decreaseCount: 'Remove a process',
      increaseCount: 'Add a process',
      burstLegend: 'Burst Time',
      burstNote: 'Type a whole number 1–{max} in each box, or press Randomize to fill every box with {randomMin}–{randomMax} and edit from there',
      rerollButton: 'Randomize Burst Time (1–10)',
      resetColorsButton: 'Default colors',
      burstInputLabel: 'Burst Time of {id}',
      colorButtonLabel: 'Click to change the color of {id} (currently {color})',
      colorPopoverTitle: 'Color of {id}',
      presetColors: 'Sample colors',
      customColor: 'Custom (RGB)',
      presetColorLabel: 'Color {color}',

      // ---------- Algorithm tabs ----------
      algorithmGroup: 'Choose an algorithm to view',
      algoTypeLabel: 'Type',
      algoStrengthLabel: 'Strength',
      algoLimitLabel: 'Limitation',
      typeNonPreemptive: 'Non-preemptive — runs to completion once it gets the CPU',
      typePreemptive: 'Preemptive — paused when the Time Quantum ends',
      summaryFCFS: 'Processes get the CPU in order P1 → Pn and each runs to completion',
      summarySJF: 'The process with the smallest BT runs first. If BTs are equal, the lower process number goes first',
      summaryRR: 'Processes take turns for at most one Time Quantum. An unfinished process goes back to the end of the queue',
      strengthFCFS: 'Simple, and no process ever jumps the queue',
      strengthSJF: 'Lowest AVG WT when every process arrives at the same time',
      strengthRR: 'Every process gets the CPU early, and turns are shared fairly',
      limitFCFS: 'A long job at the front makes short jobs wait (convoy effect)',
      limitSJF: 'BT must be known in advance, and long jobs may wait a long time',
      limitRR: 'Frequent process switches, and results depend on the Time Quantum',
      quantumLabel: 'Time Quantum (TQ)',
      quantumHint: 'Used by Round Robin (whole number 1–100)',

      // ---------- Run strip ----------
      runButton: 'RUN',
      runButtonTitle: 'Run FCFS, SJF and Round Robin together',
      compareButton: 'Compare',

      // ---------- Results area ----------
      resultsWindowTitle: 'Simulation results',
      emptyTitle: 'This CPU has no results yet',
      emptyText: 'Set up the processes in the CPU card on the left, then press Run to see the Gantt chart, summary values and result table',
      staleNote: 'The data was changed after the last Run, so the results below are for the old data — press Run again to update',
      totalBurst: 'Total BT = {total}',

      // ---------- Gantt chart ----------
      ganttEyebrow: 'CPU Execution Timeline',
      ganttTitle: 'Gantt Chart',
      totalTime: 'Total time {value}',
      describeFCFS: 'First come, first served: all processes arrive together (AT = 0), so they get the CPU in order P1 → Pn and each runs to completion',
      describeSJF: 'Shortest job first: the process with the smallest BT runs first, to completion. If BTs are equal, the lower process number goes first',
      describeRR: 'Processes take turns using the CPU for at most {quantum} time units. An unfinished process goes back to the end of the queue. ST is the first time it gets the CPU',
      orderLabel: 'CPU order',
      orderRun: 'ran {duration}',
      slotLabel: '{id} runs from {start} to {end} ({duration} time units)',
      tooltipStart: 'Start',
      tooltipEnd: 'End',
      tooltipDuration: 'Duration',

      // ---------- Summary values (KPI) ----------
      kpiGroup: 'Summary of {name}',
      avgWtTitle: 'AVG WT',
      avgWtFull: 'Average Waiting Time',
      avgTatTitle: 'AVG TAT',
      avgTatFull: 'Average Turnaround Time',
      kpiTotalTitle: 'Total time',
      kpiTotalFull: 'Time until all processes finish',
      kpiSwitchTitle: 'Switches',
      kpiSwitchFull: 'Process switches',

      // ---------- Result table ----------
      resultTableTitle: 'Process Metrics',
      showFormulas: 'Show TAT / WT calculation in the table',
      headerProcess: 'Process name',
      columnHelpLabel: 'Show the meaning and formula of {name}',
      meaningProcess: 'Process — the name of each process',
      ruleProcess: 'Named automatically P1, P2, …, Pn (the table is always sorted by name, not by CPU order)',
      columnHelpTip: 'See every value, with any process substituted, in "How each value is calculated" below the table',
      headerAT: 'Arrival Time',
      headerBT: 'Burst Time — CPU time needed',
      headerST: 'Start Time — first time on the CPU',
      headerCT: 'Completion Time — time it finishes',
      headerTAT: 'Turnaround Time = CT − AT',
      headerWT: 'Waiting Time = TAT − BT',
      average: 'Average',

      // ---------- Formulas ----------
      formulaTitle: 'How metrics are calculated',
      formulaExampleFor: 'Plug in the data of',
      formulaRule: 'Formula / how to find',
      formulaExample: 'Worked example ({id})',
      formulaExampleAll: 'Worked example (all processes)',
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

      // ---------- Compare ----------
      compareEyebrow: 'Same data',
      compareTitle: 'Algorithm Comparison',
      avgChartTitle: 'AVG WT and AVG TAT (lower is better)',
      summaryTitle: 'Average summary',
      algorithmHeader: 'Algorithm',
      contextSwitchHeader: 'Process switches',
      badgeLowest: 'lowest',
      lowestNote: 'Lowest AVG WT for this data: {names} ({value})',
      compareCaveat: 'The lowest value for this data does not mean that algorithm is the best in every situation',
      rrHistoryTitle: 'Round Robin with different Time Quantum',
      badgeShowing: 'showing',
      rrHistoryNote: 'Change the Time Quantum at the bottom of the process window and press Run again. The same BTs are used and a row is added to this table (the table restarts if the BTs change). To keep several setups side by side, duplicate this CPU',

      // ---------- Compare CPUs (D-039) ----------
      compareCpus: 'Compare CPUs',
      cpuCompareEyebrow: 'Different data',
      cpuCompareIntro: 'Compare the latest run of several CPUs, e.g. different BTs or a different TQ',
      cpuCompareMetricGroup: 'Value to compare',
      cpuCompareClose: 'Close comparison',
      cpuComparePickEyebrow: 'Data sets',
      cpuComparePickTitle: 'Choose CPUs to compare',
      cpuCompareSelected: '{count} / {total} selected',
      cpuCompareNeedTwo: 'Select at least 2 CPUs that have been run',
      cpuCompareHowTo: 'To compare after changing BT or TQ: press ⋯ on a CPU card → Duplicate, change the Burst Times or TQ of the copy and press Run — it appears here right away',
      cpuCompareChartTitle: '{metric} of each CPU',
      cpuCompareChartHint: 'Shorter is better · every bar uses the same scale, so CPUs can be compared',
      cpuCompareTableTitle: '{metric} table',
      cpuCompareNote: 'Numbers come from the latest run of each CPU (the BTs and TQ in the table are the ones used for that run) · green cell = lowest value of that CPU · press a CPU name to see its full results',
      cpuCompareStaleNote: 'CPUs marked "Out of date" were edited after their last run — their numbers are still for the old data. Press Run on that CPU to update',
      cpuCompareSjfNote: 'When every process arrives together (AT = 0), SJF always has the lowest {metric} (or ties for lowest). The interesting part is how far FCFS and RR are from SJF when the BTs or TQ change',
      cpuCompareOpen: 'Show results of {name}'
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
    // title = กล่องข้อความเล็กที่ขึ้นเมื่อชี้เมาส์ (ใช้กับปุ่มที่มีแต่ไอคอน)
    var titledElements = document.querySelectorAll('[data-i18n-title]');
    for (var m = 0; m < titledElements.length; m++) {
      titledElements[m].title = t(titledElements[m].getAttribute('data-i18n-title'));
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
