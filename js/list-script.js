const accordion = document.getElementById("customerAccordion");

fetch("https://zcutilities.zeroco.de/api/get/5762d2cf11a92c04abc386acd98cae6a5b69a03ead446117984ef683664bae20")
  .then(response => response.json())
  .then(data => {
    const customers = data.customers || [];

    customers.forEach((customer, index) => {

      const collapseId = `collapse${index}`;
      const headingId = `heading${index}`;

      // Safe class name (replace spaces with hyphens)
      const statusClass = `status-${customer.status.replace(/\s+/g, "-")}`;

      const historyHtml = (customer.history || []).map(h => `
        <li class="history-block">
        <span style="width: 80px;">   ${h.token} </span>
        <span style="width: 200px;">  ${h.issueTime} </span>
        <span style="width: 200px;" class = "exit-time">  ${h.exitTime} </span>
        <span style="width: 100px;">  ${h.duration} </span>
        <span style="width: 100px;"> Counter: ${h.counter} </span>
        </li>
        <hr>
      `).join("");

      const item = document.createElement("div");
      item.className = "accordion-item";

      item.innerHTML = `
        <h2 class="accordion-header" id="${headingId}">
          <button class="accordion-button collapsed" type="button"
            data-bs-toggle="collapse" data-bs-target="#${collapseId}"
            aria-expanded="false" aria-controls="${collapseId}">

           <div class=" d-flex align-items-center gap-3" style="width: 20%;">
             <p class="m-0 name-cell">${customer.name.split(" ").map(w => w[0].toUpperCase()).join("")}</p>
              <div> <p class="m-0">${customer.name}</p>  <span class="phone-number">${customer.phone}</span> </div>
           </div>
            <div style="width: 10%;">${customer.location}</div>
            <div style="width: 5%;">${customer.token}</div>
            <div style="width: 16%;">${customer.issueTime}</div>
            <div class="exit-time" style="width: 16%;">${customer.exitTime || "Pending"}</div>
            <div style="width: 10%;">${customer.duration || "--"}</div>
            <div style="width: 10%;">${customer.counter || "--"}</div>
            <div style="width: 13%;"><span class="status-badge ${statusClass}">${customer.status}</span></div>
          </button>
        </h2>

        <div id="${collapseId}" class="accordion-collapse collapse"
          aria-labelledby="${headingId}" data-bs-parent="#customerAccordion">
          <div class="accordion-body">
            ${historyHtml ? `<h6>History:</h6><ul>${historyHtml}</ul>` : "<em>No history available.</em>"}
          </div>
        </div>
      `;

      accordion.appendChild(item);
    });
  })
  .catch(error => {
    accordion.innerHTML = `<div class="alert alert-danger">Failed to load data: ${error}</div>`;
  });
