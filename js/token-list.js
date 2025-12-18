document.addEventListener("DOMContentLoaded", () => {
    fetchLocationName();
});

var locationIdValue = null;

function getLocationId() {
    return locationIdValue;
}
window.getLocationId = getLocationId;

async function fetchLocationName() {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("userId");

    if (!userId) {
        alert("userId missing in URL");
        return;
    }

    const API_URL = `https://zcutilities.zeroco.de/api/get/06368b0c1d5d5c14f6cc9c7e330761ce3e4a974bd87ebe392be31adbd115eaf1?username=${encodeURIComponent(
        userId
    )}`;

    try {
        const response = await fetch(API_URL, { cache: "no-store" });

        const result = await response.json();

        if (!result.Locations || result.Locations.length === 0) {
            document.getElementById("location-name").textContent =
                "Location Not Found";
            return;
        }

        const locations = result.Locations;
        const dropdown = document.getElementById("location-dropdown");

        dropdown.innerHTML = "";

        locationIdValue = locations[0].LocationId;

        locations.forEach((loc, index) => {
            const option = document.createElement("option");
            option.value = loc.LocationId;
            option.textContent = loc.Name;

            if (index === 0) option.selected = true;

            dropdown.appendChild(option);
        });

        dropdown.addEventListener("change", function () {
            const selectedIndex = this.selectedIndex;
            const selectedLocation = locations[selectedIndex];

            locationIdValue = selectedLocation.LocationId;

            console.log("Selected LocationId:", locationIdValue);
        });
    } catch (error) {
        console.error("Location API Error:", error);
        document.getElementById("location-name").textContent =
            "Error loading location";
    }
}


//=======================================================================================

document.addEventListener("DOMContentLoaded", () => {
    fetchLocationsAndBind();
});
function getLocationId() {
    return locationIdValue;
}
window.getLocationId = getLocationId;
function formatDate(date) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}
async function fetchLocationsAndBind() {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("userId");
    const urlLocationId = params.get("locationId"); 

    if (!userId) {
        alert("userId missing in URL");
        return;
    }
    const LOCATIONS_API = `https://zcutilities.zeroco.de/api/get/06368b0c1d5d5c14f6cc9c7e330761ce3e4a974bd87ebe392be31adbd115eaf1?username=${encodeURIComponent(userId)}`;
    try {
        const response = await fetch(LOCATIONS_API, { cache: "no-store" });
        const result = await response.json();

        if (!result.Locations || result.Locations.length === 0) {
            document.getElementById("location-name").textContent = "Location Not Found";
            return;
        }
        const locations = result.Locations;
        const dropdown = document.getElementById("location-dropdown");
        dropdown.innerHTML = "";

        // locationIdValue = locations[0].LocationId;
        // document.getElementById("location-name").textContent = locations[0].Name;

        // locations.forEach((loc, index) => {
        //     const option = document.createElement("option");
        //     option.value = loc.LocationId;
        //     option.textContent = loc.Name;
        //     if (index === 0) option.selected = true;
        //     dropdown.appendChild(option);
        // });

              let selectedLocation = locations[0];
        if (urlLocationId) {
            const match = locations.find(loc => String(loc.LocationId) === String(urlLocationId));
            if (match) {
                selectedLocation = match;
            }
        }

        locationIdValue = selectedLocation.LocationId;
        document.getElementById("location-name").textContent = selectedLocation.Name;

        // Populate dropdown
        locations.forEach((loc) => {
            const option = document.createElement("option");
            option.value = loc.LocationId;
            option.textContent = loc.Name;
            if (loc.LocationId === locationIdValue) option.selected = true; //  select correct one
            dropdown.appendChild(option);
        });

        await fetchAndBindMetrics(locationIdValue, locations[0].Name);

        dropdown.addEventListener("change", async function () {
            const selectedIndex = this.selectedIndex;
            const selectedLocation = locations[selectedIndex];

            locationIdValue = selectedLocation.LocationId;
            document.getElementById("location-name").textContent = selectedLocation.Name;

            // Update metrics
            await fetchAndBindMetrics(locationIdValue, selectedLocation.Name);

            // --- FIX: Work with clean params ---
            const params = new URLSearchParams(window.location.search);

            // Get userId safely (decode once)
            const userId = decodeURIComponent(params.get("userId") || "");

            // Reset params cleanly
            const newParams = new URLSearchParams();
            newParams.set("userId", userId);
            newParams.set("locationId", locationIdValue);
            newParams.set("fromDate", "07-nov-2025");
            newParams.set("toDate", "07-nov-2025");

            // newParams.set("fromDate", formatDate(new Date())); //  dynamic date
            // newParams.set("toDate", formatDate(new Date()));

            const newUrl = `${window.location.pathname}?${newParams.toString()}`;
            window.history.replaceState({}, "", newUrl);
        });

    } catch (error) {
        console.error("Location API Error:", error);
        document.getElementById("location-name").textContent = "Error loading location";
    }
}

async function fetchAndBindMetrics(locationId, locationName) {
    const today = new Date();
    //   const formattedDate = formatDate(today);

    //     const fromDate = formatDate(today);
    // const toDate = formatDate(today);

    // locationId=${encodeURIComponent(locationId)}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}



    const fromDate = "07-nov-2025";
    const toDate = "07-nov-2025";

    const METRICS_API = `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/GetTokenSummary/store-tokens/summary?locationId=${locationId}&fromDate=${fromDate}&toDate=${toDate}`;

    try {
        const response = await fetch(METRICS_API, { cache: "no-store" });
        const data = await response.json();

        document.getElementById("patients").textContent = data.metrics.patients;
        document.getElementById("completed").textContent = data.metrics.completed;
        document.getElementById("inProgress").textContent = data.metrics.inProgress;
        document.getElementById("fromDate").textContent = data.fromDate;
        document.getElementById("toDate").textContent = data.toDate;
        document.getElementById("kioskCount").textContent = data.metrics.kioskCount;
        document.getElementById("directCount").textContent = data.metrics.directCount



    } catch (error) {
        console.error("Metrics API Error:", error);
    }
}



//===================================================================================================


$(document).ready(function () {

      const params = new URLSearchParams(window.location.search);
    let locationId = params.get("locationId") || "10"; // fallback if missing
    let fromDate = params.get("fromDate") || formatDate(new Date());
    let toDate = params.get("toDate") || formatDate(new Date());
    let page = params.get("page") || 0;
    let size = params.get("size") || 20;
    let sort = params.get("sort") || "issueTime";
    let status = params.get("status") || "ALL";

   const API_URL = `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/GetLocationTokens/location-tokens?locationId=${encodeURIComponent(locationId)}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&page=${page}&size=${size}&sort=${sort}&status=${status}`;

   //  const API_URL = "https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/GetLocationTokens/location-tokens?locationId=10&fromDate=07-11-2025&toDate=07-11-2025&page=0&size=20&sort=issueTime&status=ALL";

    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            // Apollo API returns "content" array
            const tokens = data.content || [];

            const table = $('#tokenTable').DataTable({
                data: tokens,

                columns: [
                    {
                        data: 'customerName',
                        render: (data, type, row) => {
                            const initials = row.customerInitials || data.split(" ").map(w => w[0].toUpperCase()).join("");
                            return `<div class="d-flex align-items-center gap-2">
                        <strong class="name-letter">${initials}</strong>
                        <div class="d-flex flex-column">
                          <p class="m-0">${data}</p>
                          <span class="phone-number">${row.customerPhone || ""}</span>
                        </div>
                      </div>`;
                        }
                    },
                    { data: 'location' },
                    { data: 'tokenNumber' },
                    { data: 'issueTime' },
                    {
                        data: 'exitTime',
                        render: data => data || "Pending"
                    },
                    {
                        data: 'timeDurationMinutes',
                        render: data => data ? `${data} min` : "--"
                    },
                    {
                        data: 'counterNumber',
                        render: data => data || "--"
                    },
                    {
                        data: null,
                        orderable: false,
                        searchable: false,
                        render: (data, type, row) => {
                            return `
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-info toggle-history" title="View History" data-token="${row.tokenNumber}">
                    <i class="bi bi-chevron-down"></i>
                  </button>
                  <button class="btn btn-sm btn-primary edit-btn" data-id="${row.tokenId}">Edit</button>
                </div>
              `;
                        }
                    }
                ],
                responsive: true,
                scrollCollapse: true,
                scrollY: 'calc(100vh - 435px)',
                language: {
                    search: "",
                    searchPlaceholder: "Search by Name, Token, Location, Counter..."
                }
            });

            $('#tokenTable tbody').on('click', '.toggle-history', function () {
                const row = table.row($(this).closest('tr'));
                const data = row.data(); // this is the row from main tokens API

                if (row.child.isShown()) {
                    row.child.hide();
                    $(this).find('i').removeClass('bi-chevron-up').addClass('bi-chevron-down');
                } else {
                    // --- Build history API URL dynamically ---
                    // const customerId = data.customerId;   // comes from main API row
                    // const fromDate = "07-nov-2025";       // static for now
                    // const toDate = "07-nov-2025";       // static for now
                    // const page = 0;
                    // const size = 20;

                     const customerId = data.customerId;

                    const historyUrl = `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/GetCustomerHistory/customers/history?customerId=${encodeURIComponent(customerId)}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&page=${page}&size=${size}`;

                      // const historyUrl = `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/GetCustomerHistory/customers/history?customerId=${customerId}&fromDate=${fromDate}&toDate=${toDate}&page=${page}&size=${size}`;

                    // --- Fetch history ---
                    fetch(historyUrl)
                        .then(resp => resp.json())
                        .then(historyData => {
                            const visits = historyData.visits || [];

                            const historyHtml = visits.map(h => `
          <li class="history-block">
            <span style="min-width: 80px;display: inline-block;">${h.tokenNumber}</span>
            <span style="min-width: 200px;display: inline-block;">${h.issueTime}</span>
            <span style="min-width: 200px;display: inline-block;" class="exit-time">${h.exitTime || "Pending"}</span>
            <span style="min-width: 120px;display: inline-block;">${h.status}</span>
            <span style="min-width: 120px;display: inline-block;">Order: ${h.orderId || "--"}</span>
          </li>
        `).join("");

                            row.child(`
          <div style="background-color:#f6f6f6;padding:10px 15px;border-radius:10px;border:1px solid #ccc;">
            <h6 class="mb-0">History:</h6>
            <ul>${historyHtml || "<em>No history available.</em>"}</ul>
          </div>
        `).show();

                            $(this).find('i').removeClass('bi-chevron-down').addClass('bi-chevron-up');
                        })
                        .catch(err => {
                            console.error("History API error:", err);
                            row.child(`<div><em>Error loading history</em></div>`).show();
                        });
                }
            });

        });
});

function formatDate(date) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Custom filter by issue date
$.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
    const selectedDate = $('#filterDate').val();
    if (!selectedDate) return true;

    const issueTime = data[3]; // 4th column: Issue Time
    const issueDate = issueTime.split("T")[0];

    return issueDate === selectedDate;
});

// Trigger filter on date change
$('#filterDate').on('change', function () {
    $('#tokenTable').DataTable().draw();
});


document.addEventListener("DOMContentLoaded", function () {

    const openModalBtn = document.getElementById("openModalBtn");
    const modalElement = document.getElementById("createCounterModal");

    const counterModal = new bootstrap.Modal(modalElement);

    openModalBtn.addEventListener("click", function () {
        counterModal.show();
    });

});
