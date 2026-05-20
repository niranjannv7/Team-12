/**
 * api.js — Smart Attendance API Layer
 * All backend calls go through this file.
 * BASE_URL points to Flask backend. Mock mode returns sample data when backend is unavailable.
 */

const API = (() => {
  const BASE_URL = (window.location.port !== '5001' ? 'http://localhost:5001/api' : `${window.location.origin}/api`); // Dynamic API base URL
  let MOCK_MODE = false; // Set to false when backend is ready

  // ── Auth token storage ──────────────────────────────────
  const getToken = () => localStorage.getItem('sa_token');
  const setToken = (t) => localStorage.setItem('sa_token', t);
  const clearToken = () => localStorage.removeItem('sa_token');

  const defaultHeaders = () => ({
    'Content-Type': 'application/json',
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  });

  // ── Core fetch wrapper ──────────────────────────────────
  async function request(method, endpoint, body = null) {
    try {
      const opts = { method, headers: defaultHeaders() };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(`${BASE_URL}${endpoint}`, opts);
      if (res.status === 401) { clearToken(); window.location.href = 'index.html'; return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      return data;
    } catch (err) {
      if (MOCK_MODE) return null; // Let mock functions handle it
      throw err;
    }
  }

  // ── MOCK DATA (used when backend not available) ─────────
  const MOCK = {
    faculty: [
      { id: 'FAC001', name: 'Dr. Ramesh Kumar', subject: 'Data Structures', dept: 'CSE', email: 'ramesh@college.edu', sessions_held: 28, avatar: 'RK' },
      { id: 'FAC002', name: 'Prof. Anitha Selvi', subject: 'Database Management', dept: 'CSE', email: 'anitha@college.edu', sessions_held: 24, avatar: 'AS' },
      { id: 'FAC003', name: 'Dr. Vijay Mohan', subject: 'Computer Networks', dept: 'CSE', email: 'vijay@college.edu', sessions_held: 20, avatar: 'VM' },
      { id: 'FAC004', name: 'Prof. Kavitha Rajan', subject: 'Operating Systems', dept: 'CSE', email: 'kavitha@college.edu', sessions_held: 22, avatar: 'KR' },
      { id: 'FAC005', name: 'Dr. Suresh Babu', subject: 'Machine Learning', dept: 'CSE', email: 'suresh@college.edu', sessions_held: 18, avatar: 'SB' },
    ],
    students: [
      { id: 1, name: 'Aravind Kumar', reg: '22CS001', dept: 'CSE', batch: '2022-26', email: 'aravind@college.edu', phone: '9876543210', face_count: 4 },
      { id: 2, name: 'Priya Nair', reg: '22CS002', dept: 'CSE', batch: '2022-26', email: 'priya@college.edu', phone: '9876543211', face_count: 5 },
      { id: 3, name: 'Karthick Raja', reg: '22CS003', dept: 'CSE', batch: '2022-26', email: 'karthick@college.edu', phone: '9876543212', face_count: 3 },
      { id: 4, name: 'Meena Sundaram', reg: '22CS004', dept: 'CSE', batch: '2022-26', email: 'meena@college.edu', phone: '9876543213', face_count: 4 },
      { id: 5, name: 'Balaji Krishnan', reg: '22CS005', dept: 'CSE', batch: '2022-26', email: 'balaji@college.edu', phone: '9876543214', face_count: 2 },
      { id: 6, name: 'Deepa Ramachandran', reg: '22CS006', dept: 'CSE', batch: '2022-26', email: 'deepa@college.edu', phone: '9876543215', face_count: 5 },
    ],
    attendance: {
      FAC001: { total: 28, present: 22, absent: 6 },
      FAC002: { total: 24, present: 20, absent: 4 },
      FAC003: { total: 20, present: 14, absent: 6 },
      FAC004: { total: 22, present: 18, absent: 4 },
      FAC005: { total: 18, present: 10, absent: 8 },
    },
    sessions: [
      { date: '2025-01-15', time: '09:00 AM', subject: 'Data Structures', duration: '1 hr', status: 'present' },
      { date: '2025-01-17', time: '09:00 AM', subject: 'Data Structures', duration: '1 hr', status: 'absent' },
      { date: '2025-01-20', time: '09:00 AM', subject: 'Data Structures', duration: '1 hr', status: 'present' },
      { date: '2025-01-22', time: '09:00 AM', subject: 'Data Structures', duration: '1 hr', status: 'present' },
      { date: '2025-01-24', time: '09:00 AM', subject: 'Data Structures', duration: '1 hr', status: 'absent' },
    ],
    absentees: [
      { reg: '22CS002', name: 'Priya Nair', subject: 'Data Structures', time: '09:00 AM', contact: '9876543211' },
      { reg: '22CS005', name: 'Balaji Krishnan', subject: 'Data Structures', time: '09:00 AM', contact: '9876543214' },
      { reg: '22CS003', name: 'Karthick Raja', subject: 'Database Management', time: '11:00 AM', contact: '9876543212' },
    ],
    reportStats: { total: 6, avg_percent: 78, defaulters: 1, sessions: 28 },
  };

  // ── AUTH ────────────────────────────────────────────────

  async function loginFaculty(name, password) {
    if (MOCK_MODE) {
      // Match by full name (case-insensitive); any password accepted in demo
      const f = MOCK.faculty.find(x => x.name.toLowerCase() === name.toLowerCase()) || null;
      if (!f) throw new Error('Faculty name not found. Check your name or register a new account.');
      setToken('mock_faculty_token');
      return { success: true, user: f, token: 'mock_faculty_token' };
    }
    const data = await request('POST', '/auth/faculty/login', { name, password });
    if (data?.token) setToken(data.token);
    return data;
  }

  async function registerFaculty({ name, dept, subject, email, password }) {
    if (MOCK_MODE) {
      const exists = MOCK.faculty.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (exists) throw new Error('A faculty account with this name already exists.');
      const newFac = {
        id: 'FAC' + String(MOCK.faculty.length + 1).padStart(3, '0'),
        name, subject, dept, email,
        sessions_held: 0,
        avatar: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      };
      MOCK.faculty.push(newFac);
      return { success: true, user: newFac };
    }
    return request('POST', '/auth/faculty/register', { name, dept, subject, email, password });
  }

  async function loginStudent(name, reg) {
    if (MOCK_MODE) {
      const s = MOCK.students.find(x => x.name.toLowerCase() === name.toLowerCase() && x.reg === reg);
      if (!s) throw new Error('Student not found');
      setToken('mock_student_token');
      return { success: true, user: s, token: 'mock_student_token' };
    }
    const data = await request('POST', '/auth/student/login', { name, reg_no: reg });
    if (data?.token) setToken(data.token);
    return data;
  }

  async function forgotPasswordVerify(name, email) {
    if (MOCK_MODE) {
      // Check if faculty exists with that name AND email
      const f = MOCK.faculty.find(
        x => x.name.toLowerCase() === name.toLowerCase() && x.email === email.toLowerCase()
      );
      if (!f) throw new Error('No faculty account found with that name and email.');
      return { success: true };
    }
    return request('POST', '/auth/forgot-password/verify', { name, email });
  }

  async function forgotPasswordReset(name, newPassword) {
    if (MOCK_MODE) {
      // In mock mode just succeed — no real password store to update
      return { success: true };
    }
    return request('POST', '/auth/forgot-password/reset', { name, new_password: newPassword });
  }

  async function resetPassword(currentPass, newPass) {
    if (MOCK_MODE) return { success: true };
    return request('POST', '/auth/reset-password', { current_password: currentPass, new_password: newPass });
  }

  // ── STUDENTS ────────────────────────────────────────────

  async function getStudents() {
    if (MOCK_MODE) return { students: MOCK.students };
    return request('GET', '/students');
  }

  async function addStudent(data) {
    if (MOCK_MODE) {
      const s = { ...data, id: Date.now(), face_count: 0 };
      MOCK.students.push(s);
      return { success: true, student: s };
    }
    return request('POST', '/students', data);
  }

  async function updateStudent(id, data) {
    if (MOCK_MODE) {
      const idx = MOCK.students.findIndex(s => s.id === id);
      if (idx !== -1) MOCK.students[idx] = { ...MOCK.students[idx], ...data };
      return { success: true };
    }
    return request('PUT', `/students/${id}`, data);
  }

  async function deleteStudent(id) {
    if (MOCK_MODE) {
      const idx = MOCK.students.findIndex(s => s.id === id);
      if (idx !== -1) MOCK.students.splice(idx, 1);
      return { success: true };
    }
    return request('DELETE', `/students/${id}`);
  }

  async function uploadFaceImages(studentId, formData) {
    if (MOCK_MODE) return { success: true, message: 'Face data uploaded' };
    const res = await fetch(`${BASE_URL}/students/${studentId}/faces`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData, // multipart/form-data, no Content-Type header
    });
    return res.json();
  }

  // ── ATTENDANCE ──────────────────────────────────────────

  const getUser = () => {
    try { return JSON.parse(sessionStorage.getItem('sa_user')); } catch { return null; }
  };

  async function startSession(subject, duration, startTime, className, section) {
    if (MOCK_MODE) return { success: true, session_id: 'sess_' + Date.now() };
    const user = getUser();
    return request('POST', '/attendance/start', { 
        subject, 
        duration_minutes: duration, 
        start_time: startTime,
        class_name: className,
        section: section,
        faculty_id: user?.id 
    });
  }

  async function markPresent(sessionId, studentId) {
    if (MOCK_MODE) return { success: true };
    return request('POST', '/attendance/mark', { session_id: sessionId, student_reg: studentId });
  }

  async function endSession(sessionId) {
    if (MOCK_MODE) return { success: true };
    return request('POST', `/attendance/end/${sessionId}`);
  }

  async function getAbsentees(date) {
    if (MOCK_MODE) return { absentees: MOCK.absentees };
    return request('GET', `/attendance/absentees?date=${date}`);
  }

  async function getPresentees(date) {
    if (MOCK_MODE) return { presentees: [] }; // MOCK presentees can be empty for demo
    return request('GET', `/attendance/presentees?date=${date}`);
  }

  async function getStudentAttendance(studentReg, facultyId) {
    if (MOCK_MODE) {
      const att = MOCK.attendance[facultyId] || { total: 20, present: 15, absent: 5 };
      return { ...att, sessions: MOCK.sessions };
    }
    return request('GET', `/attendance/student?reg=${studentReg}&faculty_id=${facultyId}`);
  }

  async function getFacultyList() {
    if (MOCK_MODE) return { faculty: MOCK.faculty };
    return request('GET', '/faculty');
  }

  async function getSessionSummary(facultyId) {
    if (MOCK_MODE) {
      return { summary: [
        {subject:'Mathematics',sessions:3,last_date:'2026-04-08'},
        {subject:'Computer Science',sessions:5,last_date:'2026-04-07'},
        {subject:'Physics',sessions:2,last_date:'2026-04-06'},
        {subject:'Chemistry',sessions:1,last_date:'2026-04-05'},
        {subject:'Biology',sessions:0,last_date:null},
        {subject:'English',sessions:4,last_date:'2026-04-08'},
        {subject:'History',sessions:0,last_date:null},
        {subject:'Geography',sessions:1,last_date:'2026-04-04'},
        {subject:'Economics',sessions:2,last_date:'2026-04-03'},
        {subject:'Business Studies',sessions:0,last_date:null},
      ]};
    }
    const url = facultyId ? `/attendance/sessions/summary?faculty_id=${facultyId}` : '/attendance/sessions/summary';
    return request('GET', url);
  }

  // ── REPORTS ─────────────────────────────────────────────

  async function getReport(subject, from, to) {
    if (MOCK_MODE) {
      const rows = MOCK.students.map((s, i) => {
        const total = 28, present = [22,24,18,20,26,15][i] || 20;
        return { ...s, total, present, absent: total - present, percent: Math.round(present/total*100) };
      });
      return { stats: MOCK.reportStats, rows };
    }
    return request('GET', `/reports?subject=${subject}&from=${from}&to=${to}`);
  }

  // ── RECOGNITION ─────────────────────────────────────────
  // Called by camera.js when a frame needs to be analysed
  async function recognizeFace(imageBase64, sessionId) {
    if (MOCK_MODE) {
      // Simulate occasional random recognition
      const names = ['Aravind Kumar', 'Deepa Ramachandran', 'Meena Sundaram'];
      if (Math.random() > 0.7) {
        const n = names[Math.floor(Math.random() * names.length)];
        return { recognized: true, name: n, reg: '22CS00' + (Math.floor(Math.random()*6)+1), confidence: (0.88 + Math.random()*0.1).toFixed(2) };
      }
      return { recognized: false };
    }
    return request('POST', '/recognition/identify', { image: imageBase64, session_id: sessionId });
  }

  // ── HELPERS ─────────────────────────────────────────────
  function logout() { clearToken(); }
  function setMockMode(v) { MOCK_MODE = v; }

  return {
    loginFaculty, registerFaculty, loginStudent, resetPassword,
    forgotPasswordVerify, forgotPasswordReset,
    getStudents, addStudent, updateStudent, deleteStudent, uploadFaceImages,
    startSession, markPresent, endSession, getAbsentees, getPresentees, getStudentAttendance, getFacultyList, getSessionSummary,
    getReport,
    recognizeFace,
    logout, setMockMode, getToken,
    MOCK,
  };
})();