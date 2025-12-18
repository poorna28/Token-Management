// ----------------------
// CONFIG
// ----------------------
const API_URL =
  "https://zcutilities.zeroco.de/api/get/d0cc0866412341f65eec468ca97d4a73c1adf6f75be22e81cb4c7e9e83e7a8ff?locationId=10&limit=25";

const DISPLAY_LIMIT = 6;

const STATUS_ORDER = [
  "COLLECT_HERE",
  "BILLING",
  "PICKING",
  "PACKING"
];

// Cursor memory per status
const statusIndex = {
  COLLECT_HERE: 0,
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
    COLLECT_HERE: [],
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
function updateTable(tokens) {
  const tbody = document.getElementById("tableBody");

  let html = "";
  tokens.forEach(t => {
    html += `
      <tr class="${t.highlight ? "highlight" : ""}">
        <td>${t.tokenNumber}</td>
        <td>${t.customerName || "-"}</td>
        <td>${t.statusLabel.replace("_", " ")}</td>
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


//======================================================================


// // ----------------------
// // CONFIG
// // ----------------------
// const API_URL =
//   "https://zcutilities.zeroco.de/api/get/d0cc0866412341f65eec468ca97d4a73c1adf6f75be22e81cb4c7e9e83e7a8ff?locationId=10&limit=25";

// const DISPLAY_LIMIT = 6;

// const STATUS_ORDER = [
//   "COLLECT_HERE",
//   "BILLING",
//   "PICKING",
//   "PACKING"
// ];

// let refreshTimer = null;
// let globalIndex = 0;
// let orderedCache = [];

// // ----------------------
// // FETCH DATA
// // ----------------------
// async function fetchBoard() {
//   try {
//     const res = await fetch(API_URL, {
//       method: "GET",
//       cache: "no-store"
//     });

//     if (!res.ok) throw new Error("API error");

//     const data = await res.json();

//     orderedCache = buildOrderedList(data.tokens);

//     renderNextPage();

//     if (!refreshTimer && data.refreshIntervalSeconds) {
//       refreshTimer = setInterval(
//         renderNextPage,
//         data.refreshIntervalSeconds * 1000
//       );
//     }

//   } catch (err) {
//     console.error("Fetch error:", err);
//   }
// }

// // ----------------------
// // BUILD ORDERED LIST
// // ----------------------
// function buildOrderedList(tokens) {
//   const grouped = {};
//   STATUS_ORDER.forEach(s => grouped[s] = []);

//   tokens.forEach(t => {
//     if (grouped[t.statusLabel]) {
//       grouped[t.statusLabel].push(t);
//     }
//   });

//   const ordered = [];
//   STATUS_ORDER.forEach(status => {
//     ordered.push(...grouped[status]);
//   });

//   globalIndex = 0; // reset on new data
//   return ordered;
// }

// // ----------------------
// // ROTATION (KEY FIX)
// // ----------------------
// function renderNextPage() {
//   if (!orderedCache.length) return;

//   const slice = [];

//   for (let i = 0; i < DISPLAY_LIMIT; i++) {
//     slice.push(
//       orderedCache[(globalIndex + i) % orderedCache.length]
//     );
//   }

//   globalIndex =
//     (globalIndex + DISPLAY_LIMIT) % orderedCache.length;

//   updateTable(slice);
// }

// // ----------------------
// // UPDATE UI
// // ----------------------
// function updateTable(tokens) {
//   const tbody = document.getElementById("tableBody");

//   let html = "";

//   tokens.forEach(t => {
//     html += `
//       <tr class="${t.highlight ? "highlight" : ""}">
//         <td>${t.tokenNumber}</td>
//         <td>${t.customerName}</td>
//         <td>${t.statusLabel.replace("_", " ")}</td>
//         <td>${t.counterNumber || "-"}</td>
//       </tr>
//     `;
//   });

//   tbody.innerHTML = html;
// }

// // ----------------------
// // START
// // ----------------------
// fetchBoard();
