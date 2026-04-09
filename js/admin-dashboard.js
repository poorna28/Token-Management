/**
 * Apollo Token Admin Manager
 * Senior rewrite — dynamic API, URL sync, derived card counts (no separate summary API)
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const LOCATION_API = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.LOCATIONS}`;
const TOKEN_API = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.TOKENS}`;
const COMMON_HEADERS = CONFIG.HEADERS;
// ─── STATE ───────────────────────────────────────────────────────────────────

let allTokenData = [];    // raw data from API for the current query
let table = null;  // DataTable instance
let activeStageFilter = "total"; // currently active card filter (stage name or "breach")
let locationMap = {};    // { locationId: locationName } — populated by loadLocations()

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Format a date object → "YYYY-MM-DD" */
function toISODate(date) {
  return date.toISOString().split("T")[0];
}

/** Today's date string */
function today() {
  return toISODate(new Date());
}


/** Read a single URL param */
function getParam(key) {
  return new URLSearchParams(window.location.search).get(key) || "";
}

/** Push all current filter state into the URL (no page reload) */
function syncURL() {
  const locationId = document.getElementById("location-dropdown").value;
  const fromDate = document.getElementById("fromDateInput").value;
  const toDate = document.getElementById("toDateInput").value;

  const params = new URLSearchParams();
  if (locationId) params.set("locationId", locationId);
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);

  const qs = params.toString();
  window.history.pushState({}, "", qs ? `?${qs}` : window.location.pathname);
}

/** Show / hide the full-page loader */
function setLoader(visible) {
  const el = document.getElementById("loader");
  if (el) el.style.display = visible ? "flex" : "none";
}

// ─── DERIVED SUMMARY (from token list — single source of truth) ───────────────
function normalizeStage(stage) {
  if (!stage) return "-";

  const stageMap = {
    "Completed": "Delivered",
    "Cancelled Token": "Cancelled"
  };

  return stageMap[stage] || stage;
}

// ===================================
function deriveSummary(data) {
  const s = {
    total_tokens: data.length,
    billing: 0,
    picking: 0,
    packing: 0,
    ready_to_deliver: 0,
    delivered: 0,
    cancelled: 0,
    breach: 0
  };

  data.forEach(row => {
    switch (row.currentStage) {
      case "Billing In Progress":
        s.billing++;
        break;
      case "Picking In Progress":
        s.picking++;
        break;
      case "Packing In Progress":
        s.packing++;
        break;
      case "Ready to Deliver":
        s.ready_to_deliver++;
        break;
      case "Delivered":
        s.delivered++;
        break;
      case "Cancelled":
        s.cancelled++;
        break;
    }

    if (row.tatBreachMinutes > row.tatLimitMinutes) {
      s.breach++;
    }
  });

  return s;
}

function updateSummaryCards(s) {
  document.querySelector(".total-val").textContent = s.total_tokens;
  document.querySelector(".billing-val").textContent = s.billing;
  document.querySelector(".picking-val").textContent = s.picking;
  document.querySelector(".packing-val").textContent = s.packing;
  document.querySelector(".ready-val").textContent = s.ready_to_deliver;
  document.querySelector(".delivered-val").textContent = s.delivered;
  document.querySelector(".cancelled-val").textContent = s.cancelled;
  document.querySelector(".breach-val").textContent = s.breach;
}

// ─── TOKEN LIST API (fully dynamic) ──────────────────────────────────────────

// buildTokenApiUrl removed — use fetchTokensForLocation() instead

function fetchTokensForLocation(locationId) {
  const fromDate = document.getElementById("fromDateInput").value || today();
  const toDate = document.getElementById("toDateInput").value || today();
  const params = new URLSearchParams({ locationId, fromDate, toDate });
  return fetch(`${TOKEN_API}?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    headers: COMMON_HEADERS
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status} for locationId=${locationId}`);
      return res.json();
    })
    .then(result => result.data || [])
    .catch(err => {
      console.error(err.message);
      return []; // don't let one failed location break the whole load
    });
}

// AFTER
function loadTokenList() {
  setLoader(true);
  //  Do NOT reset activeStageFilter or setActiveCard here.
  //    Preserve whatever the user had selected before the reload.
  const selectedLocationId = document.getElementById("location-dropdown").value;

  const fetches = selectedLocationId
    ? [fetchTokensForLocation(selectedLocationId)]
    : Object.keys(locationMap).map(fetchTokensForLocation);

  Promise.all(fetches)
    .then(results => {
      allTokenData = results.flat().map(row => ({
        ...row,
        currentStage: normalizeStage(row.currentStage)
      }));
      updateSummaryCards(deriveSummary(allTokenData));

      // Re-apply the current active filter instead of dumping all data
      applyCardFilter(activeStageFilter || "total");
    })
    .finally(() => setLoader(false));
}

// ─── DATATABLE ───────────────────────────────────────────────────────────────

function renderTable(data) {
  if ($.fn.DataTable.isDataTable("#tokenAdminTable")) {
    $("#tokenAdminTable").DataTable().clear().rows.add(data).draw();
    return;
  }

  table = $("#tokenAdminTable").DataTable({
    data: data,
    autoWidth: false,
    language: {
      search: "",
      searchPlaceholder: "Search by Name, Token, Location, Counter…"
    },
    columnDefs: [
      { width: "140px", targets: 4 },
      { width: "140px", targets: 5 }
    ],
    columns: [
      {
        data: "customerName",
        defaultContent: "",
        render(d, t, r) {
          const initial = d ? d.charAt(0).toUpperCase() : "?";
          return `<div class="d-flex align-items-center gap-2">
                    <strong class="name-letter">${initial}</strong>
                    <div>
                      <p class="m-0 length-name">${d || "-"}</p>
                      <span class="phone-number">${r.phone || "-"}</span>
                    </div>
                  </div>`;
        }
      },
      { data: "tokenId", defaultContent: "-" },
      { data: "locationName",
        className: "length-name",
         defaultContent: "-" },
      {
        data: "currentStage",
        className: "current-stage-column",
        render(data) {
          const stage = normalizeStage(data);

          const map = {
            "Picking In Progress": "current-stage-picking",
            "Packing In Progress": "current-stage-packing",
            "Billing In Progress": "current-stage-billing",
            "Ready to Deliver": "current-stage-ready",
            "Delivered": "current-stage-delivered",
            "Cancelled": "current-stage-cancelled"
          };

          const cls = map[stage] || "";
          return `<span class="${cls} current-status-badge"><span class="dot"></span>${stage || "-"}</span>`;
        }
      },
      {
        data: "issueTime",
        render(data) {
          return formatDateTime(data, "-");
        }
      },
      {
        data: "exitTime",
        render(data) {
          return formatDateTime(data, "--");
        }
      },
      { data: "counterNo", defaultContent: "-", className: "text-center" },
      { data: "tatLimitMinutes", defaultContent: "-", className: "text-center" },
      {
        data: "tatBreachMinutes",
        render(data, type, row) {
          if (!data) return "-";
          return row.tatBreachMinutes > row.tatLimitMinutes
            ? `${data} <span class="breach-badge ms-2">Breached</span>`
            : data;
        }
      }
    ],
    paging: true,
    searching: true,
    ordering: true,
    pageLength: 10
  });
}

// ─── CARD FILTER (client-side — no extra API call) ───────────────────────────

function applyCardFilter(filterKey) {
  activeStageFilter = filterKey;

  const stageMap = {
    total: "",
    ready: "Ready to Deliver",
    picking: "Picking In Progress",
    packing: "Packing In Progress",
    billing: "Billing In Progress",
    delivered: "Delivered",
    cancelled: "Cancelled"
  };

  let filtered = [...allTokenData];

  if (filterKey === "breach") {
    filtered = filtered.filter(x => x.tatBreachMinutes > x.tatLimitMinutes);
  } else if (stageMap[filterKey]) {
    filtered = filtered.filter(x => normalizeStage(x.currentStage) === stageMap[filterKey]);
  }

  renderTable(filtered);
}

// ─── LOCATIONS ────────────────────────────────────────────────────────────────

function loadLocations() {
  return fetch(LOCATION_API, {
    method: "GET",
    cache: "no-store",
    headers: COMMON_HEADERS
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(result => {
      const locations = result.data || [];
      const dropdown = document.getElementById("location-dropdown");
      dropdown.innerHTML = `<option value="">All Locations</option>`;

      locations.forEach(loc => {
        locationMap[loc.locationId] = loc.name;  // store for parallel fetching
        const opt = document.createElement("option");
        opt.value = loc.locationId;
        opt.textContent = loc.name;
        dropdown.appendChild(opt);
      });
    })
    .catch(err => console.error("Locations error:", err));
}

// ─── CUSTOM DROPDOWN ─────────────────────────────────────────────────────────

function initializeCustomDropdown() {
  const sel = document.getElementById("location-dropdown");
  if (!sel) return;

  const wrapper = document.createElement("div");
  wrapper.className = "custom-dropdown-wrapper";
  wrapper.innerHTML = `
    <button type="button" class="custom-dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">
      <span></span>
      <svg class="cdd-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <polyline points="5 8 10 13 15 8"/>
      </svg>
    </button>
    <ul class="custom-dropdown-menu" role="listbox"></ul>`;

  const trigger = wrapper.querySelector(".custom-dropdown-trigger");
  const label = wrapper.querySelector("span");
  const menu = wrapper.querySelector(".custom-dropdown-menu");

  const toggle = (force) => {
    const open = force ?? !menu.classList.contains("open");
    menu.classList.toggle("open", open);
    trigger.classList.toggle("open", open);
    trigger.setAttribute("aria-expanded", open);
  };

  function buildItems() {
    menu.innerHTML = "";
    Array.from(sel.options).forEach(opt => {
      const li = document.createElement("li");
      li.className = "custom-dropdown-item" + (opt.selected ? " selected" : "");
      li.textContent = opt.text;
      li.setAttribute("role", "option");
      li.addEventListener("click", () => {
        menu.querySelectorAll(".custom-dropdown-item").forEach(el => el.classList.remove("selected"));
        li.classList.add("selected");
        label.textContent = opt.text;
        sel.value = opt.value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        toggle(false);
      });
      if (opt.selected) label.textContent = opt.text;
      menu.appendChild(li);
    });
    if (!label.textContent) label.textContent = sel.options[0]?.text || "";
  }

  trigger.addEventListener("click", () => toggle());
  document.addEventListener("click", e => !wrapper.contains(e.target) && toggle(false));
  new MutationObserver(buildItems).observe(sel, { childList: true, subtree: true, attributes: true });

  sel.insertAdjacentElement("afterend", wrapper);
  buildItems();
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {

  document.getElementById("fromDateInput").max = today();
  document.getElementById("toDateInput").max = today();
  // 1. Pre-fill filters from URL params
  const paramLocationId = getParam("locationId");
  const paramFromDate = getParam("fromDate");
  const paramToDate = getParam("toDate");

  // Restore dates from URL if set; otherwise default to today
  document.getElementById("fromDateInput").value = paramFromDate || today();
  document.getElementById("toDateInput").value = paramToDate || today();

  // 2. Load locations, then set dropdown value and fetch tokens
  loadLocations().then(() => {
    if (paramLocationId) {
      document.getElementById("location-dropdown").value = paramLocationId;
    }

    initializeCustomDropdown();

    // Location change → re-fetch from API + sync URL
    document.getElementById("location-dropdown").addEventListener("change", () => {
      syncURL();
      loadTokenList();
    });

    // Initial token load — dates blank by default, API returns all records
    syncURL();
    loadTokenList();
  });

  // 3. Date filter — APPLY: re-fetch from API
  document.getElementById("applyDateFilter").addEventListener("click", () => {
    const fromDate = document.getElementById("fromDateInput").value;
    const toDate = document.getElementById("toDateInput").value;

    if (!fromDate || !toDate) {
      alert("Please select both From Date and To Date.");
      return;
    }
    if (fromDate > toDate) {
      alert("From Date cannot be after To Date.");
      return;
    }

    syncURL();
    loadTokenList();
  });

  // 4. Date filter — CLEAR: reset to today
document.getElementById("clearDateFilter").addEventListener("click", () => {
  document.getElementById("fromDateInput").value = today();
  document.getElementById("toDateInput").value = today();

  // Clear DataTable search input
  if ($.fn.DataTable.isDataTable("#tokenAdminTable")) {
    const dt = $("#tokenAdminTable").DataTable();
    dt.search("").draw();
  }

  // Optional: also clear visible search box manually
  // document.querySelector('input[type="search"]')?.value = "";

  syncURL();
  loadTokenList();
});

  // 5. Card clicks — client-side filter over already-fetched data
  document.querySelector(".stat-card.breach")?.classList.remove("active");
// AFTER — persist the key to state immediately
document.querySelectorAll(".stat-card").forEach(card => {
  card.addEventListener("click", function () {
    document.querySelectorAll(".stat-card").forEach(c => c.classList.remove("active"));
    this.classList.add("active");

    const cls = this.classList;
    let key = "total";
    if (cls.contains("total"))          key = "total";
    else if (cls.contains("billing"))   key = "billing";
    else if (cls.contains("picking"))   key = "picking";
    else if (cls.contains("packing"))   key = "packing";
    else if (cls.contains("ready"))     key = "ready";
    else if (cls.contains("delivered")) key = "delivered";
    else if (cls.contains("cancelled")) key = "cancelled";
    else if (cls.contains("breach"))    key = "breach";

    activeStageFilter = key;   // update state first
    applyCardFilter(key);
  });
});
});


// ===============================================================

function formatDateTime(data, emptyValue = "-") {
  if (!data) return emptyValue;

  const d = new Date(data);

  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-GB", { month: "short" });
  const year = String(d.getFullYear()).slice(-2);

  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  return `<div class="d-flex flex-column">
            <span class="date-text">${day}&nbsp;${month}&nbsp;${year}</span>
            <span class="time-text">${time}</span>
          </div>`;
}

// ================================================

function setActiveCard(cardKey = "total") {
  document.querySelectorAll(".stat-card").forEach(c => c.classList.remove("active"));

  const targetCard = document.querySelector(`.stat-card.${cardKey}`);
  if (targetCard && cardKey !== "breach") {
    targetCard.classList.add("active");
  }
}