# NEXT STEPS — งานถัดไป

> AI: เขียนไฟล์นี้ใหม่ทั้งหมดทุกครั้งที่จบงาน ให้เหลือเฉพาะงานที่ยังไม่ทำ เรียงตามลำดับ
> แต่ละงานต้องมีเกณฑ์ "เสร็จเมื่อ" ที่ตรวจได้จริง

**อัปเดตล่าสุด:** 2026-10-12

---

## ⏳ รอผู้ใช้
1. **ทบทวน `docs/DECISIONS.md`** แล้วยืนยันหรือแก้รายการ 🟦 โดยเฉพาะ
   - D-005 จะทำ SRTF (optional) หรือไม่
   - D-006 ขอบเขตค่า input
2. **ส่งรายชื่อสมาชิก** และบอกว่าใครรับ Role A / B / C
3. **ยืนยันให้ `git init`** หรือไม่

## ▶ งานถัดไป (Phase 1 — Role A)
1. **สร้าง `js/scheduler.js`** ตาม data contract ใน CLAUDE.md ข้อ 5
   - เสร็จเมื่อ: มี `fcfs`, `sjf`, `roundRobin` และใช้ได้ทั้งใน browser (`window.Scheduler`) และ Node (`require`)
2. **สร้าง `tests/scheduler.test.js`** โดยใช้ `node:assert` (ไม่มี dependency)
   - เสร็จเมื่อ: `node tests/scheduler.test.js` ผ่าน TC-01 ถึง TC-05 และตรวจ invariant
     (ผลรวมช่วง Gantt = ผลรวม BT, WT ≥ 0, CT สูงสุด = ผลรวม BT)
3. **เรียก `algorithm-verifier`** กับ TC-01 และชุดสุ่มอีก 3 ชุด
   - เสร็จเมื่อ: ไม่พบความต่างระหว่างการคำนวณมือกับผลของโค้ด

## ⏭ ถัดจากนั้น (Phase 2 — Role B, ทำคู่ขนานได้)
- `js/validation.js` + test กรณี TC-V01 ถึง TC-V08
- `index.html` + `js/ui.js` + `css/style.css`
