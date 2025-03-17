import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🔹 Initialize Supabase
const SUPABASE_URL = "https://qbirnioxxrgcnuyblvym.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiaXJuaW94eHJnY251eWJsdnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxMzY4NjEsImV4cCI6MjA1NzcxMjg2MX0.6Qvafe5xmyFGw39BhtPo5Mxk78Xdu28Nn1S4xt_tHaw";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🚀 Utility function to check if user is logged in
function getUser() {
    return {
        isLoggedIn: localStorage.getItem("isLoggedIn") === "true",
        role: localStorage.getItem("role"),
        userId: localStorage.getItem("userId"),
    };
}

// 🚀 Handle user authentication
document.addEventListener("DOMContentLoaded", async () => {
    const { isLoggedIn, role } = getUser();

    // 🔹 Show/hide login/logout buttons
    const loginLink = document.getElementById("loginLink");
    const logoutLink = document.getElementById("logoutLink");
    if (loginLink) loginLink.style.display = isLoggedIn ? "none" : "block";
    if (logoutLink) logoutLink.style.display = isLoggedIn ? "block" : "none";

    // 🔹 Show admin panel button if admin
    const adminPanelButton = document.getElementById("adminPanelButton");
    if (adminPanelButton) adminPanelButton.style.display = role === "admin" ? "block" : "none";

    // 🔹 Logout functionality
    if (logoutLink) {
        logoutLink.addEventListener("click", () => {
            localStorage.clear();
            window.location.href = "index.html";
        });
    }

    // 🔹 Handle login form submission
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const email = document.getElementById("username").value;
            const password = document.getElementById("password").value;

            if (email === "heslipotadmin" && password === "hesliadmin123") {
                localStorage.setItem("isLoggedIn", "true");
                localStorage.setItem("role", "admin");
                localStorage.setItem("userId", "admin");
                window.location.href = "thankyou.html?action=login";
                return;
            }

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

            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("role", user.role);
            localStorage.setItem("userId", user.id);
            window.location.href = "thankyou.html?action=login";
        });
    }

    // 🔹 Handle signup form submission
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const email = document.getElementById("username").value;
            const password = document.getElementById("password").value;
            const role = document.getElementById("role").value;

            const { error } = await supabase
                .from("users")
                .insert([{ email, password, role }]);

            if (error) {
                alert("Error signing up: " + error.message);
            } else {
                alert("Signup successful! Please log in.");
                window.location.href = "thankyou.html?action=signup";
            }
        });
    }

    // 🔹 Handle thank you page
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

    // 🔹 Ensure admin/user privileges are applied on page load
    if (isLoggedIn && role === "admin") {
        const uploadSection = document.getElementById("uploadSection");
        if (uploadSection) uploadSection.style.display = "block";
    }

    // 🔹 Handle competitor uploads (Admin)
    const uploadForm = document.getElementById("uploadForm");
    if (uploadForm) {
        uploadForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const name = document.getElementById("name").value;
            const image = document.getElementById("image").files[0];
            const description = document.getElementById("description").value;
            const category = window.location.pathname.split("/").pop().replace(".html", "");

            if (!image) {
                alert("Please upload an image.");
                return;
            }

            // 🔹 Upload image to Supabase Storage
            const { data: imageData, error: imageError } = await supabase.storage
                .from("competitor-images")
                .upload(`competitors/${Date.now()}_${image.name}`, image);

            if (imageError) {
                alert("Error uploading image: " + imageError.message);
                return;
            }

            // 🔹 Get public URL of the uploaded image
            const { data: imageUrl } = supabase.storage
                .from("competitor-images")
                .getPublicUrl(imageData.path);

            // 🔹 Insert competitor data into the database
            const { error: dbError } = await supabase
                .from("competitors")
                .insert([{ name, description, category, image_url: imageUrl.publicUrl, votes: 0 }]);

            if (dbError) {
                alert("Error saving competitor: " + dbError.message);
            } else {
                alert("Competitor uploaded successfully!");
                uploadForm.reset();
                loadCompetitors(category);
            }
        });
    }

    // 🔹 Load competitors for voting
    async function loadCompetitors(category) {
        const competitorContainer = document.getElementById("competitorContainer");
        if (!competitorContainer) return;

        competitorContainer.innerHTML = "";

        const { data: competitors, error } = await supabase
            .from("competitors")
            .select("*")
            .eq("category", category);

        if (error) {
            console.error("Error fetching competitors:", error.message);
            return;
        }

        competitors.forEach((competitor) => {
            const div = document.createElement("div");
            div.className = "competitor";
            div.innerHTML = `
                <img src="${competitor.image_url}" alt="${competitor.name}">
                <h3>${competitor.name}</h3>
                <p>${competitor.description}</p>
                <p>Votes: ${competitor.votes}</p>
                <button class="btn vote-btn" data-id="${competitor.id}">Vote</button>
            `;
            competitorContainer.appendChild(div);
        });

        document.querySelectorAll(".vote-btn").forEach(button => {
            button.addEventListener("click", async function () {
                const competitorId = button.getAttribute("data-id");
                await voteForCompetitor(competitorId, category);
            });
        });
    }

    // 🔹 Handle voting
    async function voteForCompetitor(competitorId, category) {
        const { userId } = getUser();
        if (!userId) {
            alert("Please log in to vote.");
            return;
        }

        const { data: competitor, error } = await supabase
            .from("competitors")
            .select("votes")
            .eq("id", competitorId)
            .single();

        if (error) {
            alert("Error fetching competitor: " + error.message);
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

        alert("Thank you for voting!");
        loadCompetitors(category);
    }

    // 🔹 Auto-load competitors if on a category page
    const category = window.location.pathname.split("/").pop().replace(".html", "");
    if (category) {
        loadCompetitors(category);
    }

    // 🔹 Admin panel: display pending competitors
    const pendingCompetitorContainer = document.getElementById("pendingCompetitorContainer");
    if (pendingCompetitorContainer) {
        async function loadPendingCompetitors() {
            pendingCompetitorContainer.innerHTML = "";

            const { data: pendingCompetitors, error } = await supabase
                .from("pending_competitors")
                .select("*");

            if (error) {
                console.error("Error fetching pending competitors:", error.message);
                return;
            }

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
                    loadPendingCompetitors();
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
                    loadPendingCompetitors();
                });
            });
        }

        loadPendingCompetitors();
    }

    // 🔹 Load approved competitors in the admin panel
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
                        loadApprovedCompetitors();
                    });
                });
            }
        }

        loadApprovedCompetitors();
    }
});