/*
 * theme.js — สลับโหมดมืด / สว่าง และเปิด / ปิด animation พื้นหลัง (D-041)
 *
 * โหลดไฟล์นี้ใน <head> (ก่อนหน้าเว็บแสดงผล) เพื่อใส่ธีมที่ผู้ใช้เคยเลือกไว้ทันที
 * หน้าเว็บจะได้ไม่กะพริบเป็นสีขาวก่อนแล้วค่อยเปลี่ยนเป็นสีเข้ม
 *
 * ถ้าผู้ใช้ยังไม่เคยกดปุ่มสลับ จะใช้ธีมตามการตั้งค่าของเครื่อง (CSS @media prefers-color-scheme)
 * ถ้ากดแล้ว จะใส่ data-theme="light" หรือ "dark" ที่แท็ก <html> และจำค่าไว้ใน localStorage
 *
 * animation พื้นหลัง (ดวงอาทิตย์ แสงส้ม ภาพชิปที่หมุน) ปิดได้ในหน้าตั้งค่า: ใส่ data-motion="off" ที่แท็ก <html>
 * แล้ว CSS หยุด animation เหล่านั้น — ใส่ตั้งแต่อยู่ใน <head> เหมือนธีม พื้นหลังจึงไม่ขยับให้เห็นแวบหนึ่งก่อนหยุด
 */

var Theme = (function () {
  'use strict';

  var STORAGE_KEY = 'cpu-scheduler-theme';
  var MOTION_STORAGE_KEY = 'cpu-scheduler-motion';
  var systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  // บางเครื่อง/โหมดส่วนตัวปิด localStorage ไว้ ถ้าอ่านหรือเขียนไม่ได้ให้ใช้ค่าเริ่มต้นแทน (ไม่ให้หน้าเว็บพัง)
  function loadSaved(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // จำค่าไม่ได้ก็ไม่เป็นไร ธีม / animation ยังเปลี่ยนในหน้านี้ตามปกติ
    }
  }

  // ---------- ธีมมืด / สว่าง ----------

  // ธีมที่แสดงอยู่ตอนนี้: ถ้าผู้ใช้เลือกเองใช้ค่านั้น ถ้าไม่ได้เลือกให้ดูจากเครื่อง
  function getCurrentTheme() {
    var chosenTheme = document.documentElement.getAttribute('data-theme');
    if (chosenTheme === 'light' || chosenTheme === 'dark') {
      return chosenTheme;
    }
    return systemDarkQuery.matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // สวิตช์เลื่อนไปขวา (aria-checked="true") เมื่อเป็นโหมดมืด CSS ใช้ค่านี้เลื่อนปุ่มกลม
  // อัปเดตทุกอันที่มี class theme-switch (ตอนนี้มีอันเดียวที่มุมขวาบน — สวิตช์ในหน้าตั้งค่าถูกเอาออกใน D-040)
  // ชื่อของสวิตช์ ("โหมดมืด" / "Dark mode") ตั้งโดย i18n.js ผ่าน data-i18n-aria-label
  function updateSwitch() {
    var isDark = getCurrentTheme() === 'dark';
    var switches = document.querySelectorAll('.theme-switch');
    for (var i = 0; i < switches.length; i++) {
      switches[i].setAttribute('aria-checked', isDark ? 'true' : 'false');
    }
  }

  function toggle() {
    var nextTheme = getCurrentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    save(STORAGE_KEY, nextTheme);
    updateSwitch();
  }

  // ---------- animation พื้นหลัง ----------

  function isBackgroundMotionOn() {
    return document.documentElement.getAttribute('data-motion') !== 'off';
  }

  function applyBackgroundMotion(isOn) {
    if (isOn) {
      document.documentElement.removeAttribute('data-motion');
    } else {
      document.documentElement.setAttribute('data-motion', 'off');
    }
  }

  // สวิตช์ในหน้าตั้งค่า: aria-checked="true" = animation ทำงานอยู่
  function updateMotionSwitch() {
    var motionSwitch = document.getElementById('motion-switch');
    if (motionSwitch) {
      motionSwitch.setAttribute('aria-checked', isBackgroundMotionOn() ? 'true' : 'false');
    }
  }

  function toggleBackgroundMotion() {
    var nextIsOn = !isBackgroundMotionOn();
    applyBackgroundMotion(nextIsOn);
    save(MOTION_STORAGE_KEY, nextIsOn ? 'on' : 'off');
    updateMotionSwitch();
  }

  // 1) ใส่ธีมและสถานะ animation ที่เคยเลือกไว้ทันทีตอนโหลดไฟล์ (ยังอยู่ใน <head>)
  var savedTheme = loadSaved(STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    applyTheme(savedTheme);
  }
  applyBackgroundMotion(loadSaved(MOTION_STORAGE_KEY) !== 'off');

  // 2) สวิตช์อยู่ใน <body> ซึ่งยังไม่ถูกสร้าง จึงต้องรอให้หน้าเว็บโหลดเสร็จก่อนผูก event
  document.addEventListener('DOMContentLoaded', function () {
    var switches = document.querySelectorAll('.theme-switch');
    for (var i = 0; i < switches.length; i++) {
      switches[i].addEventListener('click', toggle);
    }
    updateSwitch();

    var motionSwitch = document.getElementById('motion-switch');
    if (motionSwitch) {
      motionSwitch.addEventListener('click', toggleBackgroundMotion);
    }
    updateMotionSwitch();
  });

  // ถ้าผู้ใช้เปลี่ยนธีมของเครื่องระหว่างเปิดหน้าเว็บ สวิตช์ต้องเลื่อนตาม
  systemDarkQuery.addEventListener('change', updateSwitch);

  return {
    toggle: toggle,
    getCurrentTheme: getCurrentTheme,
    isBackgroundMotionOn: isBackgroundMotionOn
  };
})();
