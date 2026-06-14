const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
});

fetch('posts.json')
  .then(response => response.json())
  .then(posts => {
    const container = document.getElementById('postContainer');
    container.innerHTML = posts.map(post => `
      <article class="post-card">
        <span class="tag">${post.category}</span>
        <h3>${post.title}</h3>
        <p class="post-date">${post.date}</p>
        <p>${post.summary}</p>
        <a href="${post.link}" target="_blank">Read on GitHub →</a>
      </article>
    `).join('');
  });
