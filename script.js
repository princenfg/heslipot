document.addEventListener("DOMContentLoaded", function () {
    // Check if the user is logged in
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const role = localStorage.getItem("role");

    // Update the account dropdown based on login status
    const loginLink = document.getElementById("loginLink");
    const logoutLink = document.getElementById("logoutLink");

    if (isLoggedIn) {
        if (loginLink) loginLink.style.display = "none";
        if (logoutLink) logoutLink.style.display = "block";
    } else {
        if (loginLink) loginLink.style.display = "block";
        if (logoutLink) logoutLink.style.display = "none";
    }

    // Show admin panel button if the user is an admin
    const adminPanelButton = document.getElementById("adminPanelButton");
    if (isLoggedIn && role === "admin" && adminPanelButton) {
        adminPanelButton.style.display = "block"; // Show button if admin
    }

    // Handle logout
    if (logoutLink) {
        logoutLink.addEventListener("click", function (event) {
            event.preventDefault();
            localStorage.removeItem("isLoggedIn");
            localStorage.removeItem("role");
            localStorage.removeItem("votedCompetitors"); // Clear voting history on logout
            window.location.href = "index.html"; // Redirect to home page after logout
        });
    }

    // Handle login form submission
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;
            const role = document.getElementById("role").value;

            // Simulate login validation
            if ((username === "admin" && password === "admin123") || (username === "user" && password === "user123")) {
                localStorage.setItem("isLoggedIn", true);
                localStorage.setItem("role", role);
                window.location.href = "thankyou.html?action=login"; // Redirect to thank you page
            } else {
                alert("Invalid credentials.");
            }
        });
    }

    // Handle signup form submission
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const name = document.getElementById("name").value;
            const email = document.getElementById("email").value;
            const phone = document.getElementById("phone").value;
            const category = document.getElementById("category").value;
            const imageFile = document.getElementById("image").files[0];
            const description = document.getElementById("description").value;

            const reader = new FileReader();
            reader.onload = function (e) {
                const competitor = {
                    name: name,
                    email: email,
                    phone: phone,
                    category: category,
                    image: e.target.result,
                    description: description,
                    votes: 0
                };

                let pendingCompetitors = JSON.parse(localStorage.getItem("pendingCompetitors")) || [];
                pendingCompetitors.push(competitor);
                localStorage.setItem("pendingCompetitors", JSON.stringify(pendingCompetitors));

                alert("Registration submitted! Awaiting admin approval.");
                signupForm.reset();
            };
            reader.readAsDataURL(imageFile);
        });
    }

    // Handle thank you page
    const thankYouMessage = document.getElementById("thankYouMessage");
    if (thankYouMessage) {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get("action");

        if (action === "login") {
            thankYouMessage.textContent = "Thank You for Logging In!";
        } else if (action === "signup") {
            thankYouMessage.textContent = "Thank You for Signing Up!";
        }

        // Redirect to home page after 3 seconds
        setTimeout(() => {
            window.location.href = "index.html";
        }, 3000);
    }

    // Ensure admin/user privileges are applied on page load
    if (isLoggedIn && role === "admin") {
        const uploadSection = document.getElementById("uploadSection");
        if (uploadSection) uploadSection.style.display = "block";
    }

    // Handle competitor upload form submission (for admins)
    const uploadForm = document.getElementById("uploadForm");
    if (uploadForm) {
        uploadForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const name = document.getElementById("name").value;
            const image = document.getElementById("image").files[0];
            const description = document.getElementById("description").value;

            // Get the current category from the page URL
            const category = window.location.pathname.split("/").pop().replace(".html", "");

            // Read the image file and convert it to a data URL
            const reader = new FileReader();
            reader.onload = function (e) {
                const competitor = {
                    name: name,
                    image: e.target.result,
                    description: description,
                    votes: 0 // Initialize vote count to 0
                };

                // Save competitor to local storage under the specific category
                let competitors = JSON.parse(localStorage.getItem(`competitors_${category}`)) || [];
                competitors.push(competitor);
                localStorage.setItem(`competitors_${category}`, JSON.stringify(competitors));

                alert("Competitor uploaded successfully!");
                uploadForm.reset();

                // Reload the competitor list if on a page that displays it
                if (document.getElementById("competitorContainer")) {
                    loadCompetitors(category);
                }
            };
            reader.readAsDataURL(image);
        });
    }

    // Load competitors for voting
    function loadCompetitors(category) {
        const competitorContainer = document.getElementById("competitorContainer");
        if (competitorContainer) {
            competitorContainer.innerHTML = ""; // Clear existing content

            // Load competitors for the specific category
            const competitors = JSON.parse(localStorage.getItem(`competitors_${category}`)) || [];

            competitors.forEach((competitor, index) => {
                const competitorDiv = document.createElement("div");
                competitorDiv.className = "competitor";
                competitorDiv.innerHTML = `
                    <img src="${competitor.image}" alt="${competitor.name}">
                    <h3>${competitor.name}</h3>
                    <p>${competitor.description}</p>
                    <p>Votes: ${competitor.votes}</p>
                    <button class="btn vote-btn" data-index="${index}" data-category="${category}">Vote</button>
                `;
                competitorContainer.appendChild(competitorDiv);
            });

            // Add event listeners to vote buttons
            const voteButtons = document.querySelectorAll(".vote-btn");
            voteButtons.forEach(button => {
                button.addEventListener("click", function () {
                    const index = button.getAttribute("data-index");
                    const category = button.getAttribute("data-category");
                    voteForCompetitor(index, category);
                });
            });
        }
    }

    // Handle voting for a competitor
    function voteForCompetitor(index, category) {
        // Check if the user has already voted in this category
        const votedCompetitors = JSON.parse(localStorage.getItem("votedCompetitors")) || {};
        const userId = localStorage.getItem("userId"); // Unique identifier for the user

        if (!userId) {
            alert("Please log in to vote.");
            return;
        }

        if (votedCompetitors[userId] && votedCompetitors[userId][category]) {
            alert("You have already voted in this category.");
            return;
        }

        // Update the vote count
        let competitors = JSON.parse(localStorage.getItem(`competitors_${category}`)) || [];
        if (competitors[index]) {
            competitors[index].votes = (competitors[index].votes || 0) + 1;
            localStorage.setItem(`competitors_${category}`, JSON.stringify(competitors));

            // Record the vote in the user's voting history
            if (!votedCompetitors[userId]) {
                votedCompetitors[userId] = {};
            }
            votedCompetitors[userId][category] = true; // Mark the category as voted
            localStorage.setItem("votedCompetitors", JSON.stringify(votedCompetitors));

            alert("Thank you for voting!");
            loadCompetitors(category); // Refresh the competitor list
        }
    }

    // Load competitors when the page loads
    const category = window.location.pathname.split("/").pop().replace(".html", "");
    if (category && document.getElementById("competitorContainer")) {
        loadCompetitors(category);
    }

    // Admin panel: display pending competitors
    const pendingCompetitorContainer = document.getElementById("pendingCompetitorContainer");
    if (pendingCompetitorContainer) {
        function loadPendingCompetitors() {
            pendingCompetitorContainer.innerHTML = ""; // Clear existing content
            const pendingCompetitors = JSON.parse(localStorage.getItem("pendingCompetitors")) || [];

            pendingCompetitors.forEach((competitor, index) => {
                const div = document.createElement("div");
                div.className = "competitor";
                div.innerHTML = `
                    <img src="${competitor.image}" alt="${competitor.name}">
                    <h3>${competitor.name}</h3>
                    <p>${competitor.description}</p>
                    <p>Category: ${competitor.category}</p>
                    <button class="btn approve-btn" data-index="${index}">Approve</button>
                    <button class="btn delete-btn" data-index="${index}">Delete</button>
                `;
                pendingCompetitorContainer.appendChild(div);
            });

            document.querySelectorAll(".approve-btn").forEach(btn => {
                btn.addEventListener("click", function () {
                    const index = btn.getAttribute("data-index");
                    const pendingCompetitors = JSON.parse(localStorage.getItem("pendingCompetitors")) || [];
                    const competitor = pendingCompetitors.splice(index, 1)[0];
                    let competitors = JSON.parse(localStorage.getItem(`competitors_${competitor.category}`)) || [];
                    competitors.push(competitor);
                    localStorage.setItem(`competitors_${competitor.category}`, JSON.stringify(competitors));
                    localStorage.setItem("pendingCompetitors", JSON.stringify(pendingCompetitors));
                    loadPendingCompetitors();
                });
            });

            document.querySelectorAll(".delete-btn").forEach(btn => {
                btn.addEventListener("click", function () {
                    const index = btn.getAttribute("data-index");
                    const pendingCompetitors = JSON.parse(localStorage.getItem("pendingCompetitors")) || [];
                    pendingCompetitors.splice(index, 1);
                    localStorage.setItem("pendingCompetitors", JSON.stringify(pendingCompetitors));
                    loadPendingCompetitors();
                });
            });
        }

        loadPendingCompetitors();
    }

    // Load approved competitors in the admin panel
    const approvedYouth = document.getElementById("approvedYouth");
    const approvedWomen = document.getElementById("approvedWomen");
    const approvedChefs = document.getElementById("approvedChefs");

    if (approvedYouth && approvedWomen && approvedChefs) {
        function loadApprovedCompetitors() {
            approvedYouth.innerHTML = "";
            approvedWomen.innerHTML = "";
            approvedChefs.innerHTML = "";

            const categories = ["youth", "women", "chefs"];
            categories.forEach(category => {
                const competitors = JSON.parse(localStorage.getItem(`competitors_${category}`)) || [];
                const container = category === "youth" ? approvedYouth : category === "women" ? approvedWomen : approvedChefs;

                competitors.forEach((competitor, index) => {
                    const div = document.createElement("div");
                    div.className = "competitor";
                    div.innerHTML = `
                        <img src="${competitor.image}" alt="${competitor.name}">
                        <h3>${competitor.name}</h3>
                        <p>${competitor.description}</p>
                        <p>Votes: ${competitor.votes}</p>
                        ${role === "admin" ? `<button class="btn delete-btn" data-category="${category}" data-index="${index}">Delete</button>` : ''}
                    `;
                    container.appendChild(div);
                });

                // Add event listeners to delete buttons for approved competitors
                const deleteButtons = container.querySelectorAll(".delete-btn");
                deleteButtons.forEach(button => {
                    button.addEventListener("click", function () {
                        const category = button.getAttribute("data-category");
                        const index = button.getAttribute("data-index");
                        deleteApprovedCompetitor(category, index);
                    });
                });
            });
        }

        loadApprovedCompetitors();
    }

    // Function to delete approved competitors
    function deleteApprovedCompetitor(category, index) {
        let competitors = JSON.parse(localStorage.getItem(`competitors_${category}`)) || [];
        if (competitors[index]) {
            competitors.splice(index, 1); // Remove the competitor
            localStorage.setItem(`competitors_${category}`, JSON.stringify(competitors)); // Update storage
            alert("Competitor deleted successfully!");
            loadApprovedCompetitors(); // Refresh the list
        }
    }
});