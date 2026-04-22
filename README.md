# DriveEasy - Premium Car Rental Application

A full-stack web application for renting premium cars, built with Node.js, Express, SQLite, and Vanilla JavaScript.

## Features

- **User Authentication**: Secure register and login system using JWT and bcrypt.
- **Car Catalog**: Browse a fleet of premium vehicles with seat count and fuel type details.
- **Dynamic Booking**: User-friendly calendar (Flatpickr) to select rental dates with automatic price calculation.
- **Booking Management**: Users can view their reservation history and cancel active bookings.
- **Admin Dashboard**: Manage the fleet (add/delete cars) and oversee all user bookings.
- **Modern UI**: Sleek, responsive design built with core CSS and Google Fonts (Poppins & Inter).

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (better-sqlite3)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, jQuery (available via CDN), Font Awesome.
- **Libraries**: Flatpickr (Calendar), JSONWebToken (Auth).

## Project Structure

```text
driveeasy/
├── backend/
│   ├── server.js        ← API routes and logic
│   ├── db.js            ← Database initialization and seeding
│   ├── package.json     ← Backend dependencies
│   └── database.sqlite  ← SQLite database file (generated on start)
├── frontend/
│   ├── index.html       ← Landing page
│   ├── cars.html        ← Car catalog
│   ├── car-detail.html  ← Booking page
│   ├── login.html       ← Login
│   ├── register.html    ← Registration
│   ├── profile.html     ← Personal bookings
│   ├── admin.html       ← Admin management
│   ├── css/
│   │   └── style.css    ← Custom design system
│   └── js/
│       ├── main.js      ← Global utilities & Nav
│       ├── cars.js      ← Catalog logic
│       ├── car-detail.js ← Booking & Flatpickr
│       ├── profile.js   ← User history
│       ├── admin.js     ← Admin dashboard
│       └── auth.js      ← Login/Register logic
└── README.md
```

## Getting Started

### Prerequisites

- Node.js installed on your system.

### Installation

1. Navigate to the backend directory:
   ```bash
   cd driveeasy/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node server.js
   ```

The backend will run on `http://localhost:3000`.

### Running the Frontend

The frontend is built with vanilla technologies and can be served using any static file server.

- **Using Python**:
  ```bash
  cd driveeasy/frontend
  python -m http.server 8000
  ```
- **Using VS Code**: Right-click `index.html` and select "Open with Live Server".

## Admin Access

Seeded Admin account:
- **Email**: `admin@driveeasy.com`
- **Password**: `admin123`

## License

MIT
