# Testing Guide

This document covers various testing approaches for the Bitespeed Identity Reconciliation API.

## Unit Testing (Service Layer)

The `identityService.ts` contains the core business logic. Here's how to test individual functions:

### Test Suite Template

Create `src/__tests__/identityService.test.ts`:

```typescript
import identityService from '../services/identityService';
import prisma from '../config/database';

// Mock Prisma
jest.mock('../config/database', () => ({
  contact: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

describe('IdentityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('identify', () => {
    test('should create new primary contact when no identifiers exist', async () => {
      // Mock empty find result
      (prisma.contact.findMany as jest.Mock).mockResolvedValue([]);

      // Mock create
      (prisma.contact.create as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        phoneNumber: null,
        linkedId: null,
        linkPrecedence: 'primary',
        createdAt: new Date(),
      });

      const result = await identityService.identify({
        email: 'test@example.com',
      });

      expect(result.primaryContactId).toBe(1);
      expect(result.emails).toContain('test@example.com');
      expect(result.secondaryContactIds).toHaveLength(0);
    });

    test('should throw error if no email or phone provided', async () => {
      await expect(identityService.identify({})).rejects.toThrow(
        'Either email or phoneNumber must be provided'
      );
    });

    test('should link secondary contact to existing primary', async () => {
      const existingContact = {
        id: 1,
        email: 'test@example.com',
        phoneNumber: null,
        linkedId: null,
        linkPrecedence: 'primary',
        createdAt: new Date('2024-01-01'),
      };

      (prisma.contact.findMany as jest.Mock).mockResolvedValue([
        existingContact,
      ]);

      (prisma.contact.create as jest.Mock).mockResolvedValue({
        id: 2,
        email: null,
        phoneNumber: '+1234567890',
        linkedId: 1,
        linkPrecedence: 'secondary',
      });

      const result = await identityService.identify({
        phoneNumber: '+1234567890',
      });

      expect(result.primaryContactId).toBe(1);
      expect(result.phoneNumbers).toContain('+1234567890');
    });
  });
});
```

## Integration Testing

Test the full API flow with database:

### Test Suite Template

Create `src/__tests__/identify.integration.test.ts`:

```typescript
import request from 'supertest';
import app from '../index';
import prisma from '../config/database';

describe('POST /identify Integration', () => {
  beforeAll(async () => {
    // Clear database
    await prisma.contact.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('POST /identify creates new primary contact', async () => {
    const response = await request(app).post('/identify').send({
      email: 'john@example.com',
      phoneNumber: '+1234567890',
    });

    expect(response.status).toBe(200);
    expect(response.body.contact).toHaveProperty('primaryContactId');
    expect(response.body.contact.emails).toContain('john@example.com');
    expect(response.body.contact.phoneNumbers).toContain('+1234567890');
    expect(response.body.contact.secondaryContactIds).toEqual([]);
  });

  test('POST /identify returns 400 without email or phone', async () => {
    const response = await request(app).post('/identify').send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('POST /identify consolidates linked contacts', async () => {
    // Create first contact
    const response1 = await request(app).post('/identify').send({
      email: 'alice@example.com',
    });

    // Link with phone
    const response2 = await request(app).post('/identify').send({
      phoneNumber: '+9876543210',
    });

    // Query with phone
    const response3 = await request(app).post('/identify').send({
      phoneNumber: '+9876543210',
    });

    const contact = response3.body.contact;
    expect(contact.emails).toContain('alice@example.com');
    expect(contact.phoneNumbers).toContain('+9876543210');
    expect(contact.secondaryContactIds.length).toBeGreaterThan(0);
  });
});
```

## End-to-End Testing (cURL)

### Test Script

Create `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
SUCCESS=0
FAILED=0

test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local expected_code=$5

  echo "Testing: $name"

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$BASE_URL$endpoint")
  fi

  status_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)

  if [ "$status_code" = "$expected_code" ]; then
    echo "✓ PASSED (Status: $status_code)"
    echo "Response: $body"
    ((SUCCESS++))
  else
    echo "✗ FAILED (Expected: $expected_code, Got: $status_code)"
    echo "Response: $body"
    ((FAILED++))
  fi
  echo ""
}

# Run Tests
echo "=== Bitespeed API Test Suite ==="
echo ""

test_endpoint "Health Check" "GET" "/health" "" "200"

test_endpoint "Identify - Email Only" "POST" "/identify" \
  '{"email":"john@example.com"}' "200"

test_endpoint "Identify - Phone Only" "POST" "/identify" \
  '{"phoneNumber":"+1234567890"}' "200"

test_endpoint "Identify - Both" "POST" "/identify" \
  '{"email":"alice@example.com","phoneNumber":"+9876543210"}' "200"

test_endpoint "Identify - Missing Data" "POST" "/identify" \
  '{}' "400"

echo "==================================="
echo "PASSED: $SUCCESS"
echo "FAILED: $FAILED"
echo "==================================="

exit $FAILED
```

Run tests:

```bash
chmod +x test-api.sh
./test-api.sh
```

## Manual Testing with Postman

1. Import `Bitespeed.postman_collection.json` into Postman
2. Set `base_url` variable to your server URL
3. Run each request and verify responses

## Performance Testing

### Load Testing with Apache Bench

```bash
# Install ab
# macOS: brew install httpd
# Linux: sudo apt-get install apache2-utils

# Test health endpoint
ab -n 1000 -c 10 http://localhost:3000/health

# Test identify endpoint
ab -n 1000 -c 10 -p identify.json -T application/json \
  http://localhost:3000/identify
```

Create `identify.json`:

```json
{ "email": "test@example.com" }
```

### Load Testing with wrk

```bash
# Install wrk
# https://github.com/wg/wrk

wrk -t12 -c400 -d30s http://localhost:3000/health

# With custom script
wrk -t12 -c400 -d30s -s identify.lua http://localhost:3000/identify
```

Create `identify.lua`:

```lua
request = function()
   wrk.method = "POST"
   wrk.body = '{"email":"test@example.com"}'
   wrk.headers["Content-Type"] = "application/json"
   return wrk.format(nil)
end
```

## Database Validation

### Check created contacts

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# View all contacts
SELECT * FROM contacts;

# View primary contacts
SELECT * FROM contacts WHERE "linkPrecedence" = 'primary';

# View linked contacts tree
SELECT id, email, "phoneNumber", "linkedId", "linkPrecedence", "createdAt"
FROM contacts
ORDER BY "createdAt" ASC;

# Count total contacts
SELECT COUNT(*) FROM contacts;

# Find contact by email
SELECT * FROM contacts WHERE email = 'test@example.com';
```

## Regression Test Scenarios

### Scenario 1: New Customer

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"scenario1@test.com"}'

# Verify: primaryContactId exists, secondaryContactIds = []
```

### Scenario 2: Merge Primaries

```bash
# Create two separate primary contacts
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@primary.com"}'

curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@work.com"}'

# Link them with a phone number
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@primary.com","phoneNumber":"+1111111111"}'

# Verify: Older primary remains, newer converted to secondary
```

### Scenario 3: Complex Linking

```bash
# Contact 1
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"user@domain.com"}'

# Contact 2
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+1234567890"}'

# Contact 3 (links them)
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"alt@domain.com","phoneNumber":"+1234567890"}'

# Verify: All consolidated under oldest primary
```

## Continuous Integration (GitHub Actions)

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: bitespeed_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npm run prisma:generate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/bitespeed_test

      - name: Run migrations
        run: npm run prisma:push
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/bitespeed_test

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/bitespeed_test
```

## Test Checklist

- [ ] Health endpoint returns 200
- [ ] Creating new contact succeeds
- [ ] Linking existing contacts works
- [ ] Merging multiple primaries works
- [ ] Responses contain correct structure
- [ ] Database records created correctly
- [ ] Indexes improve query speed
- [ ] No N+1 queries
- [ ] Error handling for invalid input
- [ ] Performance acceptable under load

## Common Test Issues

### Test Database Connection Fails

```bash
# Check PostgreSQL is running
psql -U postgres

# Verify DATABASE_URL
echo $DATABASE_URL

# Reset test database
psql -U postgres -c "DROP DATABASE IF EXISTS bitespeed_test;"
psql -U postgres -c "CREATE DATABASE bitespeed_test;"
```

### Tests Timeout

Increase Jest timeout:

```typescript
jest.setTimeout(10000); // 10 seconds
```

### Flaky Tests

Use test fixtures to ensure consistent state:

```typescript
beforeEach(async () => {
  await prisma.contact.deleteMany();
  // Create known test data
});
```

---

For more info on testing Node.js apps, see [Jest Documentation](https://jestjs.io/)
