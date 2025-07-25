window.addEventListener("DOMContentLoaded", () => {
  // Configuration
  const useMockDB = false; // Toggle for mock/localStorage mode
  let supabase = null;
  if (!useMockDB) {
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // Utility
  function qs(sel) { return document.querySelector(sel); }

  // Mock DB
  const mockDB = {
    users: JSON.parse(localStorage.getItem('mockUsers') || '[]'),
    classes: JSON.parse(localStorage.getItem('mockClasses') || '[]'),
    saveUsers() { localStorage.setItem('mockUsers', JSON.stringify(this.users)); },
    saveClasses() { localStorage.setItem('mockClasses', JSON.stringify(this.classes)); }
  };

  // App State
  let currentUser = null;
  let currentClass = null;
  let uploadedFiles = [];
  let newClassData = null;

  // DOM Elements
  const messageContainer = qs("#messageContainer");
  const loginForm = qs("#loginForm");
  const registerForm = qs("#registerForm");
  const toggleAuthBtns = document.querySelectorAll(".btn-create-account");


  const teacherNameEl = qs("#teacherName");
  const classesGrid = qs("#classesGrid");
  const addClassBtn = qs("#addClassBtn");
  const logoutBtn = qs("#logoutBtn");
  const defaulterBtn = qs("#defaulterBtn");

  const backToDashboardFromDefaulter = qs("#backToDashboardFromDefaulter");
  const uploadMultipleArea = qs("#uploadMultipleArea");
  const multipleFileInput = qs("#multipleFileInput");
  const uploadedFilesList = qs("#uploadedFilesList");
  const analyzeDefaultersBtn = qs("#analyzeDefaultersBtn");
  const defaulterResults = qs("#defaulterResults");
  const defaulterSummary = qs("#defaulterSummary");
  const defaulterList = qs("#defaulterList");
  const downloadDefaultersBtn = qs("#downloadDefaultersBtn");
  const clearAnalysisBtn = qs("#clearAnalysisBtn");

  const backToDashboardBtn = qs("#backToDashboard");
  const uploadArea = qs("#uploadArea");
  const fileInput = qs("#fileInput");
  const confirmCreateBtn = qs("#confirmCreateBtn");
  const cancelPreviewBtn = qs("#cancelPreviewBtn");
  const previewSection = qs("#previewSection");
  const previewContent = qs("#previewContent");

  const backToDashboardFromAttendance = qs("#backToDashboardFromAttendance");
  const classNameEl = qs("#className");
  const attendanceDate = qs("#attendanceDate");
  const absentRollsInput = qs("#absentRollsInput");
  const saveAttendanceBtn = qs("#saveAttendanceBtn");
  const attendancePreview = qs("#attendancePreview");
  const attendanceHistoryBtn = qs("#attendanceHistoryBtn");
  const attendanceHistoryModal = qs("#attendanceHistoryModal");
  const closeHistoryBtn = qs("#closeHistoryBtn");
  const historyContent = qs("#historyContent");
  const downloadAttendanceBtn = qs("#downloadAttendanceBtn");



  // Screens
  const screens = {
    login: qs("#loginScreen"),
    dashboard: qs("#dashboardScreen"),
    addClass: qs("#addClassScreen"),
    attendance: qs("#attendanceScreen"),
    defaulter: qs("#defaulterScreen"),
  };

  function showScreen(key) {
    Object.values(screens).forEach(s => s && s.classList.remove("active"));
    if (screens[key]) screens[key].classList.add("active");
  }

  // ---- Message helper ----
  function showMessage(text, type = "success", timeout = 3000) {
    if (!messageContainer) return;
    const msg = document.createElement("div");
    msg.className = `message ${type}`;
    msg.textContent = text;
    msg.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10000;
      font-weight: 600;
      ${type === 'error' ? 'background: #ef4444; color: white;' : 'background: #10b981; color: white;'}
    `;
    messageContainer.appendChild(msg);
    setTimeout(() => msg.remove(), timeout);
  }

  // ---- Auth ----
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = qs("#username").value.trim();
      const password = qs("#password").value;
      let user = null;

      if (useMockDB) {
        user = mockDB.users.find(u => u.username === username && u.password === password);
        if (!user) return showMessage("Invalid credentials", "error");
      } else {
        const { data, error } = await supabase.from('users').select('*').eq('username', username).eq('password', password).single();
        if (error || !data) return showMessage("Invalid credentials", "error");
        user = data;
      }
      currentUser = user;
      initDashboard();
      showScreen("dashboard");
      showMessage("Login successful!", "success");
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = qs("#regName").value.trim();
      const username = qs("#regUsername").value.trim();
      const password = qs("#regPassword").value;

      if (!name || !username || !password) return showMessage("All fields are required", "error");
      let existingUser = null;

      if (useMockDB) {
        existingUser = mockDB.users.find(u => u.username === username);
        if (existingUser) return showMessage("Username already registered", "error");
        const newUser = { id: Date.now(), name, username, password, created_at: new Date().toISOString() };
        mockDB.users.push(newUser);
        mockDB.saveUsers();
        currentUser = newUser;
      } else {
        const { data: existing } = await supabase.from('users').select('id').eq('username', username).single();
        if (existing) return showMessage("Username already registered", "error");
        const { data, error } = await supabase.from('users').insert([{ name, username, password }]).select().single();
        if (error) return showMessage("Registration failed: " + error.message, "error");
        currentUser = data;
      }
      showMessage("Account created successfully!", "success");
      initDashboard();
      showScreen("dashboard");
    });
  }

  if (toggleAuthBtns && registerForm && loginForm) {
  toggleAuthBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // If login is shown, show register
      if (!registerForm.classList.contains("hidden")) {
        registerForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
      } else {
        registerForm.classList.remove("hidden");
        loginForm.classList.add("hidden");
      }
    });
  });
}
  // ---- Dashboard ----

  function initDashboard() {
    if (teacherNameEl && currentUser) teacherNameEl.textContent = currentUser.name;
    renderClasses();
  }

  async function renderClasses() {
    if (!classesGrid) return;
    let classes = [];
    if (useMockDB)
      classes = mockDB.classes.filter(c => c.teacher_id === currentUser.id);
    else {
      const { data } = await supabase.from('classes').select('*').eq('teacher_id', currentUser.id);
      classes = data || [];
    }
    classesGrid.innerHTML = !classes.length
      ? `<div class="empty-state w-full"><div class="empty-state-icon">📚</div><h3>No classes found</h3><p>Create your first class to get started</p></div>`
      : classes.map(cls => `
      <div class="class-card card cursor-pointer" tabindex="0" data-class-id="${cls.id}">
        <div class="card__body">
          <h3>${cls.name}</h3>
          <div class="class-info">
            <div class="class-stat"><span class="class-stat-number">${cls.students?.length || 0}</span><span class="class-stat-label">Students</span></div>
            <div class="class-stat"><span class="class-stat-number">${Object.keys(cls.attendance || {}).length}</span><span class="class-stat-label">Days Recorded</span></div>
          </div>
          <button class="btn btn--outline w-full">Open</button>
        </div>
      </div>`).join("");
    document.querySelectorAll('.class-card').forEach(card => {
      card.onclick = () => openClass(card.dataset.classId);
      card.onkeydown = e => { if (e.key==="Enter" || e.key===" ") openClass(card.dataset.classId); };
    });
  }

  if (addClassBtn) addClassBtn.addEventListener("click", ()=> { resetAddClassScreen(); showScreen("addClass"); });
  if (defaulterBtn) defaulterBtn.addEventListener("click", ()=> { resetDefaulterScreen(); showScreen("defaulter"); });
  if (logoutBtn) logoutBtn.addEventListener("click", () => {
  currentUser = null;
  currentClass = null;
  if(loginForm) loginForm.reset();
  if(registerForm) registerForm.reset();
  if(registerForm) registerForm.classList.add("hidden");
  if(loginForm) loginForm.classList.remove("hidden");
  // No need to reset toggleAuthBtns text here
  showScreen("login");
  showMessage("Logged out successfully", "success");
});


  // ---- Defaulter Panel ----
  function resetDefaulterScreen() {
    uploadedFiles = [];
    if(uploadedFilesList) uploadedFilesList.innerHTML = "";
    if(analyzeDefaultersBtn) analyzeDefaultersBtn.disabled = true;
    if(defaulterResults) defaulterResults.classList.add("hidden");
    if(defaulterSummary) defaulterSummary.innerHTML = "";
    if(defaulterList) defaulterList.innerHTML = "";
  }

  if(backToDashboardFromDefaulter) backToDashboardFromDefaulter.addEventListener("click", () => showScreen("dashboard"));

  if (uploadMultipleArea && multipleFileInput && analyzeDefaultersBtn && uploadedFilesList) {
    uploadMultipleArea.onclick = () => multipleFileInput.click();
    uploadMultipleArea.ondragover = e => { e.preventDefault(); uploadMultipleArea.classList.add("dragover"); };
    uploadMultipleArea.ondragleave = () => uploadMultipleArea.classList.remove("dragover");
    uploadMultipleArea.ondrop = e => {
      e.preventDefault();
      uploadMultipleArea.classList.remove("dragover");
      if (e.dataTransfer.files.length) handleMultipleFileUpload(e.dataTransfer.files);
    };
    multipleFileInput.onchange = e => { if (e.target.files.length) handleMultipleFileUpload(e.target.files); };
  }

  function handleMultipleFileUpload(files) {
    Array.from(files).forEach(file => {
      if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          file.type === "application/vnd.ms-excel") {
        uploadedFiles.push(file);
      }
    });
    renderUploadedFiles();
  }

  function renderUploadedFiles() {
    if (!uploadedFilesList) return;
    uploadedFilesList.innerHTML = uploadedFiles.map((file, idx) => `
      <div class="uploaded-file-item">
        <span class="file-name">${file.name}</span>
        <button class="btn btn--sm btn--outline" onclick="window.removeUploadedFile(${idx})">Remove</button>
      </div>
    `).join("");
    if (analyzeDefaultersBtn) analyzeDefaultersBtn.disabled = uploadedFiles.length === 0;
  }

  window.removeUploadedFile = function(index) {
    uploadedFiles.splice(index, 1);
    renderUploadedFiles();
  };

  analyzeDefaultersBtn.addEventListener("click", async () => {
  if (uploadedFiles.length === 0) return;

  try {
    const allStudentData = {};
    const allDates = new Set();
    let totalFiles = 0;

    // Use first file as base name for export
    let baseFileName = "";
    if (uploadedFiles[0]) {
        baseFileName = uploadedFiles[0].name.replace(/\.[^.]+$/, "").replace(/(\d{2}\d{2}\d{4}(-\d{2}\d{2}_\d{4})?)$/, '');

    }

    // Gather all students & all unique dates from all files
    for (const file of uploadedFiles) {
      const data = await readFileAsArrayBuffer(file);
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      if (rows.length === 0) continue;

      totalFiles++;
      const first = rows[0];

      // Find roll number and name columns
      const rollKey = Object.keys(first).find(k => {
        const lower = k.toLowerCase().trim();
        return lower.includes("roll") || lower === "roll" || lower === "rollnumber";
      });
      const nameKey = Object.keys(first).find(k => {
        const lower = k.toLowerCase().trim();
        return lower.includes("name") || lower === "name" || lower === "studentname";
      });
      if (!rollKey || !nameKey) continue;

      // Find date columns (exclude roll and name)
      const dateColumns = Object.keys(first).filter(k => 
        k !== rollKey && k !== nameKey && k.trim() !== ""
      );

      // Add dates to global set
      dateColumns.forEach(date => allDates.add(date));

      rows.forEach(row => {
        const rollNumber = String(row[rollKey]).trim();
        const name = String(row[nameKey]).trim();
        if (!rollNumber || !name || rollNumber === "undefined" || name === "undefined") return;

        if (!allStudentData[rollNumber]) {
          allStudentData[rollNumber] = {
            name: name,
            rollNumber: rollNumber,
            attendanceRecord: {}
          };
        }

        // Process attendance for each date
        dateColumns.forEach(dateCol => {
          const status = String(row[dateCol]).trim().toLowerCase();
          if (status) {
            allStudentData[rollNumber].attendanceRecord[dateCol] = status;
          }
        });
      });
    }

    // Calculate attendance percentages and find defaulters
    const defaulters = [];
    const regularStudents = [];
    Object.values(allStudentData).forEach(student => {
      const attendanceEntries = Object.values(student.attendanceRecord);
      const totalDays = attendanceEntries.length;

      if (totalDays > 0) {
        const presentDays = attendanceEntries.filter(status =>
          status === "present" || status === "p" || status === "1"
        ).length;
        const attendancePercentage = (presentDays / totalDays) * 100;

        student.totalDays = totalDays;
        student.presentDays = presentDays;
        student.attendancePercentage = attendancePercentage;

        if (attendancePercentage < 80) {
          defaulters.push(student);
        } else {
          regularStudents.push(student);
        }
      }
    });

    // Store results for download AND for UI
    window.defaulterAnalysisResults = {
      defaulters,
      regularStudents,
      totalFiles,
      allDates,         // <-- This is critical! It holds the set of ALL unique date columns found.
      fileBaseName: baseFileName
    };

    displayDefaulterResults(defaulters, regularStudents, totalFiles);
  } catch (error) {
    console.error("Error analyzing defaulters:", error);
    showMessage("Error analyzing defaulters: " + error.message, "error");
  }
});


function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(new Uint8Array(e.target.result));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function displayDefaulterResults(defaulters, regularStudents, totalFiles) {
  const totalStudents = defaulters.length + regularStudents.length;
  const defaulterPercentage = totalStudents > 0 ? (defaulters.length / totalStudents * 100).toFixed(1) : 0;

  defaulterSummary.innerHTML = `
    <div class="summary-stats">
      <div class="stat-item">
        <span class="stat-number">${totalFiles}</span>
        <span class="stat-label">Files Analyzed</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${totalStudents}</span>
        <span class="stat-label">Total Students</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${defaulters.length}</span>
        <span class="stat-label">Defaulters</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${defaulterPercentage}%</span>
        <span class="stat-label">Defaulter Rate</span>
      </div>
    </div>
  `;

  if (defaulters.length > 0) {
    defaulterList.innerHTML = `
      <h3>Defaulters (Below 80% Attendance)</h3>
      <table class="defaulter-table">
        <thead>
          <tr>
            <th>Roll Number</th>
            <th>Name</th>
            <th>Present Days</th>
            <th>Total Days</th>
            <th>Attendance %</th>
          </tr>
        </thead>
        <tbody>
          ${defaulters.map(student => `
            <tr>
              <td>${student.rollNumber}</td>
              <td>${student.name}</td>
              <td>${student.presentDays}</td>
              <td>${student.totalDays}</td>
              <td class="attendance-percentage low">${student.attendancePercentage.toFixed(1)}%</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } else {
    defaulterList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <h3>No Defaulters Found</h3>
        <p>All students have attendance above 80%</p>
      </div>
    `;
  }
  defaulterResults.classList.remove("hidden");
}

downloadDefaultersBtn.addEventListener("click", () => {
  if (!window.defaulterAnalysisResults) return;

  const { defaulters, regularStudents, allDates, fileBaseName } = window.defaulterAnalysisResults;
  const allStudents = [...defaulters, ...regularStudents];

  // Get last (latest) date from allDates and format it as dd_mm_yyyy
  const allDatesSorted = Array.from(allDates).sort();
  const lastDateRaw = allDatesSorted.length ? allDatesSorted[allDatesSorted.length - 1] : "";

  function prettyDate(dateStr) {
    if (!dateStr) return "NA";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}_${month}_${year}`;
  }

  const lastDateFormatted = prettyDate(lastDateRaw);
  const exportBase = (fileBaseName || "Defaulter_Report").replace(/[\\/:*?"<>|]/g, "_");
  const fileName = `${exportBase}_Defaulter_list_Till_${lastDateFormatted}.xlsx`;

  const header = ["Roll Number", "Name", "Present Days", "Total Days", "Attendance %", "Status"];
  const data = [header];
  allStudents.forEach(student => {
    data.push([
      student.rollNumber,
      student.name,
      student.presentDays,
      student.totalDays,
      student.attendancePercentage.toFixed(1) + "%",
      student.attendancePercentage < 80 ? "Defaulter" : "Regular"
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Defaulter Analysis");
  XLSX.writeFile(wb, fileName);
});

clearAnalysisBtn.addEventListener("click", () => {
  resetDefaulterScreen();
});

    
    clearAnalysisBtn.addEventListener("click", () => {
      resetDefaulterScreen();
    });

  // Add the rest of your (unchanged) analyzeDefaultersBtn, download, clear buttons, and the XLSX logic here...

  // ---- Add Class ----
  function resetAddClassScreen() {
    if(uploadArea) uploadArea.classList.remove("hidden");
    if(previewSection) previewSection.classList.add("hidden");
    if(previewContent) previewContent.innerHTML = "";
    if(fileInput) fileInput.value = "";
    newClassData = null;
  }

  if(backToDashboardBtn) backToDashboardBtn.addEventListener("click", ()=> showScreen("dashboard"));

  if (uploadArea && fileInput) {
    uploadArea.onclick = ()=> fileInput.click();
    uploadArea.ondragover = e => { e.preventDefault(); uploadArea.classList.add("dragover"); };
    uploadArea.ondragleave = () => uploadArea.classList.remove("dragover");
    uploadArea.ondrop = e => {
      e.preventDefault(); uploadArea.classList.remove("dragover");
      if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files[0]);
    };
    fileInput.onchange = e => { if (e.target.files.length) handleFileUpload(e.target.files[0]); }
  }

  function handleFileUpload(file) {
    if (!file || typeof XLSX === 'undefined') return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        if (!rows.length) { showMessage("No data found in Excel file.", "error"); return; }
        const first = rows[0];
        const rollKey = Object.keys(first).find(k => k.trim().toLowerCase().includes("roll"));
        const nameKey = Object.keys(first).find(k => k.trim().toLowerCase().includes("name"));
        if (!rollKey || !nameKey) {
          showMessage("Excel must have columns with 'roll' and 'name'", "error");
          return;
        }
        const students = rows.map(r=>({
          rollNumber: String(r[rollKey]).trim(),
          name: String(r[nameKey]).trim()
        })).filter(s=>s.rollNumber && s.name && s.rollNumber !== "undefined" && s.name !== "undefined");
        if (!students.length) {
          showMessage("No valid student entries found in file.", "error");
          return;
        }
        newClassData = { name: file.name.replace(/\.[^.]+$/, ""), students, attendance: {} };
        renderPreview();
      } catch (err) {
        showMessage("Failed to read Excel file: " + err.message, "error");
      }
    };
    reader.onerror = err => showMessage("File read error: " + err.message, "error");
    reader.readAsArrayBuffer(file);
  }

  function renderPreview() {
    if(uploadArea) uploadArea.classList.add("hidden");
    if(previewSection) previewSection.classList.remove("hidden");
    if(previewContent && newClassData)
      previewContent.innerHTML = `
        <p><strong>Class Name:</strong> ${newClassData.name}</p>
        <table class="preview-table w-full">
          <thead><tr><th>Roll Number</th><th>Name</th></tr></thead>
          <tbody>
            ${newClassData.students.map(s=>`<tr><td>${s.rollNumber}</td><td>${s.name}</td></tr>`).join("")}
          </tbody>
        </table>`;
  }

  if(confirmCreateBtn) confirmCreateBtn.onclick = async ()=> {
    if (!newClassData) return;
    try {
      if (useMockDB) {
        const newClass = {
          id: Date.now(),
          name: newClassData.name,
          teacher_id: currentUser.id,
          students: newClassData.students,
          attendance: newClassData.attendance,
          created_at: new Date().toISOString()
        };
        mockDB.classes.push(newClass);
        mockDB.saveClasses();
      } else {
        const { error } = await supabase.from('classes').insert([{
          name: newClassData.name,
          teacher_id: currentUser.id,
          students: newClassData.students,
          attendance: newClassData.attendance
        }]);
        if (error) return showMessage("Failed to create class: " + error.message, "error");
      }
      showMessage("Class created successfully!", "success");
      resetAddClassScreen();
      showScreen("dashboard");
      renderClasses();
    } catch (error) {
      showMessage("Failed to create class: " + error.message, "error");
    }
  };

  if(cancelPreviewBtn) cancelPreviewBtn.onclick = resetAddClassScreen;

  // ---- Attendance & rest remains same ----
  // ... (Copy your other features here, making sure all DOM queries are within DOMContentLoaded)

  // ---- Initialize ----



    // --- Attendance ---

    
    backToDashboardFromAttendance.addEventListener("click", () => showScreen("dashboard"));
    
    async function openClass(classId) {
      let cls = null;
      
      if (useMockDB) {
        cls = mockDB.classes.find(c => c.id == classId);
      } else {
        const { data, error } = await supabase.from('classes').select('*').eq('id', classId).single();
        if (error || !data) { 
          showMessage("Class not found", "error"); 
          return; 
        }
        cls = data;
      }
      
      if (!cls) {
        showMessage("Class not found", "error");
        return;
      }
      
      currentClass = cls;
      classNameEl.textContent = cls.name;
      
      // Set today's date as default
      const today = new Date().toISOString().split('T')[0];
      attendanceDate.value = today;
      
      // Clear previous inputs
      absentRollsInput.value = "";
      attendancePreview.innerHTML = "";
      
      showScreen("attendance");
    }
    
    // Update attendance preview when input changes
    // Update attendance preview when input changes
function updateAttendancePreview() {
  if (!currentClass || !currentClass.students) return;

  const absentRolls = absentRollsInput.value
    .split(',')
    .map(roll => roll.trim())
    .filter(roll => roll !== "");

  const dateKey = attendanceDate.value;

  // Create attendance object
  const attendanceData = {};
  currentClass.students.forEach(student => {
    if (absentRolls.includes(student.rollNumber)) {
      attendanceData[student.rollNumber] = 'absent';
    } else {
      attendanceData[student.rollNumber] = 'present';
    }
  });

  // ONLY SHOW TOTALS, not individual students
  const presentCount = Object.values(attendanceData).filter(s => s === 'present').length;
  const absentCount = Object.values(attendanceData).filter(s => s === 'absent').length;

  attendancePreview.innerHTML = `
    <div class="attendance-preview-section">
      <div class="preview-stats summary-only">
        <span class="stat present">Present: ${presentCount}</span>
        <span class="stat absent">Absent: ${absentCount}</span>
      </div>
      <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
        Attendance summary for ${dateKey}.
      </div>
    </div>
  `;
}

    // Add event listeners for input changes
    absentRollsInput.addEventListener("input", updateAttendancePreview);
    attendanceDate.addEventListener("change", () => {
      // Load existing attendance for the selected date
      const dateKey = attendanceDate.value;
      const existingAttendance = currentClass.attendance?.[dateKey] || {};
      
      // Pre-fill absent rolls if attendance exists for this date
      const absentRolls = [];
      Object.keys(existingAttendance).forEach(rollNumber => {
        if (existingAttendance[rollNumber] === 'absent') {
          absentRolls.push(rollNumber);
        }
      });
      
      absentRollsInput.value = absentRolls.join(', ');
      updateAttendancePreview();
    });
    
    saveAttendanceBtn.addEventListener("click", async () => {
      if (!currentClass) return;
      
      const dateKey = attendanceDate.value;
      if (!dateKey) {
        showMessage("Please select a date", "error");
        return;
      }
      
      const absentRolls = absentRollsInput.value
        .split(',')
        .map(roll => roll.trim())
        .filter(roll => roll !== "");
      
      // Validate roll numbers
      const invalidRolls = absentRolls.filter(roll => 
        !currentClass.students.some(student => student.rollNumber === roll)
      );
      
      if (invalidRolls.length > 0) {
        showMessage(`Invalid roll numbers: ${invalidRolls.join(', ')}`, "error");
        return;
      }
      
      // Create attendance data
      const attendanceData = {};
      currentClass.students.forEach(student => {
        if (absentRolls.includes(student.rollNumber)) {
          attendanceData[student.rollNumber] = 'absent';
        } else {
          attendanceData[student.rollNumber] = 'present';
        }
      });
      
      try {
        // Update attendance in current class object
        if (!currentClass.attendance) currentClass.attendance = {};
        currentClass.attendance[dateKey] = attendanceData;
        
        // Save to database
        if (useMockDB) {
          const classIndex = mockDB.classes.findIndex(c => c.id === currentClass.id);
          if (classIndex !== -1) {
            mockDB.classes[classIndex] = currentClass;
            mockDB.saveClasses();
          }
        } else {
          const { error } = await supabase.from('classes').update({
            attendance: currentClass.attendance
          }).eq('id', currentClass.id);
          
          if (error) {
            console.error("Database error:", error);
            showMessage("Failed to save attendance: " + error.message, "error");
            return;
          }
        }
        
        showMessage("Attendance saved successfully!", "success");
        updateAttendancePreview(); // Refresh preview
      } catch (error) {
        console.error("Save attendance error:", error);
        showMessage("Failed to save attendance: " + error.message, "error");
      }
    });
    
    attendanceHistoryBtn.addEventListener("click", () => {
      renderAttendanceHistory();
      attendanceHistoryModal.classList.remove("hidden");
    });
    
    closeHistoryBtn.addEventListener("click", () => {
      attendanceHistoryModal.classList.add("hidden");
    });
    
    // Close modal when clicking outside
    attendanceHistoryModal.addEventListener("click", (e) => {
      if (e.target === attendanceHistoryModal) {
        attendanceHistoryModal.classList.add("hidden");
      }
    });
    
function renderAttendanceHistory() {
  if (!currentClass || !currentClass.attendance) {
    historyContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <h3>No Attendance Records</h3>
        <p>No attendance has been recorded for this class yet.</p>
      </div>
    `;
    return;
  }

  const dates = Object.keys(currentClass.attendance).sort().reverse();

  if (dates.length === 0) {
    historyContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <h3>No Attendance Records</h3>
        <p>No attendance has been recorded for this class yet.</p>
      </div>
    `;
    return;
  }

  // Create minimal attendance history table
  historyContent.innerHTML = `
    <div class="history-summary">
      <h3>Attendance History for ${currentClass.name}</h3>
      <p>Total sessions recorded: ${dates.length}</p>
    </div>
    <div class="history-table-container">
      <table class="attendance-history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Number of Absentees</th>
            <th>Absent Roll Numbers</th>
          </tr>
        </thead>
        <tbody>
          ${
            dates.map(date => {
              const dayAttendance = currentClass.attendance[date];
              const absentees = Object.entries(dayAttendance)
                .filter(([roll, status]) => status === 'absent')
                .map(([roll]) => roll);
              return `
                <tr>
                  <td>${new Date(date).toLocaleDateString()}</td>
                  <td class="absent-count">${absentees.length}</td>
                  <td class="absent-rolls-list">${absentees.join(', ') || '-'}</td>
                </tr>
              `;
            }).join("")
          }
        </tbody>
      </table>
    </div>
  `;
}

    
  // ... (your code remains unchanged above this point)

downloadAttendanceBtn.addEventListener("click", () => {
  if (!currentClass || !currentClass.attendance) {
    showMessage("No attendance data to download", "error");
    return;
  }

  const dates = Object.keys(currentClass.attendance).sort();
  if (dates.length === 0) {
    showMessage("No attendance data to download", "error");
    return;
  }

  // Format date as dd/mm/yyyy
  function toPrettyDate(dateString) {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const fileStart = toPrettyDate(dates[0]);
  const fileEnd = toPrettyDate(dates[dates.length - 1]);
  const originalClassName = (currentClass.name || "Attendance").replace(/[\\/:*?"<>|]/g, "_");
  const fileName =`${originalClassName}_${fileStart}-${fileEnd}.xlsx`;

  const header = ["Roll Number", "Name", ...dates];
  const data = [header];

  currentClass.students.forEach(student => {
    const row = [student.rollNumber, student.name];
    dates.forEach(date => {
      const status = currentClass.attendance[date][student.rollNumber] || "";
      row.push(status);
    });
    data.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
  XLSX.writeFile(wb, fileName);

  showMessage("Attendance report downloaded successfully!", "success");
});


// ... (rest of your code remains unchanged)

    
    // Initialize the application
    showScreen("login");
  });
