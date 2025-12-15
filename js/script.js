if (!localStorage.getItem("empidList")) {
  const validUsers = JSON.stringify(["admin", "test@gmail.com"]);
  localStorage.setItem("empidList", validUsers);
  localStorage.setItem("password", "Test@1234");
}

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("loginForm");
  const employeeIdInput = document.getElementById("employeeId");
  const passwordInput = document.getElementById("password");
  const errorMsg = document.getElementById("errorMsg");

  employeeIdInput.addEventListener("input", () => clearError(employeeIdInput));
  passwordInput.addEventListener("input", () => clearError(passwordInput));

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const enteredId = employeeIdInput.value.trim();
    const enteredPass = passwordInput.value.trim();
    const validIds = JSON.parse(localStorage.getItem("empidList"));
    const storedPass = localStorage.getItem("password");

    clearAllErrors();

    let hasError = false;

    if (enteredId === "") {
      showError(employeeIdInput, "Employee ID/email is required.");
      hasError = true;
    } else if (enteredId.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enteredId)) {
      showError(employeeIdInput, "Please enter a valid email address.");
      hasError = true;
    }

    if (enteredPass === "") {
      showError(passwordInput, "Password is required.");
      hasError = true;
    } 
      else if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(enteredPass)
    ) {
      showError(passwordInput, "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
      hasError = true;
    }

    if (!hasError) {
      if (validIds.includes(enteredId) && enteredPass === storedPass) {
        alert("Login successful!");
         window.location.href = "table.html";
        form.reset(); 
      } else {
        errorMsg.textContent = "Invalid credentials. Please try again.";
      }
    }
  });

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
    document.querySelectorAll(".error").forEach(el => el.textContent = "");
    errorMsg.textContent = "";
  }
});