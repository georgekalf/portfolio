// script.js
// Shared JS for all pages (theme, experience, projects)

document.addEventListener('DOMContentLoaded', () => {
  // =========================
  // THEME TOGGLE (persistent)
  // =========================
  const themeToggle = document.querySelector('.theme-toggle');

  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    if (themeToggle) {
      // Dark mode active -> show sun (☀️) to indicate "switch to light"
      themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  function initTheme() {
    if (!themeToggle) return;

    // First visit defaults to dark; afterwards use stored preference
    const stored = localStorage.getItem('theme');
    const initial =
      stored === 'dark' || stored === 'light' ? stored : 'dark';

    applyTheme(initial);

    themeToggle.addEventListener('click', () => {
      const current = document.body.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('theme', next);
    });
  }

  initTheme();

  // =========================
  // EXPERIENCE TABS (if used)
  // =========================
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

  // =========================
  // PROJECTS (dynamic GitHub)
  // =========================
  const projectsGrid = document.getElementById('projects-grid');
  const filterControls = document.querySelector('.filter-controls');
  let projectsData = [];

  // Fallback if GitHub API fails
  const fallbackProjects = [
    {
      name: 'Wind Turbines Health Prediction',
      friendly_title: 'Wind Turbines Health Prediction (RNN & CNN)',
      description:
        'RNN & CNN time-series models in Python with TensorFlow for wind turbine health monitoring (LSTM, GRU, and 2D-CNN).',
      languages: ['Python', 'TensorFlow', 'Time Series'],
      html_url: 'https://github.com/georgekalf',
      image_url: null
    },
    {
      name: 'Insurance Fraud Detection',
      friendly_title: 'Insurance Claim Fraud Detection (Autoencoders)',
      description:
        'Autoencoder-based anomaly detection for insurance claim fraud with SMOTE balancing and custom cost functions.',
      languages: ['Python', 'TensorFlow', 'Anomaly Detection'],
      html_url: 'https://github.com/georgekalf',
      image_url: null
    },
    {
      name: 'Hospitality Analytics ML',
      friendly_title: 'Hotel Reservation Cancellation Prediction (ML)',
      description:
        'End-to-end hospitality analytics project predicting hotel reservation cancellations using multiple ML models (Logistic Regression, SVM, Decision Tree, Random Forest, XGBoost).',
      languages: ['Python', 'Scikit-learn', 'XGBoost'],
      html_url: 'https://github.com/georgekalf',
      image_url: null
    }
  ];

  // Helper: get short summary from README markdown
  function extractReadmeSummary(markdown) {
    if (!markdown) return null;

    // Split by blank lines into paragraphs
    const paragraphs = markdown
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);

    for (const p of paragraphs) {
      const trimmed = p.trim();

      // Ignore headings, images, badges, code fences, etc.
      if (
        trimmed.startsWith('#') ||
        trimmed.startsWith('![') ||
        trimmed.startsWith('<') ||
        trimmed.startsWith('```') ||
        trimmed.toLowerCase().includes('badge') ||
        trimmed.toLowerCase().includes('shields.io')
      ) {
        continue;
      }

      // A "reasonable" paragraph
      if (trimmed.length > 40) {
        return trimmed;
      }
    }

    return null;
  }

  async function loadProjects() {
    if (!projectsGrid) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        'https://api.github.com/users/georgekalf/repos?per_page=100',
        {
          signal: controller.signal,
          headers: {
            Accept: 'application/vnd.github+json'
          }
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      let repos = await response.json();

      // Filter out forks & profile repos
      repos = repos.filter(
        repo =>
          !repo.fork &&
          repo.name.toLowerCase() !== 'georgekalf' &&
          repo.name.toLowerCase() !== 'georgekalf.github.io' &&
          repo.name.toLowerCase() !== 'portfolio'
      );

      const limited = repos.slice(0, 20); // small, focused list

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
          let readmeSummary = null;

          try {
            const readmeRes = await fetch(
              `https://api.github.com/repos/georgekalf/${repo.name}/readme`,
              { headers: { Accept: 'application/vnd.github.v3.raw' } }
            );

            if (readmeRes.ok) {
              const markdown = await readmeRes.text();

              // 1) Try to extract an image from README
              const match = markdown.match(/!\[[^\]]*]\((.*?)\)/);
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

              // 2) Extract a textual summary to use as description
              readmeSummary = extractReadmeSummary(markdown);
            }
          } catch (err) {
            console.warn(`Failed to parse README for ${repo.name}:`, err.message);
          }

          return {
            name: repo.name,
            description: repo.description || null,
            readmeSummary: readmeSummary || null,
            html_url: repo.html_url,
            languages,
            image_url: imageUrl,
            friendly_title: null
          };
        })
      );

      projectsData = projects;
      applyProjectOverrides();  // ← custom handling for your key repos
    } catch (error) {
      console.warn('GitHub API failed, using fallback projects:', error.message);
      projectsData = fallbackProjects;
    }

    renderProjects('all');
    setupProjectFilters();
  }

  // Apply explicit overrides based on your instructions
  function applyProjectOverrides() {
    projectsData.forEach(p => {
      const lower = p.name.toLowerCase();

      // Customer Segmentation project
      if (lower === 'customer-segmentation') {
        p.friendly_title = 'Customer Segmentation & RFM Analysis';
        p.description =
          'Customer segmentation using RFM and K-Means clustering (with kernel PCA) to create actionable customer groups and targeted marketing strategies.';
        p.languages = ['Python', 'R', 'Clustering', 'RFM'];
        // Use RAW image URL (converted from blob)
        p.image_url =
          'https://raw.githubusercontent.com/georgekalf/Customer-segmentation/main/too-broad-customer-segmentation.jpeg';
      }

      // Data Management MongoDB project
      if (lower === 'data-management-mongodb') {
        p.friendly_title = 'Data Management with MongoDB & PyMongo';
        p.description =
          'Hands-on data management project using MongoDB and PyMongo: designing collections, managing documents, and running analytical queries in a NoSQL environment.';
        p.languages = ['Python', 'MongoDB', 'PyMongo'];
        p.image_url =
          'https://raw.githubusercontent.com/georgekalf/data-management-mongodb/main/pymongo.jpg';
      }

      // Hotel / Hospitality ML project: make sure title & description highlight ML
      if (lower.includes('hotel') && lower.includes('reservation')) {
        p.friendly_title =
          'Hotel Reservation Cancellation Prediction (Machine Learning)';
        p.description =
          'Hospitality analytics and machine learning project predicting hotel reservation cancellations using models such as Logistic Regression, SVM, Decision Tree, Random Forest, and XGBoost, plus clustering for customer segmentation.';
        p.languages = ['Python', 'Scikit-learn', 'XGBoost', 'ML'];

        // If you later add a custom image in your repo or /images, you can hardcode here:
        // p.image_url = 'images/hotel-ml-placeholder.jpg';
      }

      // If we still have no description but we DO have a summary from README, use that
      if (!p.description && p.readmeSummary) {
        p.description = p.readmeSummary;
      }

      // If still nothing, final generic fallback
      if (!p.description) {
        p.description = 'Project details coming soon – see GitHub for more.';
      }
    });
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
        // Pretty title
        const prettifiedName = p.name
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        const title = p.friendly_title || prettifiedName;

        // Thumbnail style: show gradient if no image
        const thumbStyle = p.image_url
          ? `style="background-image:url('${p.image_url}');"`
          : '';

        const description = p.description || 'No description provided yet.';

        return `
          <a href="${p.html_url}" target="_blank" class="project-card">
            <div class="project-thumb" ${thumbStyle}></div>
            <div class="project-info">
              <h3>${title}</h3>
              <p>${description}</p>
              <div class="project-topics">
                ${p.languages
                  .map(lang => `<span class="lang-tag">${lang}</span>`)
                  .join('')}
              </div>
            </div>
          </a>
        `;
      })
      .join('');
  }

  function setupProjectFilters() {
    if (!filterControls || !projectsData.length) return;

    const allLanguages = [...new Set(projectsData.flatMap(p => p.languages))];

    // Reset and add "All" first
    filterControls.innerHTML =
      '<button class="filter-btn active" data-filter="all">All Projects</button>';

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

  // Only run project loading logic on the Projects page
  if (projectsGrid) {
    loadProjects();
  }
});
