/* =============================================
   app.js — navigation, chat, auth
   Users + chat messages stored in Firestore.
   Session stored in localStorage/sessionStorage.
============================================= */

const ADMIN_USER = 'superadmin67';

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

function isAdmin() {
  const u = currentUser();
  return u && u.toLowerCase() === ADMIN_USER.toLowerCase();
}

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
  const user = currentUser();
  if (user && typeof db !== 'undefined') {
    db.collection('presence').doc(user.toLowerCase()).delete().catch(function() {});
  }
  clearSession();
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  updateAuthUI();
}

function showMsg(el, text, ok = false) {
  el.textContent = text;
  el.className   = 'auth-msg' + (ok ? ' ok' : '');
}

// ─── User identity colours + avatars ──────────
// Deterministic per-username: hash username → pick colour + emoji
const USER_COLORS = [
  '#a78bfa','#f472b6','#34d399','#fbbf24','#60a5fa',
  '#f87171','#a3e635','#2dd4bf','#fb923c','#e879f9',
];
const USER_EMOJIS = [
  '🐱','🦊','🐻','🐼','🐸','🐺','🐯','🦁','🐙','🦋',
  '🐢','🦄','🐝','🦉','🐬','🦀','🐲','🦊','🐨','🦝',
];

function strHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function userColor(username) {
  return USER_COLORS[strHash(username.toLowerCase()) % USER_COLORS.length];
}

function userEmoji(username) {
  return USER_EMOJIS[strHash(username.toLowerCase()) % USER_EMOJIS.length];
}

// ─── Chat (Firestore real-time) ──────────────
let chatUnsubscribe   = null;
let presenceUnsubscribe = null;
let replyTarget       = null;
let editTarget        = null;   // { id, originalText }
let chatMessageLookup = {};
let chatReactionMenu  = null;   // currently open popup id
let chatMoreMenu      = null;   // currently open action menu id
let lastChatMessages  = [];

const CHAT_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

function showChatError(msg) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  container.innerHTML = '<p style="color:#f87171;font-size:13px;padding:12px;">⚠ ' + msg + '</p>';
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

// Upload image to Cloudinary and post as chat message
async function sendChatImage(file) {
  const user = currentUser();
  if (!user || !file) return;

  if (!file.type.startsWith('image/')) { alert('Only image files are supported.'); return; }
  if (file.size > 10 * 1024 * 1024) { alert('Image too large. Max 10MB.'); return; }

  const label = document.getElementById('chat-img-btn');
  if (label) label.textContent = '⏳';

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ywthyinx');

    const res = await fetch('https://api.cloudinary.com/v1_1/dokmgafq4/image/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed: ' + res.statusText);

    const data   = await res.json();
    const imgUrl = data.secure_url;

    const payload = {
      user,
      text:      '',
      imgUrl,
      time:      firebase.firestore.FieldValue.serverTimestamp(),
      reactions: {},
    };
    if (replyTarget && replyTarget.id) {
      payload.replyTo = { id: replyTarget.id, user: replyTarget.user, text: replyTarget.text };
    }
    await db.collection('chat').add(payload);
    clearReplyTarget();
  } catch (e) {
    alert('Image send failed: ' + e.message);
  } finally {
    if (label) label.textContent = '📎';
  }
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  const user  = currentUser();
  if (!user) return;

  // If in edit mode, update existing message
  if (editTarget) {
    if (!text) return;
    db.collection('chat').doc(editTarget.id).update({ text, edited: true }).catch(function() {});
    input.value = '';
    cancelEdit();
    return;
  }

  if (!text) return;

  const payload = {
    user,
    text,
    time:      firebase.firestore.FieldValue.serverTimestamp(),
    reactions: {},
  };

  if (replyTarget && replyTarget.id) {
    payload.replyTo = { id: replyTarget.id, user: replyTarget.user, text: replyTarget.text };
  }

  db.collection('chat').add(payload);
  input.value = '';
  clearReplyTarget();
}

function renderMessages(msgs) {
  const container = document.getElementById('chat-messages');
  const user      = currentUser();
  const admin     = isAdmin();
  lastChatMessages = msgs;
  chatMessageLookup = {};
  msgs.forEach(function(m) { chatMessageLookup[m.id] = m; });

  // Preserve scroll position if already near bottom
  const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;

  container.innerHTML = '';

  msgs.forEach(function(m) {
    const ts       = m.time && m.time.toDate ? m.time.toDate().getTime() : m.time;
    const isMine   = m.user === user;
    const color    = userColor(m.user || 'anon');
    const emoji    = userEmoji(m.user || 'anon');

    // Reply snippet
    const replyTo  = m.replyTo || null;
    const replySnippet = replyTo
      ? '<div class="chat-reply-snippet"><span class="label">↩ ' + escapeHtml(replyTo.user || 'unknown') + ':</span> ' + escapeHtml((replyTo.text || '').slice(0, 80)) + '</div>'
      : '';

    // Body: text or image
    let bodyHtml;
    if (m.imgUrl) {
      bodyHtml = '<img class="chat-bubble-img" src="' + escapeHtml(m.imgUrl) + '" alt="image" onclick="openLightbox(\'' + escapeHtml(m.imgUrl) + '\')" />';
    } else {
      bodyHtml = escapeHtml(m.text || '') + (m.edited ? ' <span class="edited-tag">(edited)</span>' : '');
    }

    // Existing reaction counts (only those with at least 1)
    const reactions   = m.reactions || {};
    const reactSummary = CHAT_REACTIONS
      .filter(function(e) { return Array.isArray(reactions[e]) && reactions[e].length > 0; })
      .map(function(e) {
        const users   = reactions[e];
        const reacted = user && users.includes(user);
        return '<button class="chat-reacted-pip' + (reacted ? ' mine' : '') + '" onclick="toggleChatReaction(\'' + m.id + '\',\'' + e + '\')" title="' + escapeHtml(users.join(', ')) + '">' +
          e + ' <span>' + users.length + '</span></button>';
      }).join('');

    // Side action buttons (Messenger-style): react + reply; edit/delete inside triple-dot menu
    const replyBtn = user ? '<button class="msg-side-btn" title="reply" onclick="setReplyTarget(\'' + m.id + '\')">↩</button>' : '';
    const reactBtn = user ? '<button class="msg-side-btn" title="react" onclick="toggleReactPicker(\'' + m.id + '\',this)">😊</button>' : '';
    const moreItems =
      (isMine ? '<button class="msg-more-item" onclick="closeMsgMenus();startEdit(\'' + m.id + '\')">✏ Edit</button>' : '') +
      ((isMine || admin) ? '<button class="msg-more-item danger" onclick="closeMsgMenus();deleteChatMsg(\'' + m.id + '\')">🗑 Delete</button>' : '');
    const moreBtn = moreItems
      ? '<div class="msg-more-wrap">' +
          '<button class="msg-side-btn" title="more" onclick="toggleMsgMenu(\'' + m.id + '\',this)">⋯</button>' +
          '<div class="msg-more-menu" id="msg-more-menu-' + m.id + '">' + moreItems + '</div>' +
        '</div>'
      : '';

    const sideActionsHtml = '<div class="msg-side-actions">' + reactBtn + replyBtn + moreBtn + '</div>';

    const div = document.createElement('div');
    div.className = 'chat-msg ' + (isMine ? 'mine' : 'theirs');
    div.dataset.id = m.id;

    const avatarHtml = isMine ? '' :
      '<div class="chat-avatar" style="background:' + color + '" title="' + escapeHtml(m.user || 'unknown') + '">' + emoji + '</div>';

    const bubbleStyle = isMine ? '' : ' style="background:' + color + '1a; border-color:' + color + '40"';

    div.innerHTML =
      avatarHtml +
      '<div class="msg-body">' +
        '<div class="bubble"' + bubbleStyle + '>' +
          replySnippet +
          bodyHtml +
        '</div>' +
        (reactSummary ? '<div class="chat-reacted-row">' + reactSummary + '</div>' : '') +
        '<div class="msg-meta">' + (isMine ? 'you' : escapeHtml(m.user || 'unknown')) + ' · ' + timeAgo(ts) + '</div>' +
      '</div>' +
      sideActionsHtml;

    container.appendChild(div);
  });

  if (atBottom) container.scrollTop = container.scrollHeight;
  renderReplyComposer();
  renderEditBar();
  updateOnlineCount();
}

// ─── Reaction picker ──────────────────────────
function toggleReactPicker(msgId, btn) {
  closeMsgMenus();

  // Close any existing picker
  const existing = document.getElementById('react-picker-popup');
  if (existing) {
    existing.remove();
    if (chatReactionMenu === msgId) { chatReactionMenu = null; return; }
  }
  chatReactionMenu = msgId;

  const popup = document.createElement('div');
  popup.id = 'react-picker-popup';
  popup.className = 'react-picker-popup';
  CHAT_REACTIONS.forEach(function(emoji) {
    const b = document.createElement('button');
    b.textContent = emoji;
    b.onclick = function() { toggleChatReaction(msgId, emoji); popup.remove(); chatReactionMenu = null; };
    popup.appendChild(b);
  });

  // Position near button
  btn.closest('.msg-side-actions').appendChild(popup);

  // Close on outside click
  setTimeout(function() {
    document.addEventListener('click', function handler(e) {
      if (!popup.contains(e.target) && e.target !== btn) {
        popup.remove();
        chatReactionMenu = null;
        document.removeEventListener('click', handler);
      }
    });
  }, 10);
}

function closeMsgMenus() {
  const openMenus = document.querySelectorAll('.msg-more-menu.open');
  openMenus.forEach(function(menu) { menu.classList.remove('open'); });
  chatMoreMenu = null;
}

function toggleMsgMenu(msgId, btn) {
  const menu = btn.nextElementSibling;
  if (!menu) return;

  const willOpen = !menu.classList.contains('open');
  closeMsgMenus();

  if (!willOpen) return;

  const picker = document.getElementById('react-picker-popup');
  if (picker) {
    picker.remove();
    chatReactionMenu = null;
  }

  menu.classList.add('open');
  chatMoreMenu = msgId;

  setTimeout(function() {
    document.addEventListener('click', function handler(e) {
      if (!menu.contains(e.target) && e.target !== btn) {
        closeMsgMenus();
        document.removeEventListener('click', handler);
      }
    });
  }, 10);
}

// ─── Reaction toggle ──────────────────────────
async function toggleChatReaction(messageId, emoji) {
  const user = currentUser();
  if (!user) return;

  const ref  = db.collection('chat').doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const reactions = snap.data().reactions || {};
  const users     = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
  const idx       = users.indexOf(user);

  if (idx === -1) users.push(user); else users.splice(idx, 1);
  if (users.length) reactions[emoji] = users; else delete reactions[emoji];
  await ref.update({ reactions });
}

// ─── Reply ────────────────────────────────────
function setReplyTarget(messageId) {
  if (!currentUser()) return;
  const msg = chatMessageLookup[messageId];
  if (!msg) return;
  replyTarget = { id: messageId, user: msg.user || 'unknown', text: (msg.text || '').slice(0, 140) };
  editTarget  = null;
  renderReplyComposer();
  renderEditBar();
  document.getElementById('chat-input').focus();
}

function clearReplyTarget() {
  replyTarget = null;
  renderReplyComposer();
}

function renderReplyComposer() {
  let bar = document.getElementById('chat-reply-bar');
  const row = document.querySelector('.chat-input-row');
  if (!row) return;
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'chat-reply-bar';
    bar.className = 'chat-reply-bar';
    row.parentNode.insertBefore(bar, row);
  }
  if (!replyTarget || !currentUser()) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
  bar.style.display = 'flex';
  bar.innerHTML =
    '<div class="reply-preview">' +
      '<span class="label">↩ replying to ' + escapeHtml(replyTarget.user) + '</span>' +
      '<span class="text">' + escapeHtml(replyTarget.text) + '</span>' +
    '</div>' +
    '<button class="chat-reply-cancel" onclick="clearReplyTarget()">✕</button>';
}

// ─── Edit ─────────────────────────────────────
function startEdit(messageId) {
  const msg = chatMessageLookup[messageId];
  if (!msg || msg.user !== currentUser()) return;
  editTarget  = { id: messageId, originalText: msg.text };
  replyTarget = null;
  const input = document.getElementById('chat-input');
  input.value = msg.text;
  input.focus();
  renderEditBar();
  renderReplyComposer();
}

function cancelEdit() {
  editTarget = null;
  document.getElementById('chat-input').value = '';
  renderEditBar();
}

function renderEditBar() {
  let bar = document.getElementById('chat-edit-bar');
  const row = document.querySelector('.chat-input-row');
  if (!row) return;
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'chat-edit-bar';
    bar.className = 'chat-reply-bar';
    row.parentNode.insertBefore(bar, document.getElementById('chat-reply-bar') || row);
  }
  if (!editTarget) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
  bar.style.display = 'flex';
  bar.innerHTML =
    '<div class="reply-preview">' +
      '<span class="label" style="color:#fbbf24">✏ editing message</span>' +
      '<span class="text">' + escapeHtml(editTarget.originalText) + '</span>' +
    '</div>' +
    '<button class="chat-reply-cancel" onclick="cancelEdit()">✕</button>';
}

// ─── Delete chat message (own or admin) ───────
async function deleteChatMsg(messageId) {
  const user = currentUser();
  if (!user) return;
  const msg = chatMessageLookup[messageId];
  if (!msg) return;
  if (msg.user !== user && !isAdmin()) return;
  if (!confirm('Delete this message?')) return;
  await db.collection('chat').doc(messageId).delete();
}

// ─── Chat input listeners ─────────────────────
document.getElementById('chat-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendMessage();
  if (e.key === 'Escape') { cancelEdit(); clearReplyTarget(); }
});

// Paste image into chat
document.getElementById('chat-input').addEventListener('paste', function(e) {
  const user = currentUser();
  if (!user) return;
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      e.preventDefault();
      sendChatImage(items[i].getAsFile());
      return;
    }
  }
});

// File input for chat image upload
(function() {
  const fileInput = document.getElementById('chat-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) sendChatImage(file);
      e.target.value = '';
    });
  }
})();

// ─── Online count (shared presence) ───────────
function updateOnlineCount() {
  const user = currentUser();
  if (!user) return;
  db.collection('presence').doc(user.toLowerCase()).set({
    display:  user,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true }).catch(function() {});
}

function renderOnlineCount(snapshot) {
  const cutoff = Date.now() - 2 * 60 * 1000;
  let online = 0;
  snapshot.docs.forEach(function(doc) {
    const raw = doc.data().lastSeen;
    const ts  = raw && raw.toDate ? raw.toDate().getTime() : raw;
    if (ts && ts > cutoff) online += 1;
  });
  const badge = document.getElementById('online-count');
  if (badge) badge.textContent = online + ' online';
}

function startPresenceListener() {
  if (presenceUnsubscribe) return;
  presenceUnsubscribe = db.collection('presence').onSnapshot(
    function(snapshot) { renderOnlineCount(snapshot); },
    function() {
      const badge = document.getElementById('online-count');
      if (badge) badge.textContent = '-- online';
    }
  );
}

setInterval(function() { if (currentUser()) updateOnlineCount(); }, 30000);

// ─── Auth UI ──────────────────────────────────
function updateChatAccessState() {
  const user    = currentUser();
  const input   = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const imgBtn  = document.getElementById('chat-img-btn');
  const note    = document.getElementById('chat-access-note');

  if (user) {
    input.disabled    = false;
    sendBtn.disabled  = false;
    if (imgBtn)  imgBtn.disabled  = false;
    input.placeholder = 'say something... (paste image or ctrl+v)';
    note.style.display = 'none';
  } else {
    input.disabled    = true;
    sendBtn.disabled  = true;
    if (imgBtn)  imgBtn.disabled  = true;
    input.placeholder = 'log in to send a message';
    note.style.display = 'block';
  }

  renderReplyComposer();
  renderEditBar();
}

function updateAuthUI() {
  const user      = currentUser();
  const guest     = document.getElementById('auth-guest');
  const authUser  = document.getElementById('auth-user');
  const userLabel = document.getElementById('chat-username-display');

  if (user) {
    guest.style.display    = 'none';
    authUser.style.display = 'flex';
    userLabel.textContent  = user + (isAdmin() ? ' 👑' : '');
  } else {
    guest.style.display    = 'block';
    authUser.style.display = 'none';
    userLabel.textContent  = '';
  }

  updateChatAccessState();
  if (lastChatMessages.length) renderMessages(lastChatMessages);
  if (typeof updatePicreaxUploadVisibility === 'function') updatePicreaxUploadVisibility();
  if (user) updateOnlineCount();
}

// ─── Lightbox (shared by chat + PicReax) ──────
function openLightbox(src) {
  let box = document.getElementById('lightbox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'lightbox';
    box.className = 'lightbox';
    box.innerHTML = '<div class="lightbox-backdrop"></div><img class="lightbox-img" />';
    box.querySelector('.lightbox-backdrop').onclick = closeLightbox;
    box.querySelector('.lightbox-img').onclick = closeLightbox;
    document.body.appendChild(box);
  }
  box.querySelector('.lightbox-img').src = src;
  box.classList.add('open');
  document.addEventListener('keydown', lightboxKeyHandler);
}

function closeLightbox() {
  const box = document.getElementById('lightbox');
  if (box) box.classList.remove('open');
  document.removeEventListener('keydown', lightboxKeyHandler);
}

function lightboxKeyHandler(e) {
  if (e.key === 'Escape') closeLightbox();
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
  startPresenceListener();
})();
