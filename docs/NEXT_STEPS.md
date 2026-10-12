# NEXT STEPS — งานถัดไป

> AI: เขียนไฟล์นี้ใหม่ทั้งหมดทุกครั้งที่จบงาน ให้เหลือเฉพาะงานที่ยังไม่ทำ เรียงตามลำดับ
> แต่ละงานต้องมีเกณฑ์ "เสร็จเมื่อ" ที่ตรวจได้จริง

**อัปเดตล่าสุด:** 2026-10-12

---

## ⏳ รอผู้ใช้ / สมาชิก
1. **ส่งรายชื่อสมาชิก** และบอกว่าใครรับ Role A / B / C
2. **สมาชิก Role A อ่าน `js/scheduler.js`** แล้วลองอธิบายด้วยคำพูดตัวเองว่า
   - ทำไม FCFS กับ SJF ใช้ `runInOrder` ร่วมกันได้
   - ทำไม RR ต้องเช็ก `startTimes[index] === null` ก่อนบันทึก ST
   - ทำไม SJF แบบ Preemptive ได้ผลเหมือน Non-preemptive ในโจทย์นี้
3. **สมาชิกคำนวณมือ TC-01** ใน `docs/TEST_CASES.md` แล้วลงชื่อ (R1.6d)
4. ทบทวน entry AI-001 ถึง AI-003 ใน `docs/AI_LOG.md` แล้วเปลี่ยน ⬜ เป็น ✅ พร้อมชื่อผู้ตรวจ

## ▶ งานถัดไป (Phase 2 — Role B)
1. **สร้าง `js/validation.js`** ตาม D-006, D-007
   - ฟังก์ชัน `validateProcessCount(text)`, `validateBurstTimes(texts)`, `validateQuantum(text)`
     คืน `{ ok: true, value }` หรือ `{ ok: false, message }` ข้อความภาษาไทยระบุโปรเซสที่ผิด
   - เสร็จเมื่อ: `node tests/validation.test.js` ผ่าน TC-V01 ถึง TC-V08
2. **สร้าง `index.html` + `css/style.css` + `js/ui.js`**
   - ส่วน input: จำนวนโปรเซส, โหมด BT (สุ่ม 1–10 / กรอกเอง), Time Quantum (ค่าเริ่มต้น 2), ปุ่มคำนวณ
   - ส่วนผลลัพธ์: แท็บ FCFS / SJF / RR / เปรียบเทียบ, ตาราง 7 คอลัมน์ + AVG WT (ทศนิยม 2 ตำแหน่ง)
   - เสร็จเมื่อ: double-click `index.html` ใน Chrome แล้วได้ผล TC-01 ตรงกับ TEST_CASES
3. **ประวัติ RR หลายค่า TQ** (D-008) และ Gantt chart (D-009)

## ⏭ ถัดจากนั้น
- Phase 4: ทดสอบผ่าน UI ทุก TC ใน Chrome และ Edge + จับภาพหน้าจอ
- Phase 5: README.md แล้วเรียก `submission-auditor`
