/* =============================================
   picreax.js — Cloudinary-backed photo feed
   Photos upload to Cloudinary.
   Posts / reactions / comments stored in Firestore.
============================================= */

const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥'];
const CLOUDINARY_CLOUD = 'dokmgafq4';
const CLOUDINARY_PRESET = 'ywthyinx';

function updatePicreaxUploadVisibility() {
  const user = currentUser();
  const uploadArea = document.getElementById('picreax-upload-area');
  const loginNote = document.getElementById('picreax-login-note');

  if (!uploadArea || !loginNote) return;

  if (user) {
    uploadArea.style.display = 'block';
    loginNote.style.display = 'none';
  } else {
    uploadArea.style.display = 'none';
    loginNote.style.display = 'block';
  }
}

async function handlePicUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const user = currentUser();
  if (!user) {
    updatePicreaxUploadVisibility();
    event.target.value = '';
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert('Image too large. Max 10MB.');
    event.target.value = '';
    return;
  }

  const label = document.querySelector('.upload-label span');
  if (label) label.textContent = 'uploading...';

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!res.ok) throw new Error('Cloudinary upload failed: ' + res.statusText);

    const data = await res.json();
    const imgUrl = data.secure_url;
    const postId = Date.now().toString() + '_' + Math.random().toString(36).slice(2, 8);

    await db.collection('picreax').doc(postId).set({
      user,
      imgUrl,
      time: firebase.firestore.FieldValue.serverTimestamp(),
      reactions: {},
      comments: [],
    });

    event.target.value = '';
    document.getElementById('picreax-feed').scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    alert('Upload failed: ' + e.message);
    event.target.value = '';
  } finally {
    if (label) label.textContent = '+ share a photo';
  }
}

function startPicreaxListener() {
  db.collection('picreax')
    .orderBy('time', 'desc')
    .onSnapshot(snapshot => {
      const feed = document.getElementById('picreax-feed');
      if (!feed) return;

      if (snapshot.empty) {
        feed.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">no posts yet. be the first!</p>';
        return;
      }

      feed.innerHTML = '';
      snapshot.docs.forEach(doc => {
        feed.appendChild(buildPostEl({ id: doc.id, ...doc.data() }));
      });
    });
}

function buildPostEl(post) {
  const user = currentUser();
  const article = document.createElement('article');
  article.className = 'picreax-post';
  article.dataset.id = post.id;

  const reactionBtns = REACTIONS.map(emoji => {
    const users = post.reactions?.[emoji] || [];
    const reacted = user && users.includes(user);
    return `<button class="reaction-btn${reacted ? ' reacted' : ''}"
      onclick="toggleReaction('${post.id}','${emoji}')"
      title="${users.length ? users.join(', ') : 'be the first'}">
      ${emoji} <span class="count">${users.length || ''}</span>
    </button>`;
  }).join('');

  const commentItems = (post.comments || []).map(c =>
    `<div class="comment-item"><span class="comment-author">${escapeHtml(c.user)}</span>${escapeHtml(c.text)}</div>`
  ).join('');

  const commentInput = user
    ? `<div class="comment-input-row">
        <input type="text" placeholder="add a comment..." maxlength="200"
          onkeydown="if(event.key==='Enter')addComment('${post.id}',this)" />
        <button onclick="addComment('${post.id}',this.previousElementSibling)">post</button>
      </div>`
    : '<p class="auth-note" style="margin:0">log in to comment.</p>';

  const timeMs = post.time?.toDate ? post.time.toDate().getTime() : post.time;
  const avatar = post.user ? post.user[0].toUpperCase() : '?';
  const adminDelete = (typeof isAdmin === 'function' && isAdmin())
    ? `<button class="btn-admin-delete" onclick="adminDeletePost('${post.id}')">🗑 delete post</button>`
    : '';

  article.innerHTML = `
    <div class="post-header">
      <div class="post-avatar">${avatar}</div>
      <div style="flex:1">
        <div class="post-username">${escapeHtml(post.user || 'unknown')}</div>
        <div class="post-time">${timeAgo(timeMs)}</div>
      </div>
      ${adminDelete}
    </div>
    <div class="post-img-wrap">
      <img class="post-img" src="${post.imgUrl}" alt="post by ${escapeHtml(post.user || 'unknown')}" loading="lazy"
        onclick="openLightbox('${post.imgUrl}')" style="cursor:zoom-in" />
    </div>
    <div class="post-actions">${reactionBtns}</div>
    <div class="post-comments">
      <div class="comment-list">${commentItems}</div>
      ${commentInput}
    </div>
  `;

  return article;
}

async function toggleReaction(postId, emoji) {
  const user = currentUser();
  if (!user) {
    alert('log in to react!');
    return;
  }

  const ref = db.collection('picreax').doc(postId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const reactions = snap.data().reactions || {};
  const users = reactions[emoji] || [];
  const idx = users.indexOf(user);

  if (idx === -1) users.push(user);
  else users.splice(idx, 1);

  reactions[emoji] = users;
  await ref.update({ reactions });
}

async function addComment(postId, input) {
  const text = input.value.trim();
  if (!text) return;

  const user = currentUser();
  if (!user) return;

  await db.collection('picreax').doc(postId).update({
    comments: firebase.firestore.FieldValue.arrayUnion({ user, text, time: Date.now() }),
  });

  input.value = '';
}

async function adminDeletePost(postId) {
  if (typeof isAdmin !== 'function' || !isAdmin()) return;
  if (!confirm('Delete this post permanently?')) return;
  await db.collection('picreax').doc(postId).delete();
}

(function initPicreax() {
  updatePicreaxUploadVisibility();
  startPicreaxListener();
})();
