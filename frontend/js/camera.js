/**
 * camera.js — Webcam & Face Recognition Logic
 * Handles camera stream, session timer, and face recognition polling.
 */

const Camera = (() => {
  let stream = null;
  let sessionTimer = null;
  let recognitionInterval = null;
  let sessionId = null;
  let sessionDurationSecs = 0;
  let sessionElapsed = 0;
  let recognizedStudents = new Set();
  let pollTimeoutId = null;
  let recognizingActive = false;

  // ── Start camera stream ─────────────────────────────────
  async function startStream(videoEl) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 }, facingMode: 'user' },
        audio: false,
      });
      videoEl.srcObject = stream;
      await videoEl.play();
      return true;
    } catch (err) {
      console.error('Camera error:', err);
      showToast('Could not access camera. Please allow camera permission.', 'error');
      return false;
    }
  }

  // ── Stop camera stream ──────────────────────────────────
  function stopStream() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  // ── Capture frame as base64 ─────────────────────────────
  function captureFrame(videoEl, canvasEl) {
    if (!videoEl.videoWidth || !videoEl.videoHeight) return null;
    const MAX_WIDTH = 320; // Drastically reduce footprint to save CPU
    const scale = Math.min(1, MAX_WIDTH / videoEl.videoWidth);
    canvasEl.width = videoEl.videoWidth * scale;
    canvasEl.height = videoEl.videoHeight * scale;
    const ctx = canvasEl.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
    return canvasEl.toDataURL('image/jpeg', 0.85).split(',')[1];
  }

  // ── Start attendance session ────────────────────────────
  async function startAttendanceSession(durationMins, subject, startTime, className, sectionName) {
    const video = document.getElementById('videoFeed');
    const canvas = document.getElementById('faceCanvas');
    // ...
    const ok = await startStream(video);
    if (!ok) return false;

    sessionDurationSecs = durationMins * 60;
    sessionElapsed = 0;
    recognizedStudents = new Set();
    updateRecognizedUI();

    // Backend: start session
    try {
      const res = await API.startSession(subject, durationMins, startTime, className, sectionName);
      sessionId = res?.session_id || 'local_' + Date.now();
    } catch (e) {
      sessionId = 'local_' + Date.now();
    }

    // Session countdown timer
    sessionTimer = setInterval(() => {
      sessionElapsed++;
      const remaining = sessionDurationSecs - sessionElapsed;
      updateTimerDisplay(remaining);
      if (remaining <= 0) {
        endSession(true); // Auto-stop
      }
    }, 1000);

    // Safe consecutive recursive polling (prevents overlapping and CPU starvation)
    recognizingActive = true;
    let isRecognizing = false;

    async function pollRecognition() {
      if (!stream || !recognizingActive) return;

      const frame = captureFrame(video, canvas);
      if (frame) {
        try {
          isRecognizing = true;
          const result = await API.recognizeFace(frame, sessionId);
          if (result?.recognized && !recognizedStudents.has(result.name)) {
            recognizedStudents.add(result.name);
            addRecognizedChip(result.name, result.reg);
            setRecognitionStatus(`Recognized: ${result.name}`, true);
            await API.markPresent(sessionId, result.reg);
            setTimeout(() => setRecognitionStatus('Scanning for faces…', false), 2500);
          }
        } catch (_) {
          /* Silently continue */
        } finally {
          isRecognizing = false;
        }
      }

      // Wait exactly 3 seconds AFTER the backend releases the CPU before sending next
      if (recognizingActive) {
        pollTimeoutId = setTimeout(pollRecognition, 3000);
      }
    }

    pollTimeoutId = setTimeout(pollRecognition, 2000);

    return true;
  }

  // ── End session ─────────────────────────────────────────
  async function endSession(autoStopped = false) {
    clearInterval(sessionTimer);
    recognizingActive = false;
    if (pollTimeoutId) clearTimeout(pollTimeoutId);
    stopStream();

    try { await API.endSession(sessionId); } catch (_) { }

    // Auto-update global data tables if they are defined
    if (typeof loadAbsentees === 'function') setTimeout(loadAbsentees, 500);
    if (typeof generateReport === 'function') setTimeout(generateReport, 500);

    showSessionSummary(autoStopped);
    return { recognized: recognizedStudents.size, sessionId };
  }

  // ── Timer display ───────────────────────────────────────
  function updateTimerDisplay(remainingSecs) {
    const el = document.getElementById('sessionTimer');
    if (!el) return;
    const m = Math.floor(Math.abs(remainingSecs) / 60);
    const s = Math.abs(remainingSecs) % 60;
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (remainingSecs <= 60 && remainingSecs > 0) el.style.color = '#fbbf24';
    if (remainingSecs <= 0) el.style.color = '#f87171';
  }

  // ── Recognized chips UI ─────────────────────────────────
  function addRecognizedChip(name, reg) {
    const container = document.getElementById('recognizedChips');
    const count = document.getElementById('recognizedCount');
    const emptyMsg = container.querySelector('.empty-msg');
    if (emptyMsg) emptyMsg.remove();

    const chip = document.createElement('div');
    chip.className = 'recognized-chip';
    chip.textContent = name;
    chip.title = reg;
    container.appendChild(chip);

    if (count) count.textContent = recognizedStudents.size;
  }

  function updateRecognizedUI() {
    const container = document.getElementById('recognizedChips');
    const count = document.getElementById('recognizedCount');
    if (container) container.innerHTML = '<span class="empty-msg">No students recognized yet</span>';
    if (count) count.textContent = '0';
  }

  function setRecognitionStatus(msg, active) {
    const el = document.getElementById('recognitionStatus');
    if (!el) return;
    const dot = el.querySelector('.status-dot');
    el.querySelector('span').textContent = msg;
    if (dot) dot.style.background = active ? '#4ade80' : '#22c55e';
  }

  // ── Session Summary ─────────────────────────────────────
  async function showSessionSummary(autoStopped) {
    document.getElementById('cameraCard')?.classList.add('hidden');
    const summary = document.getElementById('sessionSummary');
    if (!summary) return;
    summary.classList.remove('hidden');

    const present = recognizedStudents.size;
    // Fetch total number of students from backend (fallback to mock if unavailable)
    let totalStudents = 0;
    try {
      const res = await API.getStudents();
      totalStudents = (res?.students?.length) || 0;
    } catch (_) {
      totalStudents = (API.MOCK.students || []).length || 0;
    }

    document.getElementById('summaryText').textContent =
      autoStopped ? 'Session ended automatically — time is up.' : 'Session manually ended.';

    const statsEl = document.getElementById('summaryStats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="summary-stat">
          <span class="val" style="color:#4ade80">${present}</span>
          <span class="lbl">Present</span>
        </div>
        <div class="summary-stat">
          <span class="val" style="color:#f87171">${Math.max(0, totalStudents - present)}</span>
          <span class="lbl">Absent</span>
        </div>
        <div class="summary-stat">
          <span class="val">${totalStudents > 0 ? Math.round(present / totalStudents * 100) : '--'}%</span>
          <span class="lbl">Attendance Rate</span>
        </div>
      `;
    }
  }

  // ── Capture single face image (for student enrollment) ──
  async function captureSingleFrame(videoEl, canvasEl) {
    canvasEl.style.display = 'block';
    canvasEl.width = videoEl.videoWidth || 640;
    canvasEl.height = videoEl.videoHeight || 480;
    const ctx = canvasEl.getContext('2d');
    ctx.drawImage(videoEl, 0, 0);
    return canvasEl.toDataURL('image/jpeg', 0.9);
  }

  async function startCaptureStream() {
    const video = document.getElementById('captureVideo');
    return startStream(video);
  }

  function stopCaptureStream() {
    stopStream();
  }

  return {
    startAttendanceSession, endSession,
    startCaptureStream, stopCaptureStream, captureSingleFrame,
    stopStream,
  };
})();