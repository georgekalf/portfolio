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
  // EXPERIENCE TABS
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

  // sessionStorage cache keys and TTL
  // Repos are cached for 30 minutes so reloading during a session
  // doesn't burn through GitHub's 60 req/hr unauthenticated rate limit.
  var CACHE_KEY = 'gh_repos_cache';
  var CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  // Contextual fallback images (Unsplash)
  // NOTE: These are ONLY applied in enhanceWithReadmes when a repo has no image
  // in its README. They are never set inside applyProjectOverrides, so that the
  // README image always takes priority over the Unsplash fallback.
  var contextImages = {
    hotel:      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=80',
    viz:        'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=900&q=80',
    network:    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80',
    loans:      'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=900&q=80',
    timeseries: 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?auto=format&fit=crop&w=900&q=80',
    shiny:      'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=900&q=80',
    mlr:        'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=900&q=80'
  };

  // Fallback projects if GitHub API completely fails
  var fallbackProjects = [
    {
      name: 'Hotel Reservations Analysis',
      friendly_title: 'Hotel Reservation Cancellation & Guest Segmentation (ML)',
      description: 'Explores hotel reservation data with EDA and KMeans clustering to segment guests and understand booking behaviour. Trains multiple ML models to predict cancellations and compare performance.',
      languages: ['Python', 'ML', 'Clustering'],
      html_url: 'https://github.com/georgekalf',
      image_url: contextImages.hotel,
      fallbackImage: null,
      categories: ['Machine Learning', 'Data Analysis']
    },
    {
      name: 'Time Series RNN CNN',
      friendly_title: 'Time Series Forecasting with RNNs & CNNs',
      description: 'Time series modelling framework using TensorFlow and Keras with LSTM and CNN architectures, including preprocessing utilities and training visualisations.',
      languages: ['Python', 'TensorFlow', 'Keras'],
      html_url: 'https://github.com/georgekalf',
      image_url: contextImages.timeseries,
      fallbackImage: null,
      categories: ['Machine Learning', 'Deep Learning']
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

  // Helper: normalise GitHub image URLs (blob -> raw) and resolve relative paths
  function normaliseGithubImageUrl(url, repoFullName, defaultBranch) {
    if (!url) return null;
    var clean = url.trim().replace(/^</, '').replace(/>$/, '');

    if (clean.indexOf('http://') === 0 || clean.indexOf('https://') === 0) {
      // Fix github.com/blob/ → raw.githubusercontent.com
      if (clean.indexOf('github.com') !== -1 && clean.indexOf('/blob/') !== -1) {
        clean = clean
          .replace('https://github.com/', 'https://raw.githubusercontent.com/')
          .replace('http://github.com/', 'https://raw.githubusercontent.com/')
          .replace('/blob/', '/');
      }
      return clean;
    }

    // Relative path — resolve against raw.githubusercontent using repo info
    if (repoFullName) {
      var branch = defaultBranch || 'main';
      clean = clean.replace(/^\.?\//, '');
      return 'https://raw.githubusercontent.com/' + repoFullName + '/' + branch + '/' + clean;
    }

    return clean;
  }

  // Apply custom titles/descriptions/images/categories for key repos
  //
  // IMAGE RULES:
  //   p.image_url  → confirmed raw GitHub URL; shown immediately on first render
  //   p.fallbackImage → Unsplash fallback; only used in enhanceWithReadmes
  //                     AFTER the README is checked and has no image
  //   No property set → enhanceWithReadmes will try the README; grey placeholder shown in meantime
  function applyProjectOverrides() {
    projectsData.forEach(function (p) {
      var lower = p.name.toLowerCase();

      // Customer Segmentation
      if (lower.indexOf('customer') !== -1 && lower.indexOf('segment') !== -1) {
        p.friendly_title = 'Customer Segmentation & RFM Analysis';
        p.description = 'Customer segmentation using RFM and KMeans clustering (with kernel PCA) to create actionable customer groups and targeted marketing strategies.';
        p.languages = ['Python', 'R', 'Clustering', 'RFM'];
        p.categories = ['Machine Learning', 'Data Analysis'];
        // Confirmed image URL in this repo
        p.image_url = 'https://raw.githubusercontent.com/georgekalf/Customer-segmentation/main/too-broad-customer-segmentation.jpeg';
      }

      // Hotel Reservations (ML + segmentation)
      if (lower.indexOf('hotel') !== -1 && lower.indexOf('reserv') !== -1) {
        p.friendly_title = 'Hotel Reservation Cancellation & Guest Segmentation (ML)';
        p.description = 'Explores hotel reservation data with EDA and KMeans clustering to segment guests and understand booking patterns. Trains multiple ML models to predict cancellations and compare performance.';
        p.languages = ['Python', 'ML', 'Clustering', 'XGBoost'];
        p.categories = ['Machine Learning', 'Data Analysis'];
        // No confirmed image — README fetcher tries first; Unsplash hotel used only as last resort
        p.fallbackImage = contextImages.hotel;
      }

      // IMDB Helpful reviews detection NLP
      if (lower.indexOf('imdb') !== -1) {
        p.friendly_title = 'IMDB Helpful Reviews Detection (NLP)';
        p.description = 'Applying NLP techniques to detect helpful reviews on IMDB using text preprocessing, feature engineering and supervised learning models.';
        p.languages = ['Python', 'NLP', 'Machine Learning'];
        p.categories = ['Machine Learning', 'NLP'];
        // Confirmed image URL in this org repo
        p.image_url = 'https://raw.githubusercontent.com/Imdb-helpful-reviews-detection-NLP/Detection-of-helpful-reviews-on-IMDB-/main/IMDBs.jpg';
      }

      // Fiat 500 NLP & Network Analysis
      if (lower.indexOf('fiat') !== -1 && lower.indexOf('nlp') !== -1) {
        p.friendly_title = 'Fiat 500 EV – NLP Sentiment & Network Analysis';
        p.description = "NLP-driven sentiment analysis and network analytics on 10k+ YouTube comments to assess public perception of the Fiat 500 electric model. Explores community structure, influencer dynamics and engagement patterns.";
        p.languages = ['Python', 'NLP', 'Network Analysis', 'APIs'];
        p.categories = ['NLP'];
        // Confirmed image URL in this repo
        p.image_url = 'https://raw.githubusercontent.com/georgekalf/Fiat-500-NLP-NetworkAnalysis/main/electric_cars.jpeg';
      }

      // Ishango Data Engineering Challenge
      if (lower.indexOf('ishango') !== -1 && lower.indexOf('challenge') !== -1) {
        p.friendly_title = 'Ishango Data Engineering Challenge';
        p.description = 'Bigfoot Sightings Analysis: EDA, NLP & Semantic Classification.';
        p.languages = ['Python', 'SQL', 'Data Engineering'];
        p.categories = ['Data Analysis', 'NLP'];
        // Confirmed image URL in this repo (inside images/ folder)
        p.image_url = 'https://raw.githubusercontent.com/georgekalf/ishango-challenge/main/images/big_foot.jpg';
      }

      // Web Scraping Projects
      if (lower.indexOf('web') !== -1 && lower.indexOf('scrap') !== -1) {
        p.friendly_title = 'Web Scraping Projects (NBA & Aldi Jobs)';
        p.description = 'Web scraping pipelines for NBA defensive analytics and Aldi job postings, from data collection to cleaning, feature engineering and exploratory analysis.';
        p.languages = ['Python', 'Web Scraping', 'APIs'];
        p.categories = ['Data Analysis'];
        // Confirmed image URL in this repo (always override — no fallback needed)
        p.image_url = 'https://raw.githubusercontent.com/georgekalf/web-scraping/main/web-scraping.jpeg';
      }

      // Data Management MongoDB
      if (
        lower.indexOf('data-management') !== -1 &&
        (lower.indexOf('mongo') !== -1 || lower.indexOf('mongodb') !== -1)
      ) {
        p.friendly_title = 'Data Management with MongoDB & PyMongo';
        p.description = 'Data management project using MongoDB and PyMongo to store, restructure and analyse GitHub OSS data. Focuses on querying commits, authors and activity patterns.';
        p.languages = ['Python', 'MongoDB', 'PyMongo', 'PySpark'];
        p.categories = ['Data Analysis'];
        // Confirmed image URL in this repo
        p.image_url = 'https://raw.githubusercontent.com/georgekalf/data-management-mongodb/main/pymongo.jpg';
      }

      // Covid Data Visualisation
      // This repo HAS a COVID virus image in its README — let the fetcher pick it up.
      // p.image_url is intentionally left null so enhanceWithReadmes always checks first.
      // contextImages.viz is used only if the README genuinely has no image.
      if (lower.indexOf('covid') !== -1 || lower.indexOf('data-visual') !== -1) {
        p.friendly_title = 'COVID-19 Impact on UK Businesses (Data Visualisation)';
        p.description = 'Visual exploration of COVID-19 impact on UK businesses from 2019-2021 using Seaborn and Plotly, with interactive and animated charts across industries.';
        p.languages = ['Python', 'Seaborn', 'Plotly', 'Data Viz'];
        p.categories = ['Data Analysis'];
        // README has the virus image — fetcher will use it; fallback only if README has nothing
        p.fallbackImage = contextImages.viz;
      }

      // Machine Learning in R
      if (
        lower.indexOf('machine') !== -1 &&
        lower.indexOf('learning') !== -1 &&
        lower.indexOf('r') !== -1
      ) {
        p.friendly_title = 'Machine Learning in R (Supervised & Unsupervised)';
        p.description = 'ML exercises in R covering dimensionality reduction, clustering and classification. Includes decision trees, random forests, SVMs, kNN, LDA and cross-validation.';
        p.languages = ['R', 'ML', 'Clustering', 'Classification'];
        p.categories = ['Machine Learning'];
        // No confirmed image — README fetcher tries first; Unsplash used only as last resort
        p.fallbackImage = contextImages.mlr;
      }

      // Network Analytics
      if (lower.indexOf('network') !== -1 && lower.indexOf('analytic') !== -1) {
        p.friendly_title = 'Network Analytics on Trading Floors & AI Adoption';
        // Double-quoted string: the apostrophe in "traders'" sits safely inside double quotes
        p.description = "Network analysis of security traders' knowledge-sharing relationships and attitudes toward AI on a trading floor, using graph metrics and positional data.";
        p.languages = ['Python', 'NetworkX', 'Graph Analytics'];
        p.categories = ['Data Analysis'];
        // No confirmed image — README fetcher tries first; Unsplash used only as last resort
        p.fallbackImage = contextImages.network;
      }

      // Predicting Issuing Loans / Credit Default
      if (
        lower.indexOf('loan') !== -1 ||
        lower.indexOf('credit') !== -1 ||
        lower.indexOf('default') !== -1
      ) {
        p.friendly_title = 'Credit Default Prediction & Drivers of Risk';
        p.description = 'Credit risk modelling using bank client data with demographics, payment history and bill statements. Builds models to estimate default likelihood and identify key risk drivers.';
        p.languages = ['Python', 'ML', 'Risk Modelling'];
        p.categories = ['Machine Learning', 'Finance'];
        // No confirmed image — README fetcher tries first; Unsplash used only as last resort
        p.fallbackImage = contextImages.loans;
      }

      // Shiny drug app
      if (lower.indexOf('shiny') !== -1 || lower.indexOf('drug') !== -1) {
        p.friendly_title = 'Drug Recommendation App (R Shiny)';
        p.description = 'Interactive R Shiny app for drug recommendation and classification, predicting appropriate medications from patient characteristics.';
        p.languages = ['R', 'Shiny', 'Classification'];
        p.categories = ['Machine Learning', 'Web Development'];
        // No confirmed image — README fetcher tries first; Unsplash used only as last resort
        p.fallbackImage = contextImages.shiny;
      }

      // Time Series (RNN, CNN)
      if (lower.indexOf('time') !== -1 && lower.indexOf('series') !== -1) {
        p.friendly_title = 'Time Series Forecasting with RNNs & CNNs';
        p.description = 'Time series analysis framework using TensorFlow and Keras with LSTM and CNN architectures, plus preprocessing utilities and training/validation visualisations.';
        p.languages = ['Python', 'TensorFlow', 'Keras', 'Time Series'];
        p.categories = ['Machine Learning', 'Deep Learning'];
        // No confirmed image — README fetcher tries first; Unsplash used only as last resort
        p.fallbackImage = contextImages.timeseries;
      }

      // If still no description, it will be filled later by enhanceWithReadmes
      if (!p.description) {
        p.description = 'Project details coming soon – see GitHub for more information.';
      }

      // Ensure categories always exist
      if (!p.categories || !p.categories.length) {
        p.categories = ['Data Analysis'];
      }
    });
  }

  // Render project cards filtered by category
  function renderProjects(filter) {
    if (!projectsGrid) return;
    if (!filter) filter = 'all';

    var filtered = filter === 'all'
      ? projectsData
      : projectsData.filter(function (p) {
          return p.categories && p.categories.indexOf(filter) !== -1;
        });

    if (!filtered.length) {
      projectsGrid.innerHTML =
        '<p style="text-align:center;color:var(--text-secondary);margin-top:1.5rem;">No projects found for "' + filter + '".</p>';
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

      // rel="noopener noreferrer" on all external project links for security and privacy
      html +=
        '<a href="' + p.html_url + '" target="_blank" rel="noopener noreferrer" class="project-card">' +
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

  // Build category filter buttons from the loaded project data
  function setupProjectFilters() {
    if (!filterControls || !projectsData.length) return;

    // Collect unique categories actually used
    var allCategories = [];
    projectsData.forEach(function (p) {
      (p.categories || ['Data Analysis']).forEach(function (cat) {
        if (allCategories.indexOf(cat) === -1) allCategories.push(cat);
      });
    });

    // Preferred order of category buttons
    var preferredOrder = [
      'Machine Learning',
      'Deep Learning',
      'NLP',
      'Data Analysis',
      'Finance',
      'Web Development'
    ];

    // aria-pressed="true" on the default active button for screen reader accessibility
    filterControls.innerHTML =
      '<button class="filter-btn active" data-filter="all" aria-pressed="true">All Projects</button>';

    preferredOrder.forEach(function (cat) {
      if (allCategories.indexOf(cat) !== -1) {
        var btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.setAttribute('data-filter', cat);
        btn.setAttribute('aria-pressed', 'false');
        btn.textContent = cat;
        filterControls.appendChild(btn);
      }
    });

    filterControls.addEventListener('click', function (e) {
      if (!e.target.classList.contains('filter-btn')) return;
      var filter = e.target.getAttribute('data-filter') || 'all';

      var buttons = filterControls.querySelectorAll('.filter-btn');
      buttons.forEach(function (b) {
        b.classList.remove('active');
        // Update aria-pressed so screen readers know which filter is active
        b.setAttribute('aria-pressed', 'false');
      });
      e.target.classList.add('active');
      e.target.setAttribute('aria-pressed', 'true');

      renderProjects(filter);
    });
  }

  // Background README enhancement (non-blocking)
  //
  // Priority for each project's image:
  //   1. p.image_url set in override (confirmed raw URL) → skip image fetch entirely
  //   2. README contains an image → use it (this is how COVID gets its virus image)
  //   3. README has no image but p.fallbackImage exists → use Unsplash fallback
  //   4. Nothing available → grey gradient placeholder remains
  async function enhanceWithReadmes(repos) {
    var updated = false;

    for (var i = 0; i < repos.length; i++) {
      var repo = repos[i];
      var project = projectsData.find(function (p) { return p.name === repo.name; });
      if (!project) continue;

      // Determine what this repo still needs
      var noDescription = !project.description ||
        project.description === 'Project details coming soon \u2013 see GitHub for more information.';
      var noImage = !project.image_url; // true when no hardcoded URL was set in overrides

      // Only fetch README if we need a description, an image, or have a fallback to confirm
      var needsReadme = noDescription || noImage || !!project.fallbackImage;
      if (!needsReadme) continue;

      try {
        var readmeRes = await fetch(
          'https://api.github.com/repos/' + repo.full_name + '/readme',
          { headers: { Accept: 'application/vnd.github.v3.raw' } }
        );

        if (!readmeRes.ok) {
          // README not found — apply fallback image if we still need one
          if (noImage && project.fallbackImage) {
            project.image_url = project.fallbackImage;
            updated = true;
          }
          continue;
        }

        var markdown = await readmeRes.text();

        // Text summary from README
        if (noDescription) {
          var summary = extractReadmeSummary(markdown);
          if (summary) {
            var cleaned = summary.replace(/\s+/g, ' ');
            var matches = cleaned.match(/[^.!?]+[.!?]/g);
            project.description = matches ? matches.slice(0, 3).join(' ') : cleaned;
            updated = true;
          }
        }

        // Image from README — only attempted when no hardcoded image_url was set
        if (noImage) {
          var imgMatch = markdown.match(/!\[[^\]]*]\((.*?)\)/);
          if (imgMatch && imgMatch[1]) {
            var imgPath = normaliseGithubImageUrl(imgMatch[1], repo.full_name, repo.default_branch);
            if (imgPath) {
              project.image_url = imgPath;
              updated = true;
            }
          }

          // README had no image — apply Unsplash fallback if available
          if (!project.image_url && project.fallbackImage) {
            project.image_url = project.fallbackImage;
            updated = true;
          }
        }

      } catch (err) {
        // Silent fail per repo — apply fallback if we still have nothing
        if (noImage && project.fallbackImage && !project.image_url) {
          project.image_url = project.fallbackImage;
          updated = true;
        }
      }
    }

    // Re-render once after all READMEs have been processed
    if (updated) {
      var activeBtn = filterControls ? filterControls.querySelector('.filter-btn.active') : null;
      var currentFilter = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';
      renderProjects(currentFilter);
    }
  }

  // =========================
  // SESSION CACHE HELPERS
  // Repos are cached for 30 minutes so reloading during a testing session
  // doesn't exhaust GitHub's 60 req/hr unauthenticated rate limit.
  // =========================

  function getCachedRepos() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      // Invalidate if older than TTL
      if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
        sessionStorage.removeItem(CACHE_KEY);
        return null;
      }
      return parsed.repos;
    } catch (e) {
      return null;
    }
  }

  function setCachedRepos(repos) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        repos: repos,
        timestamp: Date.now()
      }));
    } catch (e) {
      // sessionStorage may be unavailable (private browsing quota) — fail silently
    }
  }

  async function loadProjects() {
    if (!projectsGrid) return;

    try {
      var limited;

      // Check sessionStorage cache first — avoids burning API quota on reloads
      var cached = getCachedRepos();

      if (cached) {
        // Cache hit — use stored repos directly, no API calls needed
        console.log('Projects loaded from session cache (' + cached.length + ' repos).');
        limited = cached;
      } else {
        // Cache miss — fetch from GitHub API
        var controller = new AbortController();
        var timeoutId = setTimeout(function () { controller.abort(); }, 10000);

        // ---------------------------
        // Fetch personal repos
        // ---------------------------
        var userResponse = await fetch('https://api.github.com/users/georgekalf/repos?per_page=100', {
          signal: controller.signal,
          headers: { Accept: 'application/vnd.github+json' }
        });
        if (!userResponse.ok) throw new Error('GitHub user repos error: ' + userResponse.status);
        var repos = await userResponse.json();

        // ---------------------------
        // Fetch organization repos
        // ---------------------------
        var orgResponse = await fetch('https://api.github.com/orgs/imdb-helpful-reviews-detection-nlp/repos', {
          signal: controller.signal,
          headers: { Accept: 'application/vnd.github+json' }
        });
        if (orgResponse.ok) {
          var orgRepos = await orgResponse.json();
          repos = repos.concat(orgRepos);
        }

        clearTimeout(timeoutId);

        // De-duplicate
        repos = repos.filter(function (repo, idx, self) {
          return idx === self.findIndex(function (r) { return r.full_name === repo.full_name; });
        });

        // Filter forks & portfolio repos
        repos = repos.filter(function (repo) {
          var name = repo.name.toLowerCase();
          return (
            !repo.fork &&
            name !== 'georgekalf' &&
            name !== 'georgekalf.github.io' &&
            name !== 'portfolio' &&
            name !== 'portfolio-website'
          );
        });

        // Limit to first 30
        limited = repos.slice(0, 30);

        // Store in sessionStorage for subsequent reloads within this session
        setCachedRepos(limited);
      }

      // Build initial project data — no README fetches yet, show immediately
      projectsData = limited.map(function (repo) {
        var languages = Array.isArray(repo.topics) && repo.topics.length
          ? repo.topics.slice()
          : repo.language ? [repo.language] : ['Project'];
        return {
          name: repo.name,
          description: repo.description || null,
          readmeSummary: null,
          html_url: repo.html_url,
          languages: languages,
          image_url: null,       // set by override (confirmed URLs) or enhanceWithReadmes
          fallbackImage: null,   // set by override for repos with no confirmed URL
          friendly_title: null,
          categories: ['Data Analysis']
        };
      });

      // Apply overrides: titles, descriptions, languages, categories,
      // and confirmed image URLs. Unsplash fallbacks are stored in
      // fallbackImage, NOT in image_url, so README images always win.
      applyProjectOverrides();

      // Render immediately with available data (no waiting for READMEs)
      renderProjects('all');
      setupProjectFilters();

      // Fetch READMEs in background (non-blocking):
      //   - fills in descriptions for repos without overrides
      //   - picks up README images (e.g. COVID virus image)
      //   - falls back to contextImages only if README has nothing
      enhanceWithReadmes(limited);

    } catch (error) {
      console.warn('GitHub API failed, using fallback projects:', error.message);
      projectsData = fallbackProjects;
      renderProjects('all');
      setupProjectFilters();
    }
  }

  // Only run project logic on the Projects page
  if (projectsGrid) {
    loadProjects();
  }

});