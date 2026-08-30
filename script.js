// ============ CẢNH BÁO & ĐỒNG Ý ============
const overlay = document.getElementById('warning-overlay');
const mainContent = document.getElementById('main-content');
const deniedMessage = document.getElementById('denied-message');
const btnAgree = document.getElementById('btn-agree');
const btnDisagree = document.getElementById('btn-disagree');

btnAgree.addEventListener('click', () => {
  overlay.classList.add('hidden');
  mainContent.classList.remove('hidden');
  sessionStorage.setItem('agreed', 'true');
});

btnDisagree.addEventListener('click', () => {
  overlay.classList.add('hidden');
  deniedMessage.classList.remove('hidden');
});

window.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('agreed') === 'true') {
    overlay.classList.add('hidden');
    mainContent.classList.remove('hidden');
  }
});

// ============ CHẾ ĐỘ SÁNG/TỐI ============
const themeToggle = document.getElementById('theme-toggle');
const icon = themeToggle.querySelector('i');

let currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);
updateIcon();

themeToggle.addEventListener('click', () => {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem('theme', currentTheme);
  updateIcon();
});

function updateIcon() {
  if (currentTheme === 'dark') {
    icon.className = 'fas fa-sun';
    themeToggle.setAttribute('aria-label', 'Chuyển sang chế độ sáng');
  } else {
    icon.className = 'fas fa-moon';
    themeToggle.setAttribute('aria-label', 'Chuyển sang chế độ tối');
  }
}

// ============ XỬ LÝ FILE HÀNG LOẠT ============
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const fileListContainer = document.getElementById('file-list-container');
const fileList = document.getElementById('file-list');
const fileCountSpan = document.getElementById('file-count');
const btnClearAll = document.getElementById('btn-clear-all');
const btnProcess = document.getElementById('btn-process');
const processing = document.getElementById('processing');
const processingText = document.getElementById('processing-text');
const progressFill = document.getElementById('progress-fill');
const resultDiv = document.getElementById('result');
const btnCloseResult = document.getElementById('btn-close-result');
const totalFilesSpan = document.getElementById('total-files');
const totalLinesSpan = document.getElementById('total-lines');
const validLinesSpan = document.getElementById('valid-lines');
const removedLinesSpan = document.getElementById('removed-lines');
const domainList = document.getElementById('domain-list');
const searchInput = document.getElementById('search-input');
const resultList = document.getElementById('result-list');
const resultCountDisplay = document.getElementById('result-count-display');
const btnDownload = document.getElementById('btn-download');
const btnReset = document.getElementById('btn-reset');
const exportFormat = document.getElementById('export-format');
const timerDiv = document.getElementById('auto-delete-timer');
const countdownSpan = document.getElementById('countdown');

let selectedFiles = []; // File chờ xử lý
let filteredData = [];  // Kết quả hợp lệ (mảng các chuỗi email:password)
let currentDisplayData = []; // Dữ liệu đang hiển thị sau lọc/tìm kiếm
let autoDeleteTimerId = null;
let countdownInterval = null;
const AUTO_DELETE_SECONDS = 15 * 60;

// ============ CHỌN FILE ============
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = 'var(--primary)';
  uploadArea.style.background = 'var(--card-bg)';
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.style.borderColor = 'var(--border)';
  uploadArea.style.background = 'var(--glass-bg)';
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = 'var(--border)';
  uploadArea.style.background = 'var(--glass-bg)';
  const files = Array.from(e.dataTransfer.files);
  if (files.length > 0) addFiles(files);
});

fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  if (files.length > 0) {
    addFiles(files);
    fileInput.value = '';
  }
});

function addFiles(files) {
  files.forEach(file => {
    if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
      selectedFiles.push(file);
    }
  });
  updateFileListUI();
}

function updateFileListUI() {
  fileList.innerHTML = '';
  selectedFiles.forEach((file, index) => {
    const li = document.createElement('li');
    const size = formatFileSize(file.size);
    li.innerHTML = `
      <div class="file-info">
        <i class="fas fa-file"></i>
        <span class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
        <span class="file-size">${size}</span>
      </div>
      <button class="btn-remove" data-index="${index}" title="Xóa file"><i class="fas fa-times"></i></button>
    `;
    fileList.appendChild(li);
  });

  fileCountSpan.textContent = selectedFiles.length;
  fileListContainer.classList.toggle('hidden', selectedFiles.length === 0);

  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.getAttribute('data-index'));
      removeFile(index);
    });
  });
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updateFileListUI();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

btnClearAll.addEventListener('click', () => {
  selectedFiles = [];
  updateFileListUI();
});

// ============ XỬ LÝ TẤT CẢ FILE ============
btnProcess.addEventListener('click', async () => {
  if (selectedFiles.length === 0) {
    alert('Vui lòng chọn ít nhất một file.');
    return;
  }
  await processAllFiles(selectedFiles);
});

async function processAllFiles(files) {
  uploadArea.classList.add('hidden');
  fileListContainer.classList.add('hidden');
  processing.classList.remove('hidden');
  resultDiv.classList.add('hidden');
  timerDiv.classList.add('hidden');

  filteredData = [];
  let totalLines = 0;
  let totalValid = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    processingText.textContent = `Đang xử lý file ${i + 1}/${files.length}: ${file.name}`;
    progressFill.style.width = `${((i) / files.length) * 100}%`;
    try {
      const content = await readFileAsText(file);
      const lines = content.split(/\r?\n/);
      totalLines += lines.length;
      const validLines = lines.filter(isValidEmailPassword);
      totalValid += validLines.length;
      filteredData.push(...validLines);
    } catch (error) {
      console.error(`Lỗi khi đọc file ${file.name}:`, error);
      alert(`Có lỗi khi đọc file ${file.name}. File sẽ bị bỏ qua.`);
    }
  }

  progressFill.style.width = '100%';
  const totalRemoved = totalLines - totalValid;

  // Cập nhật kết quả
  setTimeout(() => {
    processing.classList.add('hidden');
    resultDiv.classList.remove('hidden');
    timerDiv.classList.remove('hidden');

    totalFilesSpan.textContent = files.length;
    totalLinesSpan.textContent = totalLines;
    validLinesSpan.textContent = totalValid;
    removedLinesSpan.textContent = totalRemoved;

    // Hiển thị thống kê domain
    displayDomainStats(filteredData);

    // Hiển thị danh sách kết quả (tất cả)
    currentDisplayData = [...filteredData];
    renderResultList(currentDisplayData);

    startAutoDeleteCountdown();
  }, 500);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// Hàm kiểm tra email:password
function isValidEmailPassword(line) {
  line = line.trim();
  if (!line || !line.includes(':')) return false;

  const parts = line.split(':');
  const email = parts[0].trim();
  const password = parts.slice(1).join(':');

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;
  if (!password) return false;
  return true;
}

// ============ THỐNG KÊ DOMAIN ============
function displayDomainStats(data) {
  const domainCounts = {};
  data.forEach(line => {
    const email = line.split(':')[0];
    const domain = email.split('@')[1];
    if (domain) {
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    }
  });

  const sorted = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  domainList.innerHTML = '';

  if (sorted.length === 0) {
    domainList.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">Không có dữ liệu</p>';
    return;
  }

  const maxCount = sorted[0][1];
  sorted.forEach(([domain, count]) => {
    const percent = (count / maxCount) * 100;
    const item = document.createElement('div');
    item.className = 'domain-item';
    item.innerHTML = `
      <span class="domain-name">${escapeHtml(domain)}</span>
      <div class="domain-bar-container">
        <div class="domain-bar" style="width: ${percent}%"></div>
      </div>
      <span class="domain-count">${count}</span>
    `;
    domainList.appendChild(item);
  });
}

// ============ TÌM KIẾM & HIỂN THỊ DANH SÁCH ============
searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    currentDisplayData = [...filteredData];
  } else {
    currentDisplayData = filteredData.filter(line => line.toLowerCase().includes(query));
  }
  renderResultList(currentDisplayData);
});

function renderResultList(data) {
  resultList.innerHTML = '';
  if (data.length === 0) {
    resultList.innerHTML = '<li style="text-align:center; color: var(--text-secondary);">Không có dòng nào</li>';
  } else {
    data.forEach((line, index) => {
      const li = document.createElement('li');
      li.textContent = line;
      li.title = 'Click để xóa dòng này';
      li.addEventListener('click', () => {
        // Xóa dòng khỏi filteredData
        const originalIndex = filteredData.indexOf(line);
        if (originalIndex !== -1) {
          filteredData.splice(originalIndex, 1);
          // Cập nhật lại danh sách hiển thị
          currentDisplayData = currentDisplayData.filter(d => d !== line);
          renderResultList(currentDisplayData);
          // Cập nhật thống kê
          validLinesSpan.textContent = filteredData.length;
          removedLinesSpan.textContent = parseInt(totalLinesSpan.textContent) - filteredData.length;
          displayDomainStats(filteredData);
        }
      });
      resultList.appendChild(li);
    });
  }
  resultCountDisplay.textContent = `Hiển thị ${data.length} / ${filteredData.length} dòng`;
}

// ============ TỰ ĐỘNG XÓA SAU 15 PHÚT ============
function startAutoDeleteCountdown() {
  if (autoDeleteTimerId) clearTimeout(autoDeleteTimerId);
  if (countdownInterval) clearInterval(countdownInterval);

  let secondsLeft = AUTO_DELETE_SECONDS;
  updateCountdownDisplay(secondsLeft);

  countdownInterval = setInterval(() => {
    secondsLeft--;
    updateCountdownDisplay(secondsLeft);
    if (secondsLeft <= 0) {
      clearInterval(countdownInterval);
      clearTimeout(autoDeleteTimerId);
      clearData();
    }
  }, 1000);

  autoDeleteTimerId = setTimeout(() => {
    clearInterval(countdownInterval);
    clearData();
  }, AUTO_DELETE_SECONDS * 1000);
}

function updateCountdownDisplay(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  countdownSpan.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function clearData() {
  filteredData = [];
  selectedFiles = [];
  resultDiv.classList.add('hidden');
  timerDiv.classList.add('hidden');
  alert('Dữ liệu đã được tự động xóa khỏi bộ nhớ do quá thời gian 15 phút.');
  resetUI();
}

// ============ RESET & ĐÓNG ============
btnReset.addEventListener('click', resetUI);
btnCloseResult.addEventListener('click', () => {
  resultDiv.classList.add('hidden');
  timerDiv.classList.add('hidden');
  resetUI();
});

function resetUI() {
  uploadArea.classList.remove('hidden');
  fileListContainer.classList.remove('hidden');
  updateFileListUI();
  resultDiv.classList.add('hidden');
  timerDiv.classList.add('hidden');
  if (autoDeleteTimerId) clearTimeout(autoDeleteTimerId);
  if (countdownInterval) clearInterval(countdownInterval);
  progressFill.style.width = '0%';
}

// ============ TẢI FILE KẾT QUẢ ============
btnDownload.addEventListener('click', () => {
  if (filteredData.length === 0) {
    alert('Không có dữ liệu để tải.');
    return;
  }
  const format = exportFormat.value;
  let content = '';
  let mime = 'text/plain';
  let filename = 'filtered_email_password.txt';

  if (format === 'csv') {
    content = 'email,password\n' + filteredData.map(line => {
      const [email, ...passParts] = line.split(':');
      const password = passParts.join(':');
      return `${email},${password}`;
    }).join('\n');
    mime = 'text/csv';
    filename = 'filtered_email_password.csv';
  } else {
    content = filteredData.join('\n');
  }

  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
