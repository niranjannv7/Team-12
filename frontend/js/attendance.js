/**
 * attendance.js — Attendance Table Rendering & Student Management UI
 * Handles all table rendering for faculty dashboard sections.
 */

// ── Daily Attendance (Presentees & Absentees) ───────────────
let allAbsentees = [];
let allPresentees = [];
let currentAttTab = 'present';

async function loadAbsentees() {
  const date = document.getElementById('absenteeDate')?.value || getTodayStr();
  try {
    const [resA, resP] = await Promise.all([
      API.getAbsentees(date),
      API.getPresentees(date)
    ]);
    allAbsentees = resA?.absentees || [];
    allPresentees = resP?.presentees || [];
    
    renderAbsentees(allAbsentees);
    renderPresentees(allPresentees);
    populateSubjectFilter();
    filterAbsentees(); // apply default filter
  } catch (e) {
    showToast('Failed to load attendance logs', 'error');
  }
}

function switchAttTab(tab) {
  currentAttTab = tab;
  document.getElementById('tabPresentees').className = "action-btn " + (tab === 'present' ? "primary" : "secondary") + " small";
  document.getElementById('tabAbsentees').className = "action-btn " + (tab === 'absent' ? "primary" : "secondary") + " small";
  
  if (tab === 'present') {
    document.getElementById('presenteeTableWrap').classList.remove('hidden');
    document.getElementById('absenteeTableWrap').classList.add('hidden');
  } else {
    document.getElementById('presenteeTableWrap').classList.add('hidden');
    document.getElementById('absenteeTableWrap').classList.remove('hidden');
  }
}

function renderPresentees(data) {
  const body = document.getElementById('presenteeBody');
  const empty = document.getElementById('presenteeEmpty');
  if (!body) return;

  if (!data.length) {
    body.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  body.innerHTML = data.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><code style="font-size:0.78rem;color:var(--accent-2)">${p.reg}</code></td>
      <td><strong>${p.name}</strong></td>
      <td>${p.subject}</td>
      <td>${p.time}</td>
      <td><span class="badge badge-green">Present</span></td>
    </tr>
  `).join('');
}

function renderAbsentees(data) {
  const body = document.getElementById('absenteeBody');
  const empty = document.getElementById('absenteeEmpty');
  if (!body) return;

  if (!data.length) {
    body.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  body.innerHTML = data.map((a, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><code style="font-size:0.78rem;color:var(--accent-2)">${a.reg}</code></td>
      <td><strong>${a.name}</strong></td>
      <td>${a.subject}</td>
      <td>${a.time}</td>
      <td>
        <div style="display:flex;flex-direction:column;gap:0.2rem">
          ${a.contact ? `<a href="tel:${a.contact}" style="color:var(--text-dim);font-size:0.8rem">${a.contact}</a>` : ''}
          ${a.email ? `<a href="mailto:${a.email}" style="color:var(--text-dim);font-size:0.8rem">${a.email}</a>` : `<span style="color:var(--text-dim);font-size:0.8rem">No Contact</span>`}
        </div>
      </td>
      <td>
        <button class="action-btn secondary small" onclick="notifyStudent('${a.email || ''}','${a.name}','${a.subject}','${a.time}')">
          Notify
        </button>
      </td>
    </tr>
  `).join('');
}

function filterAbsentees(query) {
  if (!query && typeof query !== 'string') query = document.getElementById('attSearchInput')?.value || '';
  const subj = document.getElementById('absenteeSubjectFilter')?.value || '';
  const q = (query || '').toLowerCase();
  
  const filterFn = item => {
    const matchQ = !q || item.name.toLowerCase().includes(q) || item.reg.toLowerCase().includes(q);
    const matchS = !subj || item.subject === subj;
    return matchQ && matchS;
  };
  
  renderAbsentees(allAbsentees.filter(filterFn));
  renderPresentees(allPresentees.filter(filterFn));
}

function populateSubjectFilter() {
  const sel = document.getElementById('absenteeSubjectFilter');
  if (!sel) return;
  const subjects = [...new Set([...allAbsentees.map(a => a.subject), ...allPresentees.map(p => p.subject)])];
  sel.innerHTML = '<option value="">All Subjects</option>' +
    subjects.map(s => `<option value="${s}">${s}</option>`).join('');
}

function exportAbsentees() {
  const rows = [['Register No', 'Name', 'Subject', 'Time', 'Contact']];
  allAbsentees.forEach(a => rows.push([a.reg, a.name, a.subject, a.time, a.contact]));
  downloadCSV(rows, `absentees_${getTodayStr()}.csv`);
}

function notifyStudent(email, name, subject, time) {
  if (!email || email === 'null' || email === 'undefined') {
    showToast(`No email address saved for ${name}`, 'error');
    return;
  }
  const body = `Dear ${name},%0D%0A%0D%0AYou were marked absent for the ${subject} session today at ${time}. Please ensure you attend the upcoming sessions.%0D%0A%0D%0ARegards,%0D%0AFaculty`;
  window.location.href = `mailto:${email}?subject=Absentee Notice: ${subject}&body=${body}`;
  showToast(`Drafting email to ${email}...`, 'success');
}

// ── Students ───────────────────────────────────────────────
let allStudents = [];
let deleteTargetId = null;
let capturedFaceImages = [];

async function loadStudents() {
  try {
    const res = await API.getStudents();
    allStudents = res?.students || [];
    renderStudents(allStudents);
    populateBatchDeptFilters();
  } catch (e) {
    showToast('Failed to load students', 'error');
  }
}

function renderStudents(data) {
  const body = document.getElementById('studentBody');
  const empty = document.getElementById('studentEmpty');
  if (!body) return;

  if (!data.length) {
    body.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  body.innerHTML = data.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <div class="avatar" style="width:32px;height:32px;font-size:0.65rem">${initials(s.name)}</div>
      </td>
      <td><strong>${s.name}</strong></td>
      <td><code style="font-size:0.78rem;color:var(--accent-2)">${s.reg}</code></td>
      <td>${s.class_name || '–'} / ${s.section || '–'}</td>
      <td>${s.dept}</td>
      <td>${s.batch || '–'}</td>
      <td style="color:var(--text-muted);font-size:0.8rem">${s.email || '–'}</td>
      <td>
        ${s.face_count > 0
          ? `<span class="badge badge-green">${s.face_count} images</span>`
          : `<span class="badge badge-red">No data</span>`}
      </td>
      <td>
        <div style="display:flex;gap:0.4rem">
          <button class="action-btn secondary small" onclick="openStudentModal('edit', ${s.id})">Edit</button>
          <button class="action-btn danger small" onclick="openDeleteModal(${s.id}, '${s.name}')">Remove</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterStudents(query) {
  const q = (query || document.getElementById('studentSearch')?.value || '').toLowerCase();
  const batch = document.getElementById('batchFilter')?.value || '';
  const dept  = document.getElementById('deptFilter')?.value || '';
  const filtered = allStudents.filter(s =>
    (!q || s.name.toLowerCase().includes(q) || s.reg.toLowerCase().includes(q)) &&
    (!batch || s.batch === batch) &&
    (!dept  || s.dept === dept)
  );
  renderStudents(filtered);
}

function populateBatchDeptFilters() {
  const batches = [...new Set(allStudents.map(s => s.batch))];
  const depts   = [...new Set(allStudents.map(s => s.dept))];
  const bSel = document.getElementById('batchFilter');
  const dSel = document.getElementById('deptFilter');
  if (bSel) bSel.innerHTML = '<option value="">All Batches</option>' + batches.map(b => `<option>${b}</option>`).join('');
  if (dSel) dSel.innerHTML = '<option value="">All Departments</option>' + depts.map(d => `<option>${d}</option>`).join('');
}

function openStudentModal(mode, id) {
  capturedFaceImages = [];
  document.getElementById('facePreviewGrid').innerHTML = '';
  const modal = document.getElementById('studentModal');
  modal.classList.remove('hidden');

  if (mode === 'add') {
    document.getElementById('modalTitle').textContent = 'Add Student';
    document.getElementById('editStudentId').value = '';
    ['sName','sReg','sDept','sBatch','sClass','sSection','sEmail','sPhone'].forEach(f => {
      const el = document.getElementById(f);
      if (el) el.value = '';
    });
  } else {
    const s = allStudents.find(x => x.id === id);
    if (!s) return;
    document.getElementById('modalTitle').textContent = 'Edit Student';
    document.getElementById('editStudentId').value = s.id;
    document.getElementById('sName').value  = s.name;
    document.getElementById('sReg').value   = s.reg;
    document.getElementById('sDept').value  = s.dept;
    document.getElementById('sBatch').value = s.batch || '';
    document.getElementById('sClass').value = s.class_name || '';
    document.getElementById('sSection').value = s.section || '';
    document.getElementById('sEmail').value = s.email || '';
    document.getElementById('sPhone').value = s.phone || '';
  }
}

async function handleStudentSubmit(e) {
  e.preventDefault();
  let id = document.getElementById('editStudentId').value;
  const data = {
    name:  document.getElementById('sName').value.trim(),
    reg:   document.getElementById('sReg').value.trim(),
    dept:  document.getElementById('sDept').value.trim(),
    batch: document.getElementById('sBatch').value.trim(),
    class_name: document.getElementById('sClass').value,
    section: document.getElementById('sSection').value,
    email: document.getElementById('sEmail').value.trim(),
    phone: document.getElementById('sPhone').value.trim(),
    face_count: capturedFaceImages.length,
  };

  try {
    if (id) {
      await API.updateStudent(parseInt(id), data);
      showToast('Student updated successfully', 'success');
    } else {
      const res = await API.addStudent(data);
      id = res.student.id;
      showToast('Student added successfully', 'success');
    }

    // Upload face images if any captured
    if (capturedFaceImages.length && id) {
      const formData = new FormData();
      capturedFaceImages.forEach((dataUrl, i) => {
        const base64Data = dataUrl.split(',')[1];
        const byteString = atob(base64Data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
        const blob = new Blob([ab], { type: 'image/jpeg' });
        formData.append(`file${i}`, blob, `face_${i}.jpg`);
      });
      await API.uploadFaceImages(id, formData);
      showToast(`${capturedFaceImages.length} face image(s) saved`, 'info');
    }

    closeModal('studentModal');
    await loadStudents();
  } catch (err) {
    showToast(err.message || 'Failed to save student', 'error');
  }
}

function openDeleteModal(id, name) {
  deleteTargetId = id;
  document.getElementById('deleteStudentName').textContent = name;
  document.getElementById('deleteModal').classList.remove('hidden');
}

async function confirmDelete() {
  if (!deleteTargetId) return;
  try {
    await API.deleteStudent(deleteTargetId);
    showToast('Student removed', 'success');
    closeModal('deleteModal');
    await loadStudents();
  } catch (err) {
    showToast('Failed to remove student', 'error');
  }
  deleteTargetId = null;
}

// ── Face capture (enrollment) ───────────────────────────────
async function captureFaceFromCamera() {
  document.getElementById('cameraModal').classList.remove('hidden');
  await Camera.startCaptureStream();
}

async function snapFaceImage() {
  const video  = document.getElementById('captureVideo');
  const canvas = document.getElementById('captureCanvas');
  const dataUrl = await Camera.captureSingleFrame(video, canvas);
  capturedFaceImages.push(dataUrl);
  addFaceThumb(dataUrl);
  closeCameraModal();
}

function handleFaceUpload(event) {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      capturedFaceImages.push(e.target.result);
      addFaceThumb(e.target.result);
    };
    reader.readAsDataURL(file);
  });
}

function addFaceThumb(dataUrl) {
  const grid = document.getElementById('facePreviewGrid');
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;display:inline-block';
  wrap.innerHTML = `
    <img src="${dataUrl}" class="face-thumb"/>
    <button onclick="this.parentElement.remove()" style="position:absolute;top:-6px;right:-6px;background:var(--red);border:none;color:#fff;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center">✕</button>
  `;
  grid.appendChild(wrap);
}

function closeCameraModal() {
  Camera.stopStream();
  document.getElementById('cameraModal').classList.add('hidden');
}

// ── Reports ─────────────────────────────────────────────────
let reportRows = [];

async function generateReport() {
  const subject = document.getElementById('reportSubject')?.value || '';
  const from    = document.getElementById('reportFrom')?.value || '';
  const to      = document.getElementById('reportTo')?.value || '';

  try {
    const res = await API.getReport(subject, from, to);
    reportRows = res?.rows || [];
    const stats = res?.stats || {};

    document.getElementById('statTotal').textContent    = stats.total || '–';
    document.getElementById('statPresent').textContent  = (stats.avg_percent || '–') + (stats.avg_percent ? '%' : '');
    document.getElementById('statAbsent').textContent   = stats.defaulters || '–';
    document.getElementById('statSessions').textContent = stats.sessions || '–';

    renderReportTable(reportRows);
    showToast('Report generated', 'success');
  } catch (err) {
    showToast('Failed to generate report', 'error');
  }
}

function renderReportTable(rows) {
  const body = document.getElementById('reportBody');
  if (!body) return;
  body.innerHTML = rows.map((r, i) => {
    const cls = r.percent >= 75 ? 'badge-green' : r.percent >= 60 ? 'badge-yellow' : 'badge-red';
    const status = r.percent >= 75 ? 'Good' : r.percent >= 60 ? 'Warning' : 'Defaulter';
    return `
      <tr>
        <td>${i+1}</td>
        <td><strong>${r.name}</strong></td>
        <td><code style="font-size:0.78rem;color:var(--accent-2)">${r.reg}</code></td>
        <td>${r.total}</td>
        <td style="color:#4ade80">${r.present}</td>
        <td style="color:#f87171">${r.absent}</td>
        <td>
          <div style="display:flex;align-items:center;gap:0.6rem">
            <div style="flex:1;height:4px;background:rgba(255,255,255,0.08);border-radius:4px;min-width:60px">
              <div style="height:100%;border-radius:4px;background:${r.percent>=75?'#22c55e':r.percent>=60?'#f59e0b':'#ef4444'};width:${r.percent}%"></div>
            </div>
            <span style="font-weight:600;font-size:0.85rem">${r.percent}%</span>
          </div>
        </td>
        <td><span class="badge ${cls}">${status}</span></td>
      </tr>
    `;
  }).join('');
}

function exportReport() {
  const rows = [['Name','Register No','Classes Held','Present','Absent','Percentage']];
  reportRows.forEach(r => rows.push([r.name, r.reg, r.total, r.present, r.absent, r.percent+'%']));
  downloadCSV(rows, `attendance_report_${getTodayStr()}.csv`);
}

function exportSession() {
  showToast('Session CSV exported', 'success');
  // TODO: implement with actual session data
}

// ── Utilities ───────────────────────────────────────────────
function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}