/* ============================================================
   GLOBAL STATE
============================================================ */
let locationIdValue = null;

/* ============================================================
   DOM READY
============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
    await initPage();
});
function showLoader() {
    $("#loader").show();
}

function hideLoader() {
    $("#loader").hide();
}
/* ============================================================
   INITIALIZER
============================================================ */
async function initPage() {
    const userId = getUserId();
    if (!userId) return; // stop if invalid

    await fetchLocationsAndBind(userId);
    loadTokens();
}


/* ============================================================
   HELPERS
============================================================ */
function getLocationId() {
    return locationIdValue;
}
window.getLocationId = getLocationId;

function formatDateDDMMMYYYY(date) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${String(date.getDate()).padStart(2, "0")}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

function toDDMMYYYY(date) {
    if (date instanceof Date) {
        return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [y, m, d] = date.split("-");
        return `${d}-${m}-${y}`;
    }
    return date || "";
}

/* ============================================================
   FETCH LOCATIONS + DROPDOWN
============================================================ */
async function fetchLocationsAndBind(userIdParam) {

      const userId = userIdParam || getUserId();
    if (!userId) return;

    // showLoader();   //  START LOADER

    const params = new URLSearchParams(window.location.search);
    const urlLocationId = params.get("locationId");

    // const API =
    //     `https://zcutilities.zeroco.de/api/get/06368b0c1d5d5c14f6cc9c7e330761ce3e4a974bd87ebe392be31adbd115eaf1?username=${encodeURIComponent(userId)}`;
    const API =
        `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/getLocationMaster?username=${encodeURIComponent(userId)}`;

    try {
        const res = await fetch(API, { cache: "no-store" });
        const data = await res.json();
        if (!data.Locations?.length) {
            alert("No Locations available for this userId");
             locationIdValue = null;
              updateUrl({ locationId: null });
            return;
        }



        const locations = data.Locations;
        const dropdown = document.getElementById("location-dropdown");
        dropdown.innerHTML = "";

      // Validate urlLocationId
        let selected = locations.find(l => String(l.LocationId) === urlLocationId);

        if (!selected) {
            alert("Invalid or missing locationId in URL. Defaulting to first location.");
            selected = locations[0];
        }

        locationIdValue = selected?.LocationId || null;

        locations.forEach(loc => {
            const opt = document.createElement("option");
            opt.value = loc.LocationId;
            opt.textContent = loc.Name;
            opt.selected = loc.LocationId === locationIdValue;
            dropdown.appendChild(opt);
        });

           // Only update URL if locationIdValue is valid
        if (locationIdValue) {
            updateUrl({ locationId: locationIdValue });
            await fetchAndBindMetrics(locationIdValue);
        }

        dropdown.addEventListener("change", async function () {
            locationIdValue = this.value || null;

                 if (!locationIdValue) {
                alert("Invalid location selected.");
                return;
            }

            updateUrl({
                locationId: locationIdValue,
                fromDate: "07-11-2025",
                toDate: "07-11-2025"
            });

            await fetchAndBindMetrics(locationIdValue);
            loadTokens();
        });

    } catch (err) {
        console.error("Location API Error:", err);
         locationIdValue = null;
        updateUrl({ locationId: null });
    } finally {
        // hideLoader();   //  STOP LOADER
    }
}


/* ============================================================
   METRICS
============================================================ */
async function fetchAndBindMetrics(locationId) {

        const userId = getUserId();
    if (!userId) return;

    // showLoader();   //  START LOADER

    const fromDate = "07-Nov-2025";
    const toDate = "07-Nov-2025";

    const API =
        `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/GetTokenSummary/store-tokens/summary?locationId=${locationId}&fromDate=${fromDate}&toDate=${toDate}`;

    try {
        const res = await fetch(API, { cache: "no-store" });
        const data = await res.json();

        document.getElementById("patients").textContent = data.metrics.patients ?? "--";
        document.getElementById("completed").textContent = data.metrics.completed ?? "--";
        document.getElementById("inProgress").textContent = data.metrics.inProgress ?? "--";
        document.getElementById("kioskCount").textContent = data.metrics.kioskCount ?? "--";
        document.getElementById("directCount").textContent = data.metrics.directCount ?? "--";
        document.getElementById("fromDate").textContent = data.fromDate;
        document.getElementById("toDate").textContent = data.toDate;

    } catch (err) {
        console.error("Metrics API Error:", err);
    } finally {
        // hideLoader();   //  STOP LOADER
    }
}


/* ============================================================
   TOKENS TABLE
============================================================ */
function loadTokens() {

      const userId = getUserId();
    if (!userId) return;

    // showLoader(); //  START LOADER

    const params = new URLSearchParams(window.location.search);

    const locationId = params.get("locationId") || locationIdValue;
    const fromDate = params.get("fromDate") || "07-11-2025";
    const toDate = params.get("toDate") || "07-11-2025";
   // Validate page + size
    const page = getIntParam(params, "page", 0, 0, 9999);
    const size = getIntParam(params, "size", 20, 1, 100);

    // Whitelist sort
    const validSortFields = ["issueTime", "exitTime", "tokenNumber"];
    const sort = getWhitelistedParam(params, "sort", validSortFields, "issueTime");

    //  Whitelist status
    const validStatuses = ["ALL", "COMPLETED", "IN_PROGRESS", "PENDING"];
    const status = getWhitelistedParam(params, "status", validStatuses, "ALL");

    const API =
        `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/GetLocationTokens/location-tokens` +
        `?locationId=${locationId}&fromDate=${fromDate}&toDate=${toDate}` +
        `&page=${page}&size=${size}&sort=${sort}&status=${status}`;

    fetch(API)
        .then(resp => resp.json())
        .then(data => {

            const tokens = data?.content || [];

            /* ============================
               SAFE DESTROY
            ============================ */
            if ($.fn.DataTable.isDataTable("#tokenTable")) {
                const dt = $("#tokenTable").DataTable();
                dt.clear();
                dt.destroy();
                $("#tokenTable tbody").empty(); //  REQUIRED
            }

            /* ============================
               INIT DATATABLE
            ============================ */
            const table = $("#tokenTable").DataTable({
                data: tokens,
                destroy: true,
                responsive: true,
                scrollY: "calc(100vh - 370px)",
                language: {
                    search: "",
                    searchPlaceholder: "Search by Name, Token, Location, Counter..."
                },
                deferRender: true,
                autoWidth: false,
                columns: [
                    {
                        data: "customerName",
                        render: (d, t, r) => `
                            <div class="d-flex align-items-center gap-2">
                                <strong class="name-letter">
                                    ${r.customerInitials || (d ? d[0] : "")}
                                </strong>
                                <div>
                                    <p class="m-0">${d || "--"}</p>
                                    <span class="phone-number">${r.customerPhone || ""}</span>
                                </div>
                            </div>`
                    },
                    { data: "location", defaultContent: "--" },
                    { data: "tokenNumber", defaultContent: "--" },

                    {
                        data: "issueTime",
                        className: "green-text",
                        render: d => d ? formatDateTime(d) : "--"
                    },

                    {
                        data: "exitTime",
                        className: "green-text",
                        render: d => d ? formatDateTime(d) : "Pending"
                    },
                    {
                        data: "timeDurationMinutes",
                        render: d => d ? `${d} min` : "--"
                    },
                    {
                        data: "counterNumber",
                        defaultContent: "--"
                    },
                    {
                        data: null,
                        orderable: false,
                        searchable: false,
                        render: () => `
                            <button class="btn btn-sm btn-info toggle-history">
                                <i class="bi bi-chevron-down"></i>
                            </button>`
                    }
                ]
            });

            /* ============================
               BIND HISTORY TOGGLE
            ============================ */
            bindHistoryToggle(table, page, size);

            /* ============================
               UPDATE URL DATES
            ============================ */
            if (data.fromDate && data.toDate) {
                updateUrl({
                    fromDate: toDDMMYYYY(data.fromDate),
                    toDate: toDDMMYYYY(data.toDate)
                });
            }

        })
        .catch(err => {
            console.error("Tokens API Error:", err);
        })
        .finally(() => {
            // hideLoader(); //  STOP LOADER
        });
}


/* ============================================================
   HISTORY TOGGLE
============================================================ */
function bindHistoryToggle(table, page, size) {

    $("#tokenTable tbody")
        .off("click", ".toggle-history")
        .on("click", ".toggle-history", function () {

            const row = table.row($(this).closest("tr"));
            const data = row.data();
            const icon = $(this).find("i");

            if (row.child.isShown()) {
                row.child.hide();
                icon.toggleClass("bi-chevron-up bi-chevron-down");
                return;
            }

            const fromDate = "07-nov-2025";
            const API =
                `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/GetCustomerHistory/customers/history?customerId=${data.customerId}&fromDate=${fromDate}&toDate=${fromDate}&page=${page}&size=${size}`;

            fetch(API)
                .then(r => r.json())
                .then(h => {
                    const html = (h.visits || []).map(h => `
                        <li class="history-block">
            <span style="min-width: 80px;display: inline-block;">${h.tokenNumber}</span>
            <span style="min-width: 200px;display: inline-block;" class="green-text">${formatDateTime(h.issueTime)}</span>
            <span style="min-width:200px; display:inline-block;" class="exit-time">
    ${h.issueTime && h.exitTime
                            ? `${Math.floor((new Date(h.exitTime) - new Date(h.issueTime)) / 60000)} min`
                            : "--"
                        }
</span>
            <span style="min-width: 120px;display: inline-block;">${h.status}</span>
            <span style="min-width: 120px;display: inline-block;">Order: ${h.orderId || "--"}</span>
          </li>`).join("");

                    row.child(`<div style="background-color:#f6f6f6;padding:10px 15px;border-radius:10px;border:1px solid #ccc;margin-left:45px">
            <h6 class="mb-0">History:</h6>
            <ul>${html || "<em>No history available.</em>"}</ul>
          </div>
        `).show();
                    icon.toggleClass("bi-chevron-down bi-chevron-up");
                });

        });
}

/* ============================================================
   URL UPDATE
============================================================ */
function updateUrl(values) {
    const url = new URL(window.location);
        Object.entries(values).forEach(([k, v]) => {
        if (v === null || v === undefined || v === "") {
            //  Remove param if value is empty/null
            url.searchParams.delete(k);
        } else {
            //  Otherwise set/update param
            url.searchParams.set(k, v);
        }
    });
    window.history.replaceState({}, "", url);
}

//  Set max date once on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    const today = new Date().toISOString().split('T')[0];
    $('#filterDate').attr('max', today);
});

// Custom filter by issue date
// $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {

//     const selectedDate = $('#filterDate').val();
//     if (!selectedDate) return true;

//     const issueTime = data[3]; // 4th column: Issue Time
//     const issueDate = issueTime.split("T")[0];

//     return issueDate === selectedDate;
// });

// Custom filter by issue date using raw data
$.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
    const selectedDate = $('#filterDate').val(); // "YYYY-MM-DD" from <input type="date">
    if (!selectedDate) return true;

    // Get the full row object instead of the formatted string
    const rowData = $('#tokenTable').DataTable().row(dataIndex).data();
    const issueTimeRaw = rowData.issueTime; // e.g. "2025-11-07T08:27:04+05:30"

    if (!issueTimeRaw) return false;

    // Normalize to YYYY-MM-DD
    const issueDate = issueTimeRaw.split("T")[0]; // "2025-11-07"

    return issueDate === selectedDate;
});

// Trigger filter on date change
$('#filterDate').on('change', function () {
    $('#tokenTable').DataTable().draw();
});


// Trigger filter on date change
$('#filterDate').on('change', function () {
    $('#tokenTable').DataTable().draw();
});




/* ============================================================
   LOADER HANDLER (Unified)
============================================================ */
(function () {
    let activeFetchCount = 0;
    const loader = document.getElementById('loader');

    if (!loader) {
        console.error('Loader element not found');
        return;
    }

    function showLoader() {
        loader.style.display = 'flex';
    }

    function hideLoader() {
        loader.style.display = 'none';
    }

    // Expose globally for manual use
    window.showLoader = showLoader;
    window.hideLoader = hideLoader;

    const originalFetch = window.fetch;
    window.fetch = function (...args) {
        activeFetchCount++;
        showLoader();

        return originalFetch.apply(this, args)
            .finally(() => {
                activeFetchCount--;
                if (activeFetchCount <= 0) {
                    activeFetchCount = 0;
                    hideLoader();
                }
            });
    };
})();



function formatDateTime(value) {
    if (!value) return "Pending";

    const date = new Date(value);
    if (isNaN(date)) return "--";

    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });
}


/* ============================================================
   HELPERS
============================================================ */
function getUserId() {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("userId");
    if (!userId) {
        console.error("UserId missing in URL");
        alert("UserId missing in URL");
        return null;
    }
    return userId;
}
window.getUserId = getUserId;



function getIntParam(params, key, defaultValue, min, max) {
    const val = parseInt(params.get(key), 10);
    if (isNaN(val)) return defaultValue;
    return Math.min(Math.max(val, min), max);
}

function getWhitelistedParam(params, key, whitelist, defaultValue) {
    const val = params.get(key);
    return whitelist.includes(val) ? val : defaultValue;
}