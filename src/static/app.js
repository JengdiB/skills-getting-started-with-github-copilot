document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      // always bypass caches so we get the latest data immediately
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear previous contents
      activitiesList.innerHTML = "";
      // also wipe dropdown options (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // If there are already participants signed up, render them as a list
        if (details.participants && details.participants.length > 0) {
          const participantsHeader = document.createElement("p");
          participantsHeader.innerHTML = "<strong>Participants:</strong>";
          activityCard.appendChild(participantsHeader);

          const list = document.createElement("ul");
          list.className = "participants";
          details.participants.forEach((email) => {
            const li = document.createElement("li");
            li.textContent = email;

            // add delete icon/button
            const del = document.createElement("span");
            del.className = "delete-participant";
            del.title = "Remove participant";
            del.textContent = "\u00D7"; // multiplication sign
            del.addEventListener("click", async () => {
              try {
                const res = await fetch(
                  `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(email)}`,
                  { method: "DELETE" }
                );
                if (res.ok) {
                  // reload activities to reflect change
                  fetchActivities();
                } else {
                  const err = await res.json();
                  console.error("Failed to remove participant", err);
                }
              } catch (e) {
                console.error("Error removing participant", e);
              }
            });

            li.appendChild(del);
            list.appendChild(li);
          });
          activityCard.appendChild(list);
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // refresh list so spots/participants update immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
