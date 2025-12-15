const API_URL =
  "https://zcutilities.zeroco.de/api/get/4e521b8fe37e5c7a77d1ffad992884b2d8dc70ddf4c6000aa1bd93433daf80df";

const statusEl = document.getElementById("status");
const tbody = document.getElementById("tableBody");

function getPriorityClass(priority) {
  if (priority === 1) return "p1";
  if (priority === 2) return "p2";
  if (priority === 4) return "p4";
  return "";
}

async function loadData() {
  try {
    statusEl.innerText = "Loading...";

    const res = await fetch(API_URL, { cache: "no-store" });
    const data = await res.json();

    let prescriptions = [];

    // Case 1: Direct API response
    if (data.prescriptions) {
      prescriptions = data.prescriptions;
    }
    // Case 2: Wrapped response
    else if (data.objects && data.objects.length && data.objects[0].content) {
      prescriptions = JSON.parse(data.objects[0].content).prescriptions || [];
    }
    else {
      throw "No prescription data";
    }

    tbody.innerHTML = "";

    if (!prescriptions.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4">No records available</td>
        </tr>
      `;
      statusEl.innerText = "No data";
      return;
    }

    prescriptions.forEach(item => {
      tbody.innerHTML += `
        <tr>
          <td>${item.tokenNo || ""}</td>
          <td>${item.patientName || ""}</td>
          <td class="${getPriorityClass(item.priority)}">
            ${item.status || ""}
          </td>
          <td>
            ${item.counter ? `<span class="counter">${item.counter}</span>` : "-"}
          </td>
        </tr>
      `;
    });

    statusEl.innerText =
      "Last updated: " + new Date().toLocaleTimeString();

  } catch (err) {
    console.error(err);
    statusEl.innerText = "Data unavailable";
    tbody.innerHTML = `
      <tr>
        <td colspan="4">Unable to load data</td>
      </tr>
    `;
  }
}

// Initial load
loadData();

// Auto refresh every 30 seconds
setInterval(loadData, 30000);
