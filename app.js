/* =============================================
   app.js — navigation, chat, auth
   Users + chat messages stored in Firestore.
   Session stored in localStorage/sessionStorage.
============================================= */

// ─── Navigation ──────────────────────────────
const sections   = document.querySelectorAll('.page-section');
const navBtns    = document.querySelectorAll('.nav-btn');
const navSubBtns = document.querySelectorAll('.nav-sub-btn');

const parentMap = {
  mkxl:       'personal',
  randomizer: 'personal',
  calculator: 'school',
};

function navigateTo(id) {
  sections.forEach(s => s.classList.remove('active'));
  const target = document.getElementById('section-' + id);
  if (target) target.classList.add('active');

  navBtns.forEach(b => b.classList.remove('active'));
  navSubBtns.forEach(b => b.classList.remove('active'));

  const mainBtn = document.querySelector(`.nav-btn[data-section="${id}"]`);
  if (mainBtn) mainBtn.classList.add('active');

  const subBtn = document.querySelector(`.nav-sub-btn[data-section="${id}"]`);
  if (subBtn) {
    subBtn.classList.add('active');
    const parentId = parentMap[id];
    if (parentId) {
      const parentBtn = document.querySelector(`.nav-btn[data-section="${parentId}"]`);
      if (parentBtn) parentBtn.classList.add('active');
      openSubNav('sub-' + parentId);
    }
  }

  closeMobileSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const group = btn.dataset.group;
    if (group) {
      const sub = document.getElementById('sub-' + group);
      if (sub) sub.classList.toggle('open');
      return;
    }
    const id = btn.dataset.section;
    if (id) navigateTo(id);
  });
});

navSubBtns.forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.section));
});

function openSubNav(subId) {
  const el = document.getElementById(subId);
  if (el) el.classList.add('open');
}

// ─── Mobile sidebar ───────────────────────────
const sidebar   = document.getElementById('sidebar');
const overlay   = document.getElementById('sidebar-overlay');
const hamburger = document.getElementById('hamburger');

hamburger.addEventListener('click', () => {
  sidebar.classList.add('open');
  overlay.classList.add('open');
});

overlay.addEventListener('click', closeMobileSidebar);

function closeMobileSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
}

// ─── Auth ─────────────────────────────────────
const SESSION_KEY = 'cozy_session';

async function hashPw(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getSession() {
  return JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || 'null');
}

function saveSession(username) {
  const data = JSON.stringify({ username });
  sessionStorage.setItem(SESSION_KEY, data);
  localStorage.setItem(SESSION_KEY, data);
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

function currentUser() {
  const s = getSession();
  return s ? s.username : null;
}

function switchAuthTab(tab) {
  document.getElementById('auth-login-form').style.display    = tab === 'login'    ? 'grid' : 'none';
  document.getElementById('auth-register-form').style.display = tab === 'register' ? 'grid' : 'none';
  document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('login-msg').textContent = '';
  document.getElementById('reg-msg').textContent   = '';
}

async function registerUser() {
  const username = document.getElementById('reg-username').value.trim();
  const pw       = document.getElementById('reg-password').value;
  const pw2      = document.getElementById('reg-password2').value;
  const msg      = document.getElementById('reg-msg');

  if (!username || !pw) return showMsg(msg, 'fill in all fields.');
  if (username.length < 2)  return showMsg(msg, 'username must be at least 2 chars.');
  if (username.length > 20) return showMsg(msg, 'username max 20 chars.');
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return showMsg(msg, 'letters, numbers, _ . - only.');
  if (pw.length < 4) return showMsg(msg, 'password min 4 characters.');
  if (pw !== pw2)    return showMsg(msg, "passwords don't match.");

  try {
    const userRef = db.collection('users').doc(username.toLowerCase());
    const snap    = await userRef.get();
    if (snap.exists) return showMsg(msg, 'username already taken.');

    const hashed = await hashPw(pw);
    await userRef.set({
      display:   username,
      pw:        hashed,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    saveSession(username);
    showMsg(msg, 'registered! welcome!', true);
    setTimeout(updateAuthUI, 250);
  } catch (e) {
    showMsg(msg, 'error: ' + e.message);
  }
}

async function loginUser() {
  const username = document.getElementById('login-username').value.trim();
  const pw       = document.getElementById('login-password').value;
  const msg      = document.getElementById('login-msg');

  if (!username || !pw) return showMsg(msg, 'fill in all fields.');

  try {
    const snap = await db.collection('users').doc(username.toLowerCase()).get();
    if (!snap.exists) return showMsg(msg, 'username not found.');

    const record = snap.data();
    const hashed = await hashPw(pw);
    if (hashed !== record.pw) return showMsg(msg, 'wrong password.');

    saveSession(record.display);
    showMsg(msg, 'welcome back!', true);
    setTimeout(updateAuthUI, 250);
  } catch (e) {
    showMsg(msg, 'error: ' + e.message);
  }
}

function logoutUser() {
  clearSession();
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  updateAuthUI();
}

function showMsg(el, text, ok = false) {
  el.textContent = text;
  el.className   = 'auth-msg' + (ok ? ' ok' : '');
}

// ─── Chat (Firestore real-time) ──────────────
let chatUnsubscribe = null;

function showChatError(msg) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  container.innerHTML = '<p style="color:#f87171;font-size:13px;padding:12px;">warning ' + msg + '</p>';
}

function startChatListener() {
  if (chatUnsubscribe) return;

  chatUnsubscribe = db.collection('chat')
    .orderBy('time', 'asc')
    .limitToLast(100)
    .onSnapshot(
      function(snapshot) {
        const msgs = snapshot.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
        renderMessages(msgs);
      },
      function(err) { showChatError('Chat error: ' + err.message); }
    );
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;

  const user = currentUser();
  if (!user) return;

  db.collection('chat').add({
    user: user,
    text: text,
    time: firebase.firestore.FieldValue.serverTimestamp(),
  });

  input.value = '';
}

function renderMessages(msgs) {
  const container = document.getElementById('chat-messages');
  const user      = currentUser();
  container.innerHTML = '';

  msgs.forEach(function(m) {
    const ts  = m.time && m.time.toDate ? m.time.toDate().getTime() : m.time;
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (m.user === user ? 'mine' : 'theirs');
    div.innerHTML =
      '<div class="bubble">' + escapeHtml(m.text) + '</div>' +
      '<div class="msg-meta">' + (m.user === user ? 'you' : escapeHtml(m.user)) + ' - ' + timeAgo(ts) + '</div>';
    container.appendChild(div);
  });

  container.scrollTop = container.scrollHeight;
  updateOnlineCount();
}

document.getElementById('chat-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendMessage();
});

// ─── Online count ─────────────────────────────
const PRESENCE_KEY = 'cozy_presence';

function updateOnlineCount() {
  const presences = JSON.parse(localStorage.getItem(PRESENCE_KEY) || '{}');
  const user = currentUser();
  if (user) presences[user] = Date.now();
  const cutoff = Date.now() - 2 * 60 * 1000;
  const online = Object.values(presences).filter(function(t) { return t > cutoff; }).length;
  document.getElementById('online-count').textContent = online + ' online';
  localStorage.setItem(PRESENCE_KEY, JSON.stringify(presences));
}

setInterval(function() { if (currentUser()) updateOnlineCount(); }, 30000);

// ─── Auth UI ──────────────────────────────────
function updateChatAccessState() {
  const user    = currentUser();
  const input   = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const note    = document.getElementById('chat-access-note');

  if (user) {
    input.disabled    = false;
    sendBtn.disabled  = false;
    input.placeholder = 'say something...';
    note.style.display = 'none';
  } else {
    input.disabled    = true;
    sendBtn.disabled  = true;
    input.placeholder = 'log in to send a message';
    note.style.display = 'block';
  }
}

function updateAuthUI() {
  const user      = currentUser();
  const guest     = document.getElementById('auth-guest');
  const authUser  = document.getElementById('auth-user');
  const userLabel = document.getElementById('chat-username-display');

  if (user) {
    guest.style.display    = 'none';
    authUser.style.display = 'flex';
    userLabel.textContent  = user;
  } else {
    guest.style.display    = 'block';
    authUser.style.display = 'none';
    userLabel.textContent  = '';
  }

  updateChatAccessState();
  if (typeof updatePicreaxUploadVisibility === 'function') updatePicreaxUploadVisibility();
  updateOnlineCount();
}

// ─── Utilities ───────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return new Date(ts).toLocaleDateString();
}

// ─── Init ─────────────────────────────────────
(function init() {
  if (typeof firebase === 'undefined' || typeof db === 'undefined') {
    showChatError('Firebase failed to load. Disable any ad blockers and refresh.');
    return;
  }
  updateAuthUI();
  startChatListener();
})();