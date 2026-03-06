# Architecture Overview

This document describes the architecture and design patterns used in the Bitespeed Identity Reconciliation API.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client / Frontend                         │
│                    (Browser, Mobile, Desktop)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTPS/HTTP
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────┴─────┐    ┌────┴──────┐   ┌───┴──────┐
    │ Express  │    │  Express  │   │ Express  │
    │  Router  │    │  Router   │   │  Router  │
    └────┬─────┘    └────┬──────┘   └───┬──────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
    ┌────┴──────────┐            ┌──────┴──────────┐
    │ Request Body  │            │ Route Handler   │
    │ Validation    │            │ (/identify)     │
    └────┬──────────┘            └──────┬──────────┘
         │                               │
         └───────────────┬───────────────┘
                         │
         ┌───────────────┴────────────────┐
         │                                │
    ┌────┴──────────────┐        ┌────────┴──────────────┐
    │ IdentityService   │        │   Logger & Error     │
    │                   │        │   Handling           │
    │ - identify()      │        └──────────────────────┘
    │ - createPrimary() │
    │ - linkContact()   │
    │ - mergePrimaries()│
    │ - buildResponse() │
    └────┬──────────────┘
         │
         │ Prisma ORM
         │
    ┌────┴──────────────┐
    │  PostgreSQL DB    │
    │                   │
    │ - contacts table  │
    │ - indexes         │
    │ - constraints     │
    └───────────────────┘
```

## Directory Structure

```
bitespeed-identity-reconciliation/
│
├── src/                          # Source code
│   ├── config/
│   │   └── database.ts          # Prisma client initialization
│   │
│   ├── services/
│   │   └── identityService.ts   # Core business logic
│   │
│   ├── routes/
│   │   └── index.ts             # API endpoints
│   │
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   │
│   ├── utils/
│   │   └── logger.ts            # Logging utility
│   │
│   ├── __tests__/               # Test files
│   │   ├── identityService.test.ts
│   │   └── identify.integration.test.ts
│   │
│   ├── index.ts                 # Express app setup
│   └── seed.ts                  # Database seeding
│
├── prisma/
│   ├── schema.prisma            # Database schema definition
│   └── migrations/              # Database migrations
│       └── 0_init/
│           └── migration.sql
│
├── dist/                        # Compiled JavaScript (generated)
├── node_modules/               # Dependencies (generated)
│
├── package.json                # Project dependencies
├── tsconfig.json              # TypeScript configuration
├── .env                       # Environment variables (local)
├── .env.example              # Environment template
├── .env.production           # Production variables
├── .gitignore                # Git ignore rules
├── .dockerignore             # Docker ignore rules
├── .eslintrc.json            # ESLint configuration
├── .prettierrc               # Code formatter config
│
├── Dockerfile                # Container image definition
├── docker-compose.yml        # Local development setup
│
├── README.md                 # Main documentation
├── DEPLOYMENT.md            # Render deployment guide
├── TESTING.md              # Testing guide
├── ARCHITECTURE.md         # This file
│
├── Bitespeed.postman_collection.json  # Postman API collection
├── package-lock.json                  # Locked dependency versions
└── yarn.lock (optional)              # Yarn lock file
```

## Layer Architecture

### 1. HTTP Layer (Express)

**File**: `src/routes/index.ts`

Responsibilities:

- Parse HTTP requests
- Validate request format
- Call service layer
- Format and send HTTP responses
- Handle HTTP-specific concerns (status codes, headers)

```typescript
router.post('/identify', async (req, res) => {
  // HTTP Input Validation
  const { email, phoneNumber } = req.body;

  // Call Service Layer
  const contact = await identityService.identify({ email, phoneNumber });

  // HTTP Output
  res.status(200).json({ contact });
});
```

**Concerns**: HTTP protocols, status codes, serialization

---

### 2. Service Layer (Business Logic)

**File**: `src/services/identityService.ts`

Responsibilities:

- Core identity reconciliation logic
- Data transformation and validation
- Database operation orchestration
- Error handling (domain-specific)

Key Methods:

- `identify()` - Main entry point
- `createPrimaryContact()` - Create new records
- `linkContactToPrimary()` - Link to existing
- `mergePrimaryContacts()` - Merge multiple primaries
- `buildContactResponse()` - Consolidate response

```typescript
// Service is independent of delivery mechanism (HTTP, GraphQL, etc)
const result = await identityService.identify(request);
```

**Concerns**: Identity logic, data consistency, business rules

---

### 3. Data Access Layer (ORM)

**File**: `src/config/database.ts`

Uses Prisma for:

- Database queries
- Type-safe operations
- Transaction management
- Migration handling

```typescript
const contacts = await prisma.contact.findMany({
  where: { email: 'test@example.com' },
});
```

**Concerns**: SQL generation, connection pooling, data persistence

---

### 4. Database Layer (PostgreSQL)

**File**: `prisma/schema.prisma`

Schema:

```prisma
model Contact {
  id               Int
  phoneNumber      String?
  email            String?
  linkedId         Int?
  linkPrecedence   LinkPrecedence
  createdAt        DateTime
  updatedAt        DateTime
  deletedAt        DateTime?
}
```

**Concerns**: Data storage, indexing, integrity constraints

---

## Data Flow

### Complete Request-Response Cycle

```
1. CLIENT REQUEST
   ↓
   POST /identify
   { "email": "john@example.com", "phoneNumber": "+1234567890" }

2. HTTP LAYER (routes/index.ts)
   ↓
   - Receive HTTP request
   - Extract and validate JSON body
   - Call identityService.identify()

3. SERVICE LAYER (services/identityService.ts)
   ↓
   - Execute business logic:
     a) Query database for matching contacts
     b) Determine if new or existing
     c) Handle contact linking/merging
     d) Consolidate response data

4. DATA ACCESS LAYER (Prisma)
   ↓
   - Execute database queries:
     a) findMany({ where: ... })  // Find existing
     b) create({ data: ... })     // Create new
     c) update({ where: ... })    // Update linked

5. DATABASE LAYER (PostgreSQL)
   ↓
   - Execute SQL statements
   - Return results to Prisma

6. SERVICE RESPONSE
   ↓
   {
     primaryContactId: 1,
     emails: ["john@example.com"],
     phoneNumbers: ["+1234567890"],
     secondaryContactIds: []
   }

7. HTTP RESPONSE
   ↓
   200 OK
   { "contact": { ... } }

8. CLIENT RECEIVES
   ↓
   Parse JSON and use response data
```

## Key Design Patterns

### 1. Service Pattern

Business logic isolated from HTTP concerns:

```typescript
// Service (reusable, testable)
class IdentityService {
  identify(request) {
    /* logic */
  }
}

// Route Handler (HTTP only)
router.post('/identify', async (req, res) => {
  const data = await identityService.identify(req.body);
  res.json(data);
});
```

**Benefits**:

- Testable without HTTP
- Reusable in different contexts (GraphQL, events, etc.)
- Clear separation of concerns

---

### 2. Dependency Injection

Database client injected, not created:

```typescript
// Instead of:
const db = new Database(); // Service creates dependency

// We provide:
import prisma from '../config/database';
// Database client created once, injected into service
```

**Benefits**:

- Easy to swap implementations for testing
- Single database connection instance
- Centralized configuration

---

### 3. Type Safety

Full TypeScript types throughout:

```typescript
interface IdentifyRequest {
  email?: string;
  phoneNumber?: string;
}

interface ContactResponse {
  primaryContactId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}

async identify(request: IdentifyRequest): Promise<ContactResponse> { }
```

**Benefits**:

- Compile-time type checking
- IDE autocomplete
- Self-documenting code
- Catch errors early

---

### 4. Error Handling

Consistent error handling across layers:

```typescript
// Service layer: Domain-specific error
throw new Error('Either email or phoneNumber must be provided');

// Route layer: Convert to HTTP error
try {
  const contact = await identityService.identify(request);
  res.json({ contact });
} catch (error) {
  res.status(400).json({ error: error.message });
}
```

---

## State Management

### Contact Linking State Machine

```
         ┌─────────────────────┐
         │   No Contact Exists │
         └──────────┬──────────┘
                    │ identify()
                    ↓
         ┌─────────────────────┐
    ┌────→ Create Primary (1) │
    │    └──────────┬──────────┘
    │               │
    │               │ identify() with different email/phone
    │               ↓
    │    ┌─────────────────────┐
    │    │ Link to Primary (1) │
    │    └────────────┬────────┘
    │                 │
    │    ┌────────────┴──────────┐
    │    │ Create Secondary (2)  │
    │    │ linkedId = 1          │
    │    │ linkPrecedence=second │
    │    └──────────┬────────────┘
    │               │
    │               │ identify() with different phone
    │               ↓
    │    ┌─────────────────────┐
    │    │ Create Secondary (3) │
    │    │ linkedId = 1        │
    │    └─────────────────────┘
    │
    │ Multiple primaries case:
    │
    │    Two separate primary contacts created
    │    Contact (A): primary, email="a@test.com", created=2024-01-10
    │    Contact (B): primary, email="b@test.com", created=2024-01-15
    │
    │    When identifying with both emails:
    │    - A stays as primary (older)
    │    - B converts to secondary, linkedId=A
    │    - All consolidated under A
```

## Concurrency & Scalability

### Single Instance

```
Client 1 ──┐
           ├──→ Express Server (1 process)
Client 2 ──┤    │
           │    └──→ PostgreSQL Connection Pool (default: 2-5)
Client 3 ──┘
```

### Distributed (Multiple Instances)

```
           Load Balancer
               │
    ┌──────────┼──────────┐
    │          │          │
Instance 1  Instance 2  Instance 3
(Port 3000)  (Port 3000)  (Port 3000)
    │          │          │
    └──────────┴──────────┘
               │
          PostgreSQL (single source of truth)
          Connection Pool manages shared access
```

**Database Consistency**:

- PostgreSQL ACID guarantees
- Foreign key constraints
- Indexes prevent N+1 queries
- Soft deletes via `deletedAt` field

---

## Performance Optimization

### Database Indexes

```sql
-- Created on:
CREATE INDEX contacts_email_idx ON contacts(email);
CREATE INDEX contacts_phoneNumber_idx ON contacts(phoneNumber);
CREATE INDEX contacts_linkedId_idx ON contacts(linkedId);
CREATE INDEX contacts_createdAt_idx ON contacts(createdAt);
```

Query optimization:

- Find by email: O(1) with index
- Find by phone: O(1) with index
- Sort by creation: O(1) with index
- Foreign key lookups: O(1) with index

### Query Patterns

```typescript
// Single query: Find all related contacts
prisma.contact.findMany({
  where: {
    OR: [{ id: primaryId }, { linkedId: primaryId }],
  },
});
// Result: 1 DB round trip, consolidate in memory
```

No N+1 queries because we:

- Load all related data in single query
- Process in application memory
- Avoid unnecessary loops

---

## Logging Architecture

```
Application Event
     ↓
Logger.info/error/debug()
     ↓
Structured JSON
     ↓
Console Output
     ↓
Viewed in Logs (dev/docker)
Sent to Log Service (production)
```

Example log output:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "message": "Identify request processed successfully",
  "data": { "primaryContactId": 1 }
}
```

---

## Testing Strategy

### Unit Tests (Service layer)

```
Mock Prisma → Test identityService → Verify logic
```

### Integration Tests (Full stack)

```
Real Database → Full request → Verify end-to-end
```

### E2E Tests (Production-like)

```
Client → Express → Database → Response
```

### Load Tests (Performance)

```
Concurrent requests → Measure throughput, latency
```

---

## Deployment Architecture

### Local Development

```
Host machine
├── Node.js + npm
├── Express server (npm run dev)
└── PostgreSQL (local install or Docker)
```

### Docker Development

```
docker-compose.yml
├── bitespeed_app service (Node 20)
├── postgres service (PG 16)
└── Network bridge (app → db communication)
```

### Production (Render)

```
Render Platform
├── Web Service (Node)
├── PostgreSQL Service (managed)
└── Auto-scaling, SSL, monitoring
```

---

## Security Layers

1. **Input Validation**
   - Validate email/phone presence
   - Type validation via TypeScript

2. **Database**
   - Foreign key constraints
   - Indexed queries prevent table scans
   - Soft deletes preserve data

3. **API Security**
   - CORS configuration
   - HTTPS in production
   - No sensitive logging

4. **Infrastructure**
   - Environment variable isolation
   - Database credentials never in code
   - Render provides SSL/TLS

---

## Scalability Considerations

### Vertical Scaling

- Upgrade Node.js memory/CPU
- Upgrade PostgreSQL hardware
- Works with single instance

### Horizontal Scaling

```
Load Balancer
    ↓
Instance 1 → PostgreSQL (connection pool)
Instance 2 → PostgreSQL (shared)
Instance 3 → PostgreSQL (shared)
```

All instances share single PostgreSQL database.
No session state in app layer.

### Database Scaling

- Read replicas (PostgreSQL feature)
- Connection pooling with Prisma
- Optimize queries (indexes exist)

---

## Key Decisions Explained

### Why Prisma?

- Type safety from schema
- Type-safe queries
- Automatic migrations
- Better DX than raw SQL

### Why TypeScript?

- Compile-time error checking
- IDE support
- Self-documenting code
- Industry standard for Node.js

### Why Express?

- Minimal, unopinionated framework
- Full control over structure
- Mature ecosystem
- Perfect for this API

### Why PostgreSQL?

- ACID transactions
- JSON support
- Foreign keys
- Proven at scale

### Why Docker?

- Consistent dev/prod environment
- Easy deployment
- Service isolation
- Industry standard

---

For more details on specific components, see:

- [README.md](README.md) - Usage documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [TESTING.md](TESTING.md) - Testing strategies
