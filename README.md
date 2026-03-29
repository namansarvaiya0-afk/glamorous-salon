# 💇 Glamorous Salon

A full-stack salon booking and management web application built with **HTML, CSS, JavaScript** (frontend) and **Node.js + Express** (backend), using **MySQL** for the database.

---

## 📁 Project Structure

```
GlamorousSalon/
├── backend/              # Node.js + Express backend
│   ├── server.js         # Main server file
│   ├── db.json           # (local dev only) fallback data
│   ├── package.json      # Backend dependencies
│   └── .env              # ⚠️ Not uploaded – see .env.example
│
├── public/               # Frontend (HTML/CSS/JS)
│   ├── index.html        # Home page
│   ├── login.html        # User login
│   ├── register.html     # User registration
│   ├── dashboard.html    # User dashboard
│   ├── forgot-password.html  # Password recovery (OTP)
│   ├── services.html     # Services page
│   ├── admin-login.html  # Admin login
│   ├── admin-dashboard.html  # Admin dashboard
│   ├── style.css         # Global styles
│   └── script.js         # Global scripts
│
├── .gitignore
├── .env.example          # Environment variable template
└── README.md
```

---

## ✨ Features

- 👤 User Registration & Login (JWT Auth)
- 🔐 Forgot Password with Email OTP
- 📅 Salon Booking System
- 🛠️ Admin Dashboard (manage users, bookings, services)
- 📱 Mobile Responsive Design
- 🔒 Bcrypt Password Hashing
- 📧 Nodemailer Email Integration

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-username/GlamorousSalon.git
cd GlamorousSalon
```

### 2. Setup Backend
```bash
cd backend
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example backend/.env
# Edit backend/.env with your actual values
```

### 4. Run the Server
```bash
cd backend
npm start
```

### 5. Open Frontend
Open `public/index.html` in your browser, or serve it via the backend at `http://localhost:5000`

---

## 🛠️ Tech Stack

| Layer     | Technology                     |
|-----------|-------------------------------|
| Frontend  | HTML5, CSS3, JavaScript (Vanilla) |
| Backend   | Node.js, Express.js            |
| Database  | MySQL / MySQL2                 |
| Auth      | JWT, Bcryptjs                  |
| Email     | Nodemailer (SMTP)              |

---

## ⚙️ Environment Variables

See `.env.example` for all required variables.

---

## 📄 License

ISC © Glamorous Salon
