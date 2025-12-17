$(document).ready(function () {
  // fetch("https://zcutilities.zeroco.de/api/get/8b1bcdf367db70389f62a7911af94ca6c41e88c4fbc608c5a65f789566be7a68")

  fetch("https://zcutilities.zeroco.de/api/get/03902e9a26d5951a277064a74aac67c09e7001c5cd7bdf3d90d3855de048c322")
    .then(response => response.json())
    .then(data => {
      const customers = data.customers || [];

      const table = $('#tokenTable').DataTable({
        data: customers,

        columns: [
          {
            data: 'name',
            render: (data, type, row) => {
              const initials = data.split(" ").map(w => w[0].toUpperCase()).join("");
              return `<div class="d-flex align-items-center gap-2">
                        <strong class="name-letter">${initials}</strong>
                        <div class="d-flex flex-column">
                          <p class="m-0">${data}</p>
                          <span class="phone-number">${row.phone}</span>
                        </div>
                      </div>`;
            }
          },
          { data: 'location' },
          { data: 'token' },
          { data: 'issueTime' },
          {
            data: 'exitTime',
            render: data => data || "Pending"
          },
          {
            data: 'duration',
            render: data => data || "--"
          },
          {
            data: 'counter',
            render: data => data || "--"
          },
          {
            data: null,
            orderable: false,
            searchable: false,
            render: (data, type, row) => {
              return `
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-info toggle-history" title="View History" data-token="${row.token}">
                    <i class="bi bi-chevron-down"></i>
                  </button>
                  <button class="btn btn-sm btn-primary edit-btn" data-id="${row.token}">Edit</button>
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

      // Expand/collapse only on icon click
      $('#tokenTable tbody').on('click', '.toggle-history', function () {
        const row = table.row($(this).closest('tr'));
        const data = row.data();

        if (row.child.isShown()) {
          row.child.hide();
          $(this).find('i').removeClass('bi-chevron-up').addClass('bi-chevron-down');
        } else {
          const historyHtml = (data.history || []).map(h => `
            <li class="history-block">
              <span style="min-width: 80px;display: inline-block;">${h.token}</span>
              <span style="min-width: 200px;display: inline-block;">${h.issueTime}</span>
              <span style="min-width: 200px;display: inline-block;" class="exit-time">${h.exitTime}</span>
              <span style="min-width: 120px;display: inline-block;">${h.duration}</span>
              <span style="min-width: 120px;display: inline-block;">Counter: ${h.counter}</span>
            </li>
          
          `).join("");

          row.child(`<div style="
    background-color: #f6f6f6;
    padding: 10px 15px;
        border-radius: 10px;
        border:1px solid #ccc;

"><h6 class="mb-0">History:</h6><ul>${historyHtml || "<em>No history available.</em>"}</ul></div>`).show();
          $(this).find('i').removeClass('bi-chevron-down').addClass('bi-chevron-up');
        }
      });

      // Edit button logic
      // $('#tokenTable tbody').on('click', '.edit-btn', function () {
      //   const tokenId = $(this).data('id');
      //   const rowData = table.row($(this).closest('tr')).data();
      //   console.log("Edit clicked for token:", tokenId, rowData);
      //   // modal logic here
      // });
    });
});


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
