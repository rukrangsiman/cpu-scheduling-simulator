/*
 * validation.js — ตรวจสอบข้อมูลที่ผู้ใช้กรอก (Role B)
 *
 * รับค่าเป็น "ข้อความ" ตามที่พิมพ์ในช่อง input แล้วตอบกลับเป็น
 *   ผ่าน:     { ok: true,  value: 5 }          (หรือ values: [...] สำหรับ Burst Time)
 *   ไม่ผ่าน:  { ok: false, message: '...' }   ข้อความภาษาไทยสำหรับแสดงให้ผู้ใช้
 *
 * ไฟล์นี้ไม่ยุ่งกับหน้าเว็บ (DOM) จึงทดสอบด้วย Node ได้ ดู tests/validation.test.js
 */

var Validation = (function () {
  'use strict';

  // ขอบเขตค่าที่รับ (DECISIONS D-006) ui.js ใช้ค่าชุดเดียวกันนี้
  var LIMITS = {
    maxProcesses: 20,
    maxBurstTime: 100,
    randomBurstMin: 1,
    randomBurstMax: 10,
    maxQuantum: 100,
    defaultQuantum: 2
  };

  function fail(message) {
    return { ok: false, message: message };
  }

  // ตรวจว่าข้อความเป็นจำนวนเต็มบวกที่ไม่เกิน max (DECISIONS D-007)
  // label คือชื่อช่องที่จะขึ้นต้นข้อความแจ้งเตือน เช่น 'Burst Time ของ P3'
  //
  // ใช้ regex แทน parseInt เพราะ parseInt('2.5') ได้ 2 และ parseInt('3abc') ได้ 3
  // ซึ่งจะทำให้โปรแกรมรับค่าผิดไปโดยผู้ใช้ไม่รู้ตัว
  function parsePositiveInteger(text, label, max) {
    var trimmed = (text === undefined || text === null) ? '' : String(text).trim();

    if (trimmed === '') {
      return fail(label + ': ยังไม่ได้กรอกค่า');
    }
    // แยกกรณี 0 และติดลบออกมา เพื่อบอกผู้ใช้ให้ตรงจุด (โจทย์ข้อ 1.5)
    if (/^-?0+$/.test(trimmed) || /^-\d+$/.test(trimmed)) {
      return fail(label + ': ต้องมากกว่า 0 (กรอกมา "' + trimmed + '")');
    }
    if (!/^\d+$/.test(trimmed)) {
      return fail(label + ': ต้องเป็นจำนวนเต็มบวก ไม่มีทศนิยมหรือตัวอักษร (กรอกมา "' + trimmed + '")');
    }

    var value = Number(trimmed);
    if (value > max) {
      return fail(label + ': ต้องไม่เกิน ' + max + ' (กรอกมา "' + trimmed + '")');
    }
    return { ok: true, value: value };
  }

  function validateProcessCount(text) {
    return parsePositiveInteger(text, 'จำนวนโปรเซส', LIMITS.maxProcesses);
  }

  function validateQuantum(text) {
    return parsePositiveInteger(text, 'Time Quantum', LIMITS.maxQuantum);
  }

  // texts คือข้อความในช่อง Burst Time เรียงตาม P1..Pn
  // ถ้าไม่ผ่าน จะคืน invalidIndexes ด้วย เพื่อให้ ui.js ไฮไลต์ช่องที่ผิดได้
  function validateBurstTimes(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      return fail('ยังไม่มีตาราง Burst Time กรุณากด "สร้างตาราง" ก่อน');
    }

    // ตรวจ "กรอกไม่ครบ" ก่อน แล้วบอกทีเดียวว่าโปรเซสไหนยังว่างอยู่บ้าง (โจทย์ข้อ 1.5)
    var emptyIndexes = [];
    var emptyNames = [];
    for (var i = 0; i < texts.length; i++) {
      var text = (texts[i] === undefined || texts[i] === null) ? '' : String(texts[i]).trim();
      if (text === '') {
        emptyIndexes.push(i);
        emptyNames.push('P' + (i + 1));
      }
    }
    if (emptyIndexes.length > 0) {
      return {
        ok: false,
        message: 'กรอก Burst Time ไม่ครบ: ' + emptyNames.join(', ') + ' ยังว่างอยู่',
        invalidIndexes: emptyIndexes
      };
    }

    // กรอกครบแล้ว ตรวจทีละช่อง และรวบรวมข้อผิดพลาดทุกช่องไว้แสดงพร้อมกัน
    var values = [];
    var messages = [];
    var invalidIndexes = [];
    for (var j = 0; j < texts.length; j++) {
      var result = parsePositiveInteger(texts[j], 'Burst Time ของ P' + (j + 1), LIMITS.maxBurstTime);
      if (result.ok) {
        values.push(result.value);
      } else {
        messages.push(result.message);
        invalidIndexes.push(j);
      }
    }

    if (messages.length > 0) {
      return { ok: false, message: messages.join('\n'), invalidIndexes: invalidIndexes };
    }
    return { ok: true, values: values };
  }

  return {
    LIMITS: LIMITS,
    validateProcessCount: validateProcessCount,
    validateBurstTimes: validateBurstTimes,
    validateQuantum: validateQuantum
  };
})();

// ให้ Node ใช้ require('./js/validation.js') ได้ (สำหรับไฟล์ทดสอบ)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validation;
}
