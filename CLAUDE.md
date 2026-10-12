# CPU Scheduling Simulator — คู่มือการทำงานสำหรับ AI

Term Project: เว็บจำลอง CPU Scheduling (FCFS, SJF Non-preemptive, Round Robin)
ทุกโปรเซสมี Arrival Time = 0 ข้อกำหนดฉบับเต็มอยู่ใน [docs/SPEC.md](docs/SPEC.md)

ตอบผู้ใช้เป็นภาษาไทย ใช้ศัพท์เทคนิคภาษาอังกฤษได้

---

## 1. เริ่มต้นทุก session (ต้องทำก่อนเสมอ)

1. อ่าน [docs/PROGRESS.md](docs/PROGRESS.md) เพื่อดูว่างานถึงไหนแล้ว
2. อ่าน [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) เพื่อดูงานถัดไป
3. อ่าน [docs/DECISIONS.md](docs/DECISIONS.md) ก่อนแก้โค้ด
   **ห้ามเปลี่ยนสิ่งที่ตัดสินใจแล้วโดยไม่ถามผู้ใช้ก่อน**

## 2. จบทุกงาน (Definition of Done)

- [ ] `node tests/scheduler.test.js`, `node tests/validation.test.js` และ `node tests/profiles.test.js` ผ่านทั้งหมด
- [ ] ถ้าแก้ UI: เปิดผ่าน Browser pane (`.claude/launch.json` → `static`) แล้วลองใช้งานจริง ดู console error
      (Browser pane เปิด `file://` แบบภาพนิ่ง จึงต้องใช้ local server ตอนทดสอบ แต่ผู้ตรวจเปิดไฟล์ตรงได้)
- [ ] ติ๊ก checklist และเพิ่มบันทึก session ใน `docs/PROGRESS.md`
- [ ] เขียน `docs/NEXT_STEPS.md` ใหม่ให้ตรงกับสถานะปัจจุบัน
- [ ] เพิ่ม entry ใน `docs/AI_LOG.md` (ดูข้อ 6)
- [ ] ถ้ามีการตัดสินใจใหม่ ให้เพิ่มใน `docs/DECISIONS.md`

## 3. ข้อบังคับทางเทคนิค

ผู้ตรวจต้องเปิด `index.html` ด้วยการ double-click ใน Chrome/Edge ได้ทันที ดังนั้น

- ใช้ Vanilla HTML / CSS / JavaScript เท่านั้น ไม่มี framework, ไม่มี build step, ไม่มี npm dependency
- **ห้ามใช้ ES modules** (`<script type="module">`, `import`/`export`) เพราะ Chrome บล็อกบน `file://`
  ให้ใช้ `<script src="...">` ธรรมดาแล้วเรียงลำดับการโหลดให้ถูก
- ห้าม `fetch()` ไฟล์ local, ห้ามพึ่ง CDN หรืออินเทอร์เน็ต
- ห้ามใช้ absolute path หรือ path เฉพาะเครื่องผู้พัฒนา
- แยกชั้นให้ชัด:
  | ไฟล์ | หน้าที่ | กฎ |
  |---|---|---|
  | `js/scheduler.js` | อัลกอริทึม + คำนวณ ST/CT/TAT/WT/AVG | pure function, ห้ามแตะ DOM |
  | `js/validation.js` | ตรวจสอบ input | pure function, ห้ามแตะ DOM |
  | `js/profiles.js` | ข้อมูล CPU หลายตัว (สร้าง / ทำสำเนา / บันทึก localStorage) (D-014) | ห้ามแตะ DOM, ห้ามคำนวณผล |
  | `js/ui.js` | แถบ CPU + แผงตั้งค่าแบบ dropdown + พื้นที่ผลลัพธ์ (D-017), รับ input, เรียก scheduler, render Gantt/KPI/ตาราง | ห้ามคำนวณผลเอง |
  | `js/modals.js` | popup (`<dialog>`) รายละเอียด CPU / วิธีทำงาน / ตั้งค่า + ภาพประกอบ SVG (D-016) | ห้ามคำนวณผลเอง โหลดก่อน `ui.js` |
  | `js/theme.js` | สลับธีมมืด/สว่าง (โหลดใน `<head>`) | ไม่ยุ่งกับข้อมูลโปรเซส |
  | `js/i18n.js` | ข้อความบนหน้าเว็บ TH/EN (`I18n.t()`, `data-i18n`) | ข้อความใหม่ต้องเพิ่มทั้ง `th` และ `en` |
- `scheduler.js`, `validation.js` และ `profiles.js` ต้องใช้ได้ทั้งใน browser และ Node:
  ```js
  if (typeof module !== 'undefined' && module.exports) { module.exports = Scheduler; }
  ```

## 4. สไตล์โค้ด

สมาชิกทุกคนต้องอธิบายโค้ดได้ในวิดีโอ ดังนั้น **อ่านง่ายสำคัญกว่าฉลาด**

- ใช้ `for` loop ธรรมดา ชื่อตัวแปรเต็ม (`remainingTime` ไม่ใช่ `rt`)
- comment ภาษาไทยอธิบาย "ทำไม" ในจุดสำคัญ (เช่น tie-break ของ SJF, การวนคิวของ RR)
- หลีกเลี่ยง one-liner ซับซ้อน, reduce ซ้อนกัน, หรือ trick ที่อธิบายยาก
- ฟังก์ชันละหนึ่งหน้าที่ ยาวไม่เกินประมาณ 40 บรรทัด

## 5. Data contract (ตกลงไว้เพื่อให้ Role A และ Role B ทำงานคู่ขนานได้)

```js
// Input ที่ส่งเข้า scheduler
const processes = [
  { id: 'P1', arrivalTime: 0, burstTime: 5 },
  { id: 'P2', arrivalTime: 0, burstTime: 3 },
];

// Output ของ Scheduler.fcfs(processes) / Scheduler.sjf(processes) / Scheduler.roundRobin(processes, quantum)
const result = {
  algorithm: 'FCFS' | 'SJF' | 'RR',
  quantum: null | number,           // มีค่าเฉพาะ RR
  rows: [                           // เรียงตาม P1..Pn เสมอ
    { id, arrivalTime, burstTime, startTime, completionTime, turnaroundTime, waitingTime },
  ],
  gantt: [ { id: 'P1', start: 0, end: 2 } ],  // ช่วงเวลาที่แต่ละโปรเซสได้ CPU ตามลำดับจริง
  averageWaitingTime: number,
  averageTurnaroundTime: number,
};
```

## 6. การบันทึกการใช้ AI (สำคัญ — เป็นเนื้อหาวิดีโอส่วนที่ 3)

ทุกครั้งที่ AI สร้างหรือแก้โค้ด/เอกสารที่มีนัยสำคัญ ให้เพิ่ม entry ใน `docs/AI_LOG.md` ตาม template ในไฟล์นั้น

- บันทึก prompt ของผู้ใช้ตามจริง (ย่อได้แต่ห้ามแต่ง)
- ระบุไฟล์ที่ AI สร้าง/แก้ และวิธีที่ใช้ตรวจสอบ
- ช่อง "มนุษย์ตรวจแล้ว" ให้ใส่ `⬜ รอตรวจ` เสมอ — **ห้ามใส่ว่าตรวจแล้วแทนผู้ใช้**
- ถ้า AI ทำผิดแล้วแก้ ให้บันทึกด้วย (เป็นตัวอย่างที่ดีสำหรับวิดีโอ)

## 7. Subagents (อยู่ใน `.claude/agents/`)

| Agent | ใช้เมื่อ |
|---|---|
| `algorithm-verifier` | หลังแก้ `js/scheduler.js` หรือเพิ่ม test case — คำนวณด้วยมือแบบอิสระแล้วเทียบกับผลของโค้ด |
| `submission-auditor` | ก่อนส่งงาน หรือเมื่อจบแต่ละ Phase — ตรวจกับ checklist ใน `docs/SPEC.md` |

เรียกใช้เมื่อผู้ใช้ขอ หรือเมื่อ NEXT_STEPS ระบุไว้ งานทั่วไปให้ทำใน session หลัก

ถ้าเรียกด้วยชื่อแล้วไม่พบ agent (เช่น agent เพิ่งสร้างและ session ยังไม่โหลด) ให้ใช้ `general-purpose`
แล้วสั่งให้อ่าน `.claude/agents/<ชื่อ>.md` และทำตามคำสั่งในไฟล์นั้นแทน
