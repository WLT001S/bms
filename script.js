(function(){
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

  document.getElementById('btn-process').addEventListener('click', async ()=>{
    document.getElementById('processing').classList.remove('hidden');
    const fill = document.getElementById('progress-fill');
    const label = document.getElementById('proc-label');
    fill.style.width='0%';

    let allLines = [];
    for(let i=0;i<files.length;i++){
      label.textContent = `Đang đọc ${files[i].name}…`;
      const text = await files[i].text();
      const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>0);
      allLines = allLines.concat(lines);
      fill.style.width = `${((i+1)/files.length)*70}%`;
      await new Promise(r=>setTimeout(r,110));
    }

    label.textContent = 'Đang kiểm tra định dạng và loại bỏ trùng lặp…';
    fill.style.width = '90%';
    await new Promise(r=>setTimeout(r,180));

    let total = allLines.length;
    let valid = 0, duplicate = 0, invalid = 0;
    const seen = new Set();  // lưu email đã thấy (thường)
    const cleanPairs = [];

    allLines.forEach(line => {
      if (!emailPassRe.test(line)) {
        invalid++;
        return;
      }
      const email = line.split(':')[0].toLowerCase();
      if (seen.has(email)) {
        duplicate++;
      } else {
        seen.add(email);
        cleanPairs.push(line);
        valid++;
      }
    });

    fill.style.width = '100%';
    label.textContent = 'Hoàn tất.';
    await new Promise(r=>setTimeout(r,220));
    document.getElementById('processing').classList.add('hidden');

    window._cleanPairs = cleanPairs;
    showResults(total, valid, duplicate, invalid);
    goToStage(2);
  });

  // ---------- Results ----------
  function showResults(total, valid, dupCount, invalidCount){
    document.getElementById('s-total').textContent = total;
    document.getElementById('s-valid').textContent = valid;
    document.getElementById('s-dup').textContent = dupCount;
    document.getElementById('s-invalid').textContent = invalidCount;
    document.getElementById('final-count').textContent = valid + ' tài khoản sẵn sàng';

    const domains = {};
    window._cleanPairs.forEach(pair=>{
      const email = pair.split(':')[0];
      const d = email.split('@')[1];
      domains[d] = (domains[d]||0)+1;
    });
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
  document.getElementById('btn-download').addEventListener('click', ()=>{
    const format = document.getElementById('export-format').value;
    const pairs = window._cleanPairs || [];
    let content, mime, filename;
    if (format === 'csv') {
      content = 'email,password\n' + pairs.map(p=>{
        const [email, ...passParts] = p.split(':');
        const password = passParts.join(':');
        return `${email},${password}`;
      }).join('\n');
      mime = 'text/csv';
      filename = 'clean-list.csv';
    } else {
      content = pairs.join('\n');
      mime = 'text/plain';
      filename = 'clean-list.txt';
    }
    const blob = new Blob([content], {type: mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });

  // ---------- Reset ----------
  document.getElementById('btn-reset').addEventListener('click', ()=>{
    files = [];
    renderFileList();
    goToStage(1);
  });
})();
