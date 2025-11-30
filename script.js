// script.js
// Shared JS for all pages (theme, experience tabs, dynamic projects)

document.addEventListener('DOMContentLoaded', () => {
  // =======================================
  // THEME TOGGLE (always dark on new visit)
  // =======================================
  const themeToggle = document.querySelector('.theme-toggle');

  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    if (themeToggle) {
      // Dark active -> show sun (switch to light), Light active -> show moon (switch to dark)
      themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  function initTheme() {
    if (!themeToggle) return;

    // Use sessionStorage so a *new browser session* always starts in dark,
    // but theme is consistent across pages within the same session.
    const stored = sessionStorage.getItem('theme');
    const initial = stored === 'dark' || stored === 'light' ? stored : 'dark';

    applyTheme(initial);

    themeToggle.addEventListener('click', () => {
      const current = document.body.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      sessionStorage.setItem('theme', next);
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

  // Contextual fallback images for some domains (Unsplash)
  const contextImages = {
    hotel:
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=80',
    scraping:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
    viz:
      'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=900&q=80',
    network:
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80',
    loans:
      'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=900&q=80',
    timeseries:
      'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?auto=format&fit=crop&w=900&q=80',
    shiny:
      'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=900&q=80',
    mlr:
      'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=900&q=80'
  };

  // Fallback projects if GitHub API fails completely
  const fallbackProjects = [
    {
      name: 'Hotel Reservations Analysis',
      friendly_title: 'Hotel Reservation Cancellation & Guest Segmentation (ML)',
      description:
        'Explores hotel reservation data with EDA and KMeans clustering to segment guests and understand booking behaviour. Trains multiple ML models to predict cancellations and compare performance across approaches.',
      languages: ['Python', 'ML', 'Clustering'],
      html_url: 'https://github.com/georgekalf',
      image_url: contextImages.hotel
    },
    {
      name: 'Time Series RNN CNN',
      friendly_title: 'Time Series Forecasting with RNNs & CNNs',
      description:
        'Time series modelling framework using TensorFlow and Keras with LSTM and CNN architectures. Includes preprocessing, training utilities and learning-curve visualisations for robust forecasting.',
      languages: ['Python', 'TensorFlow', 'Keras'],
      html_url: 'https://github.com/georgekalf',
      image_url: contextImages.timeseries
    }
  ];

  // Helper: get short summary paragraph from README markdown
  function extractReadmeSummary(markdown) {
    if (!markdown) return null;

    const paragraphs = markdown
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);

    for (const p of paragraphs) {
      const trimmed = p.trim();
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
      if (trimmed.length > 40) return trimmed;
    }
    return null;
  }

  // Helper: normalise GitHub image URLs (blob -> raw)
  function normaliseGithubImageUrl(url) {
    if (!url) return null;
    let clean = url.trim().replace(/^</, '').replace(/>$/, '');

    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      if (clean.includes('github.com') && clean.includes('/blob/')) {
        clean = clean
          .replace('https://github.com/', 'https://raw.githubusercontent.com/')
          .replace('http://github.com/', 'https://raw.githubusercontent.com/')
          .replace('/blob/', '/');
      }
      return clean;
    }
    // Relative URLs handled separately where we know repo + branch
    return clean;
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
          headers: { Accept: 'application/vnd.github+json' }
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      let repos = await response.json();

      // Filter out forks & profile/portfolio repos
      repos = repos.filter(
        repo =>
          !repo.fork &&
          repo.name.toLowerCase() !== 'georgekalf' &&
          repo.name.toLowerCase() !== 'georgekalf.github.io'
      );

      const limited = repos.slice(0, 30);

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

              // Image from README
              const imgMatch = markdown.match(/!\[[^\]]*]\((.*?)\)/);
              if (imgMatch && imgMatch[1]) {
                let imgPath = imgMatch[1];
                imgPath = normaliseGithubImageUrl(imgPath);

                if (imgPath.startsWith('http')) {
                  imageUrl = imgPath;
                } else {
                  const branch = repo.default_branch || 'main';
                  const cleaned = imgPath.replace(/^\.?\//, '');
                  imageUrl = `https://raw.githubusercontent.com/georgekalf/${repo.name}/${branch}/${cleaned}`;
                }
              }

              // Text summary from README
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
            image_url: imageUrl || null,
            friendly_title: null
          };
        })
      );

      projectsData = projects;
      applyProjectOverrides();
    } catch (error) {
      console.warn('GitHub API failed, using fallback projects:', error.message);
      projectsData = fallbackProjects;
    }

    renderProjects('all');
    setupProjectFilters();
  }

  // Apply custom titles/descriptions/images for your key repos
  function applyProjectOverrides() {
    projectsData.forEach(p => {
      const lower = p.name.toLowerCase();

      // ----- Customer Segmentation -----
      if (lower.includes('customer') && lower.includes('segment')) {
        p.friendly_title = 'Customer Segmentation & RFM Analysis';
        p.description =
          'Customer segmentation using RFM and KMeans clustering (with kernel PCA) to create actionable segments and targeted marketing strategies.';
        p.languages = ['Python', 'R', 'Clustering', 'RFM'];
        if (!p.image_url) {
          p.image_url =
            'https://raw.githubusercontent.com/georgekalf/Customer-segmentation/main/too-broad-customer-segmentation.jpeg';
        }
      }

      // ----- Hotel Reservations (ML + segmentation) -----
      if (lower.includes('hotel') && lower.includes('reserv')) {
        p.friendly_title =
          'Hotel Reservation Cancellation & Guest Segmentation (ML)';
        p.description =
          'Explores hotel reservation data with EDA and KMeans clustering to segment guests and understand booking patterns. Trains multiple ML models to predict cancellations and compare performance across approaches.';
        p.languages = ['Python', 'ML', 'Clustering', 'XGBoost'];
        if (!p.image_url) {
          p.image_url = contextImages.hotel;
        }
      }

      // ----- Web Scraping Projects -----
      if (lower.includes('web') && lower.includes('scrap')) {
        p.friendly_title = 'Web Scraping Projects (NBA & Aldi Jobs)';
        p.description =
          'Collection of web scraping projects, including an NBA defensive improvement analysis and an Aldi job postings intelligence study. Uses Python and APIs to collect, clean and analyse data for actionable recommendations.';
        p.languages = ['Python', 'Web Scraping', 'APIs'];
        if (!p.image_url) {
          p.image_url = contextImages.scraping;
        }
      }

      // ----- Data Management MongoDB -----
      if (
        lower.includes('data-management') &&
        (lower.includes('mongo') || lower.includes('mongodb'))
      ) {
        p.friendly_title = 'Data Management with MongoDB & PyMongo';
        p.description =
          'Data management project using MongoDB and PyMongo to store, restructure and analyse GitHub OSS data. Focuses on querying commits, authors and activity patterns to study collaboration and seasonality.';
        p.languages = ['Python', 'MongoDB', 'PyMongo', 'PySpark'];
        if (!p.image_url) {
          p.image_url =
            'https://raw.githubusercontent.com/georgekalf/data-management-mongodb/main/pymongo.jpg';
        }
      }

      // ----- Covid Data Visualisation -----
      if (
        lower.includes('covid') ||
        lower.includes('visual') ||
        lower.includes('data-visual')
      ) {
        p.friendly_title = 'COVID-19 Impact on UK Businesses (Data Visualisation)';
        p.description =
          'Visual exploration of COVID-19 impact on UK businesses from 2019–2021 using Seaborn and Plotly. Includes comparative line charts, interactive bar and geospatial plots, and animated bubble charts across industries.';
        p.languages = ['Python', 'Seaborn', 'Plotly', 'Data Viz'];
        if (!p.image_url) {
          p.image_url = contextImages.viz;
        }
      }

      // ----- Machine Learning in R -----
      if (lower.includes('machine') && lower.includes('learning') && lower.includes('r')) {
        p.friendly_title = 'Machine Learning in R (Supervised & Unsupervised)';
        p.description =
          'Series of ML exercises in R, including dimensionality reduction, clustering, and classification. Covers decision trees, random forests, SVMs, kNN, LDA and cross-validation on datasets like German credit and medical data.';
        p.languages = ['R', 'ML', 'Clustering', 'Classification'];
        if (!p.image_url) {
          p.image_url = contextImages.mlr;
        }
      }

      // ----- Network Analytics -----
      if (lower.includes('network') && lower.includes('analytic')) {
        p.friendly_title = 'Network Analytics on Trading Floors & AI Adoption';
        p.description =
          'Network analysis of security traders’ knowledge-sharing relationships and their attitudes toward AI on a trading floor. Uses graph metrics and positional data to study how AI-related opinions diffuse across interconnected professionals.';
        p.languages = ['Python', 'NetworkX', 'Graph Analytics'];
        if (!p.image_url) {
          p.image_url = contextImages.network;
        }
      }

      // ----- Predicting Issuing Loans / Credit Default -----
      if (
        lower.includes('loan') ||
        lower.includes('credit') ||
        lower.includes('default')
      ) {
        p.friendly_title = 'Credit Default Prediction & Drivers of Risk';
        p.description =
          'Credit risk modelling project using bank client data with demographics, payment history and bill statements. Builds models to estimate default likelihood and identify key drivers to support credit decisions and targeted lending.';
        p.languages = ['Python', 'ML', 'Risk Modelling'];
        if (!p.image_url) {
          p.image_url = contextImages.loans;
        }
      }

      // ----- Shiny App: drug classification -----
      if (lower.includes('shiny') || lower.includes('drug')) {
        p.friendly_title = 'Drug Recommendation App (R Shiny)';
        p.description =
          'Interactive R Shiny app for drug recommendation and classification built as part of MSc work. Lets users explore models and predict appropriate medications based on patient characteristics.';
        p.languages = ['R', 'Shiny', 'Classification'];
        if (!p.image_url) {
          p.image_url = contextImages.shiny;
        }
      }

      // ----- Time Series (RNN, CNN) -----
      if (lower.includes('time') && lower.includes('series')) {
        p.friendly_title = 'Time Series Forecasting with RNNs & CNNs';
        p.description =
          'Time series analysis framework using TensorFlow and Keras with LSTM and CNN architectures. Includes preprocessing utilities, model training functions and visualisations of training and validation performance.';
        p.languages = ['Python', 'TensorFlow', 'Keras', 'Time Series'];
        if (!p.image_url) {
          p.image_url = contextImages.timeseries;
        }
      }

      // ------ Generic README summary fallback ------
      if (!p.description && p.readmeSummary) {
        // Trim README summary to 2–3 shortish sentences
        const sentences = p.readmeSummary
          .replace(/\s+/g, ' ')
          .split(/(?<=[.!?])\s+/)
          .slice(0, 3);
        p.description = sentences.join(' ');
      }

      // Last fallback if still nothing
      if (!p.description) {
        p.description = 'Project details coming soon – see GitHub for more information.';
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
        const prettifiedName = p.name
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        const title = p.friendly_title || prettifiedName;

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

  // Only run project logic on the Projects page
  if (projectsGrid) {
    loadProjects();
  }
});
