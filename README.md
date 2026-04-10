# 🚌 Ahmedabad City Bus Tracking & Seat Booking System
> **A Cloud-Based Smart Transit Platform for AMTS/BRTS Route Navigation and Live Reservation**

## 📖 Project Overview
The **Ahmedabad Bus Tracking & Seat Booking System** is a comprehensive cloud-based web application designed to streamline daily commuting in Ahmedabad. Its primary purpose is to bridge the gap between physical city transit and digital accessibility by allowing users to search for buses, book seats in real-time, and track bus locations on a map. 

The system operates on a dataset-driven architecture where bus routes, stops, and schedules are parsed from a central dataset. It features a fully functioning user flow, an administrative dashboard for dataset handling, robust JWT-based authentication, and a containerized deployment setup using Docker for seamless scalability.

## ✨ Features
### User Features
* **Authentication:** Secure Sign-up and Login using encrypted passwords and JWT sessions.
* **Smart Bus Search:** Search for buses based on `Source` and `Destination` mapped against the Ahmedabad transit dataset.
* **Interactive Seat Booking:** Visual seat layout allowing users to select, hold, and confirm seat reservations.
* **Live Route Tracking (Partial Implementation):** Users can view the bus route on a map. *Note: Currently, "live tracking" is simulated by interpolating dataset coordinates along the route rather than using physical hardware GPS modules.*
* **Booking History:** A dedicated dashboard for users to view past and upcoming journey details.

### Admin Features
* **Admin Dashboard:** Centralized view of total buses, active routes, and daily bookings.
* **Dataset Import Engine:** Admins can upload and parse raw datasets (CSV/JSON) containing `route_id`, `source`, `destination`, `coordinates`, and `plate_number` to update the transit network dynamically.
* **Bus & Schedule Management:** Edit bus capacities and update transit timings.

## 🛠️ Tech Stack
* **Frontend:** React.js, Tailwind CSS (for modern, responsive UI components), React-Router, Leaflet.js / Google Maps API (for map rendering).
* **Backend:** Node.js, Express.js (RESTful API architecture).
* **Database:** MongoDB (Mongoose ODM for schemas).
* **Containerization:** Docker, Docker Compose.
* **Authentication:** JSON Web Tokens (JWT), bcrypt.js.
* **Dataset Processing:** `csv-parser` / `fs` module for handling static route files.

## 🗂️ Project Structure
```text
Ahmedabad-Bus-Tracking-Seat-Booking-System/
├── backend/
│   ├── config/            # DB connection and env configurations
│   ├── controllers/       # API logic (auth, bookings, buses, admin)
│   ├── datasets/          # Static CSV/JSON files for Ahmedabad routes & coordinates
│   ├── middleware/        # JWT verification & role-based access control
│   ├── models/            # MongoDB Schemas (User, Bus, Booking, Route)
│   ├── routes/            # Express route definitions
│   ├── Dockerfile         # Backend container configuration
│   ├── package.json
│   └── server.js          # Backend entry point
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/    # Reusable UI components (Navbar, SeatMap, etc.)
│   │   ├── pages/         # Core views (Home, Login, Search, AdminDash)
│   │   ├── services/      # Axios API call wrappers
│   │   ├── App.js
│   │   └── index.js
│   ├── Dockerfile         # Frontend container configuration
│   └── package.json
├── docker-compose.yml     # Multi-container orchestration
├── .gitignore
└── README.md

## ⚙️ How It Works (System Flow)

### Dataset Initialization
On startup or through admin upload, the backend parses the Ahmedabad bus dataset and populates MongoDB with valid routes, stops, and coordinate points.

### Authentication
Users register or log in. The backend validates credentials and issues a JWT bearer token.

### Bus Search
The user inputs a source and destination. The backend queries the routes collection and returns available buses and timings.

### Seat Booking
The user selects a bus, views seat availability, and confirms a seat. The backend locks the seat and creates a booking linked to the user account.

### Tracking
On the tracking page, the frontend fetches the coordinate array for the selected bus route and plots a moving marker on the map to simulate bus progress.

---

## 📊 Dataset Information

This project relies heavily on a structured transit dataset to simulate Ahmedabad bus operations.

### Data Stored
The dataset may contain fields such as:
- `bus_id`
- `plate_number`
- `source_stop`
- `destination_stop`
- `intermediate_stops`
- `coordinates` array (latitude/longitude pairs)

### Parsing
The backend includes a parser that reads the dataset file and seeds the database.

### Routing Logic
The search algorithm checks whether both the user's source and destination exist sequentially within a bus route’s stop list.

---

## 🔌 API Overview

### Authentication APIs
- `POST /api/auth/register` — Create a new user account
- `POST /api/auth/login` — Authenticate user and return JWT

### Bus & Route APIs
- `GET /api/buses/search?source=X&destination=Y` — Fetch matching buses
- `GET /api/buses/:id` — Get specific bus details and seat availability

### Booking APIs
- `POST /api/bookings/create` — Confirm a seat reservation *(Requires Auth)*
- `GET /api/bookings/my-bookings` — Retrieve user booking history *(Requires Auth)*

### Admin APIs
- `POST /api/admin/dataset/upload` — Upload a new CSV/JSON file to update routes *(Requires Admin Auth)*
- `GET /api/admin/dashboard-stats` — Fetch system statistics *(Requires Admin Auth)*

---

## 💻 Installation and Setup (Local Development)

### Prerequisites
Make sure the following are installed:
- Node.js (v16+)
- MongoDB (Local or Atlas)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Chetan-Suhagiya/Ahmedabad-Bus-Tracking-Seat-Booking-System.git
cd Ahmedabad-Bus-Tracking-Seat-Booking-System

### 2. Backend Setup

```bash
cd backend
npm install
# Create a .env file based on the Configuration section below
npm run start:dev
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
# Create a .env file containing the backend API URL
npm start
```

### Default Local URLs
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

---

## 🐳 Docker Setup

This project includes Docker-based deployment using multiple containers for clean separation of services.

### Run with Docker Compose

From the root directory:

```bash
docker-compose up --build
```

### Run in Detached Mode

```bash
docker-compose up -d --build
```

### Stop Containers

```bash
docker-compose down
```

### Container Architecture
- Frontend Container: Builds and serves the React application on port 3000
- Backend Container: Runs the Node.js API on port 5000
- Database Container: Runs MongoDB on port 27017

---

## 📱 Usage Guide

### Open the application in your browser:
`http://localhost:3000`

### Sign Up
Create a new user profile.

### Login
Use your credentials to access booking and tracking features.

### Search & Book
Enter source and destination, select a bus from results, and book your seat.

### Track Bus
Open the tracking section and view the route and simulated live movement on the map.

### Admin Access
Log in with admin credentials, view the dashboard, and test dataset upload and management features.

---

## 📸 Screenshots / Demo

Add your screenshots here:

- Home / Search Page
- Seat Selection Page
- Live Tracking Page
- Booking History Page
- Admin Dashboard

### Example format

```markdown
## Screenshots

### Home Page
![Home Page](./screenshots/home.png)

### Admin Dashboard
![Admin Dashboard](./screenshots/admin-dashboard.png)
```

---

## ⚙️ Configuration

Create `.env` files in both frontend and backend.

### `backend/.env`

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ahmedabad_bus_db
# If using Docker, change MONGO_URI to mongodb://mongo:27017/ahmedabad_bus_db
JWT_SECRET=your_super_secret_jwt_key
```

### `frontend/.env`

```env
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_MAPS_API_KEY=your_leaflet_or_google_maps_key
```

---

## ⚠️ Known Issues / Limitations

- Simulated Tracking: Real-time GPS tracking is not yet integrated; current tracking uses dataset coordinates and interpolation.
- Dataset Import Speed: Very large datasets may slow down upload and parsing.
- Live Vehicle Hardware Integration: Physical GPS devices are not currently connected.

---

## 🚀 Future Improvements

- Integrate payment gateway such as Razorpay or Stripe
- Add WebSocket support for real-time seat availability updates
- Enable live GPS hardware integration for actual bus tracking
- Add SMS/WhatsApp notifications for booking confirmation
- Improve analytics and admin reporting dashboard
- Add route optimization and ETA prediction using ML models

---

## 👨‍💻 Author

Chetankumar Suhagiya  
GitHub: @Chetan-Suhagiya

Feel free to connect for collaboration, suggestions, or project-related discussions.

---

## 📜 License & Contribution

This project is currently available for academic and portfolio use.

- Contributions are welcome
- Issues and feature suggestions are appreciated
- You may fork the repository and submit a Pull Request
