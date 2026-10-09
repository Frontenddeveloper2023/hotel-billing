# StayLio – SaaS Hotel Billing Management System

StayLio is a web-based hotel management and billing platform designed to simplify daily hotel operations. It provides tools for room booking, customer management, food and service tracking, invoice generation, reporting, branch management, and subscription plan management through a centralized interface.

The platform is designed with a responsive user interface to support desktop, tablet, and mobile screens.

## Features

- **Dashboard** – View hotel operations and key business information.
- **Room Booking** – Manage room bookings and guest stays.
- **Food Management** – Manage food items and related operations.
- **Service Management** – Track hotel services.
- **Customer Management** – Maintain customer information and records.
- **Invoice Management** – Manage billing and invoice records.
- **Reports** – Access hotel business and operational reports.
- **Branch Management** – Organize hotel branches.
- **Settings** – Configure hotel-specific settings and billing policies.
- **Subscription Management** – View and manage available plans.
- **Hotel Registration** – Complete the registration workflow: Choose Plan → Hotel Details → Checkout → Payment → Application Status.
- **Responsive UI** – Designed for desktop, tablet, and mobile devices.
- **Role-Based Access** – Intended to support permissions based on user roles, where configured.

## Technology Stack

### Frontend
- React.js
- Vite
- JavaScript
- Tailwind CSS
- Axios

### Backend
- Node.js
- Express.js
- REST APIs

### Database
- MongoDB
- Mongoose

### Development Tools
- Git and GitHub
- npm
- VS Code

## Project Structure

```text
StayLio/
├── frontend/       # React frontend application
├── backend/        # Node.js and Express backend
└── README.md
```

*The exact folder structure may vary depending on the current repository setup.*

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js and npm
- MongoDB instance or MongoDB Atlas connection
- Git

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd StayLio
```

Replace the placeholder with your actual repository URL.

### 2. Configure the Backend

```bash
cd backend
npm install
```

Create a `.env` file inside the backend directory using the variable names required by your application.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
```

Ensure the variable names match those used in your backend code. Add any other required credentials for services integrated into your project.

Start the backend using the script defined in `backend/package.json`. For example:

```bash
npm run dev
```

### 3. Configure the Frontend

Open a separate terminal:

```bash
cd frontend
npm install
```

Create a frontend `.env` file if required by your application.

Example:

```env
VITE_BACKEND_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Open the local URL displayed by Vite in your terminal.

## Responsive Testing

StayLio pages should be tested at the following viewport widths:

| Viewport | Device category |
|---|---|
| 1440px | Desktop |
| 1024px | Small laptop / tablet landscape |
| 768px | Tablet |
| 425px | Mobile |
| 375px | Small mobile |

Check navigation, page layout, forms, tables, buttons, scrolling, and content overflow at each viewport. Record results in the responsive QA checklist.

## Environment & Security

- Keep `.env` files out of version control.
- Add `.env` and other secret files to `.gitignore`.
- Never commit database credentials, JWT secrets, API keys, or payment credentials.
- Configure production environment variables through your hosting provider.
- Validate authentication and authorization on the backend, not only in the frontend.
- Restrict access to hotel data according to the authenticated user's permissions and tenant/branch scope.

## Git Workflow

Check the current changes:

```bash
git status
```

Stage the README:

```bash
git add README.md
```

Commit the changes:

```bash
git commit -m "docs: add professional project README"
```

Push to GitHub:

```bash
git push origin main
```

If your default branch has a different name, replace `main` with that branch name.

## Future Improvements

Potential enhancements include:

- Advanced analytics and reporting
- Improved role and permission management
- Automated testing for responsive layouts
- Enhanced subscription and billing workflows
- Additional integrations and deployment automation

## License

Add the appropriate license before distributing or open-sourcing this project.

---

**StayLio – Simplifying Hotel Operations and Billing.**
