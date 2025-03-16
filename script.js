import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase setup
const SUPABASE_URL = "https://qbirnioxxrgcnuyblvym.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiaXJuaW94eHJnY251eWJsdnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxMzY4NjEsImV4cCI6MjA1NzcxMjg2MX0.6Qvafe5xmyFGw39BhtPo5Mxk78Xdu28Nn1S4xt_tHaw";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", function () {
    // Dropdown Menu Functionality
    const menuButton = document.querySelector(".account-btn");
    const dropdownContent = document.querySelector(".dropdown-content");

    if (menuButton) {
        menuButton.addEventListener("click", function () {
            dropdownContent.style.display = dropdownContent.style.display === "block" ? "none" : "block";
        });

        // Close dropdown if clicked outside
        document.addEventListener("click", function (event) {
            if (!menuButton.contains(event.target) && !dropdownContent.contains(event.target)) {
                dropdownContent.style.display = "none";
            }
        });
    }

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
            localStorage.removeItem("userId"); // Clear user ID on logout
            localStorage.removeItem("votedCompetitors"); // Clear voting history on logout
            window.location.href = "index.html"; // Redirect to home page after logout
        });
    }

    // Handle login form submission
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const email = document.getElementById("username").value;
            const password = document.getElementById("password").value;

            // Hardcoded admin credentials
            if (email === "heslipotadmin" && password === "hesliadmin123") {
                localStorage.setItem("isLoggedIn", true);
                localStorage.setItem("role", "admin");
                localStorage.setItem("userId", "admin"); // Admin user ID
                window.location.href = "thankyou.html?action=login"; // Redirect to thank you page
                return;
            }

            // Check user credentials in Supabase for regular users
            const { data: user, error } = await supabase
                .from("users")
                .select("*")
                .eq("email", email)
                .eq("password", password)
                .single();

            if (error || !user) {
                alert("Invalid credentials.");
                return;
            }

            // Log in the user
            localStorage.setItem("isLoggedIn", true);
            localStorage.setItem("role", "user");
            localStorage.setItem("userId", user.id); // Store user ID
            window.location.href = "thankyou.html?action=login"; // Redirect to thank you page
        });
    }

    // Handle signup form submission
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const email = document.getElementById("username").value;
            const password = document.getElementById("password").value;

            // Insert user data into Supabase database (users table)
            const { data: user, error } = await supabase
                .from("users")
                .insert([
                    {
                        email,
                        password, // Note: In a real application, hash the password before storing it
                        role: "user", // Default role for new users
                    },
                ]);

            if (error) {
                alert("Error signing up: " + error.message);
            } else {
                alert("Signup successful! Please log in.");
                window.location.href = "login.html"; // Redirect to login page
            }
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
        uploadForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const name = document.getElementById("name").value;
            const image = document.getElementById("image").files[0];
            const description = document.getElementById("description").value;

            // Get the current category from the page URL
            const category = window.location.pathname.split("/").pop().replace(".html", "");

            // Upload image to Supabase Storage
            const { data: imageData, error: imageError } = await supabase.storage
                .from("competitor-images")
                .upload(`competitors/${Date.now()}_${image.name}`, image);

            if (imageError) {
                alert("Error uploading image: " + imageError.message);
                return;
            }

            // Get public URL of the uploaded image
            const { data: imageUrl } = supabase.storage
                .from("competitor-images")
                .getPublicUrl(imageData.path);

            // Insert competitor data into Supabase database (competitors table)
            const { data: competitor, error: dbError } = await supabase
                .from("competitors")
                .insert([
                    {
                        name,
                        description,
                        category,
                        image_url: imageUrl.publicUrl,
                        votes: 0,
                    },
                ]);

            if (dbError) {
                alert("Error saving competitor: " + dbError.message);
            } else {
                alert("Competitor uploaded successfully!");
                uploadForm.reset();

                // Reload the competitor list if on a page that displays it
                if (document.getElementById("competitorContainer")) {
                    loadCompetitors(category);
                }
            }
        });
    }

    // Load competitors for voting
    async function loadCompetitors(category) {
        const competitorContainer = document.getElementById("competitorContainer");
        if (competitorContainer) {
            competitorContainer.innerHTML = ""; // Clear existing content

            // Fetch competitors for the specific category
            const { data: competitors, error } = await supabase
                .from("competitors")
                .select("*")
                .eq("category", category);

            if (error) {
                console.error("Error fetching competitors:", error.message);
                return;
            }

            // Display each competitor
            competitors.forEach((competitor) => {
                const competitorDiv = document.createElement("div");
                competitorDiv.className = "competitor";
                competitorDiv.innerHTML = `
                    <img src="${competitor.image_url}" alt="${competitor.name}">
                    <h3>${competitor.name}</h3>
                    <p>${competitor.description}</p>
                    <p>Votes: ${competitor.votes}</p>
                    <button class="btn vote-btn" data-id="${competitor.id}" data-category="${category}">Vote</button>
                `;
                competitorContainer.appendChild(competitorDiv);
            });

            // Add event listeners to vote buttons
            document.querySelectorAll(".vote-btn").forEach(button => {
                button.addEventListener("click", async function () {
                    const competitorId = button.getAttribute("data-id");
                    const category = button.getAttribute("data-category");
                    await voteForCompetitor(competitorId, category);
                });
            });
        }
    }

    // Handle voting for a competitor
    async function voteForCompetitor(competitorId, category) {
        const userId = localStorage.getItem("userId");

        if (!userId) {
            alert("Please log in to vote.");
            return;
        }

        // Check if the user has already voted in this category
        const { data: votedCompetitors, error: fetchError } = await supabase
            .from("voted_competitors")
            .select("*")
            .eq("user_id", userId)
            .eq("category", category);

        if (fetchError) {
            console.error("Error fetching voting history:", fetchError.message);
            return;
        }

        if (votedCompetitors.length > 0) {
            alert("You have already voted in this category.");
            return;
        }

        // Increment the vote count for the competitor
        const { data: competitor, error: voteError } = await supabase
            .from("competitors")
            .select("votes")
            .eq("id", competitorId)
            .single();

        if (voteError) {
            alert("Error fetching competitor: " + voteError.message);
            return;
        }

        const newVotes = competitor.votes + 1;

        const { error: updateError } = await supabase
            .from("competitors")
            .update({ votes: newVotes })
            .eq("id", competitorId);

        if (updateError) {
            alert("Error updating vote count: " + updateError.message);
            return;
        }

        // Record the vote in the user's voting history
        const { error: historyError } = await supabase
            .from("voted_competitors")
            .insert([{ user_id: userId, category }]);

        if (historyError) {
            alert("Error recording vote: " + historyError.message);
            return;
        }

        alert("Thank you for voting!");
        loadCompetitors(category); // Refresh the competitor list
    }

    // Load competitors when the page loads
    const category = window.location.pathname.split("/").pop().replace(".html", "");
    if (category && document.getElementById("competitorContainer")) {
        loadCompetitors(category);
    }

    // Admin panel: display pending competitors
    const pendingCompetitorContainer = document.getElementById("pendingCompetitorContainer");
    if (pendingCompetitorContainer) {
        async function loadPendingCompetitors() {
            pendingCompetitorContainer.innerHTML = ""; // Clear existing content

            // Fetch pending competitors from Supabase
            const { data: pendingCompetitors, error } = await supabase
                .from("pending_competitors")
                .select("*");

            if (error) {
                console.error("Error fetching pending competitors:", error.message);
                return;
            }

            // Display each pending competitor
            pendingCompetitors.forEach((competitor) => {
                const div = document.createElement("div");
                div.className = "competitor";
                div.innerHTML = `
                    <img src="${competitor.image_url}" alt="${competitor.name}">
                    <h3>${competitor.name}</h3>
                    <p>${competitor.description}</p>
                    <p>Category: ${competitor.category}</p>
                    <button class="btn approve-btn" data-id="${competitor.id}">Approve</button>
                    <button class="btn delete-btn" data-id="${competitor.id}">Delete</button>
                `;
                pendingCompetitorContainer.appendChild(div);
            });

            // Add event listeners for approve and delete buttons
            document.querySelectorAll(".approve-btn").forEach(btn => {
                btn.addEventListener("click", async function () {
                    const competitorId = btn.getAttribute("data-id");

                    // Fetch the competitor from pending_competitors
                    const { data: competitor, error: fetchError } = await supabase
                        .from("pending_competitors")
                        .select("*")
                        .eq("id", competitorId)
                        .single();

                    if (fetchError) {
                        alert("Error fetching competitor: " + fetchError.message);
                        return;
                    }

                    // Insert the competitor into the approved competitors table
                    const { error: insertError } = await supabase
                        .from("competitors")
                        .insert([competitor]);

                    if (insertError) {
                        alert("Error approving competitor: " + insertError.message);
                        return;
                    }

                    // Delete the competitor from pending_competitors
                    const { error: deleteError } = await supabase
                        .from("pending_competitors")
                        .delete()
                        .eq("id", competitorId);

                    if (deleteError) {
                        alert("Error deleting pending competitor: " + deleteError.message);
                        return;
                    }

                    alert("Competitor approved successfully!");
                    loadPendingCompetitors(); // Refresh the list
                });
            });

            document.querySelectorAll(".delete-btn").forEach(btn => {
                btn.addEventListener("click", async function () {
                    const competitorId = btn.getAttribute("data-id");

                    // Delete the competitor from pending_competitors
                    const { error } = await supabase
                        .from("pending_competitors")
                        .delete()
                        .eq("id", competitorId);

                    if (error) {
                        alert("Error deleting competitor: " + error.message);
                        return;
                    }

                    alert("Competitor deleted successfully!");
                    loadPendingCompetitors(); // Refresh the list
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
        async function loadApprovedCompetitors() {
            approvedYouth.innerHTML = "";
            approvedWomen.innerHTML = "";
            approvedChefs.innerHTML = "";

            const categories = ["youth", "women", "chefs"];
            for (const category of categories) {
                // Fetch approved competitors for the category
                const { data: competitors, error } = await supabase
                    .from("competitors")
                    .select("*")
                    .eq("category", category);

                if (error) {
                    console.error(`Error fetching ${category} competitors:`, error.message);
                    continue;
                }

                const container = category === "youth" ? approvedYouth : category === "women" ? approvedWomen : approvedChefs;

                competitors.forEach((competitor) => {
                    const div = document.createElement("div");
                    div.className = "competitor";
                    div.innerHTML = `
                        <img src="${competitor.image_url}" alt="${competitor.name}">
                        <h3>${competitor.name}</h3>
                        <p>${competitor.description}</p>
                        <p>Votes: ${competitor.votes}</p>
                        ${role === "admin" ? `<button class="btn delete-btn" data-id="${competitor.id}">Delete</button>` : ''}
                    `;
                    container.appendChild(div);
                });

                // Add event listeners to delete buttons for approved competitors
                const deleteButtons = container.querySelectorAll(".delete-btn");
                deleteButtons.forEach(button => {
                    button.addEventListener("click", async function () {
                        const competitorId = button.getAttribute("data-id");

                        // Delete the competitor from the approved table
                        const { error } = await supabase
                            .from("competitors")
                            .delete()
                            .eq("id", competitorId);

                        if (error) {
                            alert("Error deleting competitor: " + error.message);
                            return;
                        }

                        alert("Competitor deleted successfully!");
                        loadApprovedCompetitors(); // Refresh the list
                    });
                });
            }
        }

        loadApprovedCompetitors();
    }
});