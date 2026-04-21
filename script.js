const BASE_URL = "http://127.0.0.1:5001";

function showAlert(title, text, icon = "info") {
    if (typeof Swal !== "undefined") {
        return Swal.fire({ title, text, icon });
    } else {
        alert(title + "\n" + (text || ""));
        return Promise.resolve();
    }
}

function logout() {
    localStorage.removeItem("user");
    showAlert("Logged Out", "", "success").then(() => {
        window.location = "login.html";
    });
}

function goBookings() {
    window.location = "mybookings.html";
}

async function register() {
    let name = document.getElementById("name").value;
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    await fetch(BASE_URL + "/register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, email, password})
    });

    showAlert("Success 🎉", "Registered successfully", "success")
    .then(() => window.location = "login.html");
}

async function login() {
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    let res = await fetch(BASE_URL + "/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email, password})
    });

    let data = await res.json();

    if (data.message === "Login Successful") {
        localStorage.setItem("user", email);

        showAlert("Welcome 🎉", "Login Successful", "success")
        .then(() => window.location = "dashboard.html");

    } else {
        showAlert("Error ❌", "Invalid email or password", "error");
    }
}

async function loadEvents() {
    let res = await fetch(BASE_URL + "/events");
    let events = await res.json();

    let container = document.getElementById("events");
    container.innerHTML = "";

    events.forEach(e => {
        let div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${e.name}</h3>
            <p>📍 ${e.location}</p>
            <p>📅 ${e.date}</p>
            <p>⏰ ${e.time || "Time not specified"}</p>
            <p>💰 ₹${e.price}</p>
            <button class="btn" onclick="payNow('${e.name}', ${e.price})">
                Book Now
            </button>
        `;

        container.appendChild(div);
    });
}

async function payNow(eventName, price) {

    let userEmail = localStorage.getItem("user");

    if (!userEmail) {
        showAlert("Login Required", "Please login first", "warning")
        .then(() => window.location = "login.html");
        return;
    }

    if (price === 0) {

        await fetch(BASE_URL + "/book-event", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                user_email: userEmail,
                event_name: eventName,
                payment_id: "FREE_EVENT",
                payment_status: "success"
            })
        });

        showAlert("Free Event Booked 🎉", "", "success");
        return;
    }

    let response = await fetch(BASE_URL + "/create-order", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ amount: price })
    });

    let order = await response.json();

    var options = {
        "key": "rzp_test_SZosMAy6eYmFqz",
        "amount": order.amount,
        "currency": "INR",
        "name": "Smart Event Hub",
        "description": eventName,
        "order_id": order.id,

        "handler": async function (response){

            await fetch(BASE_URL + "/book-event", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    user_email: userEmail,
                    event_name: eventName,
                    payment_id: response.razorpay_payment_id,
                    payment_status: "success"
                })
            });

            showAlert("Booking Confirmed 🎉", "", "success");
        }
    };

    new Razorpay(options).open();
}

async function loadBookings() {

    let email = localStorage.getItem("user");

    let res = await fetch(`${BASE_URL}/bookings/${email}`);
    let data = await res.json();

    let container = document.getElementById("bookings");
    container.innerHTML = "";

    data.forEach(b => {
        let div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${b.event_name}</h3>
            <p>✅ Payment Successful</p>
            <button class="btn cancel-btn" onclick="cancelBooking('${b.event_name}')">
                Cancel Booking
            </button>
        `;

        container.appendChild(div);
    });
}

// ================= CANCEL =================

async function cancelBooking(eventName) {

    let email = localStorage.getItem("user");

    let confirmCancel;

    if (typeof Swal !== "undefined") {
        const result = await Swal.fire({
            title: "Cancel Booking?",
            text: "Are you sure you want to cancel?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes",
            cancelButtonText: "No"
        });
        confirmCancel = result.isConfirmed;
    } else {
        confirmCancel = confirm("Are you sure?");
    }

    if (!confirmCancel) return;

    await fetch(BASE_URL + "/cancel-booking", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            user_email: email,
            event_name: eventName
        })
    });

    showAlert("Cancelled ❌", "Refund in 48 hours 💸", "success");

    loadBookings();
}

// ================= CHATBOT =================

function toggleChat() {
    let box = document.getElementById("chat-box");
    box.style.display = box.style.display === "flex" ? "none" : "flex";
}

function sendMessage() {
    let input = document.getElementById("chat-input");
    let msg = input.value.trim();

    if (!msg) return;

    addMessage(msg, "user");

    let reply = getBotReply(msg);

    setTimeout(() => {
        addMessage(reply, "bot");
    }, 500);

    input.value = "";
}

function addMessage(text, sender) {
    let container = document.getElementById("chat-messages");

    let div = document.createElement("div");
    div.className = `chat-msg ${sender === "user" ? "chat-user" : "chat-bot"}`;
    div.innerText = text;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function getBotReply(msg) {

    msg = msg.toLowerCase();

    if (/hi|hello|hey/.test(msg)) return "Hey 👋 How can I help you?";
    if (/book|ticket/.test(msg)) return "Click 'Book Now' on any event to book 🎟️";
    if (/payment|upi|card/.test(msg)) return "We support UPI, Cards & Net Banking 💳";
    if (/cancel|refund/.test(msg)) return "You can cancel from My Bookings. Refund in 48 hrs 💸";
    if (/event|show/.test(msg)) return "All events are listed on dashboard 🎉";
    if (/time|date|location/.test(msg)) return "Details are shown on each event card 📍";
    if (/login/.test(msg)) return "Login to book and manage events.";
    if (/register/.test(msg)) return "Create account from Register page.";
    if (/help|issue/.test(msg)) return "Our support team will contact you shortly 📞";

    return "I'm not fully sure 🤔 Our expert will contact you soon!";
}

if (window.location.pathname.includes("dashboard")) loadEvents();
if (window.location.pathname.includes("mybookings")) loadBookings();