from flask import Flask, request, jsonify
from pymongo import MongoClient
from flask_cors import CORS
import qrcode
import razorpay

app = Flask(__name__)
CORS(app)

# MongoDB Connection
client = MongoClient("mongodb://localhost:27017/")
db = client["eventhub"]

# Razorpay Setup
razorpay_client = razorpay.Client(auth=("rzp_test_SZosMAy6eYmFqz", "eLqQPzNRWrALHVvZCSbp3UdN"))

# ------------------ ROUTES ------------------

@app.route("/")
def home():
    return "MongoDB Connected Successfully 🚀"


# ------------------ USER ------------------

@app.route("/register", methods=["POST"])
def register():
    data = request.json
    db.users.insert_one(data)
    return jsonify({"message": "User Registered Successfully"})


@app.route("/login", methods=["POST"])
def login():
    data = request.json
    user = db.users.find_one({
        "email": data["email"],
        "password": data["password"]
    })

    if user:
        return jsonify({"message": "Login Successful"})
    else:
        return jsonify({"message": "Invalid Credentials"})


# ------------------ EVENTS ------------------

@app.route("/add-event", methods=["POST"])
def add_event():
    data = request.json
    db.events.insert_one(data)
    return jsonify({"message": "Event Added Successfully"})

@app.route("/update-event/<name>", methods=["PUT"])
def update_event(name):
    data = request.json

    result = db.events.update_one(
        {"name": name},
        {"$set": data}
    )

    if result.modified_count > 0:
        return jsonify({"message": "Event Updated Successfully"})
    else:
        return jsonify({"message": "Event Not Found"})
    
@app.route("/events", methods=["GET"])
def get_events():
    events = list(db.events.find({}, {"_id": 0}))
    return jsonify(events)


# ------------------ BOOKING ------------------

@app.route("/book-event", methods=["POST"])
def book_event():
    data = request.json

    if data.get("payment_status") == "success":

        # Save booking
        db.bookings.insert_one(data)

        # Generate QR Code
        qr_data = f"{data['user_email']} - {data['event_name']}"
        qr = qrcode.make(qr_data)
        qr.save("ticket.png")

        return jsonify({
            "message": "Booking Confirmed",
            "qr": "ticket.png"
        })

    else:
        return jsonify({"message": "Payment Failed"})


@app.route("/bookings/<email>", methods=["GET"])
def get_bookings(email):
    bookings = list(db.bookings.find(
        {"user_email": email},
        {"_id": 0}
    ))
    return jsonify(bookings)

# ------------------ PAYMENT ------------------

@app.route("/create-order", methods=["POST"])
def create_order():
    data = request.json
    amount = data.get("amount") * 100  # convert to paise

    order = razorpay_client.order.create({
        "amount": amount,
        "currency": "INR",
        "payment_capture": 1
    })

    return jsonify(order)


# ------------------ QR (Optional) ------------------

@app.route("/generate-qr", methods=["POST"])
def generate_qr():
    data = request.json
    qr = qrcode.make(str(data))
    qr.save("ticket.png")
    return jsonify({"message": "QR Code Generated"})

@app.route("/cancel-booking", methods=["POST"])
def cancel_booking():
    data = request.json

    result = db.bookings.delete_one({
        "user_email": data["user_email"],
        "event_name": data["event_name"]
    })

    if result.deleted_count > 0:
        return jsonify({"message": "Booking Cancelled"})
    else:
        return jsonify({"message": "Booking Not Found"})
    
# ------------------ RUN ------------------

if __name__ == "__main__":
    app.run(debug=True, port=5001)