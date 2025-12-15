$(document).ready(function () {
  fetch("https://zcutilities.zeroco.de/api/get/8b1bcdf367db70389f62a7911af94ca6c41e88c4fbc608c5a65f789566be7a68")
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
                        <strong>${initials}</strong>
                        <div>
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
        responsive: true
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
              <span style="width: 80px;">${h.token}</span>
              <span style="width: 200px;">${h.issueTime}</span>
              <span style="width: 200px;" class="exit-time">${h.exitTime}</span>
              <span style="width: 100px;">${h.duration}</span>
              <span style="width: 100px;">Counter: ${h.counter}</span>
            </li>
            <hr>
          `).join("");

          row.child(`<div><h6>History:</h6><ul>${historyHtml || "<em>No history available.</em>"}</ul></div>`).show();
          $(this).find('i').removeClass('bi-chevron-down').addClass('bi-chevron-up');
        }
      });

      // Edit button logic
      $('#tokenTable tbody').on('click', '.edit-btn', function () {
        const tokenId = $(this).data('id');
        const rowData = table.row($(this).closest('tr')).data();
        console.log("Edit clicked for token:", tokenId, rowData);
        // modal logic here
      });
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
