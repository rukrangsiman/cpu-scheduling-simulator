/*
 * theme.js — สลับโหมดมืด / สว่าง
 *
 * โหลดไฟล์นี้ใน <head> (ก่อนหน้าเว็บแสดงผล) เพื่อใส่ธีมที่ผู้ใช้เคยเลือกไว้ทันที
 * หน้าเว็บจะได้ไม่กะพริบเป็นสีขาวก่อนแล้วค่อยเปลี่ยนเป็นสีเข้ม
 *
 * ถ้าผู้ใช้ยังไม่เคยกดปุ่มสลับ จะใช้ธีมตามการตั้งค่าของเครื่อง (CSS @media prefers-color-scheme)
 * ถ้ากดแล้ว จะใส่ data-theme="light" หรือ "dark" ที่แท็ก <html> และจำค่าไว้ใน localStorage
 */

var Theme = (function () {
  'use strict';

  var STORAGE_KEY = 'cpu-scheduler-theme';
  var systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  // บางเครื่อง/โหมดส่วนตัวปิด localStorage ไว้ ถ้าอ่านหรือเขียนไม่ได้ให้ใช้ธีมตามเครื่องแทน (ไม่ให้หน้าเว็บพัง)
  function loadSavedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // จำค่าไม่ได้ก็ไม่เป็นไร ธีมยังเปลี่ยนในหน้านี้ตามปกติ
    }
  }

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
  // ชื่อของสวิตช์ ("โหมดมืด" / "Dark mode") ตั้งโดย i18n.js ผ่าน data-i18n-aria-label
  function updateSwitch() {
    var themeSwitch = document.getElementById('theme-switch');
    if (!themeSwitch) {
      return;
    }
    var isDark = getCurrentTheme() === 'dark';
    themeSwitch.setAttribute('aria-checked', isDark ? 'true' : 'false');
  }

  function toggle() {
    var nextTheme = getCurrentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    saveTheme(nextTheme);
    updateSwitch();
  }

  // 1) ใส่ธีมที่เคยเลือกไว้ทันทีตอนโหลดไฟล์ (ยังอยู่ใน <head>)
  var savedTheme = loadSavedTheme();
  if (savedTheme === 'light' || savedTheme === 'dark') {
    applyTheme(savedTheme);
  }

  // 2) สวิตช์อยู่ใน <body> ซึ่งยังไม่ถูกสร้าง จึงต้องรอให้หน้าเว็บโหลดเสร็จก่อนผูก event
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('theme-switch').addEventListener('click', toggle);
    updateSwitch();
  });

  // ถ้าผู้ใช้เปลี่ยนธีมของเครื่องระหว่างเปิดหน้าเว็บ สวิตช์ต้องเลื่อนตาม
  systemDarkQuery.addEventListener('change', updateSwitch);

  return {
    toggle: toggle,
    getCurrentTheme: getCurrentTheme
  };
})();
