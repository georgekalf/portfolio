// script.js
// Shared JS for all pages (theme, experience tabs, dynamic projects)

document.addEventListener('DOMContentLoaded', function () {
  // =======================================
  // THEME TOGGLE (always dark on new visit)
  // =======================================
  var themeToggle = document.querySelector('.theme-toggle');

  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    if (themeToggle) {
      // Dark active -> show sun (switch to light), Light active -> show moon (switch to dark)
      themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  function initTheme() {
    if (!themeToggle) return;

    // Use sessionStorage so a new browser session always starts in dark,
    // but pages stay consistent within the same session.
    var stored = sessionStorage.getItem('theme');
    var initial = (stored === 'dark' || stored === 'light') ? stored : 'dark';

    applyTheme(initial);

    themeToggle.addEventListener('click', function () {
      var current = document.body.getAttribute('data-theme') || 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      sessionStorage.setItem('theme', next);
    });
  }

  initTheme();

  // =========================
  // EXPERIENCE TABS (if used)
  // =========================
  var expTabs = document.querySelectorAll('.tab-btn');
  var expContents = document.querySelectorAll('.experience-content');

  if (expTabs.length && expContents.length) {
    expTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        expTabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');

        expContents.forEach(function (c) { c.classList.remove('active'); });
        var targetId = tab.getAttribute('data-tab');
        var target = document.getElementById(targetId);
        if (target) target.classList.add('active');
      });
    });
  }

  // =========================
  // PROJECTS (dynamic GitHub)
  // =========================
  var projectsGrid = document.getElementById('projects-grid');
  var filterControls = document.querySelector('.filter-controls');
  var projectsData = [];

  // Contextual fallback images (Unsplash)
  var contextImages = {
    hotel: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=80',
    scraping: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
    viz: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=900&q=80',
    network: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80',
    loans: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=900&q=80',
    timeseries: 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?auto=format&fit=crop&w=900&q=80',
    shiny: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=900&q=80',
    mlr: 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=900&q=80'
  };

  // Fallback projects if GitHub API completely fails
  var fallbackProjects = [
    {
      name: 'Hotel Reservations Analysis',
      friendly_title: 'Hotel Reservation Cancellation & Guest Segmentation (ML)',
      description:
        'Explores hotel reservation data with EDA and KMeans clustering to segment guests and understand booking behaviour. Trains multiple ML models to predict cancellations and compare performance.',
      languages: ['Python', 'ML', 'Clustering'],
      html_url: 'https://github.com/georgekalf',
      image_url: contextImages.hotel
    },
    {
      name: 'Time Series RNN CNN',
      friendly_title: 'Time Series Forecasting with RNNs & CNNs',
      description:
        'Time series modelling framework using TensorFlow and Keras with LSTM and CNN architectures, including preprocessing utilities and training visualisations.',
      languages: ['Python', 'TensorFlow', 'Keras'],
      html_url: 'https://github.com/georgekalf',
      image_url: contextImages.timeseries
    }
  ];

  // Helper: get short summary from README markdown
  function extractReadmeSummary(markdown) {
    if (!markdown) return null;

    var paragraphs = markdown
      .split(/\n\s*\n/)
      .map(function (p) { return p.trim(); })
      .filter(function (p) { return p.length > 0; });

    for (var i = 0; i < paragraphs.length; i++) {
      var trimmed = paragraphs[i];
      if (
        trimmed.indexOf('#') === 0 ||
        trimmed.indexOf('![') === 0 ||
        trimmed.indexOf('<') === 0 ||
        trimmed.indexOf('```') === 0 ||
        trimmed.toLowerCase().indexOf('badge') !== -1 ||
        trimmed.toLowerCase().indexOf('shields.io') !== -1
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
    var clean = url.trim().replace(/^</, '').replace(/>$/, '');

    if (clean.indexOf('http://') === 0 || clean.indexOf('https://') === 0) {
      if (clean.indexOf('github.com') !== -1 && clean.indexOf('/blob/') !== -1) {
        clean = clean
          .replace('https://github.com/', 'https://raw.githubusercontent.com/')
          .replace('http://github.com/', 'https://raw.githubusercontent.com/')
          .replace('/blob/', '/');
      }
      return clean;
    }
    return clean; // relative; handled later when we know repo/branch
  }

  async function loadProjects() {
    if (!projectsGrid) return;

    try {
      var controller = new AbortController();
      var timeoutId = setTimeout(function () {
        controller.abort();
      }, 10000);

      var response = await fetch(
        'https://api.github.com/users/georgekalf/repos?per_page=100',
        {
          signal: controller.signal,
          headers: { Accept: 'application/vnd.github+json' }
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('GitHub API error: ' + response.status);
      }

      var repos = await response.json();

      // Filter out forks & profile/portfolio repos
      repos = repos.filter(function (repo) {
        var name = repo.name.toLowerCase();
        return (
          !repo.fork &&
          name !== 'georgekalf' &&
          name !== 'georgekalf.github.io'
        );
      });

      var limited = repos.slice(0, 30);

      var projects = [];
      for (var i = 0; i < limited.length; i++) {
        var repo = limited[i];

        var languages;
        if (Array.isArray(repo.topics) && repo.topics.length) {
          languages = repo.topics.slice();
        } else if (repo.language) {
          languages = [repo.language];
        } else {
          languages = ['Project'];
        }

        var imageUrl = null;
        var readmeSummary = null;

        try {
          var readmeRes = await fetch(
            'https://api.github.com/repos/georgekalf/' +
              repo.name +
              '/readme',
            { headers: { Accept: 'application/vnd.github.v3.raw' } }
          );

          if (readmeRes.ok) {
            var markdown = await readmeRes.text();

            // Image from README
            var imgMatch = markdown.match(/!\[[^\]]*]\((.*?)\)/);
            if (imgMatch && imgMatch[1]) {
              var imgPath = normaliseGithubImageUrl(imgMatch[1]);
              if (imgPath.indexOf('http') === 0) {
                imageUrl = imgPath;
              } else {
                var branch = repo.default_branch || 'main';
                var cleaned = imgPath.replace(/^\.?\//, '');
                imageUrl =
                  'https://raw.githubusercontent.com/georgekalf/' +
                  repo.name +
                  '/' +
                  branch +
                  '/' +
                  cleaned;
              }
            }

            // Text summary from README
            readmeSummary = extractReadmeSummary(markdown);
          }
        } catch (err) {
          console.warn('Failed to parse README for ' + repo.name + ':', err.message);
        }

        projects.push({
          name: repo.name,
          description: repo.description || null,
          readmeSummary: readmeSummary || null,
          html_url: repo.html_url,
          languages: languages,
          image_url: imageUrl || null,
          friendly_title: null
        });
      }

      projectsData = projects;
      applyProjectOverrides();
    } catch (error) {
      console.warn('GitHub API failed, using fallback projects:', error.message);
      projectsData = fallbackProjects;
    }

    renderProjects('all');
    setupProjectFilters();
  }

  // Apply custom titles/descriptions/images for key repos
  function applyProjectOverrides() {
    projectsData.forEach(function (p) {
      var lower = p.name.toLowerCase();

      // Customer Segmentation
      if (lower.indexOf('customer') !== -1 && lower.indexOf('segment') !== -1) {
        p.friendly_title = 'Customer Segmentation & RFM Analysis';
        p.description =
          'Customer segmentation using RFM and KMeans clustering (with kernel PCA) to create actionable customer groups and targeted marketing strategies.';
        p.languages = ['Python', 'R', 'Clustering', 'RFM'];
        if (!p.image_url) {
          p.image_url =
            'https://raw.githubusercontent.com/georgekalf/Customer-segmentation/main/too-broad-customer-segmentation.jpeg';
        }
      }

      // Hotel Reservations (ML + segmentation)
      if (lower.indexOf('hotel') !== -1 && lower.indexOf('reserv') !== -1) {
        p.friendly_title =
          'Hotel Reservation Cancellation & Guest Segmentation (ML)';
        p.description =
          'Explores hotel reservation data with EDA and KMeans clustering to segment guests and understand booking patterns. Trains multiple ML models to predict cancellations and compare performance.';
        p.languages = ['Python', 'ML', 'Clustering', 'XGBoost'];
        if (!p.image_url) {
          p.image_url = contextImages.hotel;
        }
      }

      // Web Scraping Projects
      if (lower.indexOf('web') !== -1 && lower.indexOf('scrap') !== -1) {
        p.friendly_title = 'Web Scraping Projects (NBA & Aldi Jobs)';
        p.description =
          'Web scraping projects including NBA defensive analysis and Aldi job postings intelligence. Uses Python and APIs to collect, clean and analyse data for actionable recommendations.';
        p.languages = ['Python', 'Web Scraping', 'APIs'];
        if (!p.image_url) {
          p.image_url = contextImages.scraping;
        }
      }

      // Data Management MongoDB
      if (
        lower.indexOf('data-management') !== -1 &&
        (lower.indexOf('mongo') !== -1 || lower.indexOf('mongodb') !== -1)
      ) {
        p.friendly_title = 'Data Management with MongoDB & PyMongo';
        p.description =
          'Data management project using MongoDB and PyMongo to store, restructure and analyse GitHub OSS data. Focuses on querying commits, authors and activity patterns.';
        p.languages = ['Python', 'MongoDB', 'PyMongo', 'PySpark'];
        if (!p.image_url) {
          p.image_url =
            'https://raw.githubusercontent.com/georgekalf/data-management-mongodb/main/pymongo.jpg';
        }
      }

      // Covid Data Visualisation
      if (
        lower.indexOf('covid') !== -1 ||
        lower.indexOf('visual') !== -1 ||
        lower.indexOf('data-visual') !== -1
      ) {
        p.friendly_title = 'COVID-19 Impact on UK Businesses (Data Visualisation)';
        p.description =
          'Visual exploration of COVID-19 impact on UK businesses from 2019–2021 using Seaborn and Plotly, with interactive and animated charts across industries.';
        p.languages = ['Python', 'Seaborn', 'Plotly', 'Data Viz'];
        if (!p.image_url) {
          p.image_url = contextImages.viz;
        }
      }

      // Machine Learning in R
      if (
        lower.indexOf('machine') !== -1 &&
        lower.indexOf('learning') !== -1 &&
        lower.indexOf('r') !== -1
      ) {
        p.friendly_title = 'Machine Learning in R (Supervised & Unsupervised)';
        p.description =
          'ML exercises in R covering dimensionality reduction, clustering and classification. Includes decision trees, random forests, SVMs, kNN, LDA and cross-validation on datasets like German credit and medical data.';
        p.languages = ['R', 'ML', 'Clustering', 'Classification'];
        if (!p.image_url) {
          p.image_url = contextImages.mlr;
        }
      }

      // Network Analytics
      if (lower.indexOf('network') !== -1 && lower.indexOf('analytic') !== -1) {
        p.friendly_title = 'Network Analytics on Trading Floors & AI Adoption';
        p.description =
          'Network analysis of security traders’ knowledge-sharing relationships and attitudes toward AI on a trading floor, using graph metrics and positional data.';
        p.languages = ['Python', 'NetworkX', 'Graph Analytics'];
        if (!p.image_url) {
          p.image_url = contextImages.network;
        }
      }

      // Predicting Issuing Loans / Credit Default
      if (
        lower.indexOf('loan') !== -1 ||
        lower.indexOf('credit') !== -1 ||
        lower.indexOf('default') !== -1
      ) {
        p.friendly_title = 'Credit Default Prediction & Drivers of Risk';
        p.description =
          'Credit risk modelling using bank client data with demographics, payment history and bill statements. Builds models to estimate default likelihood and identify key drivers for lending decisions.';
        p.languages = ['Python', 'ML', 'Risk Modelling'];
        if (!p.image_url) {
          p.image_url = contextImages.loans;
        }
      }

      // Shiny drug app
      if (lower.indexOf('shiny') !== -1 || lower.indexOf('drug') !== -1) {
        p.friendly_title = 'Drug Recommendation App (R Shiny)';
        p.description =
          'Interactive R Shiny app for drug recommendation and classification built as part of MSc work, predicting appropriate medications from patient characteristics.';
        p.languages = ['R', 'Shiny', 'Classification'];
        if (!p.image_url) {
          p.image_url = contextImages.shiny;
        }
      }

      // Time Series (RNN, CNN)
      if (lower.indexOf('time') !== -1 && lower.indexOf('series') !== -1) {
        p.friendly_title = 'Time Series Forecasting with RNNs & CNNs';
        p.description =
          'Time series analysis framework using TensorFlow and Keras with LSTM and CNN architectures, plus preprocessing utilities and training/validation visualisations.';
        p.languages = ['Python', 'TensorFlow', 'Keras', 'Time Series'];
        if (!p.image_url) {
          p.image_url = contextImages.timeseries;
        }
      }

      // If still no description, use README summary (trimmed to ~2–3 sentences)
      if (!p.description && p.readmeSummary) {
        var cleaned = p.readmeSummary.replace(/\s+/g, ' ');
        var matches = cleaned.match(/[^.!?]+[.!?]/g);
        if (matches && matches.length) {
          var short = matches.slice(0, 3).join(' ');
          p.description = short;
        } else {
          p.description = cleaned;
        }
      }

      if (!p.description) {
        p.description =
          'Project details coming soon – see GitHub for more information.';
      }
    });
  }

  function renderProjects(filter) {
    if (!projectsGrid) return;
    if (!filter) filter = 'all';

    var filtered;
    if (filter === 'all') {
      filtered = projectsData;
    } else {
      filtered = projectsData.filter(function (p) {
        return p.languages.indexOf(filter) !== -1;
      });
    }

    if (!filtered.length) {
      projectsGrid.innerHTML =
        '<p style="text-align:center; color: var(--text-secondary); margin-top:1.5rem;">' +
        'No projects found for "' +
        filter +
        '".</p>';
      return;
    }

    var html = '';
    filtered.forEach(function (p) {
      var prettifiedName = p.name
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      var title = p.friendly_title || prettifiedName;
      var thumbStyle = p.image_url
        ? 'style="background-image:url(\'' + p.image_url + '\');"'
        : '';
      var description = p.description || 'No description provided yet.';

      html +=
        '<a href="' + p.html_url + '" target="_blank" class="project-card">' +
          '<div class="project-thumb" ' + thumbStyle + '></div>' +
          '<div class="project-info">' +
            '<h3>' + title + '</h3>' +
            '<p>' + description + '</p>' +
            '<div class="project-topics">';
      p.languages.forEach(function (lang) {
        html += '<span class="lang-tag">' + lang + '</span>';
      });
      html +=
            '</div>' +
          '</div>' +
        '</a>';
    });

    projectsGrid.innerHTML = html;
  }

  function setupProjectFilters() {
    if (!filterControls || !projectsData.length) return;

    // Collect unique languages
    var allLanguages = [];
    projectsData.forEach(function (p) {
      p.languages.forEach(function (lang) {
        if (allLanguages.indexOf(lang) === -1) {
          allLanguages.push(lang);
        }
      });
    });

    filterControls.innerHTML =
      '<button class="filter-btn active" data-filter="all">All Projects</button>';

    allLanguages.forEach(function (lang) {
      var btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.setAttribute('data-filter', lang);
      btn.textContent = lang;
      filterControls.appendChild(btn);
    });

    filterControls.addEventListener('click', function (e) {
      if (!e.target.classList.contains('filter-btn')) return;
      var filter = e.target.getAttribute('data-filter') || 'all';

      var buttons = filterControls.querySelectorAll('.filter-btn');
      buttons.forEach(function (b) { b.classList.remove('active'); });
      e.target.classList.add('active');

      renderProjects(filter);
    });
  }

  // Only run project logic on the Projects page
  if (projectsGrid) {
    loadProjects();
  }
});
