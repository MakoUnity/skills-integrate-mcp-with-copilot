document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const authStatusText = document.getElementById("auth-status-text");
  const userMenuToggle = document.getElementById("user-menu-toggle");
  const userMenu = document.getElementById("user-menu");
  const openLoginBtn = document.getElementById("open-login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const cancelLoginBtn = document.getElementById("cancel-login-btn");

  let authToken = localStorage.getItem("teacherToken");
  let currentTeacher = localStorage.getItem("teacherUsername");

  function showMessage(text, level) {
    messageDiv.textContent = text;
    messageDiv.className = level;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAuthUI() {
    const isLoggedIn = Boolean(authToken && currentTeacher);

    if (isLoggedIn) {
      authStatusText.textContent = `Logged in as ${currentTeacher}`;
      openLoginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      signupForm.classList.remove("hidden");
    } else {
      authStatusText.textContent = "Student view";
      openLoginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
      signupForm.classList.add("hidden");
    }
  }

  function getAuthHeaders() {
    if (!authToken) {
      return {};
    }

    return {
      Authorization: `Bearer ${authToken}`,
    };
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
    // Ustaw focus na pierwszym polu
    setTimeout(() => {
      document.getElementById("username").focus();
    }, 50);
  }

  function closeLoginModal() {
    loginModal.classList.add("hidden");
    loginForm.reset();
  }

  function setLoggedOutState() {
    authToken = null;
    currentTeacher = null;
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacherUsername");
    updateAuthUI();
  }

  async function syncAuthStatus() {
    if (!authToken) {
      setLoggedOutState();
      return;
    }

    try {
      const response = await fetch("/auth/me", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        setLoggedOutState();
        return;
      }

      const data = await response.json();
      currentTeacher = data.username;
      localStorage.setItem("teacherUsername", currentTeacher);
      updateAuthUI();
    } catch (error) {
      setLoggedOutState();
      console.error("Error verifying auth status:", error);
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      const isLoggedIn = Boolean(authToken && currentTeacher);

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML =
        '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isLoggedIn
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}" title="Unregister student">Remove</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!authToken) {
      showMessage("Please login as a teacher to unregister students.", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          setLoggedOutState();
        }
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authToken) {
      showMessage("Please login as a teacher to register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          setLoggedOutState();
        }
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  userMenuToggle.addEventListener("click", () => {
    userMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".user-menu-wrapper")) {
      userMenu.classList.add("hidden");
    }
  });

  openLoginBtn.addEventListener("click", () => {
    openLoginModal();
    userMenu.classList.add("hidden");
  });

  cancelLoginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    closeLoginModal();
  });

  loginModal.addEventListener("mousedown", (event) => {
    if (event.target === loginModal) {
      closeLoginModal();
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "Login failed.", "error");
        return;
      }

      authToken = result.token;
      currentTeacher = result.username;
      localStorage.setItem("teacherToken", authToken);
      localStorage.setItem("teacherUsername", currentTeacher);
      updateAuthUI();
      closeLoginModal();
      fetchActivities();
      showMessage("Teacher login successful.", "success");
    } catch (error) {
      showMessage("Failed to login. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }

    setLoggedOutState();
    fetchActivities();
    showMessage("Logged out.", "info");
    userMenu.classList.add("hidden");
  });

  // Upewnij się, że modal jest ukryty na starcie
  loginModal.classList.add("hidden");
  syncAuthStatus().then(fetchActivities);
});
