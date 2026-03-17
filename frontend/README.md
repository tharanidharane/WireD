# Wired Chat

A full-stack MERN real-time chat application with JWT auth, friend requests, image/video sharing, and Socket.io powered live updates.

## Project Structure

```text
server/  Express + MongoDB + Socket.io backend
client/  React + Vite frontend
```

## Quick Start

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

## Important MongoDB Note

Your provided password contains `@`, which must be URL-encoded inside a MongoDB connection string.

Use this in `server/.env`:

```env
MONGO_URI=mongodb+srv://tharanidharane:Quants%401209@cluster0.v5byibx.mongodb.net/chatapp?retryWrites=true&w=majority&appName=Cluster0
```

## Features

- Email/password signup and login
- JWT-protected APIs
- Real-time one-to-one chat
- Image and video uploads
- Friend search, requests, and acceptance
- Online/offline presence
- Typing indicators
- Responsive modern UI
