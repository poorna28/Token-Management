/*************************************************
 * CONFIG
 *************************************************/
// const params = new URLSearchParams(window.location.search);

// const locationId = getIntParam(params, "locationId", 10, 1, 100000);
// const limit = getIntParam(params, "limit", 50, 1, 500); // total records from API

const params = new URLSearchParams(window.location.search);

let locationId, limit;

try {
  locationId = getRequiredIntParam(params, "locationId", 1, 100000);
  limit = getRequiredIntParam(params, "limit", 1, 500);
} catch (e) {
  console.error(e.message);
  // STOP everything
  throw e;
}


 // const API_URL = `https://zcutilities.zeroco.de/api/get/112e46603b29bdfba06cf59e4f00a92e82483d25d66fc707974537e78fc5d6b7?locationId=${locationId}&limit=${limit}`;

  const API_URL = `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/TokenDisplay/board?locationId=${locationId}&limit=${limit}`;



console.log("API URL ", API_URL);

/*************************************************
 * STATE
 *************************************************/
let allTokens = [];
let currentIndex = 0;
let rotateTimer = null;

const DISPLAY_COUNT = 5;      // show 10 records at a time
const ROTATE_INTERVAL = 20000; // 5 seconds

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

/* SORT TOKENS BY PRIORITY */
allTokens.sort((a, b) => {
  const p1 = STATUS_PRIORITY[a.statusLabel] ?? 99;
  const p2 = STATUS_PRIORITY[b.statusLabel] ?? 99;
  return p1 - p2;
});


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
    `Showing records ${currentIndex + 1} to ${currentIndex + batch.length
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
  const DISPLAY_COUNT = 5;
  const COLS = 4;

  //  No Tokens case (keep your behavior)
  if (!Array.isArray(tokens) || tokens.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="4" style="text-align:center;">
          No Tokens Available
        </td>
      </tr>
    `;
    return;
  }

  const oldRows = Array.from(tbody.children);

  /* STEP 1: hide old rows */
  oldRows.forEach((tr, index) => {
    tr.classList.add("row-hide");
    tr.style.animationDelay = `${index * 0.08}s`;
  });

  const hideDuration = oldRows.length * 80 + 400;

  /* STEP 2: replace rows */
  setTimeout(() => {
    tbody.innerHTML = "";

    /* STEP 3: render actual token rows */
    tokens.forEach((token, index) => {
      const statusClass = getStatusClass(token.statusLabel);
      const tr = document.createElement("tr");

      tr.classList.add("row-animate");
      if (statusClass) tr.classList.add(statusClass);

      tr.style.animationDelay = `${index * 0.12}s`;

      tr.innerHTML = `
        <td>${token.tokenNumber ?? "-"}</td>
        <td>${token.customerName?.replace(/\n|\r/g, " ") ?? "-"}</td>
        <td>${token.statusLabel ?? "-"}</td>
        <td>${token.counterNumber?.toString().trim() || "-"}</td>
      `;

      tbody.appendChild(tr);
    });

    /* STEP 4: pad EMPTY rows to make total = 5 */
    const remaining = DISPLAY_COUNT - tokens.length;

    for (let i = 0; i < remaining; i++) {
      const tr = document.createElement("tr");
      tr.className = "empty-row";

      for (let j = 0; j < COLS; j++) {
        tr.appendChild(document.createElement("td"));
      }

      tbody.appendChild(tr);
    }

  }, hideDuration);
}




const STATUS_PRIORITY = {
  "Ready to Deliver": 1,
  "Token in Progress": 1,
  "Packing In Progress": 2,
  "Packing in Progress": 2,
  "Picking In Progress": 3,
  "Billing in Progress": 4
};


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

    case "Picking In Progress":
      return "status-picking";

    case "Packing In Progress":
      return "status-packing";

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
// function getIntParam(params, key, defaultVal, min, max) {
//   const value = parseInt(params.get(key), 10);
//   if (isNaN(value)) return defaultVal;
//   if (value < min) return min;
//   if (value > max) return max;
//   return value;
// }

function getRequiredIntParam(params, key, min, max) {
  const raw = params.get(key);
  const value = parseInt(raw, 10);

  if (raw === null || raw === "") {
    alert(`Missing required URL parameter: ${key}`);
    throw new Error(`Missing param: ${key}`);
  }

  if (isNaN(value)) {
    alert(`Invalid ${key}. Must be a number`);
    throw new Error(`Invalid param: ${key}`);
  }

  if (value < min || value > max) {
    alert(`${key} must be between ${min} and ${max}`);
    throw new Error(`Out of range param: ${key}`);
  }

  return value;
}


/*************************************************
 * INITIAL LOAD
 *************************************************/
fetchTokenBoard();
