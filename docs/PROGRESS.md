# PROGRESS — ความคืบหน้าโปรเจ็ค

> AI: อัปเดตไฟล์นี้ทุกครั้งที่จบงาน (ติ๊ก checklist + เพิ่มบันทึก session ด้านล่าง)
> สถานะ: ⬜ ยังไม่เริ่ม · 🟨 กำลังทำ · ✅ เสร็จ

**Phase ปัจจุบัน:** Phase 1 เสร็จ → เริ่ม Phase 2
**อัปเดตล่าสุด:** 2026-10-12

---

## Phase 0 — Setup และวางแผน
- ✅ สร้างเอกสารการทำงาน (CLAUDE.md, docs/*, subagents)
- ✅ ผู้ใช้ยืนยัน DECISIONS ทั้งหมด (D-001 ถึง D-010)
- ⬜ ใส่รายชื่อสมาชิกและแบ่ง Role A / B / C
- ✅ `git init` + commit แรก

## Phase 1 — Algorithm core (Role A)
- ✅ `js/scheduler.js`: `fcfs()`, `sjf()`, `roundRobin()` + `buildResult()` คำนวณ TAT/WT/AVG ร่วมกัน
- ✅ `tests/scheduler.test.js` ครอบคลุม TC-01, TC-02, TC-04, TC-05, ข้อมูลผิด และ invariant จากข้อมูลสุ่ม 500 ชุด — ผ่าน 17/17
- ✅ เรียก `algorithm-verifier` ตรวจผลแบบอิสระ — 4 ชุด 13 การรัน ตรงทุกช่อง (AI-003)
- ⬜ สมาชิก Role A อ่านโค้ดและอธิบายได้ทุกฟังก์ชัน (เตรียมสำหรับวิดีโอ)

## Phase 2 — UI (Role B)
- ⬜ `index.html` layout: ส่วน input / เลือกโหมด BT / TQ / ปุ่มคำนวณ / ผลลัพธ์
- ⬜ `js/validation.js` ครบทุกข้อใน R1.5
- ⬜ `js/ui.js`: สร้างช่อง BT ตาม n, สุ่ม BT, แสดงข้อความแจ้งเตือน
- ⬜ `css/style.css`

## Phase 3 — เชื่อมต่อและแสดงผล
- ⬜ ตารางผลลัพธ์ + AVG WT แยกแท็บ FCFS / SJF / RR
- ⬜ แท็บเปรียบเทียบ (ชุดข้อมูลเดียวกัน)
- ⬜ ประวัติ RR หลายค่า TQ
- ⬜ (เสริม) Gantt chart, ปุ่มโหลดตัวอย่าง

## Phase 4 — ทดสอบ (Role C)
- ⬜ รัน TC ทั้งหมดผ่าน UI จริงใน Chrome และ Edge แล้วจับภาพหน้าจอ
- ⬜ ทดสอบ input ผิดทุกกรณี (TC-V*)
- ⬜ **สมาชิกคำนวณมือ TC-01 เอง** แล้วลงชื่อใน TEST_CASES (R1.6d — ห้ามให้ AI ทำแทน)

## Phase 5 — เอกสารส่งงาน
- ⬜ README.md ครบ D3–D7
- ⬜ เรียก `submission-auditor` ตรวจทั้งโปรเจ็ค

## Phase 6 — วิดีโอ
- ⬜ `docs/VIDEO_PLAN.md`: บทวิดีโอส่วนที่ 2 แบ่งช่วงให้สมาชิกทุกคน
- ⬜ บทวิดีโอส่วนที่ 3 จาก AI_LOG (เลือก 3–5 ตัวอย่างเด่น รวมกรณีที่ AI ผิดแล้วทีมแก้)
- ⬜ อัด / ตัดต่อ / export ไฟล์วิดีโอ

---

## บันทึก session

| วันที่ | สิ่งที่ทำ | ผู้ทำ / AI |
|---|---|---|
| 2026-10-12 | วางแผนโปรเจ็ค สร้าง CLAUDE.md, docs/ (SPEC, DECISIONS, PROGRESS, NEXT_STEPS, AI_LOG, TEST_CASES) และ subagents 2 ตัว | Claude Code |
| 2026-10-12 | ยืนยัน DECISIONS, `git init`, เขียน `js/scheduler.js` และ `tests/scheduler.test.js` (17/17 ผ่าน), ตรวจด้วย algorithm-verifier | Claude Code |
