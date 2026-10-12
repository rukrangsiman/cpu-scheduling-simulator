/*
 * validation.js — ตรวจสอบข้อมูลที่ผู้ใช้กรอก (Role B)
 *
 * รับค่าเป็น "ข้อความ" ตามที่พิมพ์ในช่อง input แล้วตอบกลับเป็น
 *   ผ่าน:     { ok: true,  value: 5 }          (หรือ values: [...] สำหรับ Burst Time)
 *   ไม่ผ่าน:  { ok: false, message: '...' }   ข้อความสำหรับแสดงให้ผู้ใช้
 *
 * ทุกฟังก์ชันรับ language ('th' หรือ 'en') เป็นพารามิเตอร์ตัวสุดท้าย ถ้าไม่ส่งมาจะใช้ภาษาไทย
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

  // ข้อความแจ้งเตือนทั้งสองภาษา {label} {input} {max} จะถูกแทนด้วยค่าจริงใน fillTemplate
  var MESSAGES = {
    th: {
      processCount: 'จำนวนโปรเซส',
      burstTimeOf: 'Burst Time ของ {id}',
      empty: '{label}: ยังไม่ได้กรอกค่า',
      notPositive: '{label}: ต้องมากกว่า 0 (กรอกมา "{input}")',
      notInteger: '{label}: ต้องเป็นจำนวนเต็มบวก ไม่มีทศนิยมหรือตัวอักษร (กรอกมา "{input}")',
      tooLarge: '{label}: ต้องไม่เกิน {max} (กรอกมา "{input}")',
      noBurstInputs: 'ยังไม่มีช่อง Burst Time กรุณากด "ถัดไป" ในขั้นที่ 1 ก่อน',
      burstMissing: 'กรอก Burst Time ไม่ครบ: {names} ยังว่างอยู่'
    },
    en: {
      processCount: 'Number of processes',
      burstTimeOf: 'Burst Time of {id}',
      empty: '{label}: no value entered',
      notPositive: '{label}: must be greater than 0 (entered "{input}")',
      notInteger: '{label}: must be a positive whole number, no decimals or letters (entered "{input}")',
      tooLarge: '{label}: must not exceed {max} (entered "{input}")',
      noBurstInputs: 'There are no Burst Time fields yet. Please press "Next" in step 1 first',
      burstMissing: 'Burst Time is incomplete: {names} still empty'
    }
  };

  // เลือกชุดข้อความตามภาษา ถ้าไม่รู้จักภาษานั้นให้ใช้ภาษาไทย
  function messagesFor(language) {
    return MESSAGES[language] || MESSAGES.th;
  }

  // แทน {ชื่อ} ในข้อความด้วยค่าจริง เช่น fillTemplate('{label}: ...', { label: 'Time Quantum' })
  function fillTemplate(template, values) {
    var text = template;
    var names = Object.keys(values);
    for (var i = 0; i < names.length; i++) {
      text = text.split('{' + names[i] + '}').join(String(values[names[i]]));
    }
    return text;
  }

  function fail(message) {
    return { ok: false, message: message };
  }

  // ตรวจว่าข้อความเป็นจำนวนเต็มบวกที่ไม่เกิน max (DECISIONS D-007)
  // label คือชื่อช่องที่จะขึ้นต้นข้อความแจ้งเตือน เช่น 'Burst Time ของ P3'
  //
  // ใช้ regex แทน parseInt เพราะ parseInt('2.5') ได้ 2 และ parseInt('3abc') ได้ 3
  // ซึ่งจะทำให้โปรแกรมรับค่าผิดไปโดยผู้ใช้ไม่รู้ตัว
  function parsePositiveInteger(text, label, max, language) {
    var messages = messagesFor(language);
    var trimmed = (text === undefined || text === null) ? '' : String(text).trim();
    var details = { label: label, input: trimmed, max: max };

    if (trimmed === '') {
      return fail(fillTemplate(messages.empty, details));
    }
    // แยกกรณี 0 และติดลบออกมา เพื่อบอกผู้ใช้ให้ตรงจุด (โจทย์ข้อ 1.5)
    if (/^-?0+$/.test(trimmed) || /^-\d+$/.test(trimmed)) {
      return fail(fillTemplate(messages.notPositive, details));
    }
    if (!/^\d+$/.test(trimmed)) {
      return fail(fillTemplate(messages.notInteger, details));
    }

    var value = Number(trimmed);
    if (value > max) {
      return fail(fillTemplate(messages.tooLarge, details));
    }
    return { ok: true, value: value };
  }

  function validateProcessCount(text, language) {
    return parsePositiveInteger(text, messagesFor(language).processCount, LIMITS.maxProcesses, language);
  }

  function validateQuantum(text, language) {
    return parsePositiveInteger(text, 'Time Quantum', LIMITS.maxQuantum, language);
  }

  // texts คือข้อความในช่อง Burst Time เรียงตาม P1..Pn
  // ถ้าไม่ผ่าน จะคืน invalidIndexes ด้วย เพื่อให้ ui.js ไฮไลต์ช่องที่ผิดได้
  function validateBurstTimes(texts, language) {
    var messages = messagesFor(language);
    if (!Array.isArray(texts) || texts.length === 0) {
      return fail(messages.noBurstInputs);
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
        message: fillTemplate(messages.burstMissing, { names: emptyNames.join(', ') }),
        invalidIndexes: emptyIndexes
      };
    }

    // กรอกครบแล้ว ตรวจทีละช่อง และรวบรวมข้อผิดพลาดทุกช่องไว้แสดงพร้อมกัน
    var values = [];
    var errorMessages = [];
    var invalidIndexes = [];
    for (var j = 0; j < texts.length; j++) {
      var label = fillTemplate(messages.burstTimeOf, { id: 'P' + (j + 1) });
      var result = parsePositiveInteger(texts[j], label, LIMITS.maxBurstTime, language);
      if (result.ok) {
        values.push(result.value);
      } else {
        errorMessages.push(result.message);
        invalidIndexes.push(j);
      }
    }

    if (errorMessages.length > 0) {
      return { ok: false, message: errorMessages.join('\n'), invalidIndexes: invalidIndexes };
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
