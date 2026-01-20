// ----------------------
// CONFIG
// ----------------------
// const API_URL =
  // "https://zcutilities.zeroco.de/api/get/d0cc0866412341f65eec468ca97d4a73c1adf6f75be22e81cb4c7e9e83e7a8ff?locationId=10&limit=25";

  // const API_URL = "https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/TokenDisplay/board?locationId=10&limit=25";

  const params = new URLSearchParams(window.location.search);

const locationId = getIntParam(params, "locationId", 10, 1, 100000);
const limit = getIntParam(params, "limit", 25, 1, 100);

const API_URL = `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/TokenDisplay/board?locationId=${locationId}&limit=${limit}`;



  const DISPLAY_LIMIT = 6;

const STATUS_ORDER = [
  "READY_FOR_DELIVERY",
  "BILLING",
  "PICKING",
  "PACKING"
];

// Cursor memory per status
const statusIndex = {
  READY_FOR_DELIVERY: 0,
  BILLING: 0,
  PICKING: 0,
  PACKING: 0
};

let refreshTimer = null;

// ----------------------
// FETCH API
// ----------------------
async function fetchTokenBoard() {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("API failed");

    const data = await res.json();

    const displayTokens = buildDisplayList(data.tokens);
    updateTable(displayTokens);

    // Start interval only once
    if (!refreshTimer && data.refreshIntervalSeconds) {
      refreshTimer = setInterval(
        fetchTokenBoard,
        data.refreshIntervalSeconds * 1000
      );
    }
  } catch (err) {
    console.error("Token fetch error:", err);
  }
}

// ----------------------
// CORE BOARD LOGIC
// ----------------------
function buildDisplayList(tokens) {
  // Group by STATUS LABEL
  const grouped = {
    READY_FOR_DELIVERY: [],
    BILLING: [],
    PICKING: [],
    PACKING: []
  };

  tokens.forEach(t => {
    if (grouped[t.statusLabel]) {
      grouped[t.statusLabel].push(t);
    }
  });

  const result = [];
  let remaining = DISPLAY_LIMIT;

  // Respect strict order
  for (const status of STATUS_ORDER) {
    if (remaining === 0) break;

    const list = grouped[status];
    if (!list.length) continue;

    const start = statusIndex[status];
    const take = Math.min(list.length, remaining);

    for (let i = 0; i < take; i++) {
      result.push(list[(start + i) % list.length]);
    }

    // Move cursor forward
    statusIndex[status] = (start + take) % list.length;
    remaining -= take;
  }

  return result;
}

// ----------------------
// UI UPDATE (NO FLICKER)
// ----------------------
// function updateTable(tokens) {
//   const tbody = document.getElementById("tableBody");

//   let html = "";
//   tokens.forEach(t => {
//     html += `
//     <div>
//       <tr class="${t.highlight ? "highlight" : ""}">
//         <td>${t.tokenNumber}</td>
//         <td>${t.customerName || "-"}</td>
//         <td>${formatStatus(t.statusLabel)}</td>

//         <td>${t.counterNumber || "-"}</td>
//       </tr>
//     </div>
//     `;
//   });

//   tbody.innerHTML = html;
// }
function updateTable(tokens) {
  const tbody = document.getElementById("tableBody");

  let html = "";
  tokens.forEach(t => {
    const statusClass = `status-${t.statusLabel.toLowerCase()}`;
    html += `
      <tr class="${statusClass} ${t.highlight ? "highlight" : ""}">
        <td>${t.tokenNumber}</td>
        <td>${t.customerName || "-"}</td>
        <td>${formatStatus(t.statusLabel)}</td>
        <td>${t.counterNumber || "-"}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}


// ----------------------
// INITIAL LOAD
// ----------------------
fetchTokenBoard();


function formatStatus(label) {
  return label
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}


function getIntParam(params, key, defaultVal, min, max) {
  const val = parseInt(params.get(key), 10);
  if (isNaN(val)) return defaultVal;
  if (val < min) return min;
  if (val > max) return max;
  return val;
}
