/*
 * ทดสอบ js/scheduler.js
 * วิธีรัน:  node tests/scheduler.test.js
 *
 * ใช้ node:assert ที่มากับ Node อยู่แล้ว ไม่ต้องติดตั้งอะไรเพิ่ม
 * ค่าคาดหวังมาจาก docs/TEST_CASES.md
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const Scheduler = require(path.join(__dirname, '..', 'js', 'scheduler.js'));

// ---------- ตัวช่วย ----------

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (error) {
    failed++;
    console.log('  ✗ ' + name);
    console.log('    ' + error.message.split('\n').join('\n    '));
  }
}

// [5, 3, 8, 6] -> [{ id: 'P1', arrivalTime: 0, burstTime: 5 }, ...]
function makeProcesses(burstTimes) {
  return burstTimes.map((burstTime, i) => ({ id: 'P' + (i + 1), arrivalTime: 0, burstTime }));
}

function column(result, key) {
  return result.rows.map((row) => row[key]);
}

// เทียบ ST, CT, WT และ AVG WT กับค่าที่คำนวณไว้
function expectResult(result, expected) {
  assert.deepEqual(column(result, 'startTime'), expected.st, 'ST');
  assert.deepEqual(column(result, 'completionTime'), expected.ct, 'CT');
  assert.deepEqual(column(result, 'waitingTime'), expected.wt, 'WT');
  assert.equal(result.averageWaitingTime, expected.avgWT, 'AVG WT');
}

function ganttText(result) {
  return result.gantt.map((slot) => slot.id + ' ' + slot.start + '-' + slot.end).join(', ');
}

// เงื่อนไขที่ต้องเป็นจริงเสมอ ไม่ว่าข้อมูลจะเป็นอะไร
function checkInvariants(result, burstTimes, quantum) {
  const totalBurst = burstTimes.reduce((sum, bt) => sum + bt, 0);

  // Gantt ต่อกันไม่มีช่องว่าง ไม่ซ้อนกัน เริ่มที่ 0 จบที่ผลรวม BT
  let expectedStart = 0;
  for (const slot of result.gantt) {
    assert.equal(slot.start, expectedStart, 'Gantt มีช่องว่างหรือซ้อนกันที่ ' + slot.id);
    assert.ok(slot.end > slot.start, 'Gantt มีช่วงความยาว 0');
    if (quantum !== null) {
      assert.ok(slot.end - slot.start <= quantum, 'RR ใช้ CPU เกิน quantum');
    }
    expectedStart = slot.end;
  }
  assert.equal(expectedStart, totalBurst, 'Gantt ไม่จบที่ผลรวม BT');

  let totalWaiting = 0;
  result.rows.forEach((row, i) => {
    assert.equal(row.id, 'P' + (i + 1), 'rows ต้องเรียง P1..Pn');
    assert.equal(row.burstTime, burstTimes[i]);
    assert.equal(row.turnaroundTime, row.completionTime - row.arrivalTime, 'TAT = CT - AT');
    assert.equal(row.waitingTime, row.turnaroundTime - row.burstTime, 'WT = TAT - BT');
    assert.ok(row.waitingTime >= 0, 'WT ติดลบ');
    assert.ok(row.startTime >= 0 && row.startTime < row.completionTime, 'ST ต้องน้อยกว่า CT');

    // ผลรวมเวลาใน Gantt ของโปรเซสนี้ = BT, ช่วงแรก = ST, ช่วงสุดท้าย = CT
    const slots = result.gantt.filter((slot) => slot.id === row.id);
    const used = slots.reduce((sum, slot) => sum + (slot.end - slot.start), 0);
    assert.equal(used, row.burstTime, row.id + ' ได้ CPU ไม่เท่ากับ BT');
    assert.equal(slots[0].start, row.startTime, row.id + ' ST ไม่ตรงกับ Gantt');
    assert.equal(slots[slots.length - 1].end, row.completionTime, row.id + ' CT ไม่ตรงกับ Gantt');

    totalWaiting += row.waitingTime;
  });
  assert.equal(result.averageWaitingTime, totalWaiting / burstTimes.length, 'AVG WT');
}

// ---------- TC-01: BT = 5, 3, 8, 6 ----------

console.log('TC-01  BT = [5, 3, 8, 6]');
const tc01 = makeProcesses([5, 3, 8, 6]);

test('FCFS', () => {
  const result = Scheduler.fcfs(tc01);
  assert.equal(result.algorithm, 'FCFS');
  assert.equal(result.quantum, null);
  expectResult(result, { st: [0, 5, 8, 16], ct: [5, 8, 16, 22], wt: [0, 5, 8, 16], avgWT: 7.25 });
  assert.equal(ganttText(result), 'P1 0-5, P2 5-8, P3 8-16, P4 16-22');
});

test('SJF', () => {
  const result = Scheduler.sjf(tc01);
  assert.equal(result.algorithm, 'SJF');
  expectResult(result, { st: [3, 0, 14, 8], ct: [8, 3, 22, 14], wt: [3, 0, 14, 8], avgWT: 6.25 });
  assert.equal(ganttText(result), 'P2 0-3, P1 3-8, P4 8-14, P3 14-22');
});

test('RR q=2', () => {
  const result = Scheduler.roundRobin(tc01, 2);
  assert.equal(result.algorithm, 'RR');
  assert.equal(result.quantum, 2);
  expectResult(result, { st: [0, 2, 4, 6], ct: [16, 11, 22, 20], wt: [11, 8, 14, 14], avgWT: 11.75 });
  assert.equal(
    ganttText(result),
    'P1 0-2, P2 2-4, P3 4-6, P4 6-8, P1 8-10, P2 10-11, P3 11-13, P4 13-15, P1 15-16, P3 16-18, P4 18-20, P3 20-22'
  );
});

test('TAT = CT เพราะ AT = 0', () => {
  for (const result of [Scheduler.fcfs(tc01), Scheduler.sjf(tc01), Scheduler.roundRobin(tc01, 2)]) {
    assert.deepEqual(column(result, 'turnaroundTime'), column(result, 'completionTime'));
  }
});

test('ไม่แก้ไข array ที่ส่งเข้ามา', () => {
  const before = JSON.stringify(tc01);
  Scheduler.fcfs(tc01);
  Scheduler.sjf(tc01);
  Scheduler.roundRobin(tc01, 2);
  assert.equal(JSON.stringify(tc01), before);
});

// ---------- TC-02: ชุดเดิม เปลี่ยน TQ ----------

console.log('TC-02  ชุดเดิม เปลี่ยน TQ');

test('RR q=4', () => {
  const result = Scheduler.roundRobin(tc01, 4);
  expectResult(result, { st: [0, 4, 7, 11], ct: [16, 7, 20, 22], wt: [11, 4, 12, 16], avgWT: 10.75 });
  assert.equal(ganttText(result), 'P1 0-4, P2 4-7, P3 7-11, P4 11-15, P1 15-16, P3 16-20, P4 20-22');
});

test('RR q=10 (TQ >= BT สูงสุด) ได้ผลเหมือน FCFS', () => {
  const rr = Scheduler.roundRobin(tc01, 10);
  const fcfs = Scheduler.fcfs(tc01);
  assert.deepEqual(rr.rows, fcfs.rows);
  assert.deepEqual(rr.gantt, fcfs.gantt);
});

// ---------- TC-04, TC-05: กรณีขอบ ----------

console.log('TC-04  โปรเซสเดียว');

test('BT = [7] ทุกอัลกอริทึม', () => {
  const single = makeProcesses([7]);
  for (const result of [Scheduler.fcfs(single), Scheduler.sjf(single), Scheduler.roundRobin(single, 2)]) {
    expectResult(result, { st: [0], ct: [7], wt: [0], avgWT: 0 });
  }
});

test('RR q=2 กับ BT = [7] แบ่งเป็นหลายช่วงต่อกัน', () => {
  const result = Scheduler.roundRobin(makeProcesses([7]), 2);
  assert.equal(ganttText(result), 'P1 0-2, P1 2-4, P1 4-6, P1 6-7');
});

console.log('TC-05  BT เท่ากัน (tie-break)');
const tc05 = makeProcesses([4, 4, 4]);

test('SJF เมื่อ BT เท่ากัน ได้ลำดับ P1, P2, P3 เหมือน FCFS', () => {
  const result = Scheduler.sjf(tc05);
  expectResult(result, { st: [0, 4, 8], ct: [4, 8, 12], wt: [0, 4, 8], avgWT: 4 });
  assert.deepEqual(result.rows, Scheduler.fcfs(tc05).rows);
});

test('SJF tie-break เฉพาะคู่ที่เท่ากัน: BT = [6, 2, 6, 2]', () => {
  const result = Scheduler.sjf(makeProcesses([6, 2, 6, 2]));
  assert.equal(ganttText(result), 'P2 0-2, P4 2-4, P1 4-10, P3 10-16');
});

test('RR q=2', () => {
  const result = Scheduler.roundRobin(tc05, 2);
  expectResult(result, { st: [0, 2, 4], ct: [8, 10, 12], wt: [4, 6, 8], avgWT: 6 });
});

// ---------- ข้อมูลผิด ----------

console.log('ข้อมูลผิด ต้อง throw Error');

test('ไม่มีโปรเซส', () => {
  assert.throws(() => Scheduler.fcfs([]));
  assert.throws(() => Scheduler.sjf(undefined));
});

test('BT ไม่ใช่จำนวนเต็มบวก', () => {
  for (const badBurst of [0, -1, 2.5, '3', NaN, null]) {
    const processes = [{ id: 'P1', arrivalTime: 0, burstTime: badBurst }];
    assert.throws(() => Scheduler.fcfs(processes), /P1/, 'BT = ' + badBurst);
  }
});

test('AT ไม่เท่ากับ 0', () => {
  assert.throws(() => Scheduler.fcfs([{ id: 'P1', arrivalTime: 2, burstTime: 3 }]));
});

test('TQ ไม่ใช่จำนวนเต็มบวก', () => {
  for (const badQuantum of [0, -2, 1.5, '2', undefined]) {
    assert.throws(() => Scheduler.roundRobin(tc01, badQuantum), /Time Quantum/, 'TQ = ' + badQuantum);
  }
});

// ---------- ข้อมูลสุ่ม: ตรวจ invariant ----------

console.log('ข้อมูลสุ่ม 500 ชุด (n = 1–20, BT = 1–10, TQ = 1–6)');

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

test('invariant ของทุกอัลกอริทึม', () => {
  for (let round = 0; round < 500; round++) {
    const n = randomInt(1, 20);
    const burstTimes = [];
    for (let i = 0; i < n; i++) {
      burstTimes.push(randomInt(1, 10));
    }
    const quantum = randomInt(1, 6);
    const processes = makeProcesses(burstTimes);
    const label = '\n    ข้อมูล: BT = [' + burstTimes + '], TQ = ' + quantum;

    try {
      const fcfs = Scheduler.fcfs(processes);
      const sjf = Scheduler.sjf(processes);
      const rr = Scheduler.roundRobin(processes, quantum);

      checkInvariants(fcfs, burstTimes, null);
      checkInvariants(sjf, burstTimes, null);
      checkInvariants(rr, burstTimes, quantum);

      // FCFS และ SJF รันจนจบในครั้งเดียว: CT - ST = BT
      for (const row of fcfs.rows.concat(sjf.rows)) {
        assert.equal(row.completionTime - row.startTime, row.burstTime, 'Non-preemptive ต้องรันรวดเดียว');
      }

      // SJF ให้ AVG WT ต่ำที่สุดเมื่อทุกโปรเซสมาพร้อมกัน
      assert.ok(sjf.averageWaitingTime <= fcfs.averageWaitingTime, 'SJF ต้องไม่แย่กว่า FCFS');
      assert.ok(sjf.averageWaitingTime <= rr.averageWaitingTime, 'SJF ต้องไม่แย่กว่า RR');
    } catch (error) {
      error.message += label;
      throw error;
    }
  }
});

// ---------- สรุป ----------

console.log('\nผ่าน ' + passed + ' / ' + (passed + failed));
if (failed > 0) {
  process.exitCode = 1;
}
