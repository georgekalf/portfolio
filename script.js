// ======= Theme toggle setup =======
function setupThemeToggle() {
  const toggleBtn = document.querySelector(".theme-toggle");
  const darkModeKey = "darkMode";

  function setDarkMode(enabled) {
    if (enabled) {
      document.documentElement.classList.add("dark");
      toggleBtn.textContent = "☀️";
      localStorage.setItem(darkModeKey, "true");
    } else {
      document.documentElement.classList.remove("dark");
      toggleBtn.textContent = "🌙";
      localStorage.setItem(darkModeKey, "false");
    }
  }

  toggleBtn.addEventListener("click", () => {
    const darkEnabled = document.documentElement.classList.contains("dark");
    setDarkMode(!darkEnabled);
  });

  // Load saved preference
  const saved = localStorage.getItem(darkModeKey);
  if (saved === "true") {
    setDarkMode(true);
  } else {
    setDarkMode(false);
  }
}

// ======= Work experience tabs (for work.html) =======
function setupWorkTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");

      tabButtons.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(target).classList.add("active");
    });
  });
}

// ======= Projects page code =======
const githubUser = "georgekalf";
const projectGrid = document.querySelector(".project-grid");
const filterBar = document.querySelector(".filter-bar");

// Possible image filenames in repo root for screenshots
const possibleImageFiles = [
  "screenshot.png",
  "screenshot.jpg",
  "cover.png",
  "cover.jpg",
  "preview.png",
  "preview.jpg",
  "demo.png",
  "demo.jpg",
];

// Fetch repos excluding your own readme repo
async function fetchProjects() {
  try {
    const res = await fetch(`https://api.github.com/users/${githubUser}/repos?per_page=100`);
    let repos = await res.json();

    if (!Array.isArray(repos)) {
      projectGrid.innerHTML = "<p>Error fetching projects.</p>";
      return [];
    }

    repos = repos.filter(r => r.name.toLowerCase() !== "georgekalf");

    // Fetch languages for each repo
    const reposWithLanguages = await Promise.all(
      repos.map(async (repo) => {
        const langRes = await fetch(repo.languages_url);
        const languages = await langRes.json();
        repo.languages = Object.keys(languages);
        return repo;
      })
    );

    return reposWithLanguages;
  } catch (err) {
    console.error("Error fetching repos:", err);
    projectGrid.innerHTML = "<p>Error loading projects.</p>";
    return [];
  }
}

// Try to get repo image URL
async function getRepoImage(repo) {
  try {
    const contentsRes = await fetch(`https://api.github.com/repos/${githubUser}/${repo.name}/contents/`);
    if (!contentsRes.ok) return null;

    const files = await contentsRes.json();
    const imageFile = files.find(
      (file) =>
        file.type === "file" &&
        possibleImageFiles.includes(file.name.toLowerCase())
    );
    if (imageFile) {
      return `https://raw.githubusercontent.com/${githubUser}/${repo.name}/main/${imageFile.name}`;
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

// Create project card HTML
function createProjectCard(repo, imageUrl) {
  const languagesHTML = repo.languages
    .map((lang) => `<span class="lang-tag">${lang}</span>`)
    .join(" ");

  return `
    <a href="${repo.html_url}" target="_blank" class="project-card" data-languages='${JSON.stringify(repo.languages)}'>
      <div class="project-image" style="background-image: url('${imageUrl || "images/project-placeholder.png"}');"></div>
      <div class="project-info">
        <h3>${repo.name}</h3>
        <p>${repo.description || "No description available."}</p>
        <div class="project-langs">${languagesHTML}</div>
      </div>
    </a>
  `;
}

// Populate filter buttons for all languages found
function populateFilterButtons(repos) {
  const allLangs = new Set();
  repos.forEach((r) => r.languages.forEach((lang) => allLangs.add(lang)));

  allLangs.forEach((lang) => {
    const btn = document.createElement("button");
    btn.classList.add("filter-btn");
    btn.textContent = lang;
    btn.setAttribute("data-filter", lang);
    filterBar.appendChild(btn);
  });
}

// Filter projects by language
function filterProjects(language) {
  const cards = document.querySelectorAll(".project-card");
  cards.forEach((card) => {
    const langs = JSON.parse(card.dataset.languages);
    if (language === "all" || langs.includes(language)) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });

  // Update active button style
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === language);
  });
}

async function initProjectsPage() {
  if (!projectGrid || !filterBar) return;

  const repos = await fetchProjects();
  if (repos.length === 0) {
    projectGrid.innerHTML = "<p>No projects found.</p>";
    return;
  }

  populateFilterButtons(repos);

  const reposWithImages = await Promise.all(
    repos.map(async (repo) => {
      const img = await getRepoImage(repo);
      return { repo, img };
    })
  );

  projectGrid.innerHTML = reposWithImages
    .map(({ repo, img }) => createProjectCard(repo, img))
    .join("");

  filterBar.addEventListener("click", (e) => {
    if (e.target.classList.contains("filter-btn")) {
      filterProjects(e.target.dataset.filter);
    }
  });

  filterProjects("all");
}

// ======= On DOM load =======
document.addEventListener("DOMContentLoaded", () => {
  setupThemeToggle();

  if (document.querySelector(".tab-button")) {
    setupWorkTabs();
  }

  if (document.querySelector(".project-grid")) {
    initProjectsPage();
  }
});
