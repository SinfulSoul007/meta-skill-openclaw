#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(process.env.HOME, '.openclaw', 'workspace', 'skills');
const AGENTS_DIR = path.join(process.env.HOME, '.openclaw', 'agents');
const PUBLIC_DIR = path.join(__dirname, 'public');

const portArg = process.argv.indexOf('--port');
const PORT = portArg !== -1 ? parseInt(process.argv[portArg + 1], 10) : 3000;

const sseClients = new Set();

if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });

// ── UTILITIES ─────────────────────────────────────────────

const debounceMap = new Map();
function debounce(key, fn, delay) {
  if (debounceMap.has(key)) clearTimeout(debounceMap.get(key));
  debounceMap.set(key, setTimeout(() => { debounceMap.delete(key); fn(); }, delay));
}

function broadcast(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try { client.write(data); } catch { sseClients.delete(client); }
  }
}

// ── SKILLS ────────────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)/);
    if (m) result[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return result;
}

function getSkillFiles(skillPath) {
  const files = [];
  function walk(dir, base) {
    try {
      for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        const rel = base ? base + '/' + entry : entry;
        if (fs.statSync(full).isDirectory()) walk(full, rel);
        else files.push(rel);
      }
    } catch {}
  }
  walk(skillPath, '');
  return files;
}

function getSkillInfo(name) {
  const skillPath = path.join(SKILLS_DIR, name);
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  try {
    const stat = fs.statSync(skillPath);
    if (!stat.isDirectory()) return null;
    if (!fs.existsSync(skillMdPath)) return null;
    const content = fs.readFileSync(skillMdPath, 'utf8');
    const fm = parseFrontmatter(content);
    const files = getSkillFiles(skillPath);
    return {
      name: fm.name || name,
      description: fm.description || '',
      version: fm.version || '',
      path: skillPath,
      files,
      lineCount: content.split('\n').length,
      hasScripts: files.some(f => f.startsWith('scripts/') || f.endsWith('.sh')),
      createdAt: stat.birthtime.toISOString(),
      modifiedAt: fs.statSync(skillMdPath).mtime.toISOString(),
    };
  } catch { return null; }
}

function getAllSkills() {
  try {
    return fs.readdirSync(SKILLS_DIR).map(n => getSkillInfo(n)).filter(Boolean)
      .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  } catch { return []; }
}

function getStats() {
  const skills = getAllSkills();
  return {
    totalSkills: skills.length,
    totalLines: skills.reduce((s, sk) => s + sk.lineCount, 0),
    totalScripts: skills.filter(sk => sk.hasScripts).length,
    latestSkill: skills[0]?.name || null,
    metaSkillPresent: skills.some(sk => sk.name === 'meta-skill'),
  };
}

// ── MESSAGES ──────────────────────────────────────────────

function extractText(msg) {
  let text = '';
  if (Array.isArray(msg.content)) {
    for (const b of msg.content) {
      if (b.type === 'text') text += b.text;
    }
  } else if (typeof msg.content === 'string') {
    text = msg.content;
  }
  return text;
}

function isNoise(text) {
  return text.includes('HEARTBEAT') || text.includes('Read HEARTBEAT');
}

function parseSessionMessages(filePath) {
  const messages = [];
  try {
    const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
    for (const line of lines) {
      if (!line) continue;
      try {
        const entry = JSON.parse(line);
        if (entry.type !== 'message') continue;
        const msg = entry.message;
        if (!msg || !msg.role) continue;
        if (msg.role === 'toolResult' || msg.role === 'system') continue;
        const text = extractText(msg);
        if (!text || isNoise(text)) continue;
        messages.push({ role: msg.role, text, timestamp: entry.timestamp });
      } catch {}
    }
  } catch {}
  return messages;
}

function getAllMessages() {
  let all = [];
  try {
    for (const agent of fs.readdirSync(AGENTS_DIR)) {
      const sessDir = path.join(AGENTS_DIR, agent, 'sessions');
      if (!fs.existsSync(sessDir)) continue;
      for (const f of fs.readdirSync(sessDir)) {
        if (!f.endsWith('.jsonl')) continue;
        all = all.concat(parseSessionMessages(path.join(sessDir, f)));
      }
    }
  } catch {}
  all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return all;
}

// ── WATCHERS ──────────────────────────────────────────────

// Track file sizes to detect new content
const fileSizes = new Map();

function watchMessages() {
  try {
    for (const agent of fs.readdirSync(AGENTS_DIR)) {
      const sessDir = path.join(AGENTS_DIR, agent, 'sessions');
      if (!fs.existsSync(sessDir)) continue;

      // Initial sizes
      for (const f of fs.readdirSync(sessDir)) {
        if (!f.endsWith('.jsonl')) continue;
        const fp = path.join(sessDir, f);
        try { fileSizes.set(fp, fs.statSync(fp).size); } catch {}
      }

      fs.watch(sessDir, { recursive: true }, (_evt, filename) => {
        if (!filename || !filename.endsWith('.jsonl')) return;
        const fp = path.join(sessDir, filename);
        debounce('msg-' + fp, () => {
          try {
            const stat = fs.statSync(fp);
            const prevSize = fileSizes.get(fp) || 0;
            if (stat.size <= prevSize) return;
            fileSizes.set(fp, stat.size);

            // Read only the new bytes
            const buf = Buffer.alloc(stat.size - prevSize);
            const fd = fs.openSync(fp, 'r');
            fs.readSync(fd, buf, 0, buf.length, prevSize);
            fs.closeSync(fd);

            const newLines = buf.toString('utf8').trim().split('\n');
            for (const line of newLines) {
              try {
                const entry = JSON.parse(line);
                if (entry.type !== 'message') continue;
                const msg = entry.message;
                if (!msg || msg.role === 'toolResult' || msg.role === 'system') continue;
                const text = extractText(msg);
                if (!text || isNoise(text)) continue;
                broadcast({
                  type: 'message',
                  message: { role: msg.role, text, timestamp: entry.timestamp },
                  timestamp: new Date().toISOString(),
                });
              } catch {}
            }
          } catch {}
        }, 200);
      });
    }
  } catch {}
}

function watchSkills() {
  try {
    fs.watch(SKILLS_DIR, { recursive: true }, (_evt, filename) => {
      if (!filename) return;
      const skillName = filename.split(path.sep)[0];
      if (!skillName) return;
      debounce(skillName, () => {
        const skillPath = path.join(SKILLS_DIR, skillName);
        if (!fs.existsSync(skillPath)) {
          broadcast({ type: 'skill_deleted', name: skillName, timestamp: new Date().toISOString() });
        } else {
          const info = getSkillInfo(skillName);
          if (!info) return;
          const age = Date.now() - new Date(info.createdAt).getTime();
          const type = age < 3000 ? 'skill_created' : 'skill_updated';
          broadcast({ type, name: skillName, skill: info, timestamp: new Date().toISOString() });
        }
      }, 500);
    });
  } catch (e) {
    console.error('Skill watcher error:', e.message);
  }
}

// Also poll for new messages every 3s as a fallback (fs.watch can miss events)
let lastMsgCount = 0;
function pollMessages() {
  const msgs = getAllMessages();
  if (msgs.length > lastMsgCount) {
    const newOnes = msgs.slice(lastMsgCount);
    for (const m of newOnes) {
      broadcast({ type: 'message', message: m, timestamp: new Date().toISOString() });
    }
  }
  lastMsgCount = msgs.length;
}
setInterval(pollMessages, 3000);

watchSkills();
watchMessages();

// ── HTTP SERVER ───────────────────────────────────────────

const MIME = {
  '.html': 'text/html', '.css': 'text/css',
  '.js': 'application/javascript', '.json': 'application/json',
};

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

const server = http.createServer((req, res) => {
  setCORS(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (pathname === '/api/skills') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getAllSkills()));
    return;
  }

  const skillMatch = pathname.match(/^\/api\/skills\/(.+)$/);
  if (skillMatch) {
    const name = decodeURIComponent(skillMatch[1]);
    const fp = path.join(SKILLS_DIR, name, 'SKILL.md');
    try {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(fs.readFileSync(fp, 'utf8'));
    } catch {
      res.writeHead(404); res.end('Not found');
    }
    return;
  }

  if (pathname === '/api/messages') {
    const msgs = getAllMessages();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(msgs.slice(-100)));
    return;
  }

  if (pathname === '/api/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getStats()));
    return;
  }

  // Static files
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`🦞 SkillForge Dashboard running at http://localhost:${PORT}`);
  console.log(`   Watching: ${SKILLS_DIR}`);
  // Init poll baseline
  lastMsgCount = getAllMessages().length;
});
