document.addEventListener('DOMContentLoaded', function() {
  const root = document.documentElement;

  // ---------- Theme toggle ----------
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle.addEventListener('click', () => {
    const isLight = root.getAttribute('data-theme') === 'light';
    root.setAttribute('data-theme', isLight ? 'dark' : 'light');
  });

  // ---------- Stage navigation ----------
  const railSteps = document.querySelectorAll('.rail-step');
  function goToStage(n){
    [1,2,3].forEach(i=>{
      document.getElementById('stage-'+i).classList.toggle('hidden', i!==n);
    });
    railSteps.forEach(el=>{
      const s = Number(el.dataset.step);
      el.classList.toggle('active', s===n);
      el.classList.toggle('done', s<n);
    });
  }

  // ---------- File handling ----------
  const dropEl = document.getElementById('drop');
  const fileInput = document.getElementById('file-input');
  const filelistEl = document.getElementById('filelist');
  const btnProcess = document.getElementById('btn-process');
  const btnClear = document.getElementById('btn-clear');
  let files = [];

  dropEl.addEventListener('click', () => fileInput.click());
  dropEl.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' ') fileInput.click(); });
  ['dragover','dragleave','drop'].forEach(evt=>{
    dropEl.addEventListener(evt, e=>{
      e.preventDefault();
      dropEl.classList.toggle('drag', evt==='dragover');
    });
  });
  dropEl.addEventListener('drop', e=> handleFiles(e.dataTransfer.files));
  fileInput.addEventListener('change', e=> handleFiles(e.target.files));

  function handleFiles(list){
    files = files.concat(Array.from(list));
    renderFileList();
  }

  function renderFileList(){
    filelistEl.innerHTML = '';
    const has = files.length > 0;
    filelistEl.classList.toggle('hidden', !has);
    btnClear.classList.toggle('hidden', !has);
    btnProcess.disabled = !has;
    files.forEach((f, i)=>{
      const li = document.createElement('li');
      li.innerHTML = `<span class="fname">${f.name}</span><span class="fmeta">${(f.size/1024).toFixed(1)} KB</span>`;
      const btn = document.createElement('button');
      btn.innerHTML = '✕';
      btn.setAttribute('aria-label', 'Xóa file');
      btn.onclick = ()=>{ files.splice(i,1); renderFileList(); };
      li.appendChild(btn);
      filelistEl.appendChild(li);
    });
  }

  btnClear.addEventListener('click', ()=>{ files = []; renderFileList(); });

  // ---------- Processing ----------
  const emailPassRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}:[^\r\n]+$/;

  // Lưu kết quả theo từng file
  let resultsByFile = {}; // { fileName: [cleanPairs] }
  let totalStats = { total:0, valid:0, duplicate:0, invalid:0 };

  document.getElementById('btn-process').addEventListener('click', async ()=>{
    document.getElementById('processing').classList.remove('hidden');
    const fill = document.getElementById('progress-fill');
    const label = document.getElementById('proc-label');
    fill.style.width='0%';

    // Reset
    resultsByFile = {};
    totalStats = { total:0, valid:0, duplicate:0, invalid:0 };

    for(let i=0;i<files.length;i++){
      label.textContent = `Đang đọc ${files[i].name}…`;
      const text = await files[i].text();
      const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>0);
      totalStats.total += lines.length;

      const seenInFile = new Set();
      const cleanPairs = [];
      let dupInFile = 0, invalidInFile = 0;

      lines.forEach(line => {
        if (!emailPassRe.test(line)) {
          invalidInFile++;
          totalStats.invalid++;
          return;
        }
        const email = line.split(':')[0].toLowerCase();
        if (seenInFile.has(email)) {
          dupInFile++;
          totalStats.duplicate++;
        } else {
          seenInFile.add(email);
          cleanPairs.push(line);
          totalStats.valid++;
        }
      });

      resultsByFile[files[i].name] = cleanPairs;
      fill.style.width = `${((i+1)/files.length)*70}%`;
      await new Promise(r=>setTimeout(r,110));
    }

    label.textContent = 'Hoàn tất.';
    fill.style.width = '100%';
    await new Promise(r=>setTimeout(r,220));
    document.getElementById('processing').classList.add('hidden');

    // Cập nhật giao diện kết quả
    showResults();
    goToStage(2);
  });

  // ---------- Hiển thị kết quả ----------
  function showResults(){
    document.getElementById('s-total').textContent = totalStats.total;
    document.getElementById('s-valid').textContent = totalStats.valid;
    document.getElementById('s-dup').textContent = totalStats.duplicate;
    document.getElementById('s-invalid').textContent = totalStats.invalid;
    document.getElementById('final-count').textContent = totalStats.valid + ' tài khoản sẵn sàng';

    // Gom tất cả clean pairs để hiển thị và tìm kiếm
    const allCleanPairs = Object.values(resultsByFile).flat();
    window._cleanPairs = allCleanPairs;

    // Phân tích domain
    const domains = {};
    allCleanPairs.forEach(pair=>{
      const email = pair.split(':')[0];
      const d = email.split('@')[1];
      if (d) domains[d] = (domains[d]||0)+1;
    });
    const domainList = document.getElementById('domain-list');
    domainList.innerHTML = '';
    const totalValid = totalStats.valid || 1;
    Object.entries(domains).sort((a,b)=>b[1]-a[1]).forEach(([domain, count]) => {
      const percent = ((count / totalValid) * 100).toFixed(1);
      const li = document.createElement('li');
      li.className = 'domain-item';
      li.innerHTML = `
        <span class="domain-name">${domain}</span>
        <div class="domain-bar"><div class="domain-bar-fill" style="width:${percent}%"></div></div>
        <span class="domain-count">${count} (${percent}%)</span>
      `;
      domainList.appendChild(li);
    });

    // Populate domain filter
    const domainFilter = document.getElementById('domain-filter');
    domainFilter.innerHTML = '<option value="">Mọi domain</option>' +
      Object.keys(domains).sort((a,b)=>domains[b]-domains[a])
      .map(d=>`<option value="${d}">${d} (${domains[d]})</option>`).join('');

    renderRows();
    document.getElementById('search').oninput = renderRows;
    domainFilter.onchange = renderRows;
  }

  function renderRows(){
    const q = document.getElementById('search').value.toLowerCase();
    const dom = document.getElementById('domain-filter').value;
    const rowsEl = document.getElementById('rows');
    rowsEl.innerHTML = '';
    (window._cleanPairs||[]).filter(pair=>{
      const email = pair.split(':')[0];
      return email.includes(q) && (!dom || email.endsWith('@'+dom));
    })
    .slice(0,500).forEach(pair=>{
      const li = document.createElement('li');
      li.innerHTML = `<span>${pair}</span><span class="tag ok">hợp lệ</span>`;
      rowsEl.appendChild(li);
    });
  }

  // ---------- Navigation buttons ----------
  document.getElementById('btn-goto-3').addEventListener('click', ()=> goToStage(3));
  document.getElementById('btn-back-1').addEventListener('click', ()=> goToStage(1));

  // ---------- Download ----------
  function downloadBlob(content, mime, filename) {
    const blob = new Blob([content], {type: mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Tải file gộp
  document.getElementById('btn-download').addEventListener('click', ()=>{
    const format = document.getElementById('export-format').value;
    const pairs = Object.values(resultsByFile).flat();
    let content, mime, filename;
    if (format === 'csv') {
      content = 'email,password\n' + pairs.map(p=>{
        const [email, ...passParts] = p.split(':');
        const password = passParts.join(':');
        return `${email},${password}`;
      }).join('\n');
      mime = 'text/csv';
      filename = 'clean-list.csv';
    } else if (format === 'json') {
      content = JSON.stringify(pairs.map(p=>{
        const [email, ...passParts] = p.split(':');
        return { email, password: passParts.join(':') };
      }), null, 2);
      mime = 'application/json';
      filename = 'clean-list.json';
    } else {
      content = pairs.join('\n');
      mime = 'text/plain';
      filename = 'clean-list.txt';
    }
    downloadBlob(content, mime, filename);
  });

  // Tải ZIP chứa từng file riêng
  document.getElementById('btn-download-zip').addEventListener('click', async ()=>{
    if (Object.keys(resultsByFile).length === 0) return;
    const zip = new JSZip();
    const folder = zip.folder('filtered_results');
    for (const [fileName, pairs] of Object.entries(resultsByFile)) {
      if (pairs.length > 0) {
        const cleanName = fileName.replace(/\.[^/.]+$/, '') + '_filtered.txt';
        folder.file(cleanName, pairs.join('\n'));
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered_results.zip';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Xem và tải từng file riêng
  const individualModal = document.getElementById('individual-modal');
  const individualFileList = document.getElementById('individual-file-list');
  document.getElementById('btn-show-individual').addEventListener('click', ()=>{
    individualFileList.innerHTML = '';
    for (const [fileName, pairs] of Object.entries(resultsByFile)) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${fileName} (${pairs.length} dòng)</span>
        <button class="download-btn" title="Tải file này"><i class="fas fa-download"></i></button>
      `;
      li.querySelector('.download-btn').addEventListener('click', ()=>{
        const content = pairs.join('\n');
        const format = document.getElementById('export-format').value;
        if (format === 'csv') {
          const csv = 'email,password\n' + pairs.map(p=>{
            const [email, ...passParts] = p.split(':');
            return `${email},${passParts.join(':')}`;
          }).join('\n');
          downloadBlob(csv, 'text/csv', fileName.replace(/\.[^/.]+$/, '') + '_filtered.csv');
        } else if (format === 'json') {
          const json = JSON.stringify(pairs.map(p=>{
            const [email, ...passParts] = p.split(':');
            return { email, password: passParts.join(':') };
          }), null, 2);
          downloadBlob(json, 'application/json', fileName.replace(/\.[^/.]+$/, '') + '_filtered.json');
        } else {
          downloadBlob(content, 'text/plain', fileName.replace(/\.[^/.]+$/, '') + '_filtered.txt');
        }
      });
      individualFileList.appendChild(li);
    }
    individualModal.classList.remove('hidden');
  });

  document.getElementById('btn-close-individual').addEventListener('click', ()=>{
    individualModal.classList.add('hidden');
  });

  // ---------- Reset ----------
  document.getElementById('btn-reset').addEventListener('click', ()=>{
    files = [];
    resultsByFile = {};
    totalStats = { total:0, valid:0, duplicate:0, invalid:0 };
    renderFileList();
    goToStage(1);
  });
});
