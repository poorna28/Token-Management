/*************************************************
 * CONFIG
 *************************************************/
const params = new URLSearchParams(window.location.search);

const locationId = getIntParam(params, "locationId", 10, 1, 100000);
const limit = getIntParam(params, "limit", 50, 1, 500); // total records from API

 // const API_URL = `https://zcutilities.zeroco.de/api/get/112e46603b29bdfba06cf59e4f00a92e82483d25d66fc707974537e78fc5d6b7?locationId=${locationId}&limit=${limit}`;

const API_URL = `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/TokenDisplay/board?locationId=${locationId}&limit=${limit}`;



console.log("API URL ", API_URL);

/*************************************************
 * STATE
 *************************************************/
let allTokens = [];
let currentIndex = 0;
let rotateTimer = null;

const DISPLAY_COUNT = 6;      // show 10 records at a time
const ROTATE_INTERVAL = 5000; // 5 seconds

/*************************************************
 * FETCH TOKENS
 *************************************************/
async function fetchTokenBoard() {
  try {
    console.log("Calling API again ");

    const response = await fetch(API_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("FULL API RESPONSE ", data);

    allTokens =
      data.tokens ||
      data.TokenDisplayList ||
      data.data ||
      [];

    console.log("TOTAL TOKENS ", allTokens.length);

    currentIndex = 0;

    if (rotateTimer) {
      clearInterval(rotateTimer);
    }

    showNextBatch();

    rotateTimer = setInterval(showNextBatch, ROTATE_INTERVAL);

  } catch (error) {
    console.error("TOKEN BOARD ERROR ", error);
  }
}

/*************************************************
 * SHOW NEXT 10 RECORDS
 *************************************************/
function showNextBatch() {
  if (!Array.isArray(allTokens) || allTokens.length === 0) {
    updateTable([]);
    return;
  }

  // If all records are shown, call API again
  if (currentIndex >= allTokens.length) {
    fetchTokenBoard();
    return;
  }

  const batch = allTokens.slice(
    currentIndex,
    currentIndex + DISPLAY_COUNT
  );

  console.log(
    `Showing records ${currentIndex + 1} to ${
      currentIndex + batch.length
    }`
  );

  updateTable(batch);

  currentIndex += DISPLAY_COUNT;
}

/*************************************************
 * UI RENDER
 *************************************************/
function updateTable(tokens) {
  const tbody = document.getElementById("tableBody");

  // Start fade-out
  tbody.classList.remove("fade-in");
  tbody.classList.add("fade-out");

  setTimeout(() => {
    // Update content after fade-out
    if (!Array.isArray(tokens) || tokens.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;">No Tokens Available</td>
        </tr>`;
    } else {
      let html = "";

      tokens.forEach(token => {
        const statusClass = getStatusClass(token.statusLabel);

        html += `
          <tr class="${statusClass} ${token.highlight ? "highlight" : "-"}">
            <td>${token.tokenNumber ?? "-"}</td>
            <td>${token.customerName?.replace(/\n|\r/g, " ") ?? "-"}</td>
            <td>${token.statusLabel ?? "-"}</td>
            <td>${token.counterNumber?.toString().trim() || "-"}</td>

          </tr>
        `;
      });

      tbody.innerHTML = html;
    }

    // Fade-in after content update
    tbody.classList.remove("fade-out");
    tbody.classList.add("fade-in");

  }, 600); // match CSS transition time
}


/*************************************************
 * STATUS → CSS CLASS
 *************************************************/
function getStatusClass(statusLabel) {
  switch (statusLabel) {
    case "Token in Progress":
    case "Ready to Deliver":
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
