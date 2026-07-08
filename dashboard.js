/**
 * LEGACY-X Dashboard JavaScript
 * Chat interface, multi-agent workflow, card management
 */

// ── State ─────────────────────────────────────────────────────────────────────
let chatHistory  = [];
let isProcessing = false;
const chatMessages = document.getElementById('chatMessages');
const chatInput    = document.getElementById('chatInput');
const sendBtn      = document.getElementById('sendBtn');
const charCounter  = document.getElementById('charCounter');
const contextCtr   = document.getElementById('contextCounter');
const suggestions  = document.getElementById('suggestions');

// ── Input Helpers ─────────────────────────────────────────────────────────────
chatInput.addEventListener('input', () => {
  charCounter.textContent = `${chatInput.value.length}/1000`;
  autoResizeTextarea(chatInput);
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!isProcessing) sendMessage();
  }
});

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function useSuggestion(btn) {
  chatInput.value = btn.textContent.trim();
  chatInput.dispatchEvent(new Event('input'));
  chatInput.focus();
}

// ── Send Message ──────────────────────────────────────────────────────────────
async function sendMessage() {
  const question = chatInput.value.trim();
  if (!question || isProcessing) return;

  isProcessing = true;
  sendBtn.disabled = true;
  suggestions.style.display = 'none';

  // Add user message bubble
  appendMessage('user', question);
  chatInput.value = '';
  chatInput.style.height = 'auto';
  charCounter.textContent = '0/1000';

  // Show typing indicator
  const typingId = showTypingIndicator();

  // Reset workflow
  resetWorkflow();
  animateWorkflowStep(0);

  try {
    const res = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ question, history: chatHistory }),
    });

    const data = await res.json();
    removeTypingIndicator(typingId);

    if (data.error) {
      appendMessage('ai', `⚠️ ${data.error}`);
      showToast(data.error, 'error');
      return;
    }

    // Animate workflow steps
    await animateWorkflowSteps(data.workflow_steps || []);

    // Update context counter
    if (contextCtr) {
      contextCtr.textContent = `${data.context_used || 0} memories retrieved`;
    }

    // Populate agent cards
    setAgentResponse('legacy',   data.legacy,    data.timestamp);
    setAgentResponse('analyst',  data.analyst,   data.timestamp);
    setAgentResponse('consensus', data.consensus, data.timestamp);

    // Add consensus to chat
    appendMessage('ai', data.consensus || data.legacy || 'No response generated.', data.timestamp);

    // Update history
    chatHistory.push({ user: question, assistant: data.consensus });
    if (chatHistory.length > 20) chatHistory.shift(); // Keep last 20

  } catch (err) {
    removeTypingIndicator(typingId);
    appendMessage('ai', '⚠️ Network error. Please check your connection and try again.');
    showToast('Connection failed', 'error');
    resetWorkflow();
    console.error(err);
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
  }
}

// ── Chat Bubbles ──────────────────────────────────────────────────────────────
function appendMessage(role, text, timestamp = '') {
  const isAI  = role === 'ai';
  const div   = document.createElement('div');
  div.className = `lx-msg ${isAI ? 'lx-msg-ai' : 'lx-msg-user'}`;

  const avatarIcon = isAI ? 'bi-person-badge-fill' : 'bi-person-fill';
  const timeStr    = timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const bodyHTML   = isAI ? renderMarkdown(text) : escapeHtml(text);

  div.innerHTML = `
    <div class="lx-msg-avatar"><i class="bi ${avatarIcon}"></i></div>
    <div class="lx-msg-bubble">
      <div>${bodyHTML}</div>
      <p class="lx-msg-meta">${isAI ? 'Wisdom Twin' : 'You'} · ${timeStr}</p>
    </div>`;

  chatMessages.appendChild(div);
  scrollToBottom();
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function scrollToBottom() {
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
}

// ── Typing Indicator ──────────────────────────────────────────────────────────
function showTypingIndicator() {
  const id  = `typing-${Date.now()}`;
  const div = document.createElement('div');
  div.id        = id;
  div.className = 'lx-msg lx-msg-ai';
  div.innerHTML = `
    <div class="lx-msg-avatar"><i class="bi bi-person-badge-fill"></i></div>
    <div class="lx-typing-indicator">
      <div class="lx-typing-dot"></div>
      <div class="lx-typing-dot"></div>
      <div class="lx-typing-dot"></div>
    </div>`;
  chatMessages.appendChild(div);
  scrollToBottom();
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ── Agent Cards ───────────────────────────────────────────────────────────────
function setAgentResponse(agent, text, timestamp) {
  const body  = document.getElementById(`${agent}Body`);
  const tEl   = document.getElementById(`${agent}Time`);
  const card  = document.getElementById(`${agent}Card`);

  if (body) {
    body.innerHTML = `<div class="lx-agent-response">${renderMarkdown(text)}</div>`;
  }
  if (tEl && timestamp) tEl.textContent = timestamp;

  // Glow animation
  if (card) {
    card.classList.add('lx-thinking');
    setTimeout(() => card.classList.remove('lx-thinking'), 2000);
  }
}

function toggleCard(bodyId) {
  const body    = document.getElementById(bodyId);
  const chevron = document.getElementById(bodyId.replace('Body', 'Chevron'));
  if (!body) return;
  const hidden = body.style.display === 'none';
  body.style.display   = hidden ? '' : 'none';
  if (chevron) chevron.className = hidden ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
}

// ── Workflow Animation ────────────────────────────────────────────────────────
function resetWorkflow() {
  for (let i = 0; i < 6; i++) {
    const el = document.getElementById(`wfStep${i}`);
    if (el) el.className = 'lx-wf-step-item lx-wf-idle';
  }
}

function animateWorkflowStep(index) {
  const el = document.getElementById(`wfStep${index}`);
  if (el) el.className = 'lx-wf-step-item lx-wf-active';
}

async function animateWorkflowSteps(steps) {
  for (let i = 0; i < 6; i++) {
    const el = document.getElementById(`wfStep${i}`);
    if (el) {
      // Mark previous as done
      if (i > 0) {
        const prev = document.getElementById(`wfStep${i - 1}`);
        if (prev) prev.className = 'lx-wf-step-item lx-wf-done';
      }
      el.className = 'lx-wf-step-item lx-wf-active';
      await delay(320);
    }
  }
  // Mark last as done
  const last = document.getElementById(`wfStep5`);
  if (last) last.className = 'lx-wf-step-item lx-wf-done';
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Clear & Export ────────────────────────────────────────────────────────────
document.getElementById('clearChat')?.addEventListener('click', () => {
  chatMessages.innerHTML = '';
  chatHistory = [];
  resetWorkflow();
  ['legacy','analyst','consensus'].forEach(a => {
    const b = document.getElementById(`${a}Body`);
    if (b) b.innerHTML = '<p class="lx-agent-placeholder">Response will appear here…</p>';
  });
  suggestions.style.display = '';
  contextCtr.textContent = '0 memories retrieved';
  showToast('Chat cleared', 'info');
});

document.getElementById('exportChat')?.addEventListener('click', () => {
  if (!chatHistory.length) { showToast('No conversation to export', 'info'); return; }
  let content = 'LEGACY-X Conversation Export\n';
  content    += `Exported: ${new Date().toLocaleString()}\n`;
  content    += '─'.repeat(50) + '\n\n';
  chatHistory.forEach((h, i) => {
    content += `[${i + 1}] You: ${h.user}\n\nWisdom Twin: ${h.assistant}\n\n${'─'.repeat(50)}\n\n`;
  });
  downloadText(content, `legacy-x-chat-${Date.now()}.txt`);
  showToast('Conversation exported', 'success');
});
