// State
let skills = [];
let selectedSkill = null;
let eventSource = null;

// DOM refs
const skillList = document.getElementById('skill-list');
const detailContent = document.getElementById('detail-content');
const feedScroll = document.getElementById('feed-scroll');
const chatScroll = document.getElementById('chat-scroll');
const statusDot = document.getElementById('status-dot');
const statSkills = document.getElementById('stat-skills');
const statLines = document.getElementById('stat-lines');
const statScripts = document.getElementById('stat-scripts');

// ── UTILS ─────────────────────────────────────────────────

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function nowStr() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

// ── SYNTAX HIGHLIGHT ──────────────────────────────────────

function highlightSkillMd(raw) {
  const lines = raw.split('\n');
  let inFrontmatter = false;
  let fmCount = 0;

  return lines.map(line => {
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    if (escaped.trim() === '---') {
      fmCount++;
      inFrontmatter = fmCount === 1;
      if (fmCount === 2) inFrontmatter = false;
      return `<span class="yaml-delim">${escaped}</span>`;
    }
    if (fmCount === 1 && inFrontmatter) {
      const m = escaped.match(/^(\w[\w-]*)(\s*:\s*)(.*)$/);
      if (m) return `<span class="yaml-key">${m[1]}</span>${m[2]}<span class="yaml-value">${m[3]}</span>`;
    }
    if (escaped.startsWith('##')) return `<span class="yaml-section">${escaped}</span>`;
    if (escaped.startsWith('#')) return `<span class="yaml-section">${escaped}</span>`;
    if (escaped.startsWith('&gt;')) return `<span class="yaml-comment">${escaped}</span>`;
    return escaped;
  }).join('\n');
}

// ── FEED ──────────────────────────────────────────────────

function addFeedItem(type, message) {
  const item = document.createElement('div');
  item.className = `feed-item ${type}`;
  item.innerHTML = `<span class="feed-time">[${nowStr()}]</span><span class="feed-msg">${message}</span>`;
  feedScroll.appendChild(item);
  feedScroll.scrollTop = feedScroll.scrollHeight;
  // Keep feed trimmed
  while (feedScroll.children.length > 60) feedScroll.removeChild(feedScroll.firstChild);
}

// ── CHAT FEED ─────────────────────────────────────────────

const seenMessages = new Set();

function cleanMessageText(raw) {
  let t = raw;
  // Strip OpenClaw metadata prefix
  t = t.replace(/^Conversation info \(untrusted metadata\):[\s\S]*?```\s*/m, '');
  // Strip markdown formatting but keep the content
  t = t.replace(/```[\w]*\n?([\s\S]*?)```/g, '$1');
  t = t.replace(/\*\*(.+?)\*\*/g, '$1');
  t = t.replace(/\*(.+?)\*/g, '$1');
  t = t.replace(/^#+\s*/gm, '');
  t = t.trim();
  if (!t) return null;
  return t;
}

function addChatMessage(msg) {
  const key = msg.timestamp + msg.role;
  if (seenMessages.has(key)) return;
  seenMessages.add(key);

  const cleaned = cleanMessageText(msg.text);
  if (!cleaned) return;

  const item = document.createElement('div');
  item.className = `chat-item ${msg.role}`;
  const roleLabel = msg.role === 'user' ? 'USER' : 'BOT';
  const text = cleaned.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  item.innerHTML = `<span class="chat-role">${roleLabel}</span><span class="chat-text">${text}</span>`;
  chatScroll.appendChild(item);
  chatScroll.scrollTop = chatScroll.scrollHeight;
  while (chatScroll.children.length > 80) chatScroll.removeChild(chatScroll.firstChild);
}

async function loadRecentMessages() {
  try {
    const res = await fetch('/api/messages');
    const msgs = await res.json();
    msgs.forEach(addChatMessage);
  } catch {}
}

// ── STATS ─────────────────────────────────────────────────

async function refreshStats() {
  try {
    const res = await fetch('/api/stats');
    const s = await res.json();
    statSkills.textContent = `${s.totalSkills} skill${s.totalSkills !== 1 ? 's' : ''}`;
    statLines.textContent = `${s.totalLines} lines`;
    statScripts.textContent = `${s.totalScripts} scripts`;
    [statSkills, statLines, statScripts].forEach(el => {
      el.classList.add('active');
      setTimeout(() => el.classList.remove('active'), 800);
    });
  } catch {}
}

// ── GALLERY ───────────────────────────────────────────────

function renderGallery() {
  // Remove empty state if we have skills
  const emptyState = document.getElementById('empty-state');
  if (skills.length > 0) {
    if (emptyState) emptyState.remove();
  } else {
    if (!emptyState) {
      const div = document.createElement('div');
      div.className = 'empty-state';
      div.id = 'empty-state';
      div.innerHTML = `<div class="pulse-ring"></div><p>Waiting for skills...</p><p class="empty-sub">Text your bot to create one.</p>`;
      skillList.appendChild(div);
    }
    return;
  }

  // Re-render all cards (preserving selection)
  skillList.innerHTML = '';
  skills.forEach(skill => {
    const card = document.createElement('div');
    const isMeta = skill.name === 'meta-skill';
    const isSelected = selectedSkill && selectedSkill.name === skill.name;
    card.className = `skill-card${isMeta ? ' meta' : ''}${isSelected ? ' selected' : ''}`;
    card.dataset.name = skill.name;
    card.innerHTML = `
      <div class="card-name">${skill.name}</div>
      <div class="card-desc">${skill.description || 'No description'}</div>
      <div class="card-meta">
        <span>📄 ${skill.lineCount} lines</span>
        ${skill.hasScripts ? '<span>⚙️ scripts</span>' : ''}
        <span>🕐 ${timeAgo(skill.modifiedAt)}</span>
      </div>`;
    card.addEventListener('click', () => selectSkill(skill));
    skillList.appendChild(card);
  });
}

function glowCard(name) {
  const card = skillList.querySelector(`[data-name="${name}"]`);
  if (!card) return;
  card.classList.add('new-glow');
  setTimeout(() => card.classList.remove('new-glow'), 5500);
}

// ── DETAIL ────────────────────────────────────────────────

async function selectSkill(skill) {
  selectedSkill = skill;
  // Update selected state in gallery
  document.querySelectorAll('.skill-card').forEach(c => c.classList.remove('selected'));
  const card = skillList.querySelector(`[data-name="${skill.name}"]`);
  if (card) card.classList.add('selected');

  let content = '';
  try {
    const res = await fetch(`/api/skills/${encodeURIComponent(skill.name)}`);
    content = await res.text();
  } catch { content = '(failed to load)'; }

  detailContent.className = '';
  detailContent.innerHTML = `
    <div class="detail-header">
      <div class="detail-name">${skill.name}</div>
      <div class="detail-description">${skill.description || 'No description'}</div>
    </div>
    <div class="detail-body">
      <div class="detail-meta-row">
        <span>Lines:<strong>${skill.lineCount}</strong></span>
        <span>Scripts:<strong>${skill.hasScripts ? 'Yes' : 'No'}</strong></span>
        ${skill.version ? `<span>Version:<strong>${skill.version}</strong></span>` : ''}
        <span>Modified:<strong>${timeAgo(skill.modifiedAt)}</strong></span>
        <span>Created:<strong>${timeAgo(skill.createdAt)}</strong></span>
      </div>
      ${skill.files.length > 0 ? `
      <div class="detail-files">
        <strong>Files</strong>
        <ul>${skill.files.map(f => `<li>${f}</li>`).join('')}</ul>
      </div>` : ''}
      <div>
        <div class="code-label">SKILL.MD</div>
        <div class="code-block">${highlightSkillMd(content)}</div>
      </div>
    </div>`;
}

// ── DATA FETCH ────────────────────────────────────────────

async function loadSkills() {
  try {
    const res = await fetch('/api/skills');
    skills = await res.json();
    renderGallery();
    refreshStats();
    if (!selectedSkill && skills.length > 0) selectSkill(skills[0]);
  } catch (e) {
    addFeedItem('system', `⚠️ Failed to load skills: ${e.message}`);
  }
}

// ── SSE ───────────────────────────────────────────────────

function connectSSE() {
  if (eventSource) eventSource.close();
  eventSource = new EventSource('/api/events');

  eventSource.onopen = () => {
    statusDot.className = 'status-dot connected';
    statusDot.title = 'Connected';
    addFeedItem('system', '🦞 SkillForge Dashboard connected');
  };

  eventSource.onmessage = async (e) => {
    let event;
    try { event = JSON.parse(e.data); } catch { return; }

    if (event.type === 'connected') return;

    if (event.type === 'message') {
      addChatMessage(event.message);
      return;
    }

    if (event.type === 'skill_created') {
      addFeedItem('created', `✅ Skill "${event.name}" created`);
      await loadSkills();
      glowCard(event.name);
      // Auto-select the new skill
      const sk = skills.find(s => s.name === event.name);
      if (sk) selectSkill(sk);
    } else if (event.type === 'skill_updated') {
      addFeedItem('updated', `🔄 Skill "${event.name}" updated`);
      await loadSkills();
      // Refresh detail if this skill is selected
      if (selectedSkill && selectedSkill.name === event.name) {
        const sk = skills.find(s => s.name === event.name);
        if (sk) selectSkill(sk);
      }
    } else if (event.type === 'skill_deleted') {
      addFeedItem('deleted', `🗑️ Skill "${event.name}" deleted`);
      if (selectedSkill && selectedSkill.name === event.name) {
        selectedSkill = null;
        detailContent.className = 'detail-placeholder';
        detailContent.innerHTML = '<p>Select a skill to inspect it.</p>';
      }
      await loadSkills();
    }
  };

  eventSource.onerror = () => {
    statusDot.className = 'status-dot disconnected';
    statusDot.title = 'Disconnected — retrying...';
    addFeedItem('system', '⚠️ Connection lost. Reconnecting...');
    setTimeout(connectSSE, 3000);
  };
}

// ── POLLING FALLBACK ──────────────────────────────────────
// SSE can be buffered by proxies (Cloudflare Tunnel etc.)
// Poll every 2s to guarantee real-time updates

async function pollMessages() {
  try {
    const res = await fetch('/api/messages');
    const msgs = await res.json();
    msgs.forEach(addChatMessage);
  } catch {}
}

async function pollSkills() {
  try {
    const res = await fetch('/api/skills');
    const newSkills = await res.json();
    // Detect new skills
    const oldNames = new Set(skills.map(s => s.name));
    skills = newSkills;
    renderGallery();
    refreshStats();
    for (const sk of newSkills) {
      if (!oldNames.has(sk.name)) {
        addFeedItem('created', `Skill "${sk.name}" created`);
        glowCard(sk.name);
        selectSkill(sk);
      }
    }
  } catch {}
}

// ── INIT ──────────────────────────────────────────────────

loadSkills();
loadRecentMessages();
connectSSE();

// Poll every 2s for messages, every 3s for skills
setInterval(pollMessages, 2000);
setInterval(pollSkills, 3000);

// Refresh time-ago labels every 30s
setInterval(() => renderGallery(), 30000);
