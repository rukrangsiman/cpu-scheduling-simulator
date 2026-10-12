/*
 * scheduler.js — อัลกอริทึม CPU Scheduling (Role A)
 *
 * มี 3 อัลกอริทึม: FCFS, SJF แบบ Non-preemptive และ Round Robin
 * ไฟล์นี้คำนวณอย่างเดียว ไม่ยุ่งกับหน้าเว็บ (DOM) จึงทดสอบด้วย Node ได้
 *
 * สมมติฐานของโจทย์: ทุกโปรเซสมี Arrival Time = 0 และเรียงเริ่มต้นเป็น P1..Pn
 *
 * Input:  [{ id: 'P1', arrivalTime: 0, burstTime: 5 }, ...]
 * Output: { algorithm, quantum, rows, gantt, averageWaitingTime, averageTurnaroundTime }
 *         (รายละเอียดดู CLAUDE.md ข้อ 5)
 */

// ห่อด้วยฟังก์ชันเพื่อให้ตัวแปรช่วย (เช่น buildResult) ไม่หลุดไปชนกับชื่อใน ui.js
// ภายนอกจะเห็นแค่ object Scheduler ตัวเดียว
var Scheduler = (function () {
  'use strict';

  // ---------- ตรวจ input ----------

  function isPositiveInteger(value) {
    return Number.isInteger(value) && value > 0;
  }

  // validation.js ตรวจสิ่งที่ผู้ใช้กรอกไว้แล้ว ส่วนนี้กันกรณีโค้ดส่วนอื่นส่งข้อมูลผิดมา
  // ถ้าไม่ตรวจ ข้อมูลผิดจะทำให้ได้ตัวเลขแปลก ๆ หรือ Round Robin วนไม่จบ
  function checkProcesses(processes) {
    if (!Array.isArray(processes) || processes.length === 0) {
      throw new Error('ต้องมีโปรเซสอย่างน้อย 1 โปรเซส');
    }
    for (var i = 0; i < processes.length; i++) {
      var process = processes[i];
      if (!isPositiveInteger(process.burstTime)) {
        throw new Error('Burst Time ของ ' + process.id + ' ต้องเป็นจำนวนเต็มบวก');
      }
      if (process.arrivalTime !== 0) {
        throw new Error('โปรเจ็คนี้กำหนดให้ Arrival Time = 0 ทุกโปรเซส (' + process.id + ')');
      }
    }
  }

  function checkQuantum(quantum) {
    if (!isPositiveInteger(quantum)) {
      throw new Error('Time Quantum ต้องเป็นจำนวนเต็มบวก');
    }
  }

  // ---------- สร้างผลลัพธ์ (ใช้ร่วมกันทุกอัลกอริทึม) ----------

  // แต่ละอัลกอริทึมหาแค่ ST กับ CT ของแต่ละโปรเซส แล้วส่งมาที่นี่
  // สูตร TAT / WT / ค่าเฉลี่ย จึงเขียนไว้ที่เดียว ไม่ต้องเขียนซ้ำ 3 รอบ
  function buildResult(algorithm, quantum, processes, startTimes, completionTimes, gantt) {
    var rows = [];
    var totalWaitingTime = 0;
    var totalTurnaroundTime = 0;

    // วนตาม index เดิม ตารางจึงเรียง P1..Pn เสมอ ไม่ว่าลำดับการรันจะเป็นอย่างไร
    for (var i = 0; i < processes.length; i++) {
      var process = processes[i];
      var turnaroundTime = completionTimes[i] - process.arrivalTime; // TAT = CT - AT
      var waitingTime = turnaroundTime - process.burstTime;          // WT  = TAT - BT

      rows.push({
        id: process.id,
        arrivalTime: process.arrivalTime,
        burstTime: process.burstTime,
        startTime: startTimes[i],
        completionTime: completionTimes[i],
        turnaroundTime: turnaroundTime,
        waitingTime: waitingTime
      });

      totalWaitingTime += waitingTime;
      totalTurnaroundTime += turnaroundTime;
    }

    return {
      algorithm: algorithm,
      quantum: quantum,
      rows: rows,
      gantt: gantt,
      averageWaitingTime: totalWaitingTime / processes.length,
      averageTurnaroundTime: totalTurnaroundTime / processes.length
    };
  }

  // ---------- รันจนจบทีละโปรเซส (ใช้ร่วมกันระหว่าง FCFS และ SJF) ----------

  // FCFS กับ SJF Non-preemptive ทำงานเหมือนกัน คือได้ CPU แล้วรันจนเสร็จ
  // ต่างกันแค่ "ลำดับ" ที่ได้ CPU จึงรับลำดับเข้ามาเป็น array ของ index
  function runInOrder(processes, order) {
    var startTimes = [];
    var completionTimes = [];
    var gantt = [];
    var currentTime = 0;

    for (var k = 0; k < order.length; k++) {
      var index = order[k];
      var process = processes[index];

      startTimes[index] = currentTime;
      currentTime = currentTime + process.burstTime;
      completionTimes[index] = currentTime;

      gantt.push({ id: process.id, start: startTimes[index], end: currentTime });
    }

    return { startTimes: startTimes, completionTimes: completionTimes, gantt: gantt };
  }

  // ---------- FCFS ----------

  // มาก่อนได้ก่อน: ทุกโปรเซสมาถึงเวลา 0 พร้อมกัน จึงใช้ลำดับ P1, P2, ..., Pn
  function fcfs(processes) {
    checkProcesses(processes);

    var order = [];
    for (var i = 0; i < processes.length; i++) {
      order.push(i);
    }

    var run = runInOrder(processes, order);
    return buildResult('FCFS', null, processes, run.startTimes, run.completionTimes, run.gantt);
  }

  // ---------- SJF (Non-preemptive) ----------

  // งานสั้นได้ก่อน: เรียงตาม Burst Time จากน้อยไปมาก
  // ไม่ต้องทำแบบ Preemptive แยก เพราะ AT = 0 ทั้งหมด ไม่มีโปรเซสใหม่มาแทรกกลางทาง
  // แบบ Preemptive (SRTF) จึงได้ผลเหมือนกันทุกกรณี (DECISIONS D-005)
  function sjf(processes) {
    checkProcesses(processes);

    var order = [];
    for (var i = 0; i < processes.length; i++) {
      order.push(i);
    }

    order.sort(function (a, b) {
      var burstA = processes[a].burstTime;
      var burstB = processes[b].burstTime;
      if (burstA !== burstB) {
        return burstA - burstB;
      }
      // BT เท่ากัน: หมายเลขน้อยได้ก่อน เช่น P1 ก่อน P3 (DECISIONS D-003)
      return a - b;
    });

    var run = runInOrder(processes, order);
    return buildResult('SJF', null, processes, run.startTimes, run.completionTimes, run.gantt);
  }

  // ---------- Round Robin ----------

  // ผลัดกันใช้ CPU ครั้งละไม่เกิน quantum ถ้ายังไม่เสร็จให้ไปต่อท้ายคิว
  function roundRobin(processes, quantum) {
    checkProcesses(processes);
    checkQuantum(quantum);

    var remainingTimes = [];  // เวลาที่ยังต้องใช้ CPU อีกเท่าไรของแต่ละโปรเซส
    var startTimes = [];
    var completionTimes = [];
    var readyQueue = [];      // เก็บ index ของโปรเซสที่รอ CPU
    var gantt = [];
    var currentTime = 0;

    for (var i = 0; i < processes.length; i++) {
      remainingTimes.push(processes[i].burstTime);
      startTimes.push(null);  // null = ยังไม่เคยได้ CPU
      readyQueue.push(i);     // คิวเริ่มต้น P1, P2, ..., Pn
    }

    while (readyQueue.length > 0) {
      var index = readyQueue.shift();  // หยิบโปรเซสหัวคิว

      // ST คือเวลาที่ได้ CPU "ครั้งแรก" เท่านั้น รอบถัดไปไม่ต้องบันทึกซ้ำ
      if (startTimes[index] === null) {
        startTimes[index] = currentTime;
      }

      // ใช้ CPU เต็ม quantum หรือเท่าที่เหลือ ถ้าเหลือน้อยกว่า quantum
      var runTime = Math.min(quantum, remainingTimes[index]);
      gantt.push({ id: processes[index].id, start: currentTime, end: currentTime + runTime });
      currentTime = currentTime + runTime;
      remainingTimes[index] = remainingTimes[index] - runTime;

      if (remainingTimes[index] > 0) {
        readyQueue.push(index);              // ยังไม่เสร็จ ต่อท้ายคิว
      } else {
        completionTimes[index] = currentTime; // เสร็จแล้ว บันทึก CT
      }
    }

    return buildResult('RR', quantum, processes, startTimes, completionTimes, gantt);
  }

  return {
    fcfs: fcfs,
    sjf: sjf,
    roundRobin: roundRobin
  };
})();

// ให้ Node ใช้ require('./js/scheduler.js') ได้ (สำหรับไฟล์ทดสอบ)
// ใน browser ไม่มี module จึงข้ามบรรทัดนี้ และใช้ตัวแปร Scheduler ได้เลย
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Scheduler;
}
