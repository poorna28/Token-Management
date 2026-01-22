/*************************************************
 * CONFIG
 *************************************************/
const params = new URLSearchParams(window.location.search);

const locationId = getIntParam(params, "locationId", 10, 1, 100000);
const limit = getIntParam(params, "limit", 25, 1, 100);

const API_URL = `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/TokenDisplay/board?locationId=${locationId}&limit=${limit}`;

console.log("API URL 👉", API_URL);

let refreshTimer = null;

/*************************************************
 * FETCH TOKENS (AS-IS)
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

    updateTable(tokens);

    // Auto refresh from backend interval
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
 * UI RENDER
 *************************************************/
function updateTable(tokens) {
  const tbody = document.getElementById("tableBody");

  if (!Array.isArray(tokens) || tokens.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;">No Tokens Available</td>
      </tr>`;
    return;
  }

  let html = "";

  tokens.forEach(token => {
    const statusClass = getStatusClass(token.statusLabel);

    html += `
      <tr class="${statusClass} ${token.highlight ? "highlight" : ""}">
        <td>${token.tokenNumber ?? "-"}</td>
      <td>${token.customerName.replace(/\n|\r/g, " ")}</td>
        <td>${token.statusLabel ?? "-"}</td>
        <td>${token.counterNumber ?? "-"}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

/*************************************************
 * STATUS → CSS CLASS (VISUAL ONLY)
 *************************************************/
function getStatusClass(statusLabel) {
  switch (statusLabel) {
    case "Token in Progress":
      return "status-ready_for_delivery";

    case "Billing in Progress":
      return "status-billing";

    case "Picking in Progress":
      return "status-picking";

    case "Packing in Progress":
      return "status-packing";

    case "Completed":
      return "status-completed";

    default:
      return "";
  }
}

/*************************************************
 * HELPERS
 *************************************************/
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
