// =====================================
// THEME TOGGLE (with persistence)
// =====================================
const THEME_KEY = 'gk-theme-preference';
const themeToggle = document.querySelector('.theme-toggle');

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  // When dark, show ☀️ to indicate switching to light; when light, show 🌙
  if (themeToggle) {
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

(function initTheme() {
  if (!themeToggle) return;
  const stored = window.localStorage.getItem(THEME_KEY);
  const initial = stored || document.body.getAttribute('data-theme') || 'dark';
  applyTheme(initial);

  themeToggle.addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    window.localStorage.setItem(THEME_KEY, next);
  });
})();

// =====================================
// EXPERIENCE TABS (experience.html)
// =====================================
const expTabs = document.querySelectorAll('.tab-btn');
const expContents = document.querySelectorAll('.experience-content');

if (expTabs.length && expContents.length) {
  expTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      expTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      expContents.forEach(c => c.classList.remove('active'));
      const targetId = tab.getAttribute('data-tab');
      const target = document.getElementById(targetId);
      if (target) target.classList.add('active');
    });
  });
}

// =====================================
// DYNAMIC PROJECTS (projects.html)
// =====================================
const projectsGrid = document.getElementById('projects-grid');
const filterControls = document.querySelector('.filter-controls');
let projectsData = [];

const fallbackProjects = [
  {
    name: 'Wind Turbines Health Prediction',
    description:
      'RNN & CNN time-series models in Python with TensorFlow for wind turbine health monitoring.',
    languages: ['Python', 'TensorFlow'],
    html_url: 'https://github.com/georgekalf'
  },
  {
    name: 'Insurance Fraud Detection',
    description:
      'Autoencoder-based anomaly detection for insurance claim fraud in Python.',
    languages: ['Python', 'TensorFlow'],
    html_url: 'https://github.com/georgekalf'
  }
];

async function loadProjects() {
  if (!projectsGrid) return;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      'https://api.github.com/users/georgekalf/repos?per_page=100',
      {
        signal: controller.signal,
        headers: { Accept: 'application/vnd.github+json' }
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

    let repos = await response.json();

    // Filter out forks & profile repos
    repos = repos.filter(
      r =>
        !r.fork &&
        r.name.toLowerCase() !== 'georgekalf' &&
        r.name.toLowerCase() !== 'georgekalf.github.io'
    );

    // Limit to a reasonable number to avoid spamming GitHub API
    const limited = repos.slice(0, 12);

    // Enrich with README image
    const projects = await Promise.all(
      limited.map(async repo => {
        let languages;
        if (Array.isArray(repo.topics) && repo.topics.length) {
          languages = repo.topics;
        } else if (repo.language) {
          languages = [repo.language];
        } else {
          languages = ['Project'];
        }

        let imageUrl = null;
        try {
          const readmeRes = await fetch(
            `https://api.github.com/repos/georgekalf/${repo.name}/readme`,
            { headers: { Accept: 'application/vnd.github.v3.raw' } }
          );
          if (readmeRes.ok) {
            const markdown = await readmeRes.text();
            const match = markdown.match(/!\[[^\]]*\]\((.*?)\)/);
            if (match && match[1]) {
              let imgPath = match[1].trim();

              imgPath = imgPath.replace(/^</, '').replace(/>$/, '');

              if (
                imgPath.startsWith('http://') ||
                imgPath.startsWith('https://')
              ) {
                imageUrl = imgPath;
              } else {
                const branch = repo.default_branch || 'main';
                imgPath = imgPath.replace(/^\.?\//, '');
                imageUrl = `https://raw.githubusercontent.com/georgekalf/${repo.name}/${branch}/${imgPath}`;
              }
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch README for ${repo.name}:`, e.message);
        }

        return {
          name: repo.name,
          description: repo.description || 'No description provided yet.',
          html_url: repo.html_url,
          languages,
          image_url: imageUrl
        };
      })
    );

    projectsData = projects;
  } catch (err) {
    console.warn('GitHub API failed, using fallback:', err.message);
    projectsData = fallbackProjects.map(p => ({ ...p, image_url: null }));
  }

  renderProjects('all');
  setupProjectFilters();
}

function renderProjects(filter = 'all') {
  if (!projectsGrid) return;

  const filtered =
    filter === 'all'
      ? projectsData
      : projectsData.filter(p => p.languages.includes(filter));

  if (!filtered.length) {
    projectsGrid.innerHTML = `
      <p style="text-align:center; color: var(--text-secondary); margin-top:1.5rem;">
        No projects found for "${filter}".
      </p>`;
    return;
  }

  projectsGrid.innerHTML = filtered
    .map(p => {
      const title = p.name
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      const thumbStyle = p.image_url
        ? `style="background-image:url('${p.image_url}');"`
        : '';

      return `
        <a href="${p.html_url}" target="_blank" class="project-card">
          <div class="project-thumb" ${thumbStyle}></div>
          <div class="project-info">
            <h3>${title}</h3>
            <p>${p.description}</p>
            <div class="project-topics">
              ${p.languages.map(l => `<span class="lang-tag">${l}</span>`).join('')}
            </div>
          </div>
        </a>
      `;
    })
    .join('');
}

function setupProjectFilters() {
  if (!filterControls) return;

  const allLanguages = [...new Set(projectsData.flatMap(p => p.languages))];

  filterControls.innerHTML = `
    <button class="filter-btn active" data-filter="all">All Projects</button>
  `;

  allLanguages.forEach(lang => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filter = lang;
    btn.textContent = lang;
    filterControls.appendChild(btn);
  });

  filterControls.addEventListener('click', e => {
    if (!e.target.classList.contains('filter-btn')) return;
    const filter = e.target.dataset.filter || 'all';

    document
      .querySelectorAll('.filter-btn')
      .forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');

    renderProjects(filter);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
});
