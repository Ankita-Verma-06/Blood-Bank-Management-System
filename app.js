// ============================================================
//  app.js — BBMS Dashboard (Fixed & Final)
//
//  FIXES:
//  ✅ District dropdown properly enables/resets on state change
//  ✅ fetch URL uses relative path 'districts?...' (matches Tomcat context)
//  ✅ Search sends to 'search?...' and handles JSON from fixed SearchServlet
//  ✅ Results rendered as a clean styled table (not raw unstyled HTML)
//  ✅ Loading spinner + error + empty states all handled
// ============================================================


// ─────────────────────────────────────────────────────────────
//  1. DISTRICT DROPDOWN
//     When state changes → fetch districts from DistrictServlet
//     URL: GET districts?state=Punjab   (relative — Tomcat resolves to /bbms/districts)
// ─────────────────────────────────────────────────────────────
document.getElementById("stateSel").addEventListener("change", function () {
    const state       = this.value;
    const districtSel = document.getElementById("districtSel");

    if (!state) return;

    // ✅ FIX: Show loading state, disable dropdown while fetching
    districtSel.innerHTML = '<option value="">⏳ Loading districts…</option>';
    districtSel.disabled  = true;

    fetch(`districts?state=${encodeURIComponent(state)}`)
        .then(response => {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.json();
        })
        .then(data => {
            console.log("Districts received:", data);

            districtSel.disabled = false;

            if (!data || data.length === 0) {
                // No districts in DB for this state
                districtSel.innerHTML = '<option value="" disabled selected>No districts found for this state</option>';
                return;
            }

            // ✅ FIX: Populate cleanly with placeholder first
            districtSel.innerHTML = '<option value="" disabled selected>Select District</option>';
            data.forEach(d => {
                const opt   = document.createElement("option");
                opt.value   = d;
                opt.text    = d;
                districtSel.appendChild(opt);
            });
        })
        .catch(err => {
            console.error("District fetch error:", err);
            districtSel.disabled = false;
            districtSel.innerHTML = '<option value="" disabled selected>⚠️ Error loading districts</option>';
        });
});


// ─────────────────────────────────────────────────────────────
//  2. STATS
//     GET /bbms/stats → { "centres": N, "states": N }
// ─────────────────────────────────────────────────────────────
fetch(`stats`)
    .then(res => res.json())
    .then(data => {
        console.log("Stats:", data);
        animate("centres",   data.centres   || 0);
        animate("states",    data.states    || 0);
        animate("districts", data.districts || 0);
    })
    .catch(err => console.error("Stats error:", err));


// ─────────────────────────────────────────────────────────────
//  3. CHART
//     GET /bbms/chart → [{ "state": "Punjab", "count": 12 }, ...]
// ─────────────────────────────────────────────────────────────
fetch(`chart`)
    .then(res => res.json())
    .then(data => {
        const canvas = document.getElementById("myChart");
        if (!canvas) return;

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: data.map(d => d.state),
                datasets: [{
                    label: 'Centres per State',
                    data:  data.map(d => d.count),
                    backgroundColor: 'rgba(192,57,43,0.75)',
                    borderColor:     '#C0392B',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales:  { y: { beginAtZero: true } }
            }
        });
    })
    .catch(err => console.error("Chart error:", err));


// ─────────────────────────────────────────────────────────────
//  4. SEARCH FORM
//     GET search?state=X&district=Y
//     SearchServlet now returns JSON → rendered as styled table here
// ─────────────────────────────────────────────────────────────
document.getElementById("searchForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const state      = document.getElementById("stateSel").value;
    const district   = document.getElementById("districtSel").value;
    const resultsDiv = document.getElementById("results");
    const btn        = this.querySelector("button[type='submit']");

    // Validate both selected
    if (!state) {
        showMsg(resultsDiv, "warning", "Please select a State first.");
        return;
    }
    if (!district || district === "") {
        showMsg(resultsDiv, "warning", "Please select a District after choosing a State.");
        return;
    }

    // Show spinner
    btn.disabled      = true;
    btn.innerHTML     = '<i class="fa-solid fa-spinner fa-spin"></i> Searching…';
    resultsDiv.innerHTML = `
        <div style="text-align:center;padding:30px 0;color:#888;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:#C0392B;"></i>
            <p style="margin-top:10px;font-size:14px;">
                Looking for blood centres in <strong>${esc(district)}, ${esc(state)}</strong>…
            </p>
        </div>`;

    fetch(`search?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`)
        .then(response => {
            if (!response.ok) throw new Error("Server error " + response.status);
            return response.json();
        })
        .then(data => {
            btn.disabled  = false;
            btn.innerHTML = '<i class="fa-solid fa-search"></i> Search Blood Centres';

            // SearchServlet may return an error object
            if (data.error) {
                showMsg(resultsDiv, "error", "Database error: " + data.error);
                return;
            }

            // Render the result table
            renderResults(data, state, district, resultsDiv);
        })
        .catch(err => {
            console.error("Search error:", err);
            btn.disabled  = false;
            btn.innerHTML = '<i class="fa-solid fa-search"></i> Search Blood Centres';
            showMsg(resultsDiv, "error",
                "Could not reach the server. Make sure Tomcat is running and SearchServlet is deployed.");
        });
});


// ─────────────────────────────────────────────────────────────
//  Render blood centre results as a clean styled table
//  Handles JSON array from the fixed SearchServlet
// ─────────────────────────────────────────────────────────────
function renderResults(centres, state, district, container) {

    if (!centres || centres.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:36px 20px;">
                <i class="fa-solid fa-circle-exclamation" style="font-size:2.4rem;color:#E8C4C4;"></i>
                <h4 style="color:#555;margin:12px 0 6px;">No Centres Found</h4>
                <p style="color:#888;font-size:13.5px;">
                    No registered blood centres found in <strong>${esc(district)}, ${esc(state)}</strong>.<br>
                    Check if your database has entries for this location.
                </p>
            </div>`;
        return;
    }

    let html = `
        <!-- Header row -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
            <h3 style="margin:0;font-size:1.05rem;color:#333;">
                <i class="fa-solid fa-hospital" style="color:#C0392B;margin-right:7px;"></i>
                Results for <span style="color:#C0392B;">${esc(district)}, ${esc(state)}</span>
            </h3>
            <span style="background:#FFF0EE;color:#C0392B;border:1px solid rgba(192,57,43,.25);
                         padding:4px 13px;border-radius:20px;font-size:12px;font-weight:700;">
                ${centres.length} centre${centres.length !== 1 ? 's' : ''} found
            </span>
        </div>

        <!-- Styled table -->
        <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13.5px;">
            <thead>
                <tr style="background:linear-gradient(135deg,#922B21,#C0392B);color:white;">
                    <th style="padding:11px 14px;text-align:left;font-weight:600;white-space:nowrap;">#</th>
                    <th style="padding:11px 14px;text-align:left;font-weight:600;">Centre Name</th>
                    <th style="padding:11px 14px;text-align:left;font-weight:600;">Address</th>
                    <th style="padding:11px 14px;text-align:left;font-weight:600;white-space:nowrap;">Phone</th>
                    <th style="padding:11px 14px;text-align:left;font-weight:600;">Category</th>
                    <th style="padding:11px 14px;text-align:left;font-weight:600;">Timing</th>
                    <th style="padding:11px 14px;text-align:left;font-weight:600;">Email</th>
                </tr>
            </thead>
            <tbody>`;

    centres.forEach((c, i) => {
        const bg      = i % 2 === 0 ? "#fff" : "#FDF7F7";
        const name    = c.name     || c.centre_name || "—";
        const address = c.address  || (c.city ? c.city : "—");
        const phone   = c.phone    || "";
        const email   = c.email    || "";
        const cat     = c.category || "Blood Bank";
        const timing  = c.timing   || "Contact for hours";

        html += `
            <tr style="background:${bg};border-bottom:1px solid #F0DADA;transition:background .15s;"
                onmouseover="this.style.background='#FFF0EE'"
                onmouseout="this.style.background='${bg}'">
                <td style="padding:10px 14px;color:#bbb;font-size:12px;">${i + 1}</td>
                <td style="padding:10px 14px;font-weight:600;color:#2C2C2C;">${esc(name)}</td>
                <td style="padding:10px 14px;color:#666;font-size:12.5px;">${esc(address)}</td>
                <td style="padding:10px 14px;white-space:nowrap;">
                    ${phone
                        ? `<a href="tel:${esc(phone)}" style="color:#C0392B;text-decoration:none;font-weight:500;">
                               📞 ${esc(phone)}</a>`
                        : `<span style="color:#ccc;">—</span>`}
                </td>
                <td style="padding:10px 14px;">
                    <span style="background:#FEF0EF;border:1px solid #FADADD;color:#C0392B;
                                 padding:3px 9px;border-radius:12px;font-size:11.5px;font-weight:600;">
                        ${esc(cat)}
                    </span>
                </td>
                <td style="padding:10px 14px;color:#555;font-size:12px;white-space:nowrap;">
                    ⏰ ${esc(timing)}
                </td>
                <td style="padding:10px 14px;">
                    ${email
                        ? `<a href="mailto:${esc(email)}"
                               style="color:#C0392B;font-size:12px;text-decoration:none;">
                               ✉ ${esc(email)}</a>`
                        : `<span style="color:#ccc;font-size:12px;">—</span>`}
                </td>
            </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;

    // Scroll results into view smoothly
    container.scrollIntoView({ behavior: "smooth", block: "nearest" });
}


// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

// Show a status message (warning / error) inside a container div
function showMsg(container, type, msg) {
    const color = type === "error" ? "#C0392B" : "#B7950B";
    const icon  = type === "error"
        ? "fa-triangle-exclamation"
        : "fa-circle-exclamation";
    container.innerHTML = `
        <div style="text-align:center;padding:22px;color:${color};">
            <i class="fa-solid ${icon}" style="font-size:1.6rem;"></i>
            <p style="margin-top:8px;font-size:13.5px;">${msg}</p>
        </div>`;
}

// HTML-escape a value for safe injection into innerHTML
function esc(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Animated counter for stats cards
function animate(id, value) {
    const el = document.getElementById(id);
    if (!el || !value) return;
    let count = 0;
    const step = Math.max(1, Math.ceil(value / 60));
    const iv = setInterval(() => {
        count += step;
        if (count >= value) { count = value; clearInterval(iv); }
        el.innerText = count.toLocaleString();
    }, 18);
}

// NOTE: toggleChat() and sendChatMessage() live in dashboard.html — do NOT add them here.
console.log("✅ app.js loaded");
