/* =============================================
   picreax.js — Instagram-style photo feed
   Stores posts + reactions + comments in localStorage.
   Images stored as base64 data URLs.
============================================= */

const POSTS_KEY = 'picreax_posts';
const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥'];

function getPosts() {
  return JSON.parse(localStorage.getItem(POSTS_KEY) || '[]');
}

function savePosts(posts) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

function updatePicreaxUploadVisibility() {
  const user = currentUser();
  const uploadArea = document.getElementById('picreax-upload-area');
  const loginNote = document.getElementById('picreax-login-note');
  if (!uploadArea) return;
  if (user) {
    uploadArea.style.display = 'block';
    loginNote.style.display = 'none';
  } else {
    uploadArea.style.display = 'none';
    loginNote.style.display = 'block';
  }
}

function handlePicUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const user = currentUser();
  if (!user) return;

  // Limit file size to 5MB (base64 bloat)
  if (file.size > 5 * 1024 * 1024) {
    alert('Image too large. Max 5MB.');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const posts = getPosts();
    const post = {
      id: Date.now().toString(),
      user,
      imgSrc: e.target.result,
      time: Date.now(),
      reactions: {},   // { emoji: [username, ...] }
      comments: [],    // [{ user, text, time }]
    };
    posts.unshift(post);
    savePosts(posts);
    renderFeed();
    event.target.value = '';
    // Scroll to feed top
    document.getElementById('picreax-feed').scrollIntoView({ behavior: 'smooth' });
  };
  reader.readAsDataURL(file);
}

function renderFeed() {
  const feed = document.getElementById('picreax-feed');
  if (!feed) return;
  const posts = getPosts();

  if (posts.length === 0) {
    feed.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">no posts yet. be the first!</p>';
    return;
  }

  feed.innerHTML = '';
  posts.forEach(post => {
    feed.appendChild(buildPostEl(post));
  });
}

function buildPostEl(post) {
  const user = currentUser();
  const article = document.createElement('article');
  article.className = 'picreax-post';
  article.dataset.id = post.id;

  // Reaction totals
  const reactionBtns = REACTIONS.map(emoji => {
    const users = post.reactions[emoji] || [];
    const reacted = user && users.includes(user);
    return `<button class="reaction-btn${reacted ? ' reacted' : ''}" onclick="toggleReaction('${post.id}','${emoji}')" title="${users.length > 0 ? users.join(', ') : 'be the first'}">
      ${emoji} <span class="count">${users.length > 0 ? users.length : ''}</span>
    </button>`;
  }).join('');

  // Comments
  const commentItems = post.comments.map(c =>
    `<div class="comment-item"><span class="comment-author">${escapeHtml(c.user)}</span>${escapeHtml(c.text)}</div>`
  ).join('');

  const commentInput = user
    ? `<div class="comment-input-row">
        <input type="text" placeholder="add a comment…" maxlength="200"
          onkeydown="if(event.key==='Enter')addComment('${post.id}',this)" />
        <button onclick="addComment('${post.id}',this.previousElementSibling)">post</button>
      </div>`
    : `<p class="auth-note" style="margin:0">log in to comment.</p>`;

  article.innerHTML = `
    <div class="post-header">
      <div class="post-avatar">${post.user[0].toUpperCase()}</div>
      <div>
        <div class="post-username">${escapeHtml(post.user)}</div>
        <div class="post-time">${timeAgo(post.time)}</div>
      </div>
    </div>
    <img class="post-img" src="${post.imgSrc}" alt="post by ${escapeHtml(post.user)}" loading="lazy" />
    <div class="post-actions">${reactionBtns}</div>
    <div class="post-comments">
      <div class="comment-list">${commentItems}</div>
      ${commentInput}
    </div>
  `;

  return article;
}

function toggleReaction(postId, emoji) {
  const user = currentUser();
  if (!user) { alert('log in to react!'); return; }

  const posts = getPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  if (!post.reactions[emoji]) post.reactions[emoji] = [];
  const idx = post.reactions[emoji].indexOf(user);
  if (idx === -1) {
    post.reactions[emoji].push(user);
  } else {
    post.reactions[emoji].splice(idx, 1);
  }
  savePosts(posts);

  // Re-render just this post
  const existing = document.querySelector(`.picreax-post[data-id="${postId}"]`);
  if (existing) existing.replaceWith(buildPostEl(post));
}

function addComment(postId, input) {
  const text = input.value.trim();
  if (!text) return;

  const user = currentUser();
  if (!user) return;

  const posts = getPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  post.comments.push({ user, text, time: Date.now() });
  savePosts(posts);
  input.value = '';

  // Re-render just this post
  const existing = document.querySelector(`.picreax-post[data-id="${postId}"]`);
  if (existing) existing.replaceWith(buildPostEl(post));
}

// Init on load
(function initPicreax() {
  updatePicreaxUploadVisibility();
  renderFeed();
})();
