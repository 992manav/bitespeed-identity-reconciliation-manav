# API Specification

Complete specification for the Bitespeed Identity Reconciliation API.

## Base URL

- **Development**: `http://localhost:3000`
- **Production (Render)**: `https://<your-app-name>.onrender.com`

## Content-Type

All requests and responses use `application/json`.

---

## Endpoints

### POST /identify

Identifies a customer and consolidates their identity. If the customer doesn't exist, creates a new primary contact. If the customer exists (matched by email or phone), links them and consolidates their identity.

#### Authentication

None (public endpoint)

#### Request

**Method**: `POST`

**Path**: `/identify`

**Headers**:

```
Content-Type: application/json
```

**Body**:

```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | No | Customer email address |
| phoneNumber | string | No | Customer phone number with format flexibility |

**Constraints**:

- At least one of `email` or `phoneNumber` must be provided
- **Not required**: Both fields are optional individually, but not both optional
- Email format: Must be a valid email
- Phone format: Any string (can include +, spaces, dashes, etc.)

#### Response

**Success**: `200 OK`

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

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| contact | object | The consolidated contact information |
| contact.primaryContactId | number | ID of the primary contact (oldest) |
| contact.emails | array | All emails associated with this customer |
| contact.phoneNumbers | array | All phone numbers associated with this customer |
| contact.secondaryContactIds | array | IDs of all secondary contacts linked to primary |

**Error**: `400 Bad Request`

When neither `email` nor `phoneNumber` is provided:

```json
{
  "error": "Either email or phoneNumber must be provided"
}
```

**Error**: `500 Internal Server Error`

When an unexpected server error occurs:

```json
{
  "error": "Internal server error"
}
```

#### Examples

##### Example 1: Create New Customer

**Request**:

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "phoneNumber": "+1122334455"
  }'
```

**Response**:

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["alice@example.com"],
    "phoneNumbers": ["+1122334455"],
    "secondaryContactIds": []
  }
}
```

**What happens**:

- No existing contact found
- Creates new Contact with id=1
- Sets linkPrecedence="primary"
- Returns contact with just the provided info

---

##### Example 2: Link New Phone to Existing Email

**Setup**: Contact #1 exists with `email: "alice@example.com"`

**Request**:

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+5544332211"
  }'
```

**Response**:

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["alice@example.com"],
    "phoneNumbers": ["+1122334455", "+5544332211"],
    "secondaryContactIds": [2]
  }
}
```

**What happens**:

- Request searches for phone number
- Phone not found
- Creates Contact #2 (secondary) linked to #1
- Returns consolidated response showing all emails/phones for customer

---

##### Example 3: Already Linked Contact

**Setup**:

- Contact #1 (primary): `email: "alice@example.com"`
- Contact #2 (secondary, linked to #1): `phoneNumber: "+1122334455"`

**Request**:

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com"
  }'
```

**Response**:

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["alice@example.com"],
    "phoneNumbers": ["+1122334455"],
    "secondaryContactIds": [2]
  }
}
```

**What happens**:

- Request searches for email
- Email found in Contact #1
- Contact #1 is already primary
- No new record created
- Returns existing consolidated data

---

##### Example 4: Merge Two Primary Contacts

**Setup**:

- Contact #1 (primary): `email: "bob@example.com"`, created: 2024-01-10
- Contact #3 (primary): `email: "bob@work.com"`, created: 2024-01-15

**Request**:

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@example.com",
    "phoneNumber": "+6655443322"
  }'
```

**Response**:

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["bob@example.com", "bob@work.com"],
    "phoneNumbers": ["+6655443322"],
    "secondaryContactIds": [3, 4]
  }
}
```

**What happens**:

1. Search finds Contact #1 (primary) and Contact #3 (primary)
2. Contact #1 is older → remains primary
3. Contact #3 is newer → converted to secondary, linked to #1
4. New Contact #4 created as secondary with phone
5. Returns all emails/phones consolidated under #1

---

##### Example 5: Email Only

**Request**:

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "charlie@example.com"
  }'
```

**Response**:

```json
{
  "contact": {
    "primaryContactId": 2,
    "emails": ["charlie@example.com"],
    "phoneNumbers": [],
    "secondaryContactIds": []
  }
}
```

---

##### Example 6: Phone Only

**Request**:

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "++911234567890"
  }'
```

**Response**:

```json
{
  "contact": {
    "primaryContactId": 3,
    "emails": [],
    "phoneNumbers": ["+911234567890"],
    "secondaryContactIds": []
  }
}
```

---

##### Example 7: Invalid Request (Missing Fields)

**Request**:

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response** (`400 Bad Request`):

```json
{
  "error": "Either email or phoneNumber must be provided"
}
```

---

### GET /health

Health check endpoint for monitoring and load balancers.

#### Authentication

None (public endpoint)

#### Request

**Method**: `GET`

**Path**: `/health`

#### Response

**Success**: `200 OK`

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| status | string | Always "ok" if endpoint is reachable |
| timestamp | ISO8601 | Current server timestamp |

#### Example

**Request**:

```bash
curl http://localhost:3000/health
```

**Response**:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

**Use Cases**:

- Docker health checks
- Load balancer routing
- Uptime monitoring
- Kubernetes probes

---

## Data Models

### Contact

Represents a single contact record in the system.

```typescript
{
  id: number;
  email: string | null;
  phoneNumber: string | null;
  linkedId: number | null;
  linkPrecedence: 'primary' | 'secondary';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique identifier |
| email | string \| null | Contact email address |
| phoneNumber | string \| null | Contact phone number |
| linkedId | number \| null | ID of primary contact if secondary (null if primary) |
| linkPrecedence | string | "primary" or "secondary" |
| createdAt | ISO8601 | Creation timestamp |
| updatedAt | ISO8601 | Last update timestamp |
| deletedAt | ISO8601 \| null | Soft delete timestamp |

**Constraints**:

- At least one of `email` or `phoneNumber` must be provided
- If `linkPrecedence="secondary"`, `linkedId` must reference a primary contact
- `createdAt` never changes after creation
- `updatedAt` changes on any update

---

## Error Handling

### Error Response Format

All error responses follow this format:

```json
{
  "error": "A human-readable error message"
}
```

### Error Codes

| Code | Reason                                | Solution                                       |
| ---- | ------------------------------------- | ---------------------------------------------- |
| 400  | Bad Request - Missing required fields | Provide either `email` or `phoneNumber`        |
| 404  | Not Found - Invalid endpoint          | Check the path is correct (/identify, /health) |
| 500  | Internal Server Error                 | Check logs, database connection, retry later   |

### Common Errors

**Invalid Input**:

```json
{
  "error": "Either email or phoneNumber must be provided"
}
```

**Server Error**:

```json
{
  "error": "Internal server error"
}
```

**Database Connection Issues**:
When database is down, all requests return 500 with generic error message.

Check logs:

```bash
docker-compose logs app
# or
npm run dev  # shows logs directly
```

---

## Request/Response Examples

### cURL Examples

```bash
# Create new customer
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","phoneNumber":"+1234567890"}'

# Health check
curl http://localhost:3000/health

# Link new phone
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+0987654321"}'

# Email only
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"another@example.com"}'
```

### JavaScript/Fetch

```javascript
// Identify customer
async function identifyCustomer(email, phoneNumber) {
  const response = await fetch('http://localhost:3000/identify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      phoneNumber,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }

  return await response.json();
}

// Usage
const contact = await identifyCustomer('john@example.com', '+1234567890');
console.log(contact.contact.primaryContactId);
```

### Python Requests

```python
import requests

def identify_customer(email=None, phone_number=None):
    url = 'http://localhost:3000/identify'
    payload = {}

    if email:
        payload['email'] = email
    if phone_number:
        payload['phoneNumber'] = phone_number

    response = requests.post(url, json=payload)
    response.raise_for_status()
    return response.json()

# Usage
contact = identify_customer(email='john@example.com', phone_number='+1234567890')
print(contact['contact']['primaryContactId'])
```

---

## Rate Limiting

**Current Implementation**: None

For production deployments, consider adding rate limiting:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});

app.use('/identify', limiter);
```

---

## Versioning

**Current Version**: 1.0.0

The API follows semantic versioning. Future breaking changes will increment the major version.

---

## Authentication

**Current Implementation**: None

For production, consider adding:

- API Key authentication
- JWT tokens
- OAuth 2.0

---

## CORS

By default, all origins are allowed:

```
CORS_ORIGIN=*
```

For production, set to your frontend domain:

```
CORS_ORIGIN=https://example.com
```

---

## Changelog

### Version 1.0.0 (Current)

- Initial release
- POST /identify endpoint
- GET /health endpoint
- PostgreSQL with Prisma ORM
- Docker support
- Full TypeScript support
- Comprehensive documentation

---

## Best Practices

### Request Handling

1. **Always provide at least one identifier**: Email or phone number
2. **Handle errors gracefully**: Check status codes and error messages
3. **Use meaningful names**: For logs and debugging

### Response Processing

1. **Check HTTP status**: Always verify response.ok or status code
2. **Consolidate results**: Use primaryContactId to link all records
3. **Cache appropriately**: No endpoints have strict caching requirements

### Database Queries

The API is optimized for:

- Single round-trip queries
- Indexed lookups (email, phone, linkedId)
- Efficient consolidation in-memory

No pagination support (typically not needed for contacts).

---

## Support

For detailed usage instructions, see [README.md](README.md)

For deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

For testing guides, see [TESTING.md](TESTING.md)

For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md)
