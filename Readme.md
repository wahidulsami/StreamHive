<div align="center">

# 🎥 YouTube-Inspired Backend System

### A scalable REST API backend for a modern video sharing platform.

Built with **Node.js**, **Express.js**, and **MongoDB**

[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js)]()
[![Express](https://img.shields.io/badge/Express.js-5-black?style=for-the-badge&logo=express)]()
[![MongoDB](https://img.shields.io/badge/MongoDB-8+-47A248?style=for-the-badge&logo=mongodb)]()
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)]()

</div>

---

## 🚀 Overview

A production-ready backend system inspired by YouTube, providing secure authentication, video management, media uploads, and social features.

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

### Prerequisites

- Docker and Docker Compose installed

### Quick Start with Docker

1. Create your `.env` file:

```bash
cp .env.example .env
```

2. Fill in the required variables in `.env`. For Docker, set strong unique values for:

```env
ACCESS_TOKEN_SECRET=use-a-long-random-secret
REFRESH_TOKEN_SECRET=use-another-long-random-secret
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD=use-a-long-random-password
MONGO_INITDB_DATABASE=youtube
```

> Docker generates `MONGODB_URI` inside the backend container and safely URL-encodes the MongoDB credentials. Do not put a Docker `localhost` URI in `.env`.

3. Build and start:

```bash
docker compose up --build
```

4. The API is available at `http://localhost:8000`

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
```

### MongoDB

- MongoDB is private to the Compose network and is not published to the host
- Data is persisted in a named Docker volume (`mongodb_data`)
- The database name is `youtube` (set in `src/constants.js`)

### Health Checks

- Backend: `GET /health` — used by Docker and orchestrators
- MongoDB: `mongosh` ping — used by Docker Compose

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

