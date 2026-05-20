/**
 * main.js — Core application logic
 * Handles: login, register, routing, dashboard sections, student portal, shared utilities
 */

API.setMockMode(false);

// ══════════════════════════════════════════════════════════
//  LOGIN PAGE
// ══════════════════════════════════════════════════════════

function showLogin(role) {
  ['roleSelect','facultyLogin','studentLogin','registerLogin','forgotLogin'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });
  document.getElementById(role + 'Login')?.classList.remove('hidden');
}

function showRole() {
  ['facultyLogin','studentLogin','registerLogin','forgotLogin'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });
  document.getElementById('roleSelect')?.classList.remove('hidden');
}

async function handleFacultyLogin(e) {
  e.preventDefault();
  const name   = document.getElementById('facultyName').value.trim();
  const pass   = document.getElementById('facultyPass').value;
  const errEl  = document.getElementById('facultyError');
  const btn    = e.target.querySelector('.submit-btn');
  const spinner = btn.querySelector('.btn-spinner');
  const label   = btn.querySelector('span');

  errEl.classList.add('hidden');
  label.textContent = 'Signing in…';
  spinner.classList.remove('hidden');
  btn.disabled = true;

  try {
    const res = await API.loginFaculty(name, pass);
    if (res?.success) {
      sessionStorage.setItem('sa_user', JSON.stringify({ role: 'faculty', ...res.user }));
      window.location.href = 'dashboard.html';
    } else {
      throw new Error(res?.message || 'Login failed');
    }
  } catch (err) {
    errEl.textContent = err.message || 'Incorrect name or password.';
    errEl.classList.remove('hidden');
  } finally {
    label.textContent = 'Login as Faculty';
    spinner.classList.add('hidden');
    btn.disabled = false;
  }
}
async function handleFacultyRegister(e) {
  e.preventDefault();
  const name    = document.getElementById('regName').value.trim();
  const dept    = document.getElementById('regDept').value.trim();
  const subject = document.getElementById('regSubject').value.trim();
  const email   = document.getElementById('regEmail').value.trim();
  const pass    = document.getElementById('regPass').value;
  const confirm = document.getElementById('regConfirmPass').value;
  const errEl  = document.getElementById('registerError');
  const succEl = document.getElementById('registerSuccess');
  const btn    = e.target.querySelector('.submit-btn');
  const spinner = btn.querySelector('.btn-spinner');
  const label   = btn.querySelector('span');

  errEl.classList.add('hidden');
  succEl.classList.add('hidden');

  if (pass !== confirm) {
    errEl.textContent = 'Passwords do not match.';
    errEl.classList.remove('hidden');
    return;
  }

  label.textContent = 'Creating Account…';
  spinner.classList.remove('hidden');
  btn.disabled = true;

  try {
    const res = await API.registerFaculty({ name, dept, subject, email, password: pass });
    if (res?.success) {
      succEl.classList.remove('hidden');
      e.target.reset();
      document.getElementById('regPassStrength')?.style.setProperty('--strength', '0%');
      showToast('Account created! Please sign in.', 'success');
      setTimeout(() => showLogin('faculty'), 1800);
    } else {
      throw new Error(res?.message || 'Registration failed');
    }
  } catch (err) {
    errEl.textContent = err.message || 'Could not create account. Please try again.';
    errEl.classList.remove('hidden');
  } finally {
    label.textContent = 'Create Account';
    spinner.classList.add('hidden');
    btn.disabled = false;
  }
}

function updateRegPassStrength(pass) {
  const bar = document.getElementById('regPassStrength');
  if (!bar) return;
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  const map = ['0%','25%','50%','75%','100%'];
  const col = ['#ef4444','#ef4444','#f59e0b','#22c55e','#16a34a'];
  bar.style.setProperty('--strength', map[score]);
  bar.style.setProperty('--strength-color', col[score]);
}

// ── Forgot Password ────────────────────────────────────────
// Stores the verified faculty db_id between step 1 and step 2
let _forgotVerifiedName = null;

async function handleForgotVerify(e) {
  e.preventDefault();
  const name   = document.getElementById('forgotName').value.trim();
  const email  = document.getElementById('forgotEmail').value.trim();
  const errEl  = document.getElementById('forgotError');
  const btn    = e.target.querySelector('.submit-btn');
  const spinner = btn.querySelector('.btn-spinner');
  const label   = btn.querySelector('span');

  errEl.classList.add('hidden');
  label.textContent = 'Verifying…';
  spinner.classList.remove('hidden');
  btn.disabled = true;

  try {
    const res = await API.forgotPasswordVerify(name, email);
    if (res?.success) {
      _forgotVerifiedName = name;
      // Slide to step 2
      document.getElementById('forgotStep1').classList.add('hidden');
      document.getElementById('forgotStep2').classList.remove('hidden');
    } else {
      throw new Error(res?.message || 'Verification failed');
    }
  } catch (err) {
    errEl.textContent = err.message || 'No account found with that name and email.';
    errEl.classList.remove('hidden');
  } finally {
    label.textContent = 'Verify Account';
    spinner.classList.add('hidden');
    btn.disabled = false;
  }
}

async function handleForgotReset(e) {
  e.preventDefault();
  const newPass  = document.getElementById('forgotNewPass').value;
  const confirm  = document.getElementById('forgotConfirmPass').value;
  const errEl    = document.getElementById('forgotResetError');
  const succEl   = document.getElementById('forgotResetSuccess');
  const btn      = e.target.querySelector('.submit-btn');
  const spinner  = btn.querySelector('.btn-spinner');
  const label    = btn.querySelector('span');

  errEl.classList.add('hidden');
  succEl.classList.add('hidden');

  if (newPass !== confirm) {
    errEl.textContent = 'Passwords do not match.';
    errEl.classList.remove('hidden');
    return;
  }
  if (newPass.length < 8) {
    errEl.textContent = 'Password must be at least 8 characters.';
    errEl.classList.remove('hidden');
    return;
  }

  label.textContent = 'Resetting…';
  spinner.classList.remove('hidden');
  btn.disabled = true;

  try {
    const res = await API.forgotPasswordReset(_forgotVerifiedName, newPass);
    if (res?.success) {
      succEl.classList.remove('hidden');
      showToast('Password reset successfully!', 'success');
      // Reset panel state and redirect back to login after a moment
      setTimeout(() => {
        _forgotVerifiedName = null;
        document.getElementById('forgotStep1').classList.remove('hidden');
        document.getElementById('forgotStep2').classList.add('hidden');
        document.getElementById('forgotName').value = '';
        document.getElementById('forgotEmail').value = '';
        document.getElementById('forgotNewPass').value = '';
        document.getElementById('forgotConfirmPass').value = '';
        document.getElementById('forgotPassStrength').style.setProperty('--strength','0%');
        succEl.classList.add('hidden');
        showLogin('faculty');
      }, 2000);
    } else {
      throw new Error(res?.message || 'Reset failed');
    }
  } catch (err) {
    errEl.textContent = err.message || 'Could not reset password. Try again.';
    errEl.classList.remove('hidden');
  } finally {
    label.textContent = 'Reset Password';
    spinner.classList.add('hidden');
    btn.disabled = false;
  }
}

function updateForgotPassStrength(pass) {
  const bar = document.getElementById('forgotPassStrength');
  if (!bar) return;
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  const map = ['0%','25%','50%','75%','100%'];
  const col = ['#ef4444','#ef4444','#f59e0b','#22c55e','#16a34a'];
  bar.style.setProperty('--strength', map[score]);
  bar.style.setProperty('--strength-color', col[score]);
}

async function handleStudentLogin(e) {
  e.preventDefault();
  const name   = document.getElementById('studentName').value.trim();
  const reg    = document.getElementById('studentReg').value.trim();
  const errEl  = document.getElementById('studentError');
  const btn    = e.target.querySelector('.submit-btn');
  const spinner = btn.querySelector('.btn-spinner');
  const label   = btn.querySelector('span');

  errEl.classList.add('hidden');
  label.textContent = 'Signing in…';
  spinner.classList.remove('hidden');
  btn.disabled = true;

  try {
    const res = await API.loginStudent(name, reg);
    if (res?.success) {
      sessionStorage.setItem('sa_user', JSON.stringify({ role: 'student', ...res.user }));
      window.location.href = 'student.html';
    } else {
      throw new Error(res?.message || 'Login failed');
    }
  } catch (err) {
    errEl.textContent = err.message || 'Student not found. Check your details.';
    errEl.classList.remove('hidden');
  } finally {
    label.textContent = 'Login as Student';
    spinner.classList.add('hidden');
    btn.disabled = false;
  }
}

// ══════════════════════════════════════════════════════════
//  FACULTY DASHBOARD
// ══════════════════════════════════════════════════════════

function initDashboard() {
  const user = getUser();
  if (!user || user.role !== 'faculty') { window.location.href = 'index.html'; return; }

  document.getElementById('sidebarName').textContent   = user.name || 'Faculty';
  document.getElementById('sidebarAvatar').textContent = initials(user.name || 'FA');

  const abDate = document.getElementById('absenteeDate');
  if (abDate) abDate.value = getTodayStr();

  // Default start time: now, End time: now + 1 hour
  const startTimeInput = document.getElementById('sessionStartTime');
  const endTimeInput = document.getElementById('sessionEndTime');
  const d = new Date();
  const nowTime = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  if (startTimeInput) startTimeInput.value = nowTime;
  
  if (endTimeInput) {
    d.setHours(d.getHours() + 1);
    endTimeInput.value = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  updateLiveDate('liveDate');

  document.getElementById('newPass')?.addEventListener('input', function() {
    updatePassStrength(this.value);
  });

  loadStudents();
  loadAbsentees();
  generateReport();
  loadSubjectSummary();
}

function showSection(name, navEl) {
  document.querySelectorAll('.dash-section').forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('active');
  });
  const target = document.getElementById('section-' + name);
  if (target) { target.classList.remove('hidden'); target.classList.add('active'); }
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  document.getElementById('sidebar')?.classList.remove('open');
}

// ── End-time based session ──────────────────────────────────
let sessionCountdownInterval = null;

// ── Subject-wise Session Tracker ────────────────────────────
const SUBJECT_ICONS = {
  'Mathematics': '∑', 'Computer Science': '⌨', 'Physics': '⚛',
  'Chemistry': '⚗', 'Biology': '🧬', 'English': '✎',
  'History': '📜', 'Geography': '🌍', 'Economics': '📈',
  'Business Studies': '💼'
};
const SUBJECT_COLORS = [
  ['#818cf8','rgba(129,140,248,0.12)'],  // indigo
  ['#38bdf8','rgba(56,189,248,0.12)'],   // sky
  ['#f472b6','rgba(244,114,182,0.12)'],  // pink
  ['#fb923c','rgba(251,146,60,0.12)'],   // orange
  ['#4ade80','rgba(74,222,128,0.12)'],   // green
  ['#a78bfa','rgba(167,139,250,0.12)'],  // violet
  ['#fbbf24','rgba(251,191,36,0.12)'],   // amber
  ['#2dd4bf','rgba(45,212,191,0.12)'],   // teal
  ['#f87171','rgba(248,113,113,0.12)'],  // red
  ['#e879f9','rgba(232,121,249,0.12)'],  // fuchsia
];

async function loadSubjectSummary() {
  const grid = document.getElementById('subjectTrackerGrid');
  const badge = document.getElementById('trackerTotalBadge');
  if (!grid) return;

  try {
    const user = getUser();
    const res = await API.getSessionSummary(user?.id);
    const items = res?.summary || [];
    let totalSessions = 0;

    grid.innerHTML = items.map((item, i) => {
      totalSessions += item.sessions;
      const [color, bg] = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
      const icon = SUBJECT_ICONS[item.subject] || '📚';
      const lastStr = item.last_date ? formatDate(item.last_date) : 'No sessions yet';
      const barWidth = Math.min(100, item.sessions * 10); // max at 10 sessions
      return '<div class="subj-tracker-tile" style="--tile-color:' + color + ';--tile-bg:' + bg + '">'
        + '<div class="subj-tile-icon">' + icon + '</div>'
        + '<div class="subj-tile-body">'
        + '<div class="subj-tile-name">' + item.subject + '</div>'
        + '<div class="subj-tile-meta">' + lastStr + '</div>'
        + '<div class="subj-tile-bar"><div class="subj-tile-bar-fill" style="width:' + barWidth + '%"></div></div>'
        + '</div>'
        + '<div class="subj-tile-count">' + item.sessions + '</div>'
        + '</div>';
    }).join('');

    if (badge) badge.textContent = totalSessions + ' total';
  } catch (e) {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:1rem">Could not load session summary.</p>';
  }
}

async function startAttendanceSession() {
  const subject      = document.getElementById('subjectName')?.value;
  const className    = document.getElementById('className')?.value;
  const sectionName  = document.getElementById('sectionName')?.value;
  const startTimeVal = document.getElementById('sessionStartTime')?.value;
  const endTimeVal   = document.getElementById('sessionEndTime')?.value;

  if (!subject)      { showToast('Please select a subject', 'error'); return; }
  if (!className)    { showToast('Please select a class', 'error'); return; }
  if (!sectionName)  { showToast('Please select a section', 'error'); return; }
  if (!startTimeVal) { showToast('Please set a session start time', 'error'); return; }
  if (!endTimeVal)   { showToast('Please set a session end time', 'error'); return; }

  const now = new Date();
  const [startH, startM] = startTimeVal.split(':').map(Number);
  const [endH,   endM]   = endTimeVal.split(':').map(Number);
  
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM, 0, 0);
  const endDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH,   endM,   0, 0);

  if (endDate <= startDate) {
    showToast('End time must be later than start time', 'error');
    return;
  }

  const durationMins = Math.round((endDate - startDate) / 60000);

  document.getElementById('timeSettingsCard').classList.add('hidden');
  document.getElementById('cameraCard').classList.remove('hidden');
  document.getElementById('sessionSummary').classList.add('hidden');
  document.getElementById('timesupOverlay')?.classList.add('hidden');
  document.getElementById('sessionSubjectLabel').textContent = `${subject} (${className} - Sec ${sectionName})`;
  document.getElementById('sessionEndDisplay').textContent   = formatTime12(endH, endM);

  startCountdown(endDate);

  const ok = await Camera.startAttendanceSession(durationMins, subject, endTimeVal, className, sectionName);
  if (!ok) {
    clearInterval(sessionCountdownInterval);
    document.getElementById('timeSettingsCard').classList.remove('hidden');
    document.getElementById('cameraCard').classList.add('hidden');
  } else {
    showToast('Session started — ends at ' + formatTime12(endH, endM), 'success');
  }
}

function startCountdown(endDate) {
  clearInterval(sessionCountdownInterval);

  function tick() {
    const remaining = Math.floor((endDate - Date.now()) / 1000);
    const el = document.getElementById('sessionCountdown');
    if (!el) return;

    if (remaining <= 0) {
      clearInterval(sessionCountdownInterval);
      el.textContent  = "Time's up!";
      el.className    = 'session-countdown urgent';
      showTimesUpOverlay();
      return;
    }

    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    el.textContent = m + 'm ' + String(s).padStart(2,'0') + 's left';
    el.className   = remaining <= 60 ? 'session-countdown urgent' : remaining <= 300 ? 'session-countdown warn' : 'session-countdown';
  }

  tick();
  sessionCountdownInterval = setInterval(tick, 1000);
}

function showTimesUpOverlay() {
  document.getElementById('timesupOverlay')?.classList.remove('hidden');

  const statusEl = document.getElementById('recognitionStatus');
  if (statusEl) {
    statusEl.querySelector('.status-dot').style.background = '#ef4444';
    statusEl.querySelector('span').textContent = 'Session ended — attendance is closed';
  }

  const scanLine = document.querySelector('.scan-line');
  if (scanLine) scanLine.style.animationPlayState = 'paused';

  showToast("Time's up — attendance saved automatically", 'info');
}

async function stopSession() {
  clearInterval(sessionCountdownInterval);
  await Camera.endSession(false);
}

function newSession() {
  clearInterval(sessionCountdownInterval);
  ['sessionSummary','cameraCard'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
  document.getElementById('timeSettingsCard')?.classList.remove('hidden');
  document.getElementById('timesupOverlay')?.classList.add('hidden');

  const scanLine = document.querySelector('.scan-line');
  if (scanLine) scanLine.style.animationPlayState = 'running';

  document.getElementById('sessionSubjectLabel').textContent = '–';
  document.getElementById('sessionEndDisplay').textContent   = '–';
  const cd = document.getElementById('sessionCountdown');
  if (cd) { cd.textContent = '–'; cd.className = 'session-countdown'; }
  
  const subjInput = document.getElementById('subjectName');
  if (subjInput) subjInput.selectedIndex = 0;
  
  const classInput = document.getElementById('className');
  if (classInput) classInput.selectedIndex = 0;
  
  const sectionInput = document.getElementById('sectionName');
  if (sectionInput) sectionInput.selectedIndex = 0;

  const startTimeInput = document.getElementById('sessionStartTime');
  const endTimeInput = document.getElementById('sessionEndTime');
  const d = new Date();
  const nowTime = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  
  if (startTimeInput) startTimeInput.value = nowTime;
  if (endTimeInput) {
    d.setHours(d.getHours() + 1);
    endTimeInput.value = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
}

// ── Password reset ──────────────────────────────────────────
async function handlePasswordReset(e) {
  e.preventDefault();
  const current = document.getElementById('currentPass').value;
  const newPass  = document.getElementById('newPass').value;
  const confirm  = document.getElementById('confirmPass').value;
  const errEl  = document.getElementById('passError');
  const succEl = document.getElementById('passSuccess');
  errEl.classList.add('hidden');
  succEl.classList.add('hidden');

  if (newPass !== confirm) { errEl.textContent = 'Passwords do not match.'; errEl.classList.remove('hidden'); return; }
  if (newPass.length < 8)  { errEl.textContent = 'Password must be at least 8 characters.'; errEl.classList.remove('hidden'); return; }

  try {
    await API.resetPassword(current, newPass);
    succEl.classList.remove('hidden');
    e.target.reset();
    document.getElementById('passStrength')?.style.setProperty('--strength', '0%');
    showToast('Password updated successfully!', 'success');
  } catch (err) {
    errEl.textContent = err.message || 'Failed to update password.';
    errEl.classList.remove('hidden');
  }
}

function updatePassStrength(pass) {
  const bar = document.getElementById('passStrength');
  if (!bar) return;
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  const map = ['0%','25%','50%','75%','100%'];
  const col = ['#ef4444','#ef4444','#f59e0b','#22c55e','#16a34a'];
  bar.style.setProperty('--strength', map[score]);
  bar.style.setProperty('--strength-color', col[score]);
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}

// ══════════════════════════════════════════════════════════
//  STUDENT PORTAL
// ══════════════════════════════════════════════════════════

let allFaculty = [];

function initStudentPortal() {
  const user = getUser();
  if (!user || user.role !== 'student') { window.location.href = 'index.html'; return; }

  document.getElementById('studentNameHeader').textContent   = user.name;
  document.getElementById('studentRegHeader').textContent    = user.reg;
  document.getElementById('studentAvatarHeader').textContent = initials(user.name);
  document.getElementById('welcomeName').textContent         = user.name.split(' ')[0];
  updateLiveDate('studentDate');
  loadFacultyList(user.reg);
}

async function loadFacultyList(studentReg) {
  const grid = document.getElementById('facultyGrid');
  try {
    const res = await API.getFacultyList();
    allFaculty = res?.faculty || [];
    const attResults = await Promise.all(allFaculty.map(f => API.getStudentAttendance(studentReg, f.id)));
    allFaculty = allFaculty.map((f, i) => ({ ...f, att: attResults[i] || {} }));
    renderFacultyCards(allFaculty, studentReg);
    computeOverall(allFaculty);
  } catch (e) {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:1rem">Failed to load faculty list.</p>';
  }
}

function renderFacultyCards(faculty, studentReg) {
  const grid = document.getElementById('facultyGrid');
  if (!faculty.length) { grid.innerHTML = '<p style="color:var(--text-muted);padding:1rem">No faculty found.</p>'; return; }

  grid.innerHTML = faculty.map(f => {
    const att = f.att || {};
    const pct = att.total ? Math.round(att.present / att.total * 100) : 0;
    const cls = pct >= 75 ? 'good' : pct >= 60 ? 'warn' : 'bad';
    return '<div class="faculty-card" onclick="openFacultyDetail(\'' + f.id + '\', \'' + studentReg + '\')">'
      + '<div class="faculty-card-top">'
      + '<div class="faculty-avatar-lg">' + (f.avatar || initials(f.name)) + '</div>'
      + '<div><div class="faculty-card-name">' + f.name + '</div>'
      + '<div class="faculty-card-subject">' + f.subject + '</div></div></div>'
      + '<div class="faculty-card-stats">'
      + '<div class="mini-stat"><span class="ms-val">' + (att.total || '–') + '</span><span class="ms-lbl">Total</span></div>'
      + '<div class="mini-stat good"><span class="ms-val" style="color:#4ade80">' + (att.present || '–') + '</span><span class="ms-lbl">Present</span></div>'
      + '<div class="mini-stat ' + cls + '"><span class="ms-val">' + (att.total ? pct + '%' : '–') + '</span><span class="ms-lbl">Attend.</span></div>'
      + '</div></div>';
  }).join('');
}

function filterFaculty(query) {
  const q = query.toLowerCase();
  renderFacultyCards(allFaculty.filter(f => f.name.toLowerCase().includes(q) || f.subject.toLowerCase().includes(q)), getUser()?.reg || '');
}

function computeOverall(faculty) {
  let total = 0, present = 0;
  faculty.forEach(f => { total += f.att?.total || 0; present += f.att?.present || 0; });
  const absent = total - present;
  const pct = total ? Math.round(present / total * 100) : 0;
  document.getElementById('ovTotal').textContent   = total;
  document.getElementById('ovPresent').textContent = present;
  document.getElementById('ovAbsent').textContent  = absent;
  document.getElementById('ovPercent').textContent = pct + '%';
  document.getElementById('overviewStats').style.display = 'grid';
}

async function openFacultyDetail(facultyId, studentReg) {
  const f = allFaculty.find(x => x.id === facultyId);
  if (!f) return;

  document.getElementById('detailFacultyAvatar').textContent  = f.avatar || initials(f.name);
  document.getElementById('detailFacultyName').textContent    = f.name;
  document.getElementById('detailFacultySubject').textContent = f.subject;

  const att = f.att || {};
  const total = att.total || 0, present = att.present || 0;
  const absent = att.absent || (total - present);
  const pct = total ? Math.round(present / total * 100) : 0;

  document.getElementById('detailTotal').textContent   = total;
  document.getElementById('detailPresent').textContent = present;
  document.getElementById('detailAbsent').textContent  = absent;

  const needed = Math.max(0, Math.ceil(0.75 * total) - present);
  document.getElementById('detailRequired').textContent = needed > 0 ? (needed + ' more classes') : 'Requirement met ✓';

  const ring = document.getElementById('ringProgress');
  if (ring) {
    ring.style.strokeDashoffset = 314 - (pct / 100) * 314;
    ring.style.stroke = pct >= 75 ? 'url(#ringGrad)' : pct >= 60 ? '#fbbf24' : '#ef4444';
  }
  document.getElementById('ringPercent').textContent = pct + '%';

  const alertEl = document.getElementById('attAlert');
  alertEl.classList.remove('hidden','safe','warn','danger');
  if (pct >= 75) {
    alertEl.className = 'attendance-alert safe';
    alertEl.innerHTML = '✓ Your attendance is ' + pct + '% — above the 75% requirement.';
  } else if (pct >= 60) {
    alertEl.className = 'attendance-alert warn';
    alertEl.innerHTML = '⚠ Your attendance is ' + pct + '%. Attend ' + needed + ' more classes to reach 75%.';
  } else {
    alertEl.className = 'attendance-alert danger';
    alertEl.innerHTML = '✕ Critical! Attendance is only ' + pct + '%. Immediate action required.';
  }

  const sessions = att.sessions || [];
  const sessBody = document.getElementById('sessionBody');
  if (sessBody) {
    sessBody.innerHTML = sessions.length
      ? sessions.map(s => '<tr><td>' + formatDate(s.date) + '</td><td>' + s.time + '</td><td>' + (s.subject || f.subject) + '</td><td>' + s.duration + '</td><td><span class="badge ' + (s.status === 'present' ? 'badge-green' : 'badge-red') + '">' + (s.status === 'present' ? 'Present' : 'Absent') + '</span></td></tr>').join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:1.5rem">No session records</td></tr>';
  }

  document.getElementById('attendanceDetail').classList.remove('hidden');
  document.getElementById('attendanceDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeFacultyDetail() {
  document.getElementById('attendanceDetail').classList.add('hidden');
}

// ══════════════════════════════════════════════════════════
//  SHARED UTILITIES
// ══════════════════════════════════════════════════════════

function logout() {
  API.logout();
  sessionStorage.removeItem('sa_user');
  window.location.href = 'index.html';
}

function getUser() {
  try { return JSON.parse(sessionStorage.getItem('sa_user')); } catch { return null; }
}

function initials(name) {
  if (!name) return '??';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime12(h, m) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  return (h % 12 || 12) + ':' + String(m).padStart(2,'0') + ' ' + ampm;
}

function updateLiveDate(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

function togglePass(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
}

function showToast(msg, type) {
  type = type || 'info';
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons  = { success: '✓', error: '✕', info: 'ℹ' };
  const colors = { success: '#4ade80', error: '#f87171', info: '#818cf8' };
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = '<span style="color:' + colors[type] + ';font-weight:700">' + icons[type] + '</span> ' + msg;
  container.appendChild(toast);
  setTimeout(function() {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3500);
}

document.addEventListener('DOMContentLoaded', function() {
  if (document.body.classList.contains('student-portal') || window.location.pathname.includes('student')) initStudentPortal();
  else if (document.body.classList.contains('dashboard-page')) initDashboard();
});