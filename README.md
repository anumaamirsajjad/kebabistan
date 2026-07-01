📖 Project Description
Kebabistan is a modern, full-stack web application designed for a premium kebab and grill restaurant. It provides a beautiful, animated customer-facing landing page complete with a live interactive menu, a floating shopping cart for online delivery orders, and a table reservation system. Behind the scenes, it features a secure admin dashboard where restaurant staff can track revenue, process incoming orders, update menu stock, and manage table bookings in real time.

🛠️ Tech Stack
Frontend: Vanilla HTML, CSS, and JavaScript. It uses GSAP (GreenSock) for smooth scroll animations and parallax effects.
Backend: Node.js with the Express.js framework handling API requests.
Database: PostgreSQL (Supabase).
🗄️ The Database
The app uses PostgreSQL via DATABASE_URL (Supabase supported). When you run the server, src/db.js checks if tables exist and creates/seeds defaults (menu and reviews) when needed.

🌐 Vercel Frontend + Separate Backend
If your frontend is deployed on Vercel and backend is deployed elsewhere, set your backend URL in public/config.js:

window.APP_CONFIG = {
	apiBaseUrl: "https://your-backend-domain.com"
};

This makes frontend calls like /api/menu, /api/orders, and /api/reservations target your backend domain in production.

🚀 How to View It
Run the command npm run dev (or npm start) in your terminal from the project folder.
Open your browser and go to: http://localhost:3000 for the customer site.
To view the admin panel, go to: http://localhost:3000/admin.html
📂 File Structure Breakdown
public/index.html: The main customer-facing website. Contains all the frontend layout, styles, and Javascript for the cart, reservations, and GSAP animations.
public/admin.html: The admin dashboard layout. Contains the logic for fetching live stats, managing orders, and rendering charts.
src/server.js: The main Express server file. It sets up the server, handles middleware, and serves the static files from the public/ directory.
src/routes.js: Contains all the API routes (e.g., GET /api/menu, POST /api/orders, POST /api/auth/login).
src/db.js: Handles all the raw SQLite database queries, connections, and the initial data seeding.
