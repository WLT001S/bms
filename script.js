// ============ CẢNH BÁO & ĐỒNG Ý ============
const overlay = document.getElementById('warning-overlay');
const mainContent = document.getElementById('main-content');
const deniedMessage = document.getElementById('denied-message');
const btnAgree = document.getElementById('btn-agree');
const btnDisagree = document.getElementById('btn-disagree');

btnAgree.addEventListener('click', () => {
  overlay.classList.add('hidden');
  mainContent.classList.remove('hidden');
  // Lưu trạng thái đồng ý trong sessionStorage để không hỏi lại trong phiên này
  sessionStorage.setItem('agreed', 'true');
});

btnDisagree.addEventListener('click', () => {
  overlay.classList.add('hidden');
  deniedMessage.classList.remove('hidden');
  // Có thể khóa hoàn toàn, không cho tương tác
});

// Kiểm tra nếu đã đồng ý trong phiên này thì không hiện overlay nữa
window.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('agreed') === 'true') {
    overlay.classList.add('hidden');
    mainContent.classList.remove('hidden');
  }
});

// ============ CHẾ ĐỘ SÁNG/TỐI ============
const themeToggle = document.getElementById('theme-toggle');
const icon = themeToggle.querySelector('i');

// Lấy theme từ localStorage hoặc mặc định light
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

// ============ XỬ LÝ FILE ============
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const processing = document.getElementById('processing');
const resultDiv = document.getElementById('result');
const totalLinesSpan = document.getElementById('total-lines');
const validLinesSpan = document.getElementById('valid-lines');
const removedLinesSpan = document.getElementById('removed-lines');
const previewContent = document.getElementById('preview-content');
const btnDownload = document.getElementById('btn-download');
const btnReset = document.getElementById('btn-reset');
const timerDiv = document.getElementById('auto-delete-timer');
const countdownSpan = document.getElementById('countdown');

let filteredData = []; // Lưu các dòng hợp lệ
let autoDeleteTimerId = null;
let countdownInterval = null;
const AUTO_DELETE_SECONDS = 15 * 60; // 15 phút

// Click vào upload area
uploadArea.addEventListener('click', () => {
  fileInput.click();
});

// Drag & drop
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = 'var(--primary)';
  uploadArea.style.background = 'var(--card-bg)';
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.style.borderColor = 'var(--border)';
  uploadArea.style.background = 'var(--card-bg)';
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = 'var(--border)';
  uploadArea.style.background = 'var(--card-bg)';
  const file = e.dataTransfer.files[0];
  if (file) {
    processFile(file);
  }
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    processFile(file);
  }
});

function isValidEmailPassword(line) {
  line = line.trim();
  if (!line || !line.includes(':')) return false;

  const parts = line.split(':');
  // Lấy phần email: tất cả trước dấu hai chấm đầu tiên
  const email = parts[0].trim();
  const password = parts.slice(1).join(':'); // Password có thể chứa ':'

  // Regex kiểm tra email
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;

  // Password không rỗng
  if (!password) return false;

  return true;
}

function processFile(file) {
  // Ẩn upload, hiện processing
  uploadArea.classList.add('hidden');
  processing.classList.remove('hidden');
  resultDiv.classList.add('hidden');
  timerDiv.classList.add('hidden');

  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    const lines = content.split(/\r?\n/);
    const total = lines.length;
    const filtered = lines.filter(isValidEmailPassword);
    const removed = total - filtered.length;

    // Lưu kết quả
    filteredData = filtered;

    // Hiển thị kết quả
    processing.classList.add('hidden');
    resultDiv.classList.remove('hidden');
    timerDiv.classList.remove('hidden');

    totalLinesSpan.textContent = total;
    validLinesSpan.textContent = filtered.length;
    removedLinesSpan.textContent = removed;

    // Hiển thị preview
    const previewLines = filtered.slice(0, 50);
    previewContent.textContent = previewLines.join('\n') || '(Không có dòng hợp lệ)';

    // Bắt đầu đếm ngược tự động xóa
    startAutoDeleteCountdown();
  };

  reader.onerror = function() {
    alert('Có lỗi khi đọc file. Vui lòng thử lại.');
    resetUI();
  };

  reader.readAsText(file);
}

function startAutoDeleteCountdown() {
  // Xóa timer cũ nếu có
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
      // Xóa dữ liệu
      filteredData = [];
      resultDiv.classList.add('hidden');
      timerDiv.classList.add('hidden');
      alert('Dữ liệu đã được tự động xóa khỏi bộ nhớ do quá thời gian 15 phút.');
      resetUI();
    }
  }, 1000);

  autoDeleteTimerId = setTimeout(() => {
    // Đảm bảo xóa sau 15 phút nếu interval không hoạt động
    clearInterval(countdownInterval);
    filteredData = [];
    resultDiv.classList.add('hidden');
    timerDiv.classList.add('hidden');
    alert('Dữ liệu đã được tự động xóa khỏi bộ nhớ do quá thời gian 15 phút.');
    resetUI();
  }, AUTO_DELETE_SECONDS * 1000);
}

function updateCountdownDisplay(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  countdownSpan.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function resetUI() {
  uploadArea.classList.remove('hidden');
  fileInput.value = '';
  resultDiv.classList.add('hidden');
  timerDiv.classList.add('hidden');
  if (autoDeleteTimerId) clearTimeout(autoDeleteTimerId);
  if (countdownInterval) clearInterval(countdownInterval);
}

btnReset.addEventListener('click', resetUI);

btnDownload.addEventListener('click', () => {
  if (filteredData.length === 0) {
    alert('Không có dữ liệu để tải.');
    return;
  }
  const blob = new Blob([filteredData.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'filtered_email_password.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
