

let employeeIdValue = "";

function getEmployeeId() {
  return employeeIdValue;
}
window.getEmployeeId = getEmployeeId;
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const employeeIdInput = document.getElementById("employeeId");
  const passwordInput = document.getElementById("password");
  const errorMsg = document.getElementById("errorMsg");

  
  employeeIdInput.addEventListener("input", () => {
    employeeIdValue = employeeIdInput.value.trim();  
    clearError(employeeIdInput);
    console.log("Employee ID variable:", employeeIdValue);
  });

  passwordInput.addEventListener("input", () => clearError(passwordInput));

  form.addEventListener("submit", handleLogin);

  async function handleLogin(event) {
    event.preventDefault();

    const username = employeeIdInput.value.trim();
    const password = passwordInput.value.trim();

    clearAllErrors();
    let hasError = false;

    // Inline validations
    if (username === "") {
      showError(employeeIdInput, "Employee ID/email is required.");
      hasError = true;
    } else if (username.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
      showError(employeeIdInput, "Please enter a valid email address.");
      hasError = true;
    }

    if (password === "") {
      showError(passwordInput, "Password is required.");
      hasError = true;
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password)) {
      showError(passwordInput, "Password must be atleast 1 capital, number, symbol pattern.");
      hasError = true;
    }

    if (hasError) return;

    const API_URL =
      "https://zcutilities.zeroco.de/api/get/9f90282514ff2a7d84e0260fec9cc606197a24d7f6352e37b1660012eb431f14/login";

    const payload = { username, password };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const result = await response.json();

      if ( result.userName) {
        window.location.href = "token-list.html";
      } else {
        errorMsg.textContent = "Invalid login response.";
      }
    } catch (error) {
      errorMsg.textContent = "Login failed. Please check credentials.";
    }
  }


  function showError(element, message) {
    let error = element.nextElementSibling;
    if (!error || !error.classList.contains("error")) {
      error = document.createElement("div");
      error.className = "error";
      element.insertAdjacentElement("afterend", error);
    }
    error.textContent = message;
  }

  function clearError(input) {
    const error = input.nextElementSibling;
    if (error && error.classList.contains("error")) {
      error.textContent = "";
    }
    errorMsg.textContent = "";
  }

  function clearAllErrors() {
    document.querySelectorAll(".error").forEach(el => (el.textContent = ""));
    errorMsg.textContent = "";
  }
});
