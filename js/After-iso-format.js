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

/** Format ISO date (YYYY-MM-DD or full ISO) into "Nov 7, 2025" */
function formatDateDisplay(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (isNaN(date)) return "--";
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

/** Format ISO datetime into "Nov 7, 2025, 8:27 AM" */
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
   FETCH LOCATIONS + DROPDOWN
============================================================ */
async function fetchLocationsAndBind(userIdParam) {
    const userId = userIdParam || getUserId();
    if (!userId) return;

    const params = new URLSearchParams(window.location.search);
    const urlLocationId = params.get("locationId");

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
            const { fromDate, toDate } = getDateParams();
            updateUrl({ locationId: locationIdValue, fromDate, toDate });
            await fetchAndBindMetrics(locationIdValue);
            loadTokens();
        });

    } catch (err) {
        console.error("Location API Error:", err);
        locationIdValue = null;
        updateUrl({ locationId: null });
    }
}

/* ============================================================
   METRICS
============================================================ */
async function fetchAndBindMetrics(locationId) {
    const userId = getUserId();
    if (!userId) return;

    const { fromDate, toDate } = getDateParams();

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
        document.getElementById("fromDate").textContent = formatDateDisplay(data.fromDate);
        document.getElementById("toDate").textContent = formatDateDisplay(data.toDate);

    } catch (err) {
        console.error("Metrics API Error:", err);
    }
}

/* ============================================================
   TOKENS TABLE
============================================================ */
function loadTokens() {
    const userId = getUserId();
    if (!userId) return;

    const params = new URLSearchParams(window.location.search);
    const locationId = params.get("locationId") || locationIdValue;
    const { fromDate, toDate } = getDateParams();

    const page = getIntParam(params, "page", 0, 0, 9999);
    const size = getIntParam(params, "size", 20, 1, 100);

    const validSortFields = ["issueTime", "exitTime", "tokenNumber"];
    const sort = getWhitelistedParam(params, "sort", validSortFields, "issueTime");

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

            if ($.fn.DataTable.isDataTable("#tokenTable")) {
                const dt = $("#tokenTable").DataTable();
                dt.clear();
                dt.destroy();
                $("#tokenTable tbody").empty();
            }

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
                    { data: "counterNumber", defaultContent: "--" },
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

            bindHistoryToggle(table, page, size);

                       /* ============================
               UPDATE URL DATES
            ============================ */
            if (data.fromDate && data.toDate) {
                updateUrl({
                    fromDate: data.fromDate,
                    toDate: data.toDate
                });
            }
        })
        .catch(err => {
            console.error("Tokens API Error:", err);
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

            const { fromDate, toDate } = getDateParams();
            const API =
                `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/GetCustomerHistory/customers/history?customerId=${data.customerId}&fromDate=${fromDate}&toDate=${toDate}&page=${page}&size=${size}`;

            fetch(API)
                .then(r => r.json())
                .then(h => {
                    const html = (h.visits || []).map(v => `
                        <li class="history-block">
                            <span style="min-width: 80px;display: inline-block;">${v.tokenNumber}</span>
                            <span style="min-width: 200px;display: inline-block;" class="green-text">${formatDateTime(v.issueTime)}</span>
                            <span style="min-width:200px; display:inline-block;" class="exit-time">
                                ${v.issueTime && v.exitTime
                                    ? `${Math.floor((new Date(v.exitTime) - new Date(v.issueTime)) / 60000)} min`
                                    : "--"}
                            </span>
                            <span style="min-width: 120px;display: inline-block;">${v.status}</span>
                            <span style="min-width: 120px;display: inline-block;">Order: ${v.orderId || "--"}</span>
                        </li>`).join("");

                    row.child(`
                        <div style="background-color:#f6f6f6;padding:10px 15px;border-radius:10px;border:1px solid #ccc;margin-left:45px">
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
            url.searchParams.delete(k);
        } else {
            url.searchParams.set(k, v);
        }
    });
    window.history.replaceState({}, "", url);
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

/* ============================================================
   DATE PARAMS (ISO)
============================================================ */
function getDateParams() {
    const params = new URLSearchParams(window.location.search);
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

    let fromDate = params.get("fromDate");
    let toDate   = params.get("toDate");

    if (!fromDate || !isoRegex.test(fromDate)) {
        fromDate = new Date().toISOString().split("T")[0]; // today
    }
    if (!toDate || !isoRegex.test(toDate)) {
        toDate = new Date().toISOString().split("T")[0]; // today
    }

    return { fromDate, toDate };
}
