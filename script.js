// Theme Toggle
const themeToggle = document.querySelector('.theme-toggle');
themeToggle.addEventListener('click', () => {
  const body = document.body;
  const current = body.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  body.setAttribute('data-theme', newTheme);
  themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
});

// Nav active link
document.querySelectorAll('.nav-link').forEach(link=>{
  if(link.href === window.location.href) link.classList.add('active');
});

// Experience Tabs (Experience page only)
const tabs = document.querySelectorAll('.tab-btn');
const contents = document.querySelectorAll('.experience-content');
tabs.forEach(tab=>{
  tab.addEventListener('click', ()=>{
    tabs.forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    contents.forEach(c=>c.classList.remove('active'));
    const content = document.getElementById(tab.getAttribute('data-tab'));
    if(content) content.classList.add('active');
  });
});

// Projects Page - Fetch dynamically from GitHub
async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  if(!grid) return;

  try {
    const res = await fetch('https://api.github.com/users/georgekalf/repos?per_page=100');
    let repos = await res.json();
    repos = repos.filter(r => !r.fork && !r.private);

    const processed = repos.map(repo => {
      const languages = repo.language ? [repo.language] : [];
      return {
        name: repo.name.replace(/[-_]/g,' '),
        description: repo.description || 'No description',
        html_url: repo.html_url,
        languages: languages,
        topics: repo.topics || []
      };
    });

    grid.innerHTML = processed.map(p => `
      <a href="${p.html_url}" target="_blank" class="project-card">
        <div class="project-info">
          <h3>${p.name}</h3>
          <p>${p.description}</p>
          <div class="project-langs">
            ${p.languages.map(l=>`<span class="lang-tag">${l}</span>`).join('')}
          </div>
          <div class="project-topics">
            ${p.topics.map(t=>`<span class="lang-tag">${t}</span>`).join('')}
          </div>
        </div>
      </a>
    `).join('');

  } catch(e) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;">Failed to load projects. Using fallback.</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadProjects);
