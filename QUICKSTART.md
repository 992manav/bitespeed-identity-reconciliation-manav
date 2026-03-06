# Quick Start Guide

Welcome to the Bitespeed Identity Reconciliation API! This guide will get you up and running in minutes.

## 📋 Prerequisites

- **Node.js 18+** or **Docker**
- **PostgreSQL 12+** (or use Docker)
- **npm** or **yarn**

## 🚀 Quick Start (3 Steps)

### Option 1: Docker Compose (Recommended - Easiest)

```bash
# Start everything with one command
docker-compose up --build

# In another terminal, seed sample data (optional)
docker-compose exec app npm run seed
```

Your API is now at: `http://localhost:3000`

### Option 2: Local Development

```bash
# 1. Install dependencies
npm install

# 2. Setup PostgreSQL and update .env
# Make sure PostgreSQL is running
# Update DATABASE_URL in .env if needed

# 3. Push schema and start
npm run prisma:push
npm run dev
```

Your API is now at: `http://localhost:3000`

## 📡 Test the API

### Health Check

```bash
curl http://localhost:3000/health
```

### Create/Identify Contact

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "phoneNumber": "+1234567890"
  }'
```

### Expected Response

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["john@example.com"],
    "phoneNumbers": ["+1234567890"],
    "secondaryContactIds": []
  }
}
```

## 📁 Project Structure

```
├── src/
│   ├── index.ts               # Express app
│   ├── routes/index.ts        # /identify endpoint
│   ├── services/              # Business logic
│   ├── config/                # Database config
│   ├── types/                 # TypeScript interfaces
│   └── utils/                 # Utilities (logger)
│
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
│
├── Dockerfile                 # Container image
├── docker-compose.yml         # Local dev setup
├── README.md                  # Full documentation
├── DEPLOYMENT.md              # Deploy to Render
├── ARCHITECTURE.md            # Design decisions
└── TESTING.md                 # Testing guide
```

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start dev server (auto-reload)
npm run build            # Build TypeScript
npm start                # Run production build

# Database
npm run prisma:push      # Apply schema to DB
npm run prisma:migrate   # Create migrations
npm run seed             # Seed sample data
npm run prisma:generate  # Generate Prisma client

# Code Quality
npm run lint             # Run ESLint
npm test                 # Run tests (if configured)
```

## 🌍 Deploy to Render (Free!)

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create PostgreSQL database
4. Create Web Service, connect GitHub repo
5. Set environment variables:
   ```
   DATABASE_URL=<postgres-url>
   NODE_ENV=production
   ```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 📚 Full Documentation

| Document                           | Purpose                                               |
| ---------------------------------- | ----------------------------------------------------- |
| [README.md](README.md)             | Complete API documentation, examples, troubleshooting |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, patterns, performance optimization     |
| [DEPLOYMENT.md](DEPLOYMENT.md)     | Step-by-step Render deployment instructions           |
| [TESTING.md](TESTING.md)           | Unit tests, integration tests, load testing           |

## 🎯 Key Features

✅ **Identity Consolidation** - Merge contacts by email/phone  
✅ **Primary Contact Logic** - Oldest stays primary, new becomes secondary  
✅ **Type-Safe** - Full TypeScript coverage  
✅ **Production-Ready** - Error handling, logging, health checks  
✅ **Scalable** - Database indexes, connection pooling  
✅ **Containerized** - Docker & Docker Compose support  
✅ **Well-Documented** - 4 comprehensive guides

## 🔍 API Endpoints

### POST /identify

Identify/consolidate customer contacts. If customer exists, links them. Otherwise creates new primary contact.

**Request:**

```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

**Response:**

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["john@example.com"],
    "phoneNumbers": ["+1234567890"],
    "secondaryContactIds": [2, 3]
  }
}
```

### GET /health

Health check for monitoring.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 💾 Database Schema

```sql
CREATE TABLE contacts (
  id                INTEGER PRIMARY KEY,
  email             VARCHAR(255),
  phoneNumber       VARCHAR(255),
  linkedId          INTEGER,
  linkPrecedence    VARCHAR(10),    -- 'primary' or 'secondary'
  createdAt         TIMESTAMP,
  updatedAt         TIMESTAMP,
  deletedAt         TIMESTAMP
);
```

## 🧪 Test Scenarios

### New Customer

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com"}'
# Creates new primary contact
```

### Existing Customer Link

```bash
# First: create contact with email
# Then: identify with phone from same person
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+1234567890"}'
# Links phone to existing email contact
```

### Merge Multiple Primaries

```bash
# If two separate primary contacts exist
# And you identify with data matching both
# The newer primary becomes secondary linked to the older
```

## 🆘 Troubleshooting

### "Connection refused"

PostgreSQL is not running. Start it:

```bash
# Docker Compose
docker-compose up postgres

# Or local PostgreSQL
psql -U postgres
```

### "Port 3000 already in use"

```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Database migration issues

```bash
# Reset and start fresh (warning: deletes data)
npm run prisma:migrate -- --reset
npm run seed
```

## 📝 Environment Variables

```env
PORT=3000                    # API port
NODE_ENV=development         # dev or production
DATABASE_URL=postgresql://...  # Postgres connection string
CORS_ORIGIN=*               # CORS allowed origins
```

## 🔐 Security Notes

- Never commit `.env` to git (already in `.gitignore`)
- Use environment variables for secrets
- In production, set `NODE_ENV=production`
- Enable CORS properly for your domain
- Keep dependencies updated: `npm audit fix`

## 💡 Next Steps

1. **Explore the API** - Try different request combinations
2. **Read the full README** - Understand all features and examples
3. **Deploy to Render** - Follow DEPLOYMENT.md for step-by-step guide
4. **Add more features** - Extend with authentication, analytics, etc.
5. **Set up testing** - See TESTING.md for test examples

## 📞 Support

- Check [README.md](README.md) for FAQ
- Review [ARCHITECTURE.md](ARCHITECTURE.md) for design questions
- See [TESTING.md](TESTING.md) for testing help
- Check logs: `docker-compose logs app` or `npm run dev`

## 🎉 You're Ready!

Your production-ready backend is set up. Start exploring!

```bash
# Get started now
npm run dev

# Or with Docker
docker-compose up --build
```

Happy coding! 🚀

---

**Questions?** Check the detailed guides:

- 📖 [Full README](README.md)
- 🏗️ [Architecture Guide](ARCHITECTURE.md)
- 🚢 [Deployment Guide](DEPLOYMENT.md)
- 🧪 [Testing Guide](TESTING.md)
