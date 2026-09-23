<div align="center">

# 🎥 StreamHive Backend

### A scalable REST API backend for the StreamHive video-sharing platform.

Built with **Node.js**, **Express.js**, and **MongoDB**

[![CI](https://github.com/wahidulsami/backend/actions/workflows/ci.yml/badge.svg)](https://github.com/wahidulsami/backend/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js)]()
[![Express](https://img.shields.io/badge/Express.js-5-black?style=for-the-badge&logo=express)]()
[![MongoDB](https://img.shields.io/badge/MongoDB-8+-47A248?style=for-the-badge&logo=mongodb)]()
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)]()


</div>

---

## 🚀 Overview

StreamHive is a video-sharing backend that provides authentication, video management, media uploads, and social features through a REST API.

Built with a clean architecture to support scalable and maintainable API development.

---

## ✨ Features

- 🔐 JWT Authentication & Authorization
- 👤 User Profile Management
- 🎥 Video CRUD Operations
- ☁️ Cloudinary Media Upload
- 💬 Comments System
- ❤️ Like / Unlike System
- 🔔 Channel Subscription
- 📂 Playlist Management
- 📝 Community Posts
- 📊 Creator Dashboard
- 🕒 Watch History

---

## 🛠️ Tech Stack

| Technology | Usage |
|---|---|
| Node.js | Backend Runtime |
| Express.js | API Framework |
| MongoDB | Database |
| Mongoose | ODM |
| JWT | Authentication |
| Cloudinary | Media Storage |
| Multer | File Upload |
| Nodemailer | Email Service |

---

## 📁 Project Structure

```text
src/
├── controllers
├── models
├── routes
├── middlewares
├── utils
├── db
├── app.js
└── index.js
```

---

## ⚡ Quick Start

```bash
git clone https://github.com/wahidulsami/backend.git

cd backend

npm install

npm run dev
```

Create `.env`:

```env
PORT=8000
MONGODB_URI=

ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 🐳 Docker

StreamHive runs as two Docker Compose services:

```text
Client
  │
  ▼
StreamHive backend :8000
  │
  │ internal network: mongodb:27017
  ▼
MongoDB 8 ── named volume: mongodb_data
```

- `backend` runs the Node.js/Express API as a non-root user.
- `mongodb` runs MongoDB 8 with authentication enabled.
- MongoDB is reachable by the backend as `mongodb:27017`; it is not exposed on the host.
- The backend starts only after MongoDB passes its authenticated healthcheck.
- The named `mongodb_data` volume keeps database data when containers are recreated.
- Docker generates the internal `MONGODB_URI` and URL-encodes credentials safely.

### Prerequisites

- Docker and Docker Compose installed

### Quick Start with Docker

1. Create your local environment file. Never commit `.env`:

```bash
cp .env.example .env
```

2. Fill in the required variables in `.env`. Use strong, unique values:

```env
ACCESS_TOKEN_SECRET=use-a-long-random-secret
REFRESH_TOKEN_SECRET=use-another-long-random-secret
MONGO_INITDB_ROOT_USERNAME=streamhive_admin
MONGO_INITDB_ROOT_PASSWORD=use-a-long-random-password
MONGO_INITDB_DATABASE=youtube
```

> Docker generates `MONGODB_URI` inside the backend container and safely URL-encodes the MongoDB credentials. Do not put a Docker `localhost` URI in `.env`.

`MONGODB_URI` is generated automatically for Docker. Do not use `localhost` for the backend-to-MongoDB connection.

3. Build and start StreamHive:

```bash
docker compose up --build
```

4. The API is available at `http://localhost:8000`.

5. Verify the backend:

```bash
curl http://localhost:8000/health
docker compose ps
```

Both services should show as healthy.

### Managing Containers

```bash
# Stop containers
docker compose down

# Stop and remove volumes (deletes database data)
docker compose down -v

# View logs
docker compose logs backend
docker compose logs mongodb

# Rebuild after code changes
docker compose up --build

# Validate Compose configuration without starting services
docker compose config -q
```

### MongoDB

- MongoDB is private to the Compose network and is not published to the host
- Data is persisted in a named Docker volume (`mongodb_data`)
- The database name is `youtube` (set in `src/constants.js`).
- Do not run `docker compose down -v` unless you intentionally want to delete the database.

### Health Checks

- Backend: `GET /health` — used by Docker and orchestrators
- MongoDB: authenticated `db.adminCommand('ping')` — used by Docker Compose

### Docker startup flow

```text
docker compose up
      │
      ├── Start MongoDB with authentication
      ├── Wait for the authenticated MongoDB ping to pass
      ├── Generate the internal MongoDB URI for StreamHive
      ├── Validate environment variables with Zod
      ├── Connect Mongoose to MongoDB
      └── Start Express on port 8000
```

If required variables are missing or invalid, the backend exits safely and prints validation messages without printing secret values.

---

## 📡 API Modules

| Module | Description |
|---|---|
| Users | Authentication & profiles |
| Videos | Upload & management |
| Comments | User interactions |
| Likes | Engagement system |
| Subscriptions | Channel system |
| Playlists | Video collections |
| Dashboard | Creator analytics |

---

## 🏗️ Architecture

```text
Client
  |
Express API
  |
Controllers
  |
Models
  |
MongoDB
```

---


## 🤝 Contributing

Contributions are welcome.

Fork → Create Branch → Commit → Pull Request

---

## 📄 License

MIT License

---

## 👨‍💻 Author

**Wahidul Islam Sami**

GitHub: https://github.com/wahidulsami

