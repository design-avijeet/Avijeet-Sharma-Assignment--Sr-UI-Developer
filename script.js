/* ============================================================================
   THEME TOGGLE (sun/moon) — persists to localStorage
   - Uses only the data-theme attribute on <html>
   - Icons: "light_mode" for switching to light, "dark_mode" for switching to dark
============================================================================ */
const htmlEl = document.documentElement;
const themeToggleBtn = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

/* Apply saved theme on load (if any), else honor what's in the HTML tag */
const savedTheme = localStorage.getItem("theme"); // "light" | "dark" | null
if (savedTheme) htmlEl.setAttribute("data-theme", savedTheme);

/* Reflect current theme in icon + labels */
function reflectTheme() {
  const isDark = htmlEl.getAttribute("data-theme") === "dark";
  // Show the *action* icon (what you'll switch to on click)
  themeIcon.textContent = isDark ? "light_mode" : "dark_mode";
  const nextLabel = isDark ? "Switch to light theme" : "Switch to dark theme";
  themeToggleBtn.title = nextLabel;
  themeToggleBtn.setAttribute("aria-label", nextLabel);
}

/* Toggle handler */
themeToggleBtn.addEventListener("click", () => {
  const isDark = htmlEl.getAttribute("data-theme") === "dark";
  const next = isDark ? "light" : "dark";
  htmlEl.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  reflectTheme();
});

/* Initial sync on load */
reflectTheme();

/* =========================================================================
   DATA MODEL
   -------------------------------------------------------------------------
   Shape of the data that drives the context rail. Each "section" (dashboard,
   tasks, settings, account) has a title and one or more "groups". A group
   has a label and an array of items. Items can be:
     - a simple row     -> { icon, label }
     - a parent row     -> { icon, label, children: ["child 1", ...] }
   ========================================================================= */

const DATA = {
  dashboard: {
    title: "Dashboard",
    groups: [
      {
        label: "Dashboard Types",
        items: [
          { icon: "visibility", label: "Overview" },
          {
            icon: "space_dashboard",
            label: "Executive Summary",
            children: [
              "Revenue Overview",
              "Key Performance Indicators",
              "Strategic Goals Progress",
              "Department Highlights",
            ],
          },
          {
            icon: "finance", // (icon name can be adjusted to a valid Material symbol)
            label: "Operations Dashboard",
            children: ["Daily Ops", "Quality Control", "SLA Compliance"],
          },
          {
            icon: "trending_up",
            label: "Financial Dashboard",
            children: ["Balance Sheet", "Expenses", "Cash Flow"],
          },
        ],
      },
    ],
  },

  tasks: {
    title: "Tasks",
    groups: [
      {
        label: "Quick Actions",
        items: [
          { icon: "add", label: "New task" },
          { icon: "filter_alt", label: "Filter tasks" },
        ],
      },
      {
        label: "My Tasks",
        items: [
          {
            icon: "schedule",
            label: "Due today",
            children: [
              "Review design mockups",
              "Update documentation",
              "Test new feature",
            ],
          },
          {
            icon: "clock_loader_40",
            label: "In progress",
            children: ["API integration", "Refactor sidebar"],
          },
          {
            icon: "check_circle",
            label: "Completed",
            children: ["Accessibility pass", "Bug fixes"],
          },
        ],
      },
      {
        label: "Other",
        items: [
          {
            icon: "flag_2",
            label: "Priority tasks",
            children: ["Critical launch items", "Stakeholder feedback"],
          },
          { icon: "inventory_2", label: "Archived" },
        ],
      },
    ],
  },

  settings: {
    title: "Settings",
    groups: [
      {
        label: "Preferences",
        items: [
          { icon: "tune", label: "General" },
          { icon: "palette", label: "Appearance" },
          { icon: "lock", label: "Privacy" },
          {
            icon: "shield",
            label: "Security",
            children: ["Two-factor auth", "Active sessions", "API tokens"],
          },
        ],
      },
      {
        label: "Advanced",
        items: [
          {
            icon: "integration_instructions",
            label: "Integrations",
            children: ["Slack", "Jira", "GitHub"],
          },
          { icon: "backup", label: "Backups" },
          { icon: "ios_share", label: "Import / Export" },
        ],
      },
    ],
  },

  account: {
    title: "Account",
    groups: [
      {
        label: "Account",
        items: [
          { icon: "person", label: "Profile" },
          { icon: "notifications", label: "Notifications" },
          { icon: "key", label: "Passwords" },
        ],
      },
    ],
  },
};

/* =========================================================================
   DOM REFERENCES
   -------------------------------------------------------------------------
   Cache all the static elements we need to read/update frequently.
   ========================================================================= */

const rail = document.querySelector(".rail--main"); // the left-most icon rail
const ctx = document.querySelector(".context"); // the second (context) rail
const ctxTitle = document.getElementById("ctxTitle"); // <h2> title inside context header
const ctxBody = document.getElementById("ctxBody"); // container where groups + rows render
const collapseBtn = document.getElementById("ctxCollapse"); // chevron button
const searchInput = document.getElementById("ctxSearch"); // search <input>

let currentSection = "dashboard"; // initial section shown on load

/* =========================================================================
   INITIAL RENDER
   -------------------------------------------------------------------------
   Paint the first section immediately.
   ========================================================================= */

renderSection(currentSection);

/* =========================================================================
   LEFT RAIL: SECTION SWITCHING
   -------------------------------------------------------------------------
   Clicking a button in the left rail swaps which section is rendered
   in the context rail (and updates the active state styling).
   ========================================================================= */

rail.addEventListener("click", (e) => {
  const btn = e.target.closest(".rail-btn[data-section]");
  if (!btn) return;

  // 1) Update active button highlight on the left rail
  rail
    .querySelectorAll(".rail-btn[data-section]")
    .forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");

  // 2) Render the selected section in the context rail
  currentSection = btn.dataset.section;
  renderSection(currentSection);
});

/* =========================================================================
   COLLAPSE / EXPAND THE CONTEXT RAIL
   -------------------------------------------------------------------------
   Toggles the 'context--collapsed' class which your CSS uses to animate
   width and visually hide labels. We blur the search input when collapsing
   to avoid caret flashing during the transition.
   ========================================================================= */

collapseBtn.addEventListener("click", () => {
  const willCollapse = !ctx.classList.contains("context--collapsed");
  ctx.classList.toggle("context--collapsed");

  // When collapsing, blur the input to prevent caret flicker during animation
  if (willCollapse) searchInput.blur();
});

/* =========================================================================
   LIVE FILTER FOR CONTEXT ITEMS
   -------------------------------------------------------------------------
   Filters both parent rows and children by text. Parents remain visible
   if any of their children match the query.
   ========================================================================= */

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();

  // We check both <summary> (parents) and <button> (rows/children).
  ctxBody.querySelectorAll("button, summary").forEach((el) => {
    const label = (el.textContent || "").toLowerCase();

    if (el.tagName.toLowerCase() === "summary") {
      // Parent node (<summary> inside a <details>)
      const details = el.parentElement;
      const children = [...details.querySelectorAll(".children .row--child")];

      // If any child matches, keep parent visible
      const childMatch = children.some((c) =>
        (c.textContent || "").toLowerCase().includes(q)
      );

      details.style.display =
        label.includes(q) || childMatch || q === "" ? "" : "none";
    } else {
      // Simple row or child row
      const li = el.closest("li") || el;
      li.style.display = label.includes(q) || q === "" ? "" : "none";
    }
  });
});

/* =========================================================================
   RENDERER
   -------------------------------------------------------------------------
   Turns a DATA[sectionKey] object into DOM nodes inside #ctxBody.
   - Groups are rendered as <section> with a label.
   - Items are either:
       * simple <button class="row">
       * or <details class="node"> with <summary> and .children
   ========================================================================= */

function renderSection(key) {
  const data = DATA[key];
  if (!data) return;

  // Update title text in the context header
  if (ctxTitle) ctxTitle.textContent = data.title;

  // Wipe previous content
  ctxBody.innerHTML = "";

  data.groups.forEach((group) => {
    // Group wrapper
    const section = document.createElement("section");

    // Group label
    const gl = document.createElement("div");
    gl.className = "group-label";
    gl.textContent = group.label;
    section.appendChild(gl);

    // Items list
    const ul = document.createElement("ul");
    ul.className = "list";

    group.items.forEach((item) => {
      const li = document.createElement("li");

      // Parent with children -> <details>
      if (Array.isArray(item.children) && item.children.length) {
        const details = document.createElement("details");
        details.className = "node";

        // Parent summary row
        const summary = document.createElement("summary");
        summary.className = "row row--parent";
        summary.innerHTML = `
          <span class="mi">${item.icon}</span>
          <span class="label">${item.label}</span>
          <span class="mi caret">expand_more</span>
        `;
        details.appendChild(summary);

        // Children container
        const children = document.createElement("div");
        children.className = "children";

        // Each child as a flat button row
        item.children.forEach((name) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "row--child";
          btn.innerHTML = `<span class="label">${name}</span>`;
          btn.addEventListener("click", () => setActive(btn));
          children.appendChild(btn);
        });

        details.appendChild(children);
        li.appendChild(details);
      } else {
        // Simple row (no children)
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "row";
        btn.innerHTML = `
          <span class="mi">${item.icon}</span>
          <span class="label">${item.label}</span>
        `;
        btn.addEventListener("click", () => setActive(btn));
        li.appendChild(btn);
      }

      ul.appendChild(li);
    });

    section.appendChild(ul);
    ctxBody.appendChild(section);
  });

  // Clear any previous query when switching section
  if (searchInput) searchInput.value = "";
}

/* =========================================================================
   CLICK-TO-EXPAND ON SEARCH ROW (WHEN COLLAPSED)
   -------------------------------------------------------------------------
   If the context is collapsed and the user clicks the search area, expand
   the rail and focus the input so they can start typing immediately.
   ========================================================================= */

const searchRow = document.querySelector(".context-search");

searchRow.addEventListener("click", () => {
  if (ctx.classList.contains("context--collapsed")) {
    ctx.classList.remove("context--collapsed");
    collapseBtn.setAttribute("aria-label", "Collapse");
    collapseBtn.title = "Collapse";

    // Wait a frame to ensure layout is updated, then focus the input
    requestAnimationFrame(() => searchInput.focus({ preventScroll: true }));
  }
});

/* =========================================================================
   ACTIVE ROW HIGHLIGHT
   -------------------------------------------------------------------------
   Gives a single "active" visual to whichever row/child the user clicked.
   ========================================================================= */

function setActive(btn) {
  ctxBody
    .querySelectorAll(".row.is-active, .row--child.is-active")
    .forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");
}
