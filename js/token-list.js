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
// function showLoader() {
//     $("#loader").show();
// }

// function hideLoader() {
//     $("#loader").hide();
// }
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
    // `https://zcutilities.zeroco.de/api/get/06368b0c1d5d5c14f6cc9c7e330761ce3e4a974bd87ebe392be31adbd115eaf1?username=${encodeURIComponent(userId)}`;

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
            const { fromDate, toDate } = getDateParams();
            updateUrl({ locationId: locationIdValue, fromDate, toDate });


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

    const { fromDate, toDate } = getDateParams();



    // if (fromDate !== toDate) { alert("Metrics are only available for single-day filters."); clearMetricsUI(); return; }

    if (new Date(fromDate) > new Date(toDate)) { alert("From date cannot be later than To date."); return; }
    const API =
        `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/GetTokenSummary/store-tokens/summary?locationId=${locationId}&fromDate=${fromDate}&toDate=${toDate}`;

    try {
        const res = await fetch(API, { cache: "no-store" });
        const data = await res.json();

        if (!data.metrics) { alert(`No metrics found between ${fromDate} and ${toDate}`); return; }

        document.getElementById("patients").textContent = data.metrics.patients ?? "--";
        document.getElementById("completed").textContent = data.metrics.completed ?? "--";
        document.getElementById("inProgress").textContent = data.metrics.inProgress ?? "--";
        document.getElementById("kioskCount").textContent = data.metrics.kioskCount ?? "--";
        document.getElementById("directCount").textContent = data.metrics.directCount ?? "--";
        document.getElementById("fromDate").textContent = formatDateDisplay(data.fromDate);
        document.getElementById("toDate").textContent = formatDateDisplay(data.toDate);



    } catch (err) {
        console.error("Metrics API Error:", err);
        clearMetricsUI();
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
    const { fromDate, toDate } = getDateParams();

    // if (fromDate !== toDate) {
    //     alert("Token list is only available for single-day filters.");
    //     $("#tokenTable tbody").html(` <tr style="position: relative; z-index: 9999"> <td colspan="8" style="text-align:center;"> <p>Please select a single-day filter to view token data.</p> </td> </tr> `); return;
    // }
    // Validate page + size
    const page = getIntParam(params, "page", 0, 0, 9999);
    const size = getIntParam(params, "size", 10000, 1, 100);

    // Whitelist sort
    const validSortFields = ["issueTime", "exitTime", "tokenNumber"];
    const sort = getWhitelistedParam(params, "sort", validSortFields, "issueTime");

    //  Whitelist status
    const validStatuses = ["ALL", "COMPLETED", "IN PROGRESS", "PENDING"];
    const status = getWhitelistedParam(params, "status", validStatuses, "ALL");

    const API =
        `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/GetLocationTokens/location-tokens` +
        `?locationId=${locationId}&fromDate=${fromDate}&toDate=${toDate}` +
        `&page=${page}&size=${size}&sort=${sort}&status=${status}`;

    fetch(API)
        .then(resp => resp.json())
        .then(data => {

            const tokens = data?.content || [];
            if (!tokens.length) { alert(`No records found between ${fromDate} and ${toDate}`); }
            if (!tokens.length) { $("#tokenTable tbody").html(` <tr><td colspan="8" style="text-align:center;">No tokens found for ${fromDate}</td></tr> `); return; }

            /* ============================
               SAFE DESTROY
            ============================ */
            if ($.fn.DataTable.isDataTable("#tokenTable")) {
                const dt = $("#tokenTable").DataTable();
                dt.clear();
                dt.destroy();
                $("#tokenTable tbody").empty(); //  REQUIRED
            }

            // Clear any previously pushed filters
            $.fn.dataTable.ext.search = [];
            /* ============================
               INIT DATATABLE
            ============================ */
            const table = $("#tokenTable").DataTable({
                data: tokens,
                destroy: true,
                responsive: true,
                scrollY: "calc(100vh - 340px)",
                order: [[3, "asc"]],
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
                                    <span class="phone-number">+91 ${r.customerPhone || ""}</span>
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

                    // {
                    //     data: "exitTime",
                    //     className: "green-text",
                    //     render: d => d ? formatDateTime(d) : "In Progress"
                    // },

                    {
                        data: "exitTime",
                        render: d => {
                            if (d) {
                                // If exitTime exists, show formatted date in green
                                return `<span class="green-text">${formatDateTime(d)}</span>`;
                            } else {
                                // If it doesn't exist, show "In Progress" in orange
                                return `<span class="orange-text">In Progress</span>`;
                            }
                        }
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
                updateUrl({ fromDate: data.fromDate, toDate: data.toDate });
            }

        })
        .catch(err => {
            console.error("Tokens API Error:", err);
            $("#tokenTable tbody").html(`<tr><td colspan="8" style="text-align:center;">Error loading tokens</td></tr>`);
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
            console.group(" History Toggle Click");
            console.log("Row data object:", data);
            console.log("customerId:", data?.customerId);
            console.log("Row index:", row.index());
            console.groupEnd();

            const icon = $(this).find("i");

            if (row.child.isShown()) {
                row.child.hide();
                icon.toggleClass("bi-chevron-up bi-chevron-down");
                return;
            }

            const { fromDate, toDate } = getDateParams();
            // if (fromDate !== toDate) {
            //     alert("History is only available for single-day filters.");
            //     return;
            // }

            if (!data || !data.customerId) {
                console.error("❌ customerId missing in row data", data);
                alert("Customer ID not available for this record.");
                return;
            }



            // Validate range 
            if (new Date(fromDate) > new Date(toDate)) { alert("From date cannot be later than To date."); return; }

            const API =
                `https://phrmapvtuat.apollopharmacy.info:8443/HBP/SalesTransactionService.svc/GetCustomerHistory/customers/history?customerId=${data.customerId}&fromDate=${fromDate}&toDate=${toDate}&page=${page}&size=${size}`;

            console.log(" API URL:", API);


            fetch(API)
                .then(r => r.json())
                .then(h => {
                    const html = (h.visits || []).map(h => `
    <tr class="token-list-accordian-table">
      <td>${h.tokenNumber}</td>
      <td>${formatDateTime(h.issueTime)}</td>
      <td class="green-text">${formatDateTime(h.exitTime) ?? '---'}</td>
      <td>
        ${h.issueTime && h.exitTime
                            ? `${Math.floor((new Date(h.exitTime) - new Date(h.issueTime)) / 60000)} min`
                            : "--"
                        }
      </td>
      <td>${((h.status || "---").replace(/_/g, " ")).toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</td>
      <td>${h.counterNumber || "---"}</td>
    </tr>
  `).join("");

                    row.child(`
    <div style="background-color:#f6f6f6;padding:10px 15px;border-radius:10px;border:1px solid #ccc;margin-left:45px">
      <h6 class="mb-2">History:</h6>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr >
            <th style="padding:0px 0px 6px;">Token</th>
            <th style="padding:0px 0px 6px;">Issue Time</th>
            <th style="padding:0px 0px 6px;">Exit Time</th>
            <th style="padding:0px 0px 6px;">Duration</th>
            <th style="padding:0px 0px 6px;">Status</th>
            <th style="padding:0px 0px 6px;">Counter</th>
          </tr>
        </thead>
        <tbody>
          ${html || `<tr><td colspan="6"><em class="no-history-available">No history available.</em></td></tr>`}
        </tbody>
      </table>
    </div>
  `).show();

                    icon.toggleClass("bi-chevron-down bi-chevron-up");
                })

                .catch(err => { console.error("History API Error:", err); alert("Error loading history. Please try again."); });
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
// $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
//     const selectedDate = $('#filterDate').val(); // "YYYY-MM-DD" from <input type="date">
//     if (!selectedDate) return true;

//     // Get the full row object instead of the formatted string
//     const rowData = $('#tokenTable').DataTable().row(dataIndex).data();
//     const issueTimeRaw = rowData.issueTime; // e.g. "2025-11-07T08:27:04+05:30"

//     if (!issueTimeRaw) return false;

//     // Normalize to YYYY-MM-DD
//     const issueDate = issueTimeRaw.split("T")[0]; // "2025-11-07"

//     return issueDate === selectedDate;
// });

// Trigger filter on date change
// Trigger filter on date change (single binding)
// $('#filterDate').on('change', function () {
//     const table = $('#tokenTable').DataTable();
//     if (table) {
//         table.draw();
//     }
// });








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
    if (!value) return "---";

    const date = new Date(value);
    if (isNaN(date)) return "---";

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



function getDateParams() {
    const params = new URLSearchParams(window.location.search);
    let fromDate = params.get("fromDate");
    let toDate = params.get("toDate");

    if (!isValidISODate(fromDate)) {
        alert("Invalid fromDate in URL. Defaulting to today.");
        fromDate = new Date().toISOString().split("T")[0];
    }
    if (!isValidISODate(toDate)) {
        alert("Invalid toDate in URL. Defaulting to today.");
        toDate = new Date().toISOString().split("T")[0];
    }

    if (new Date(fromDate) > new Date(toDate)) {
        alert("From date cannot be later than To date.");
        return { fromDate: null, toDate: null }; // block instead of swap
    }

    return { fromDate, toDate };
}



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


function isValidISODate(dateStr) {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}


function clearMetricsUI() {
    document.getElementById("patients").textContent = "--";
    document.getElementById("completed").textContent = "--";
    document.getElementById("inProgress").textContent = "--";
    document.getElementById("kioskCount").textContent = "--";
    document.getElementById("directCount").textContent = "--";
    document.getElementById("fromDate").textContent = "--";
    document.getElementById("toDate").textContent = "--";
}



document.getElementById("applyFilter").addEventListener("click", () => {
    const fromDate = document.getElementById("fromDateInput").value;
    const toDate = document.getElementById("toDateInput").value;

    if (!fromDate || !toDate) {
        alert("Please select both From and To dates");
        return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
        alert("From date cannot be greater than To date");
        return;
    }

    updateUrl({ fromDate, toDate });

    const locationId = getLocationId();
    fetchAndBindMetrics(locationId);
    loadTokens();
});




// document.addEventListener("DOMContentLoaded", () => {
//   const params = new URLSearchParams(window.location.search);
//   const fromDate = params.get("fromDate");

//   if (fromDate) {
//     document.getElementById("filterDate").value = fromDate;

//     const locationId = getLocationId();
//     fetchAndBindMetrics(locationId);
//     loadTokens();
//   }
// });


document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);

    const fromDate = params.get("fromDate");
    const toDate = params.get("toDate");

    const fromInput = document.getElementById("fromDateInput");
    const toInput = document.getElementById("toDateInput");

    if (fromDate && fromInput) {
        fromInput.value = fromDate; // MUST be YYYY-MM-DD
    }

    if (toDate && toInput) {
        toInput.value = toDate;
    }


    const locationId = getLocationId();
    fetchAndBindMetrics(locationId);
    loadTokens();
});



// function setTokenSectionInvalid(isInvalid) {
//   const wrapper = document.getElementById("tokenSectionWrapper");
//   if (!wrapper) return;
//   wrapper.classList.toggle("invalid-ui", isInvalid);
// }


document.addEventListener("DOMContentLoaded", () => {
    const today = new Date().toISOString().split("T")[0];

    const fromInput = document.getElementById("fromDateInput");
    const toInput = document.getElementById("toDateInput");

    if (fromInput) fromInput.max = today;
    if (toInput) toInput.max = today;
});


 const inputDateField = document.getElementById("fromDateInput");
  const inputDateField1 = document.getElementById("toDateInput");


  inputDateField.addEventListener("click", function () {
    this.showPicker();
  });

  inputDateField.addEventListener("focus", function () {
    this.showPicker();
  });

    inputDateField1.addEventListener("click", function () {
    this.showPicker();
  });

  inputDateField1.addEventListener("focus", function () {
    this.showPicker();
  });