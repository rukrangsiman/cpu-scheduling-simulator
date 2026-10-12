/*
 * ทดสอบ js/profiles.js (ข้อมูลของ CPU หลายตัว)
 * วิธีรัน:  node tests/profiles.test.js
 *
 * ไม่ทดสอบส่วน localStorage (ใน Node ไม่มี) ทดสอบเฉพาะการสร้าง / ทำสำเนา / แปลงเพื่อบันทึก / อ่านกลับ
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const Profiles = require(path.join(__dirname, '..', 'js', 'profiles.js'));

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

// โปรไฟล์ที่ "เคย Run แล้ว" แบบย่อ (ใส่เฉพาะช่องที่ profiles.js ใช้ ผลจริงมาจาก Scheduler ใน ui.js)
function ranProfile() {
  const profile = Profiles.createProfile('CPU 1', ['5', '3', '8', '6']);
  profile.burstMode = 'manual';
  profile.burstTimes = [5, 3, 8, 6];
  profile.results = { FCFS: {}, SJF: {}, RR: { quantum: 3 } };
  profile.rrHistory = [{ quantum: 2 }, { quantum: 3 }];
  profile.processColors = ['#ff0000', null, '#00ff00'];
  return profile;
}

console.log('สร้างและทำสำเนา');

test('CPU ใหม่: ยังไม่เคย Run, TQ เริ่มต้น 2, จำนวนโปรเซสตามชุด BT', () => {
  const profile = Profiles.createProfile('CPU 1', ['4', '7']);
  assert.equal(profile.name, 'CPU 1');
  assert.equal(profile.processCountText, '2');
  assert.equal(profile.quantumText, '2');
  assert.equal(profile.results, null);
  assert.deepEqual(profile.rrHistory, []);
});

test('createProfile ไม่ใช้อาร์เรย์เดียวกับที่ส่งเข้ามา', () => {
  const values = ['4', '7'];
  const profile = Profiles.createProfile('CPU 1', values);
  values[0] = '99';
  assert.equal(profile.burstValues[0], '4');
});

test('ทำสำเนาแล้วแก้ตัวใหม่ ตัวเดิมไม่เปลี่ยนตาม', () => {
  const original = ranProfile();
  const copy = Profiles.duplicateProfile(original, 'CPU 2');
  copy.burstValues[0] = '10';
  copy.processColors[0] = '#123456';
  copy.rrHistory.push({ quantum: 9 });
  assert.equal(copy.name, 'CPU 2');
  assert.equal(original.name, 'CPU 1');
  assert.equal(original.burstValues[0], '5');
  assert.equal(original.processColors[0], '#ff0000');
  assert.equal(original.rrHistory.length, 2);
});

test('cleanName: ตัดช่องว่าง ตัดความยาวเกิน และใช้ชื่อเดิมถ้าว่าง', () => {
  assert.equal(Profiles.cleanName('  Server A  ', 'CPU 1'), 'Server A');
  assert.equal(Profiles.cleanName('   ', 'CPU 1'), 'CPU 1');
  assert.equal(Profiles.cleanName('x'.repeat(40), 'CPU 1').length, Profiles.MAX_NAME_LENGTH);
});

console.log('บันทึกและอ่านกลับ');

test('บันทึกแล้วอ่านกลับ: ข้อมูลกรอกและข้อมูล Run ครั้งล่าสุดครบ', () => {
  const saved = Profiles.toSavedData([ranProfile(), Profiles.createProfile('CPU 2', ['1'])], 1, 3);
  // ผ่าน JSON เหมือนเก็บใน localStorage จริง
  const loaded = Profiles.fromSavedData(JSON.parse(JSON.stringify(saved)));
  assert.equal(loaded.profiles.length, 2);
  assert.equal(loaded.activeIndex, 1);
  assert.equal(loaded.nextNumber, 3);

  const first = loaded.profiles[0];
  assert.equal(first.burstMode, 'manual');
  assert.deepEqual(first.burstValues, ['5', '3', '8', '6']);
  assert.deepEqual(first.processColors, ['#ff0000', null, '#00ff00']);
  assert.deepEqual(first.savedRun, { burstTimes: [5, 3, 8, 6], quantum: 3, historyQuantums: [2, 3] });
  // ผลลัพธ์ไม่ถูกบันทึก ui.js ต้องคำนวณใหม่จาก savedRun
  assert.equal(first.results, null);

  assert.equal(loaded.profiles[1].savedRun, null);
});

test('ข้อมูลเสียทั้งก้อน → null (ui.js จะสร้าง CPU 1 ใหม่)', () => {
  assert.equal(Profiles.fromSavedData(null), null);
  assert.equal(Profiles.fromSavedData({ profiles: 'abc' }), null);
  assert.equal(Profiles.fromSavedData({ profiles: [] }), null);
  assert.equal(Profiles.fromSavedData({ profiles: [{ name: 'x' }] }), null);
});

test('ข้าม CPU ที่ข้อมูลเสีย แต่เก็บตัวที่ดีไว้', () => {
  const loaded = Profiles.fromSavedData({
    profiles: [{ name: 'เสีย', burstValues: [5, 3] }, { name: 'ดี', burstValues: ['5', '3'] }]
  });
  assert.equal(loaded.profiles.length, 1);
  assert.equal(loaded.profiles[0].name, 'ดี');
});

test('ชุด BT ที่ Run ไว้ผิดขอบเขต (0, 2.5, 101, เกิน 20 ตัว) → ถือว่ายังไม่เคย Run', () => {
  const badRuns = [
    { burstTimes: [5, 0], quantum: 2 },
    { burstTimes: [5, 2.5], quantum: 2 },
    { burstTimes: [101], quantum: 2 },
    { burstTimes: new Array(21).fill(1), quantum: 2 },
    { burstTimes: [5, 3], quantum: 0 },
    { burstTimes: ['5', '3'], quantum: 2 }
  ];
  for (const lastRun of badRuns) {
    const loaded = Profiles.fromSavedData({
      profiles: [{ name: 'CPU 1', burstValues: ['5'], lastRun: lastRun, showCompare: true, isStale: true }]
    });
    assert.equal(loaded.profiles[0].savedRun, null, JSON.stringify(lastRun));
    // ไม่มีผลลัพธ์ จึงเปิดหน้าเปรียบเทียบหรือแจ้งผลเก่าไม่ได้
    assert.equal(loaded.profiles[0].showCompare, false);
    assert.equal(loaded.profiles[0].isStale, false);
  }
});

test('สีที่ไม่ใช่รูปแบบ #RRGGBB → ใช้สีเริ่มต้นทั้งหมด', () => {
  const loaded = Profiles.fromSavedData({
    profiles: [{ name: 'CPU 1', burstValues: ['5'], processColors: ['red'] }]
  });
  assert.deepEqual(loaded.profiles[0].processColors, []);
});

test('activeIndex เกินจำนวน CPU → เลือกตัวแรก, nextNumber ไม่ซ้ำกับตัวที่มี', () => {
  const loaded = Profiles.fromSavedData({
    activeIndex: 5,
    nextNumber: 1,
    profiles: [{ name: 'A', burstValues: ['1'] }, { name: 'B', burstValues: ['2'] }]
  });
  assert.equal(loaded.activeIndex, 0);
  assert.equal(loaded.nextNumber, 3);
});

test(`อ่าน CPU ได้ไม่เกิน ${Profiles.MAX_PROFILES} ตัว`, () => {
  const list = [];
  for (let i = 0; i < Profiles.MAX_PROFILES + 3; i++) {
    list.push({ name: 'CPU ' + (i + 1), burstValues: ['1'] });
  }
  assert.equal(Profiles.fromSavedData({ profiles: list }).profiles.length, Profiles.MAX_PROFILES);
});

console.log('\nผลรวม: ผ่าน ' + passed + ' / ' + (passed + failed));
if (failed > 0) {
  process.exit(1);
}
