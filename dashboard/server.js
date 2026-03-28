#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(process.env.HOME, '.openclaw', 'workspace', 'skills');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Parse --port flag
const portArg = process.argv.indexOf('--port');
const PORT = portArg !== -1 ? parseInt(process.argv[portArg + 1], 10) : 3000;

// SSE clients
const sseClients = new Set();

// Ensure skills dir exists
if (!fs.existsSync(SKILLS_DIR)) {
  fs.mkdirSync(SKILLS_DIR, { recursive: true });
}

// Parse YAML frontmatter from SKILL.md
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const block = match[1];
  const result = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)/);
    if (m) result[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return result;
}

// Get all files in a skill dir recursively
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

// Build skill info object
function getSkillInfo(name) {
  const skillPath = path.join(SKILLS_DIR, name);
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  try {
    const stat = fs.statSync(skillPath);
    if (!stat.isDirectory()) return null;
    if (!fs.existsSync(skillMdPath)) return null;
    const content = fs.readFileSync(skillMdPath, 'utf8');
    const frontmatter = parseFrontmatter(content);
    const lines = content.split('\n').length;
    const files = getSkillFiles(skillPath);
    const hasScripts = files.some(f => f.startsWith('scripts/') || f.endsWith('.sh'));
    const skillStat = fs.statSync(skillMdPath);
    return {
      name: frontmatter.name || name,
      description: frontmatter.description || '',
      version: frontmatter.version || '',
      path: skillPath,
      files,
      lineCount: lines,
      hasScripts,
      createdAt: stat.birthtime.toISOString(),
      modifiedAt: skillStat.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

// Get all skills
function getAllSkills() {
  try {
    return fs.readdirSync(SKILLS_DIR)
      .map(name => getSkillInfo(name))
      .filter(Boolean)
      .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  } catch {
    return [];
  }
}

// Get stats
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

// Broadcast SSE event
function broadcast(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try { client.write(data); } catch { sseClients.delete(client); }
  }
}

// Watch skills directory with debounce
const debounceMap = new Map();
function debounce(key, fn, delay) {
  if (debounceMap.has(key)) clearTimeout(debounceMap.get(key));
  debounceMap.set(key, setTimeout(() => { debounceMap.delete(key); fn(); }, delay));
}

let watcher = null;
function startWatcher() {
  try {
    watcher = fs.watch(SKILLS_DIR, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      const parts = filename.split(path.sep);
      const skillName = parts[0];
      if (!skillName) return;
      debounce(skillName, () => {
        const skillPath = path.join(SKILLS_DIR, skillName);
        if (!fs.existsSync(skillPath)) {
          broadcast({ type: 'skill_deleted', name: skillName, timestamp: new Date().toISOString() });
        } else {
          const info = getSkillInfo(skillName);
          if (!info) return;
          // Heuristic: if modified within last 2s, treat as created or updated
          const age = Date.now() - new Date(info.createdAt).getTime();
          const type = age < 3000 ? 'skill_created' : 'skill_updated';
          broadcast({ type, name: skillName, skill: info, timestamp: new Date().toISOString() });
        }
      }, 500);
    });
  } catch (e) {
    console.error('Watcher error:', e.message);
  }
}
startWatcher();

// MIME types
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
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

  // SSE
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // API: list skills
  if (pathname === '/api/skills') {
    const skills = getAllSkills();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(skills));
    return;
  }

  // API: single skill content
  const skillMatch = pathname.match(/^\/api\/skills\/(.+)$/);
  if (skillMatch) {
    const name = decodeURIComponent(skillMatch[1]);
    const skillMdPath = path.join(SKILLS_DIR, name, 'SKILL.md');
    try {
      const content = fs.readFileSync(skillMdPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(content);
    } catch {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
    return;
  }

  // API: stats
  if (pathname === '/api/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getStats()));
    return;
  }

  // Static files
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  // Prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end(); return;
  }
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`🦞 SkillForge Dashboard running at http://localhost:${PORT}`);
  console.log(`   Watching: ${SKILLS_DIR}`);
});
