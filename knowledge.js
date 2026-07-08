/**
 * LEGACY-X Knowledge Management JavaScript
 * File upload with progress, drag-and-drop, delete
 */

const dropZone      = document.getElementById('dropZone');
const fileInput     = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const uploadStatus   = document.getElementById('uploadStatus');
const progressBar    = document.getElementById('progressBar');
const uploadFileName = document.getElementById('uploadFileName');
const uploadPct      = document.getElementById('uploadPct');

// ── Drag & Drop ───────────────────────────────────────────────────────────────
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files);
  files.forEach(uploadFile);
});

fileInput.addEventListener('change', () => {
  Array.from(fileInput.files).forEach(uploadFile);
  fileInput.value = '';
});

// ── Upload ────────────────────────────────────────────────────────────────────
function uploadFile(file) {
  const allowed = ['pdf', 'txt', 'docx'];
  const ext     = file.name.split('.').pop().toLowerCase();
  if (!allowed.includes(ext)) {
    showToast(`File type .${ext} not allowed. Use PDF, TXT, or DOCX.`, 'error');
    return;
  }
  if (file.size > 16 * 1024 * 1024) {
    showToast('File exceeds 16 MB limit.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  // Show progress
  uploadFileName.textContent = file.name;
  uploadPct.textContent      = '0%';
  progressBar.style.width    = '0%';
  uploadProgress.classList.remove('d-none');
  uploadStatus.innerHTML     = '';

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload');

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      progressBar.style.width = pct + '%';
      uploadPct.textContent   = pct + '%';
    }
  });

  xhr.addEventListener('load', () => {
    uploadProgress.classList.add('d-none');
    try {
      const resp = JSON.parse(xhr.responseText);
      if (xhr.status === 200) {
        showToast(resp.message, 'success');
        uploadStatus.innerHTML = `<div class="alert alert-success py-2 px-3 mt-2" style="font-size:0.82rem">
          <i class="bi bi-check-circle me-2"></i>${resp.message}</div>`;
        updateStats(resp.stats);
        refreshFiles();
      } else {
        showToast(resp.error || 'Upload failed.', 'error');
        uploadStatus.innerHTML = `<div class="alert alert-danger py-2 px-3 mt-2" style="font-size:0.82rem">
          <i class="bi bi-x-circle me-2"></i>${resp.error}</div>`;
      }
    } catch (e) {
      showToast('Upload failed — unexpected server response.', 'error');
    }
  });

  xhr.addEventListener('error', () => {
    uploadProgress.classList.add('d-none');
    showToast('Network error during upload.', 'error');
  });

  xhr.send(formData);
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function deleteFile(filename, btn) {
  if (!confirm(`Remove "${filename}" from the knowledge base?`)) return;

  btn.innerHTML = '<span class="lx-loading-spinner"></span>';
  btn.disabled  = true;

  try {
    const res  = await fetch(`/api/delete/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    const data = await res.json();

    if (res.ok) {
      // Animate removal
      const item = btn.closest('.lx-file-item');
      if (item) {
        item.style.transition = 'opacity 0.3s, transform 0.3s';
        item.style.opacity    = '0';
        item.style.transform  = 'translateX(20px)';
        setTimeout(() => item.remove(), 320);
      }
      showToast(data.message, 'success');
      updateStats(data.stats);
      checkEmpty();
    } else {
      showToast(data.error || 'Delete failed.', 'error');
      btn.innerHTML = '<i class="bi bi-trash"></i>';
      btn.disabled  = false;
    }
  } catch (e) {
    showToast('Network error.', 'error');
    btn.innerHTML = '<i class="bi bi-trash"></i>';
    btn.disabled  = false;
  }
}

// ── Refresh files list ────────────────────────────────────────────────────────
async function refreshFiles() {
  try {
    const res   = await fetch('/api/files');
    const files = await res.json();
    const list  = document.getElementById('fileList');

    if (!files.length) {
      list.innerHTML = `
        <div class="lx-empty-state text-center py-5" id="emptyState">
          <i class="bi bi-inbox lx-empty-icon"></i>
          <p class="mt-3 mb-0">No documents uploaded yet.</p>
          <p class="lx-tiny-text">Upload PDF, TXT, or DOCX files to build the knowledge base.</p>
        </div>`;
      return;
    }

    const icons = { PDF: 'bi-file-earmark-pdf', DOCX: 'bi-file-earmark-word', TXT: 'bi-file-earmark-text' };
    list.innerHTML = files.map(f => `
      <div class="lx-file-item" data-filename="${f.name}">
        <div class="lx-file-icon lx-file-${f.type.toLowerCase()}">
          <i class="bi ${icons[f.type] || 'bi-file-earmark'}"></i>
        </div>
        <div class="lx-file-info flex-grow-1">
          <div class="lx-file-name">${f.name}</div>
          <div class="lx-file-meta">${f.type} · ${f.size} KB · ${f.uploaded}</div>
        </div>
        <button class="btn lx-btn-danger-ghost btn-sm" onclick="deleteFile('${f.name}', this)">
          <i class="bi bi-trash"></i>
        </button>
      </div>`).join('');
  } catch (e) {
    showToast('Could not refresh file list.', 'error');
  }
}

// ── Update Stats ──────────────────────────────────────────────────────────────
function updateStats(stats) {
  if (!stats) return;
  setEl('statTotalFiles',  stats.total_files);
  setEl('statTotalChunks', stats.total_chunks);
  setEl('statIndexTerms',  stats.index_terms);
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function checkEmpty() {
  const items = document.querySelectorAll('.lx-file-item');
  if (!items.length) {
    document.getElementById('fileList').innerHTML = `
      <div class="lx-empty-state text-center py-5">
        <i class="bi bi-inbox lx-empty-icon"></i>
        <p class="mt-3 mb-0">No documents uploaded yet.</p>
      </div>`;
  }
}
