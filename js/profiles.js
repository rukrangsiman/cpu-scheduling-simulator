/*
 * profiles.js — ข้อมูลของ CPU หลายตัว (เหมือนโปรไฟล์) ที่สลับไปมาได้ในแถบด้านซ้าย
 *
 * CPU แต่ละตัวมีชุดข้อมูลของตัวเอง: จำนวนโปรเซส, Burst Time, สี, Time Quantum และผลการ Run ครั้งล่าสุด
 * ไฟล์นี้จัดการเฉพาะ "ข้อมูล" (สร้าง / ทำสำเนา / แปลงเพื่อบันทึก / อ่านกลับ) ไม่แตะ DOM และไม่คำนวณ ST/CT/TAT/WT
 * ui.js เป็นคนอ่านค่าจากหน้าเว็บมาใส่ และเรียก Scheduler คำนวณผล
 *
 * บันทึกลง localStorage เหมือนธีมและภาษา (ปิดหน้าเว็บแล้วเปิดใหม่ CPU ยังอยู่)
 * ผลลัพธ์ไม่ได้บันทึกตรง ๆ แต่บันทึกชุด BT และค่า TQ ที่ใช้ Run ไว้ แล้วให้ Scheduler คำนวณใหม่ตอนเปิดหน้า
 */

var Profiles = (function () {
  'use strict';

  var STORAGE_KEY = 'cpu-scheduler-profiles';
  var MAX_PROFILES = 12;
  var MAX_NAME_LENGTH = 24;

  // ใช้ขอบเขตค่าเดียวกับการตรวจ input (จำนวนโปรเซส, BT, TQ)
  // ใน browser มีตัวแปร Validation จาก validation.js อยู่แล้ว ส่วนใน Node (ตอนรัน test) ต้อง require เอง
  var LIMITS = (typeof Validation !== 'undefined')
    ? Validation.LIMITS
    : require('./validation.js').LIMITS;

  // CPU ตัวใหม่: ยังไม่เคย Run (results = null) ใช้ BT ที่ ui.js สุ่มมาให้
  function createProfile(name, burstValues) {
    return {
      name: name,
      processCountText: String(burstValues.length),
      burstValues: burstValues.slice(), // ข้อความในช่อง BT (เก็บเป็นข้อความ เพราะผู้ใช้อาจกรอกผิดค้างไว้)
      quantumText: String(LIMITS.defaultQuantum),
      processColors: [],              // สีที่ผู้ใช้เลือก index 0 = P1 (ช่องว่าง = ใช้สีเริ่มต้น)
      selectedAlgorithm: 'FCFS',
      showCompare: false,
      showFormulas: false,
      formulaProcessId: 'P1',
      formulaOpen: false,             // ส่วนสูตรพับไว้ก่อน หน้าผลลัพธ์จะได้ไม่ยาวเกินไป (กดเพื่อกางได้)
      isStale: false,                 // true = แก้ข้อมูลหลัง Run ผลที่แสดงยังเป็นของข้อมูลเดิม
      burstTimes: null,               // ชุด BT ที่ใช้ Run ครั้งล่าสุด
      results: null,                  // { FCFS, SJF, RR } จาก Scheduler
      rrHistory: []                   // ผล RR ของหลายค่า TQ บนชุด BT เดียวกัน
    };
  }

  // ทำสำเนาทั้งข้อมูลและผลลัพธ์ แก้ตัวใหม่แล้วตัวเดิมต้องไม่เปลี่ยนตาม
  // JSON.parse(JSON.stringify(...)) คัดลอกทุกชั้น เพราะข้อมูลมีแค่ตัวเลข ข้อความ อาร์เรย์ และ object ธรรมดา
  function duplicateProfile(profile, name) {
    var copy = JSON.parse(JSON.stringify(profile));
    copy.name = name;
    return copy;
  }

  // ตัดช่องว่างหัวท้ายและความยาวเกิน ถ้าเหลือว่างให้ใช้ชื่อเดิม
  function cleanName(text, fallback) {
    var name = String(text).trim().slice(0, MAX_NAME_LENGTH);
    return name === '' ? fallback : name;
  }

  // ---------- แปลงเป็นข้อมูลที่บันทึกได้ ----------

  function toSavedProfile(profile) {
    var saved = {
      name: profile.name,
      processCountText: profile.processCountText,
      burstValues: profile.burstValues,
      quantumText: profile.quantumText,
      processColors: profile.processColors,
      selectedAlgorithm: profile.selectedAlgorithm,
      showCompare: profile.showCompare,
      isStale: profile.isStale,
      lastRun: null
    };
    // เก็บแค่ "ข้อมูลที่ใช้ Run" ไม่เก็บตารางผลลัพธ์ เพราะคำนวณใหม่จากข้อมูลนี้ได้ผลเท่าเดิมเสมอ
    if (profile.results) {
      var quantums = [];
      for (var i = 0; i < profile.rrHistory.length; i++) {
        quantums.push(profile.rrHistory[i].quantum);
      }
      saved.lastRun = {
        burstTimes: profile.burstTimes,
        quantum: profile.results.RR.quantum,
        historyQuantums: quantums
      };
    }
    return saved;
  }

  function toSavedData(profiles, activeIndex, nextNumber) {
    var list = [];
    for (var i = 0; i < profiles.length; i++) {
      list.push(toSavedProfile(profiles[i]));
    }
    return { version: 1, activeIndex: activeIndex, nextNumber: nextNumber, profiles: list };
  }

  // ---------- อ่านข้อมูลที่บันทึกไว้กลับมา ----------
  // ข้อมูลใน localStorage อาจเสียหรือเป็นของเวอร์ชันเก่า จึงตรวจทุกช่องก่อนใช้ ถ้าผิดให้ใช้ค่าเริ่มต้นแทน

  function isWholeNumberInRange(value, min, max) {
    return typeof value === 'number' && Math.floor(value) === value && value >= min && value <= max;
  }

  function isTextList(value) {
    if (!Array.isArray(value)) {
      return false;
    }
    for (var i = 0; i < value.length; i++) {
      if (typeof value[i] !== 'string') {
        return false;
      }
    }
    return true;
  }

  function isValidColorList(value) {
    if (!Array.isArray(value) || value.length > LIMITS.maxProcesses) {
      return false;
    }
    for (var i = 0; i < value.length; i++) {
      // ช่องว่าง (null) = ยังไม่ได้เลือกสี
      if (value[i] !== null && !/^#[0-9a-fA-F]{6}$/.test(value[i])) {
        return false;
      }
    }
    return true;
  }

  // ข้อมูล Run ล่าสุดต้องเป็นชุด BT ที่ถูกต้องตามขอบเขตเดียวกับตอนกรอก ไม่อย่างนั้นถือว่ายังไม่เคย Run
  function readLastRun(lastRun) {
    if (!lastRun || !Array.isArray(lastRun.burstTimes)) {
      return null;
    }
    var burstTimes = lastRun.burstTimes;
    if (burstTimes.length < 1 || burstTimes.length > LIMITS.maxProcesses) {
      return null;
    }
    for (var i = 0; i < burstTimes.length; i++) {
      if (!isWholeNumberInRange(burstTimes[i], 1, LIMITS.maxBurstTime)) {
        return null;
      }
    }
    if (!isWholeNumberInRange(lastRun.quantum, 1, LIMITS.maxQuantum)) {
      return null;
    }

    var quantums = [];
    var history = Array.isArray(lastRun.historyQuantums) ? lastRun.historyQuantums : [];
    for (var j = 0; j < history.length; j++) {
      if (isWholeNumberInRange(history[j], 1, LIMITS.maxQuantum)) {
        quantums.push(history[j]);
      }
    }
    return { burstTimes: burstTimes.slice(), quantum: lastRun.quantum, historyQuantums: quantums };
  }

  // แปลงข้อมูลที่บันทึกไว้ของ CPU หนึ่งตัวกลับเป็นโปรไฟล์ (ยังไม่มีผลลัพธ์ ui.js จะคำนวณจาก savedRun)
  function fromSavedProfile(saved, fallbackName) {
    if (!saved || typeof saved !== 'object' || !isTextList(saved.burstValues) || saved.burstValues.length < 1) {
      return null;
    }
    // CPU ที่บันทึกจากรุ่นก่อน (เคยรับได้ 20 โปรเซส) อาจมีเกิน 10 ตัว: เก็บเฉพาะโปรเซสแรก ๆ ไว้ ไม่ทิ้งทั้ง CPU (D-036)
    var isTrimmed = saved.burstValues.length > LIMITS.maxProcesses;
    var profile = createProfile(cleanName(saved.name || '', fallbackName),
      saved.burstValues.slice(0, LIMITS.maxProcesses));
    if (typeof saved.processCountText === 'string' && !isTrimmed) {
      profile.processCountText = saved.processCountText;
    }
    if (typeof saved.quantumText === 'string') {
      profile.quantumText = saved.quantumText;
    }
    if (Array.isArray(saved.processColors)) {
      var colors = saved.processColors.slice(0, LIMITS.maxProcesses);
      if (isValidColorList(colors)) {
        profile.processColors = colors;
      }
    }
    if (saved.selectedAlgorithm === 'SJF' || saved.selectedAlgorithm === 'RR') {
      profile.selectedAlgorithm = saved.selectedAlgorithm;
    }
    profile.savedRun = readLastRun(saved.lastRun);
    // เปิดหน้าเปรียบเทียบ / แจ้งผลเก่า ได้เฉพาะเมื่อมีผลลัพธ์
    profile.showCompare = saved.showCompare === true && profile.savedRun !== null;
    profile.isStale = saved.isStale === true && profile.savedRun !== null;
    return profile;
  }

  // คืน { profiles, activeIndex, nextNumber } หรือ null ถ้าข้อมูลใช้ไม่ได้เลย
  function fromSavedData(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.profiles)) {
      return null;
    }
    var profiles = [];
    for (var i = 0; i < data.profiles.length && profiles.length < MAX_PROFILES; i++) {
      var profile = fromSavedProfile(data.profiles[i], 'CPU ' + (i + 1));
      if (profile) {
        profiles.push(profile);
      }
    }
    if (profiles.length === 0) {
      return null;
    }

    var activeIndex = isWholeNumberInRange(data.activeIndex, 0, profiles.length - 1) ? data.activeIndex : 0;
    // เลขของ CPU ตัวถัดไปต้องมากกว่าจำนวนที่มีอยู่ จะได้ไม่ได้ชื่อซ้ำกับตัวเดิม
    var nextNumber = isWholeNumberInRange(data.nextNumber, 1, 9999) ? data.nextNumber : profiles.length + 1;
    if (nextNumber <= profiles.length) {
      nextNumber = profiles.length + 1;
    }
    return { profiles: profiles, activeIndex: activeIndex, nextNumber: nextNumber };
  }

  // ---------- localStorage ----------
  // ห่อด้วย try/catch: ถ้า browser ปิด localStorage หรือข้อมูลเสีย หน้าเว็บยังใช้ได้ แค่จำ CPU ไม่ได้

  function load() {
    try {
      var text = localStorage.getItem(STORAGE_KEY);
      return text ? fromSavedData(JSON.parse(text)) : null;
    } catch (error) {
      return null;
    }
  }

  function save(profiles, activeIndex, nextNumber) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSavedData(profiles, activeIndex, nextNumber)));
    } catch (error) {
      // บันทึกไม่ได้ก็ไม่เป็นไร CPU ยังใช้งานได้ในหน้านี้ตามปกติ
    }
  }

  return {
    MAX_PROFILES: MAX_PROFILES,
    MAX_NAME_LENGTH: MAX_NAME_LENGTH,
    createProfile: createProfile,
    duplicateProfile: duplicateProfile,
    cleanName: cleanName,
    toSavedData: toSavedData,
    fromSavedData: fromSavedData,
    load: load,
    save: save
  };
})();

// ให้ไฟล์ test ใน Node เรียกใช้ได้ (ใน browser ไม่มี module จึงข้ามบรรทัดนี้)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Profiles;
}
