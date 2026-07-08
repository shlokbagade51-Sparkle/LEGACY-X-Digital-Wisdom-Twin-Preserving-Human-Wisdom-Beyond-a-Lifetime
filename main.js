/**
 * LEGACY-X — Main JavaScript
 * Shared utilities: theme toggle, toast, helpers
 */

// ── Theme Toggle ──────────────────────────────────────────────────────────────
(function () {
  const html      = document.documentElement;
  const btn       = document.getElementById('themeToggle');
  const icon      = document.getElementById('themeIcon');
  const stored    = localStorage.getItem('lx-theme') || 'dark';

  html.setAttribute('data-theme', stored);
  updateIcon(stored);

  if (btn) {
    btn.addEventListener('click', () => {
      const current = html.getAttribute('data-theme');
      const next    = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('lx-theme', next);
      updateIcon(next);
    });
  }

  function updateIcon(theme) {
    if (!icon) return;
    icon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
  }
})();

// ── Toast Notifications ───────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  // Remove existing toast
  document.querySelectorAll('.lx-toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `lx-toast lx-toast-${type}`;

  const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill' };
  const colors = { success: 'var(--green)', error: 'var(--red)', info: 'var(--blue)' };

  toast.innerHTML = `
    <div class="d-flex align-items-center gap-2">
      <i class="bi ${icons[type] || icons.info}" style="color:${colors[type]};flex-shrink:0"></i>
      <span>${message}</span>
    </div>`;

  document.body.appendChild(toast);
  requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ── Markdown-lite renderer ────────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/^#{3}\s+(.+)$/gm, '<h6>$1</h6>')
    .replace(/^#{2}\s+(.+)$/gm, '<h5>$1</h5>')
    .replace(/^#{1}\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)+/gs, '<ul class="mb-2 ps-3">$&</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(?!<[hpu])(.+)/gm, (m, p) => p.trim() ? `<p>${p}</p>` : '')
    .replace(/<p><\/p>/g, '');
}

// ── Auto-resize textarea ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.lx-chat-textarea').forEach(el => {
    el.addEventListener('input', () => {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    });
  });
});

// ── Export helpers (shared) ───────────────────────────────────────────────────
function downloadText(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
