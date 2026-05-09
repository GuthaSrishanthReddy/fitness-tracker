# Fitness Tracker

Monorepo for an AI-powered fitness tracker with:
- `frontend` (React + Vite + TypeScript)
- `backend` (Express + Prisma + TypeScript)

## Project Structure

```text
fitness-tracker/
  backend/
  frontend/
```

## Quick Start

1. Install backend dependencies:
```bash
cd backend
npm install
```

2. Create the root env file:
```bash
# .env
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
GOOGLE_API_KEY=your-google-api-key
SPOONACULAR_API_KEY=your-spoonacular-api-key
```

3. Generate Prisma client and run migrations:
```bash
npx prisma generate
npx prisma migrate dev
```

4. Start backend:
```bash
npm run dev
```

5. In another terminal, install and start frontend:
```bash
cd frontend
npm install
npm run dev
```

## Frontend API Base

Frontend uses:
- `VITE_API_BASE_URL` if provided
- otherwise defaults to `/api`

If frontend and backend run on different origins in development, set:
```bash
# .env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Documentation

- Frontend details: `frontend/README.md`
- Backend details: `backend/README.md`
