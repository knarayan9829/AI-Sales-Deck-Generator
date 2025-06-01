# SalesDeck Fullstack App (v2)

This project implements a file manager with persistent uploads.

## Setup Instructions

### 1. Install dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Create a .env file

Inside `server/`, create a `.env` based on `.env.example`.

### 3. Run

- Backend: `cd server && npm start`
- Frontend: `cd client && npm run dev`

Uploaded files are saved in `server/uploads` and served at `http://localhost:5000/uploads/<filename>`.