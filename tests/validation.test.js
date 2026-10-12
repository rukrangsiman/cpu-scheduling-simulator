/*
 * ทดสอบ js/validation.js
 * วิธีรัน:  node tests/validation.test.js
 *
 * ครอบคลุม TC-V01 ถึง TC-V08 ใน docs/TEST_CASES.md
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const Validation = require(path.join(__dirname, '..', 'js', 'validation.js'));

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

function expectOk(result, value) {
  assert.equal(result.ok, true, 'ควรผ่าน แต่ได้: ' + result.message);
  assert.equal(result.value, value);
}

function expectFail(result, messagePattern) {
  assert.equal(result.ok, false, 'ควรไม่ผ่าน แต่ผ่าน');
  assert.match(result.message, messagePattern);
}

// ---------- จำนวนโปรเซส ----------

console.log('จำนวนโปรเซส');

test('ค่าปกติ 1, 3, 10, 20 และมีช่องว่างหัวท้าย', () => {
  expectOk(Validation.validateProcessCount('1'), 1);
  expectOk(Validation.validateProcessCount('3'), 3);
  expectOk(Validation.validateProcessCount(' 10 '), 10);
  expectOk(Validation.validateProcessCount('20'), 20);
});

test('TC-V01 ไม่กรอก', () => {
  expectFail(Validation.validateProcessCount(''), /^จำนวนโปรเซส: ยังไม่ได้กรอก/);
  expectFail(Validation.validateProcessCount('   '), /ยังไม่ได้กรอก/);
  expectFail(Validation.validateProcessCount(undefined), /ยังไม่ได้กรอก/);
});

test('TC-V02 เป็น 0', () => {
  expectFail(Validation.validateProcessCount('0'), /ต้องมากกว่า 0/);
  expectFail(Validation.validateProcessCount('000'), /ต้องมากกว่า 0/);
});

test('TC-V03 ติดลบ', () => {
  expectFail(Validation.validateProcessCount('-3'), /ต้องมากกว่า 0/);
  expectFail(Validation.validateProcessCount('-0'), /ต้องมากกว่า 0/);
});

test('TC-V04 ไม่ใช่จำนวนเต็ม', () => {
  for (const text of ['2.5', 'abc', '3abc', '1e2', '+3', '3 4', '٣', '0x5']) {
    expectFail(Validation.validateProcessCount(text), /จำนวนเต็มบวก/);
  }
});

test('TC-V05 เกิน 20', () => {
  expectFail(Validation.validateProcessCount('21'), /ไม่เกิน 20/);
  expectFail(Validation.validateProcessCount('99999999999999999999'), /ไม่เกิน 20/);
});

test('ข้อความแจ้งเตือนแสดงค่าที่ผู้ใช้กรอก', () => {
  expectFail(Validation.validateProcessCount('2.5'), /"2\.5"/);
});

// ---------- Burst Time ----------

console.log('Burst Time');

test('ค่าปกติ', () => {
  const result = Validation.validateBurstTimes(['5', ' 3', '8 ', '100']);
  assert.equal(result.ok, true);
  assert.deepEqual(result.values, [5, 3, 8, 100]);
});

test('ยังไม่มีตาราง', () => {
  expectFail(Validation.validateBurstTimes([]), /ขั้นที่ 1/);
  expectFail(Validation.validateBurstTimes(undefined), /ขั้นที่ 1/);
});

test('TC-V06 กรอกไม่ครบ บอกทุกโปรเซสที่ว่าง', () => {
  const result = Validation.validateBurstTimes(['5', '3', '', '6', '  ']);
  expectFail(result, /ไม่ครบ: P3, P5 ยังว่างอยู่/);
  assert.deepEqual(result.invalidIndexes, [2, 4]);
});

test('TC-V07 BT ไม่ใช่จำนวนเต็มบวก ระบุโปรเซสและรวมทุกข้อผิดพลาด', () => {
  const result = Validation.validateBurstTimes(['0', '-1', '1.5', 'x', '4']);
  assert.equal(result.ok, false);
  const lines = result.message.split('\n');
  assert.equal(lines.length, 4);
  assert.match(lines[0], /^Burst Time ของ P1: ต้องมากกว่า 0/);
  assert.match(lines[1], /^Burst Time ของ P2: ต้องมากกว่า 0/);
  assert.match(lines[2], /^Burst Time ของ P3: ต้องเป็นจำนวนเต็มบวก/);
  assert.match(lines[3], /^Burst Time ของ P4: ต้องเป็นจำนวนเต็มบวก/);
  assert.deepEqual(result.invalidIndexes, [0, 1, 2, 3]);
});

test('BT เกิน 100', () => {
  const result = Validation.validateBurstTimes(['5', '101']);
  expectFail(result, /P2: ต้องไม่เกิน 100/);
  assert.deepEqual(result.invalidIndexes, [1]);
});

test('กรณีว่างตรวจก่อนกรณีค่าผิด', () => {
  const result = Validation.validateBurstTimes(['abc', '']);
  expectFail(result, /ไม่ครบ: P2/);
  assert.deepEqual(result.invalidIndexes, [1]);
});

// ---------- Time Quantum ----------

console.log('Time Quantum');

test('ค่าปกติ และค่าเริ่มต้นเป็น 2', () => {
  expectOk(Validation.validateQuantum('2'), 2);
  expectOk(Validation.validateQuantum('1'), 1);
  expectOk(Validation.validateQuantum('100'), 100);
  assert.equal(Validation.LIMITS.defaultQuantum, 2);
});

test('TC-V08 TQ ไม่ใช่จำนวนเต็มบวก', () => {
  expectFail(Validation.validateQuantum(''), /^Time Quantum: ยังไม่ได้กรอก/);
  expectFail(Validation.validateQuantum('0'), /^Time Quantum: ต้องมากกว่า 0/);
  expectFail(Validation.validateQuantum('-2'), /^Time Quantum: ต้องมากกว่า 0/);
  expectFail(Validation.validateQuantum('1.5'), /^Time Quantum: ต้องเป็นจำนวนเต็มบวก/);
  expectFail(Validation.validateQuantum('101'), /^Time Quantum: ต้องไม่เกิน 100/);
});

// ---------- ข้อความภาษาอังกฤษ (ปุ่ม TH / ENG) ----------

console.log('ภาษาอังกฤษ');

test('ส่ง language = "en" ได้ข้อความภาษาอังกฤษ', () => {
  expectFail(Validation.validateProcessCount('', 'en'), /^Number of processes: no value entered$/);
  expectFail(Validation.validateProcessCount('21', 'en'), /^Number of processes: must not exceed 20 \(entered "21"\)$/);
  expectFail(Validation.validateQuantum('0', 'en'), /^Time Quantum: must be greater than 0/);
  expectFail(Validation.validateBurstTimes(['5', ''], 'en'), /^Burst Time is incomplete: P2 still empty$/);
  expectFail(Validation.validateBurstTimes(['1.5'], 'en'), /^Burst Time of P1: must be a positive whole number/);
  expectFail(Validation.validateBurstTimes([], 'en'), /step 1/);
});

test('ไม่ส่ง language หรือส่งภาษาที่ไม่รู้จัก ใช้ภาษาไทย', () => {
  expectFail(Validation.validateQuantum('abc'), /ต้องเป็นจำนวนเต็มบวก/);
  expectFail(Validation.validateQuantum('abc', 'fr'), /ต้องเป็นจำนวนเต็มบวก/);
});

console.log('\nผ่าน ' + passed + ' / ' + (passed + failed));
if (failed > 0) {
  process.exitCode = 1;
}
