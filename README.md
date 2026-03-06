# Bitespeed Identity Reconciliation API

A production-ready Node.js backend API for identifying and reconciling customer identities across multiple contact points (email and phone number).

## Overview

The Bitespeed Identity Reconciliation API helps you:

- Identify customers even when they use different emails or phone numbers
- Consolidate fragmented customer records
- Maintain a clear hierarchy of primary and secondary contacts
- Query and merge customer identities seamlessly

## Features

✅ **RESTful API** - Clean, intuitive endpoints  
✅ **Identity Consolidation** - Automatically merge related contacts  
✅ **Primary Contact Management** - Maintain oldest as primary  
✅ **TypeScript** - Full type safety  
✅ **PostgreSQL** - Reliable relational database  
✅ **Prisma ORM** - Type-safe database access  
✅ **Docker Ready** - Docker and Docker Compose support  
✅ **Production Quality** - Error handling, logging, and health checks

## Prerequisites

- **Node.js** 18+ or **Docker**
- **PostgreSQL** 12+ (or use Docker)
- **npm** or **yarn**

## Project Structure

```
bitespeed-identity-reconciliation/
├── src/
│   ├── config/
│   │   └── database.ts          # Prisma client configuration
│   ├── services/
│   │   └── identityService.ts   # Core business logic
│   ├── routes/
│   │   └── index.ts             # API endpoints
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   ├── utils/
│   │   └── logger.ts            # Logging utility
│   ├── index.ts                 # Express app setup
│   └── seed.ts                  # Database seeding
├── prisma/
│   └── schema.prisma            # Database schema
├── Dockerfile                   # Container image definition
├── docker-compose.yml           # Local development setup
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies
├── .env.example                # Environment variables template
└── README.md
```

## Installation & Setup

### Option 1: Local Development (Node.js)

#### 1. Clone and Install

```bash
git clone <repository-url>
cd bitespeed-identity-reconciliation
npm install
```

#### 2. Set Up Database

Ensure PostgreSQL is running locally. Update `.env`:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/bitespeed_dev"
```

#### 3. Run Migrations

```bash
npm run prisma:push
```

#### 4. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

#### 5. (Optional) Seed Sample Data

```bash
npm run seed
```

### Option 2: Docker Compose (Recommended)

All dependencies (Node.js + PostgreSQL) are automatically managed:

```bash
docker-compose up --build
```

This starts:

- **App**: `http://localhost:3000`
- **PostgreSQL**: `localhost:5432` (with auto-created database)

To stop:

```bash
docker-compose down
```

To seed data:

```bash
docker-compose exec app npm run seed
```

## API Documentation

### POST /identify

Identifies a customer based on email and/or phone number. If the customer exists, consolidates their identity; otherwise, creates a new primary contact.

#### Request

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "phoneNumber": "+1234567890"
  }'
```

#### Request Body

```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

**Requirements:**

- At least one of `email` or `phoneNumber` must be provided
- Email format: valid email address
- Phone format: any string (can include +, spaces, dashes)

#### Response (200 OK)

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["john@example.com", "john@gmail.com"],
    "phoneNumbers": ["+1234567890", "+9876543210"],
    "secondaryContactIds": [2, 3]
  }
}
```

#### Response Fields

- **primaryContactId** (number): The ID of the primary contact
- **emails** (array): All emails associated with this customer
- **phoneNumbers** (array): All phone numbers associated with this customer
- **secondaryContactIds** (array): IDs of secondary contacts linked to the primary

#### Error Responses

**400 Bad Request** - Missing both email and phoneNumber:

```json
{
  "error": "Either email or phoneNumber must be provided"
}
```

**500 Internal Server Error**:

```json
{
  "error": "Internal server error"
}
```

### GET /health

Health check endpoint for monitoring.

#### Response (200 OK)

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Database Schema

### Contact Table

```sql
CREATE TABLE contacts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  phoneNumber      VARCHAR(255),
  email            VARCHAR(255),
  linkedId         INTEGER,
  linkPrecedence   VARCHAR(10),  -- 'primary' or 'secondary'
  createdAt        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt        TIMESTAMP,

  FOREIGN KEY(linkedId) REFERENCES contacts(id)
);
```

#### Fields

- **id**: Unique contact identifier
- **email**: Contact email (nullable, indexed)
- **phoneNumber**: Contact phone (nullable, indexed)
- **linkedId**: ID of primary contact this is linked to (nullable)
- **linkPrecedence**: "primary" or "secondary"
  - **primary**: Original/oldest contact
  - **secondary**: Later contacts merged/linked to primary
- **createdAt**: Contact creation timestamp
- **updatedAt**: Last update timestamp
- **deletedAt**: Soft delete timestamp (nullable)

## Business Logic

### Scenario 1: New Customer

```
Request: { "email": "alice@example.com", "phoneNumber": "+1111111111" }

Result:
- Creates new Contact with linkPrecedence = "primary"
- No linkedId
- Returns primaryContactId with all emails/phones
```

### Scenario 2: Existing Customer (Same Email/Phone)

```
Request: { "email": "alice@example.com", "phoneNumber": "+2222222222" }

Result:
- Email already exists as primary contact #1
- Creates new secondary Contact linked to #1
- Returns all consolidated emails/phones for customer
```

### Scenario 3: Multiple Primary Contacts (Merge)

```
Existing Data:
- Contact #1 (primary): email="alice@example.com", createdAt=2024-01-10
- Contact #2 (primary): email="alice.work@example.com", createdAt=2024-01-15

Request: { "email": "alice@example.com", "phoneNumber": "+3333333333" }

Result:
- Contact #1 is newer, so stays primary
- Contact #2 is converted to secondary linked to #1
- New contact created as secondary
- Returns all emails/phones consolidated under #1
```

### Scenario 4: Already Linked Contact

```
Existing Data:
- Contact #1 (primary, email="alice@example.com")
- Contact #2 (secondary, linkedId=#1, phone="+4444444444")

Request: { "email": "alice@example.com" }

Result:
- Contact already linked correctly
- Returns consolidated response with no new records created
```

## Development Commands

```bash
# Install dependencies
npm install

# Type-check TypeScript
npm run build

# Start dev server with auto-reload
npm run dev

# Generate Prisma client
npm run prisma:generate

# Push schema to database (no migration files)
npm run prisma:push

# Run database migrations (creates migration files)
npm run prisma:migrate

# Seed sample data
npm run seed

# Lint code
npm run lint
```

## Environment Variables

Create a `.env` file from `.env.example`:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# CORS (optional)
CORS_ORIGIN=*
```

### For Production (Render)

```env
NODE_ENV=production
PORT=10000  # Render default
DATABASE_URL=<your-postgres-url>
CORS_ORIGIN=https://your-frontend-domain.com
```

## Deployment on Render

### 1. Create PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **PostgreSQL**
3. Set name, database name, user, password
4. Create and note the `Internal Database URL`

### 2. Deploy Application

1. Push code to GitHub

2. In Render Dashboard, click **New** → **Web Service**

3. Connect GitHub repository

4. Configure:

   ```
   Name: bitespeed-identity-reconciliation
   Environment: Node
   Build Command: npm install && npm run build && npm run prisma:push
   Start Command: node dist/index.js
   ```

5. Add environment variables:

   ```
   NODE_ENV=production
   DATABASE_URL=<internal-database-url-from-step-1>
   ```

6. Deploy

### 3. Test Deployed API

```bash
curl -X POST https://your-app.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "phoneNumber": "+1234567890"}'
```

## Example Usage

### Scenario: E-commerce Customer

```bash
# First order with email
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com"}'

# Response
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["john@example.com"],
    "phoneNumbers": [],
    "secondaryContactIds": []
  }
}

# Second order with phone
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'

# Response
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["john@example.com"],
    "phoneNumbers": ["+1234567890"],
    "secondaryContactIds": [2]
  }
}

# Third order with different email
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "john@gmail.com"}'

# Response - Consolidated
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["john@example.com", "john@gmail.com"],
    "phoneNumbers": ["+1234567890"],
    "secondaryContactIds": [2, 3]
  }
}
```

## Logging

The API includes structured logging. Set `NODE_ENV=production` to disable debug logs:

```javascript
// Log output
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "message": "Identify request processed successfully",
  "data": {
    "primaryContactId": 1
  }
}
```

## Error Handling

- **Validation Errors**: 400 Bad Request
- **Not Found**: 404 Not Found
- **Server Errors**: 500 Internal Server Error

All errors are logged with context for debugging.

## Performance Considerations

- **Indexes**: Contacts table indexed on `phoneNumber`, `email`, `linkedId`, and `createdAt` for fast lookups
- **Soft Deletes**: `deletedAt` field allows logical deletion without losing data
- **Connection Pooling**: Prisma includes connection pooling for optimal database performance

## Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:3000/health

# Identify with email
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Identify with phone
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'

# Identify with both
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "phoneNumber": "+1234567890"}'
```

### Using Postman/Insomnia

1. Create a new POST request to `http://localhost:3000/identify`
2. Set header: `Content-Type: application/json`
3. Add JSON body:
   ```json
   {
     "email": "example@test.com",
     "phoneNumber": "+1234567890"
   }
   ```
4. Send request

## Troubleshooting

### Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Ensure PostgreSQL is running. For Docker Compose, run:

```bash
docker-compose up -d postgres
```

### Port Already in Use

```
Error: listen EADDRINUSE :::3000
```

**Solution**: Change `PORT` in `.env` or kill the process using port 3000:

```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Prisma Migration Issues

```bash
# Reset database (warning: deletes all data)
npm run prisma:migrate -- --reset

# Or start fresh
npm run prisma:push
npm run seed
```

## Security Best Practices (Production)

1. **Environment Variables**: Never commit `.env` to version control
2. **HTTPS**: Use HTTPS in production (Render provides free SSL)
3. **CORS**: Set `CORS_ORIGIN` to your frontend domain
4. **Input Validation**: Current implementation validates email/phone presence
5. **Rate Limiting**: Add rate limiting middleware for production:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/identify', limiter);
```

6. **Database Backups**: Enable automatic backups on Render

## Architecture Highlights

### Service-Oriented Design

- `identityService.ts`: Core business logic (separated from routes)
- Controller layer: Routes handle HTTP concerns

### Type Safety

- Full TypeScript coverage
- Prisma-generated types ensure database consistency
- Explicit interfaces for all API inputs/outputs

### Error Handling

- Structured logging for debugging
- Graceful error responses
- Health check endpoint for monitoring

### Scalability

- Connection pooling via Prisma
- Database indexes for O(1) lookups
- Stateless API (scales horizontally)

## License

MIT

## Support

For issues or questions, please open an issue in the repository.

---

**Built with ❤️ for customer identity management**
