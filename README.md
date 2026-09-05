# 🎓 Learning Management System (LMS)

A modern, full-stack e-learning platform built with the **MERN stack**, where educators can create and sell courses, and students can browse, purchase, and learn from video-based courses with progress tracking and ratings.

---

## 🌐 Live Demo

- **Frontend:** [https://lms-client-ds4s.onrender.com](https://lms-client-ds4s.onrender.com)
- **Backend API:** [https://lms-server-03ij.onrender.com](https://lms-server-03ij.onrender.com)

---

## 🌟 Features

### For Students
- 📚 Browse and enroll in various courses
- 💳 Secure payment processing with Stripe
- 📝 Track lecture-by-lecture learning progress
- ⭐ Rate and review purchased courses
- 👤 Personalized "My Enrollments" dashboard
- 🎯 Access to enrolled course video content

### For Educators
- 📝 Create and manage courses with a rich text editor
- 📊 Track student enrollments per course
- 💰 Manage course pricing and discounts
- 📈 View earnings and dashboard analytics
- 🖼️ Upload course thumbnails via Cloudinary
- 📹 Organize course content into chapters and lectures

### General
- 🔐 Secure authentication with Clerk
- 💫 Modern, responsive UI with Tailwind CSS
- ⚡ Stripe webhook–driven automatic enrollment after payment
- 📱 Mobile-friendly design
- 🔍 Course search and filtering
- 🎨 Clean course cards and layout

---

## 🛠️ Technology Stack

**Frontend**
- React 19 + Vite
- React Router DOM v7
- Tailwind CSS
- Clerk React (authentication UI)
- Axios (API requests)
- React Quill (rich text course descriptions)
- React YouTube (video player)
- React Toastify (notifications)
- rc-progress (progress bars)

**Backend**
- Node.js & Express.js
- MongoDB with Mongoose ODM
- Clerk Express SDK (authentication & middleware)
- Stripe (payments + webhooks)
- Cloudinary (image uploads)
- Multer (file upload handling)
- Svix (webhook signature verification)

**Hosting**
- Frontend deployed as a **Static Site** on [Render](https://render.com)
- Backend deployed as a **Web Service** on [Render](https://render.com)

**Security Features**
- Clerk-based session/token authentication
- Verified Stripe & Clerk webhook signatures
- Environment variable–protected secrets
- Input validation on API routes

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (Atlas or local)
- Clerk account (for auth)
- Stripe account (for payments)
- Cloudinary account (for image uploads)

### 1. Clone the repository
```bash
git clone https://github.com/shubhamshrivastav1/lms-main.git
cd lms-main
```

### 2. Install dependencies
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 3. Set up environment variables

Create `.env` files in **both** `client/` and `server/` — never commit these to Git.

**`server/.env`**
```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_signing_secret

CLOUDINARY_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET_KEY=your_cloudinary_api_secret

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_signing_secret

CURRENCY=USD
```

**`client/.env`**
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_BACKEND_URL=http://localhost:5000
VITE_CURRENCY=$
```

> ⚠️ The Stripe secret key and the Stripe CLI/webhook endpoint **must belong to the same Stripe account**. Verify with `stripe config --list` before testing payments — an account mismatch is the most common reason webhooks silently fail to fire.

### 4. Start the application
```bash
# Start backend
cd server
npm start          # or: npm run server (with nodemon auto-restart)

# Start frontend (new terminal)
cd client
npm run dev
```
- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:5173`

### 5. Forward Stripe webhooks locally
Enrollment only happens once Stripe's webhook reaches your server. Use the Stripe CLI in development:
```bash
stripe login
stripe listen --forward-to localhost:5000/stripe
```
Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET` in `server/.env`, then restart the server.

---

## 📱 Application Structure

```
lms-main/
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── assets/          # Images, icons, static data
│   │   ├── components/      # Reusable UI components (student/educator)
│   │   ├── context/         # React context providers (AppContext)
│   │   └── pages/           # Page components (student/educator routes)
│   └── public/               # Static assets
│
└── server/                  # Backend Node.js application
    ├── configs/              # DB, Cloudinary, Multer configuration
    ├── controllers/          # Request handlers (courses, educator, user, webhooks)
    ├── middlewares/          # Auth middleware (Clerk)
    ├── models/               # Mongoose models (User, Course, Purchase, Progress)
    ├── routes/               # API route definitions
    └── server.js             # App entry point
```

---

## 🌐 Deployment (Render)

Frontend and backend are deployed as **two separate services** from the same repository.

### Backend — Web Service
| Setting | Value |
|---|---|
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Environment Variables | Same keys as `server/.env` |

### Frontend — Static Site
| Setting | Value |
|---|---|
| Root Directory | `client` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |
| Environment Variables | Same keys as `client/.env`, with `VITE_BACKEND_URL` pointed at the deployed backend URL |

Since this is a single-page React app, a rewrite rule is needed so routes like `/my-enrollments` or `/player/:id` don't 404 on refresh:

- Render → Static Site → **Redirects/Rewrites** → add `Source: /*`, `Destination: /index.html`, `Action: Rewrite`
- Or add a `client/public/_redirects` file with:
  ```
  /*    /index.html   200
  ```

### Production Stripe Webhook
1. Stripe Dashboard → **Webhooks** → **Add endpoint**
2. URL: `https://<your-backend-domain>/stripe`
3. Event: `checkout.session.completed`
4. Copy the new signing secret into the backend's `STRIPE_WEBHOOK_SECRET` env var on Render, then redeploy.

### Clerk Production Settings
Add the deployed frontend domain to Clerk's allowed origins/redirect URLs so authentication works outside `localhost`.

---

## 🔄 How Payments & Enrollment Work

```
Student clicks "Enroll Now"
        ↓
Backend creates a Stripe Checkout Session
        ↓
Student completes payment on Stripe
        ↓
Stripe sends "checkout.session.completed" to /stripe
        ↓
webhooks.js verifies the signature (STRIPE_WEBHOOK_SECRET)
        ↓
Server adds the course to user.enrolledCourses in MongoDB
        ↓
Course appears under "My Enrollments"
```

---

## 🔒 Security

- Authentication handled by Clerk
- Secure payment processing with Stripe
- Verified webhook signatures (Stripe + Clerk)
- Secure image uploads via Cloudinary
- Environment variables kept out of version control
- **Never** paste `.env` contents or raw API keys into chats, screenshots, or public repos — rotate any credential immediately if it's ever exposed

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repo and submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

---

## 📞 Contact

**Shubham Shrivastav**
GitHub: [@shubhamshrivastav1](https://github.com/shubhamshrivastav1)
