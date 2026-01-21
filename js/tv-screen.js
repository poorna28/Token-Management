/*************************************************
 * CONFIG
 *************************************************/
const params = new URLSearchParams(window.location.search);

const locationId = getIntParam(params, "locationId", 10, 1, 100000);
const limit = getIntParam(params, "limit", 25, 1, 100);

const API_URL = `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/TokenDisplay/board?locationId=${locationId}&limit=${limit}`;

console.log("API URL 👉", API_URL);

const DISPLAY_LIMIT = 6;

// Display order (business decision)
const STATUS_ORDER = [
  "READY_FOR_DELIVERY",
  "BILLING",
  "PICKING",
  "PACKING"
];

// Backend → UI status mapping
const STATUS_MAP = {
  "Token in Progress": "READY_FOR_DELIVERY",
  "Billing in Progress": "BILLING",
  "Picking in Progress": "PICKING",
  "Packing in Progress": "PACKING"
};

// Rotation index per status
const statusIndex = {
  READY_FOR_DELIVERY: 0,
  BILLING: 0,
  PICKING: 0,
  PACKING: 0
};

let refreshTimer = null;

/*************************************************
 * FETCH TOKENS
 *************************************************/
async function fetchTokenBoard() {
  try {
    const response = await fetch(API_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("FULL API RESPONSE 👉", data);

    const tokens =
      data.tokens ||
      data.TokenDisplayList ||
      data.data ||
      [];

    console.log("TOKENS RECEIVED 👉", tokens);

    if (!Array.isArray(tokens) || tokens.length === 0) {
      updateTable([]);
      return;
    }

    const displayTokens = buildDisplayList(tokens);
    updateTable(displayTokens);

    // Auto refresh (if backend sends interval)
    if (!refreshTimer && data.refreshIntervalSeconds) {
      refreshTimer = setInterval(
        fetchTokenBoard,
        data.refreshIntervalSeconds * 1000
      );
    }

  } catch (error) {
    console.error("TOKEN BOARD ERROR ❌", error);
  }
}

/*************************************************
 * ROUND-ROBIN DISPLAY LOGIC (OPTION-1)
 *************************************************/
function buildDisplayList(tokens) {
  const grouped = {
    READY_FOR_DELIVERY: [],
    BILLING: [],
    PICKING: [],
    PACKING: []
  };

  // Group tokens by mapped status
  tokens.forEach(token => {
    const mappedStatus = STATUS_MAP[token.statusLabel];
    if (mappedStatus && grouped[mappedStatus]) {
      grouped[mappedStatus].push({
        ...token,
        statusLabel: mappedStatus
      });
    }
  });

  console.log("GROUPED TOKENS 👉", grouped);

  const result = [];
  let remaining = DISPLAY_LIMIT;

  // Round-robin across statuses
  while (remaining > 0) {
    let addedThisRound = false;

    for (const status of STATUS_ORDER) {
      const list = grouped[status];
      if (!list || list.length === 0) continue;

      const index = statusIndex[status] % list.length;
      result.push(list[index]);

      statusIndex[status]++;
      remaining--;
      addedThisRound = true;

      if (remaining === 0) break;
    }

    // Stop if no status had tokens
    if (!addedThisRound) break;
  }

  console.log("DISPLAY TOKENS 👉", result);
  return result;
}

/*************************************************
 * UI RENDER
 *************************************************/
function updateTable(tokens) {
  const tbody = document.getElementById("tableBody");

  if (!tokens || tokens.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;">No Tokens Available</td>
      </tr>`;
    return;
  }

  let html = "";

  tokens.forEach(token => {
    const statusClass = token.statusLabel
      ? `status-${token.statusLabel.toLowerCase()}`
      : "";

    html += `
      <tr class="${statusClass} ${token.highlight ? "highlight" : ""}">
        <td>${token.tokenNumber ?? "-"}</td>
        <td>${token.customerName ?? "-"}</td>
        <td>${formatStatus(token.statusLabel)}</td>
        <td>${token.counterNumber ?? "-"}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

/*************************************************
 * HELPERS
 *************************************************/
function formatStatus(status) {
  if (!status) return "-";
  return status
    .split("_")
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function getIntParam(params, key, defaultVal, min, max) {
  const value = parseInt(params.get(key), 10);
  if (isNaN(value)) return defaultVal;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/*************************************************
 * INITIAL LOAD
 *************************************************/
fetchTokenBoard();
