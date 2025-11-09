# 🎨 Frontend API Integration Guide

**SkillSense Backend API Documentation**
**Version:** 1.0
**Base URL:** `http://localhost:8001/api` (Development)

---

## 📑 Table of Contents

1. [Authentication](#authentication)
2. [Candidates](#candidates)
3. [Vacancies](#vacancies)
4. [Applications](#applications)
5. [Matching](#matching)
6. [Companies](#companies)
7. [Error Handling](#error-handling)
8. [Common Workflows](#common-workflows)

---

## 🔐 Authentication

### Register New User

**Endpoint:** `POST /api/auth/register/`

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@company.com",
  "password": "SecurePass123!",
  "password_confirm": "SecurePass123!",
  "company_name": "Tech Corp",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": "uuid-here",
    "username": "john_doe",
    "email": "john@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "company": {
      "id": "company-uuid",
      "name": "Tech Corp",
      "email": "john@company.com",
      "phone": null,
      "address": null,
      "website": null
    },
    "is_verified": false,
    "has_mfa": false,
    "date_joined": "2025-11-09T00:00:00Z"
  },
  "tokens": {
    "refresh": "eyJhbGc...",
    "access": "eyJhbGc..."
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "errors": {
    "email": ["User with this email already exists"],
    "password": ["Passwords do not match"]
  }
}
```

---

### Login

**Endpoint:** `POST /api/auth/login/`

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login exitoso",
  "user": {
    "id": "uuid-here",
    "username": "john_doe",
    "email": "john@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "company": {
      "id": "company-uuid",
      "name": "Tech Corp"
    }
  },
  "tokens": {
    "refresh": "eyJhbGc...",
    "access": "eyJhbGc..."
  }
}
```

---

### Refresh Token

**Endpoint:** `POST /api/auth/token/refresh/`

**Request Body:**
```json
{
  "refresh": "eyJhbGc..."
}
```

**Success Response (200):**
```json
{
  "access": "new-access-token-here"
}
```

---

### Authenticated Requests

**All authenticated endpoints require the access token in the Authorization header:**

```
Authorization: Bearer eyJhbGc...
```

**Example (JavaScript):**
```javascript
const response = await fetch('http://localhost:8001/api/candidates/', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

---

## 👥 Candidates

### Upload CV (Step 1: Extract Data)

**Endpoint:** `POST /api/cv/upload/`

**Request:** `multipart/form-data`
```
cv_file: [PDF File]
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "CV procesado exitosamente. Revisa los datos extraídos antes de crear el candidato.",
  "cv_file_id": "cv-uuid-here",
  "extraction_result": {
    "success": true,
    "documents": [
      {
        "data": {
          "full_name": "Marco Ramírez",
          "email": "marco@example.com",
          "phone": "+57 321 433 0135",
          "location": "Bogotá, Colombia",
          "professional_summary": "Experienced developer...",
          "social_links": [
            {
              "type": "github",
              "url": "https://github.com/username"
            }
          ],
          "experience": [
            {
              "company": "DiDi",
              "role": "ML Engineer",
              "start_date": "06-2024",
              "end_date": "01-2025",
              "description": "Built ML models..."
            }
          ],
          "education": [
            {
              "institution": "University",
              "degree": "Computer Science",
              "dates": "2022-2025"
            }
          ],
          "generic_skills": ["Python", "Django", "React"],
          "languages": ["English - C1", "Spanish - Native"]
        },
        "fidelity": 85.0
      }
    ]
  }
}
```

**Frontend Flow:**
1. User uploads PDF
2. Backend extracts data and returns `cv_file_id`
3. Frontend shows extracted data for review/editing
4. User confirms and creates candidate (next endpoint)

---

### Create Candidate (Step 2: After CV Upload)

**Endpoint:** `POST /api/candidates/`

**Request Body:**
```json
{
  "full_name": "Marco Ramírez",
  "email": "marco@example.com",
  "phone": "+57 321 433 0135",
  "location": "Bogotá, Colombia",
  "linkedin_url": "https://linkedin.com/in/marco",
  "github_url": "https://github.com/marco",
  "portfolio_url": "https://marco.dev",
  "cv_file_id": "cv-uuid-from-upload",
  "supervised_data": {
    "hr_notes": "Great candidate!",
    "hr_rating": 5,
    "verified_by_hr": true
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Candidato creado exitosamente",
  "data": {
    "id": "candidate-uuid",
    "full_name": "Marco Ramírez",
    "email": "marco@example.com",
    "phone": "+57 321 433 0135",
    "location": "Bogotá, Colombia",
    "linkedin_url": "https://linkedin.com/in/marco",
    "github_url": "https://github.com/marco",
    "cv_file": {
      "id": "cv-uuid",
      "file_url": "https://storage.googleapis.com/...",
      "extraction_result": { ... }
    },
    "supervised_data": {
      "hr_notes": "Great candidate!",
      "hr_rating": 5,
      "verified_by_hr": true
    },
    "skills": [
      {
        "id": 5,
        "element_id": "2.A.1.e",
        "element_name": "Mathematics"
      }
    ],
    "technologies": [
      {
        "id": 272,
        "example": "Python",
        "category": "Object oriented development software"
      }
    ],
    "created_at": "2025-11-09T00:00:00Z"
  }
}
```

**🤖 Auto-Matching Trigger:**
- When a candidate is created, the system **automatically** matches them with all ACTIVE vacancies
- SUGGESTED applications are created for matches >= 60% affinity
- Frontend doesn't need to do anything - it happens in the background

---

### List Candidates

**Endpoint:** `GET /api/candidates/`

**Query Parameters:**
- `search` (optional): Search by name or email
- `page` (optional): Page number for pagination

**Example:** `GET /api/candidates/?search=marco&page=1`

**Success Response (200):**
```json
{
  "count": 25,
  "next": "http://localhost:8001/api/candidates/?page=2",
  "previous": null,
  "results": [
    {
      "id": "candidate-uuid",
      "full_name": "Marco Ramírez",
      "email": "marco@example.com",
      "phone": "+57 321 433 0135",
      "location": "Bogotá, Colombia",
      "linkedin_url": "https://linkedin.com/in/marco",
      "github_url": "https://github.com/marco",
      "skills_count": 12,
      "technologies_count": 28,
      "created_at": "2025-11-09T00:00:00Z"
    }
  ]
}
```

---

### Get Candidate Detail

**Endpoint:** `GET /api/candidates/{id}/`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "candidate-uuid",
    "full_name": "Marco Ramírez",
    "email": "marco@example.com",
    "phone": "+57 321 433 0135",
    "location": "Bogotá, Colombia",
    "cv_file": {
      "file_url": "https://storage.googleapis.com/...",
      "extraction_result": {
        "documents": [
          {
            "data": {
              "experience": [...],
              "education": [...],
              "generic_skills": ["Python", "Django"]
            }
          }
        ]
      }
    },
    "skills": [...],
    "technologies": [...],
    "supervised_data": {
      "hr_notes": "Excellent candidate",
      "hr_rating": 5
    }
  }
}
```

---

### Update Candidate

**Endpoint:** `PATCH /api/candidates/{id}/`

**Request Body (partial update):**
```json
{
  "phone": "+57 321 999 9999",
  "location": "Medellín, Colombia",
  "supervised_data": {
    "hr_notes": "Updated notes",
    "hr_rating": 4
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Candidato actualizado exitosamente",
  "data": { ... }
}
```

---

### Delete Candidate

**Endpoint:** `DELETE /api/candidates/{id}/`

**Success Response (204):**
```json
{
  "success": true,
  "message": "Candidato eliminado exitosamente"
}
```

---

## 💼 Vacancies

### Create Vacancy

**Endpoint:** `POST /api/vacancies/`

**Request Body:**
```json
{
  "title": "Senior Python Developer",
  "description": "We are looking for an experienced Python developer with Django knowledge and cloud experience.",
  "location": "Bogotá, Colombia (Remote OK)",
  "status": "ACTIVE",
  "technology_ids": [272, 961, 962],
  "skill_requirement_ids": [5, 8, 19]
}
```

**Status Options:**
- `ACTIVE` - Vacancy is open and accepting applications
- `INACTIVE` - Vacancy is paused
- `FILLED` - Position has been filled
- `CANCELLED` - Vacancy cancelled

**Success Response (201):**
```json
{
  "success": true,
  "message": "Vacancy created successfully",
  "data": {
    "id": "vacancy-uuid",
    "company": {
      "id": "company-uuid",
      "name": "Tech Corp"
    },
    "title": "Senior Python Developer",
    "description": "We are looking for...",
    "location": "Bogotá, Colombia (Remote OK)",
    "status": "ACTIVE",
    "technologies": [
      {
        "id": 272,
        "example": "Python",
        "category": "Object oriented development software"
      }
    ],
    "skill_requirements": [
      {
        "id": 5,
        "skill": {
          "element_name": "Mathematics"
        },
        "required": true
      }
    ],
    "application_count": 0,
    "created_at": "2025-11-09T00:00:00Z"
  }
}
```

**🤖 Auto-Matching Trigger:**
- When an ACTIVE vacancy is created, the system **automatically** matches it with all candidates in your company
- SUGGESTED applications are created for matches >= 60% affinity
- Check `/api/vacancies/{id}/suggested-applications/` to see auto-generated suggestions

---

### List Vacancies

**Endpoint:** `GET /api/vacancies/`

**Query Parameters:**
- `status` (optional): Filter by status (ACTIVE, INACTIVE, FILLED, CANCELLED)
- `search` (optional): Search by title

**Example:** `GET /api/vacancies/?status=ACTIVE&search=python`

**Success Response (200):**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "vacancy-uuid",
      "title": "Senior Python Developer",
      "location": "Bogotá, Colombia",
      "company_name": "Tech Corp",
      "status": "ACTIVE",
      "technology_count": 5,
      "skill_count": 8,
      "application_count": 12,
      "created_at": "2025-11-09T00:00:00Z"
    }
  ]
}
```

---

### Get Vacancy Detail

**Endpoint:** `GET /api/vacancies/{id}/`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "vacancy-uuid",
    "title": "Senior Python Developer",
    "description": "Looking for...",
    "location": "Bogotá",
    "status": "ACTIVE",
    "technologies": [...],
    "skill_requirements": [...],
    "application_count": 12
  }
}
```

---

### Update Vacancy

**Endpoint:** `PATCH /api/vacancies/{id}/`

**Request Body:**
```json
{
  "title": "Senior Python/Django Developer",
  "status": "INACTIVE"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Vacancy updated successfully",
  "data": { ... }
}
```

---

### Delete Vacancy

**Endpoint:** `DELETE /api/vacancies/{id}/`

**Success Response (204):**
```json
{
  "success": true,
  "message": "Vacancy deleted successfully"
}
```

---

## 🎯 Matching

### Get SUGGESTED Applications for Vacancy

**Endpoint:** `GET /api/vacancies/{vacancy_id}/suggested-applications/`

**What are SUGGESTED applications?**
- Auto-generated by the system when a vacancy or candidate is created
- Represents AI-recommended matches with affinity score >= 60%
- Status is `SUGGESTED` (purple badge in admin)
- HR can review and promote to `PENDING` or reject

**Success Response (200):**
```json
{
  "success": true,
  "vacancy": {
    "id": "vacancy-uuid",
    "title": "Senior Python Developer"
  },
  "suggestions_count": 3,
  "suggestions": [
    {
      "id": "application-uuid",
      "candidate": "candidate-uuid",
      "candidate_name": "Marco Ramírez",
      "candidate_email": "marco@example.com",
      "status": "SUGGESTED",
      "affinity_score": "85.50",
      "created_at": "2025-11-09T00:00:00Z"
    },
    {
      "id": "application-uuid-2",
      "candidate_name": "Ana García",
      "affinity_score": "72.30",
      "status": "SUGGESTED"
    }
  ]
}
```

**Frontend Display:**
```
🤖 AI Suggested Candidates (3)

1. Marco Ramírez - 85.5% Match ⭐
   Email: marco@example.com
   [View Profile] [Accept] [Reject]

2. Ana García - 72.3% Match
   Email: ana@example.com
   [View Profile] [Accept] [Reject]
```

---

### Match Candidates to Vacancy (Manual)

**Endpoint:** `GET /api/vacancies/{vacancy_id}/match-candidates/`

**Query Parameters:**
- `min_score` (optional, default: 50): Minimum match score (0-100)
- `top_n` (optional, default: 10): Number of top candidates to return

**Example:** `GET /api/vacancies/{id}/match-candidates/?min_score=70&top_n=5`

**Success Response (200):**
```json
{
  "success": true,
  "vacancy": {
    "id": "vacancy-uuid",
    "title": "Senior Python Developer",
    "required_skills_count": 5,
    "optional_skills_count": 3,
    "technologies_count": 8
  },
  "filters": {
    "min_score": 70.0,
    "top_n": 5
  },
  "total_candidates_evaluated": 50,
  "matching_candidates_count": 5,
  "matches": [
    {
      "candidate": {
        "id": "candidate-uuid",
        "full_name": "Marco Ramírez",
        "email": "marco@example.com",
        "phone": "+57 321 433 0135",
        "location": "Bogotá",
        "skills_count": 12,
        "technologies_count": 28
      },
      "match_score": 92.5,
      "match_details": {
        "total_score": 92.5,
        "skills": {
          "score": 95.0,
          "required_skills": {
            "total": 5,
            "matched": 5,
            "missing": 0,
            "match_rate": 100.0
          },
          "optional_skills": {
            "total": 3,
            "matched": 2,
            "match_rate": 66.7
          },
          "extra_skills_count": 4,
          "penalty_applied": 0.0,
          "bonus_applied": 15.0
        },
        "technologies": {
          "score": 87.5,
          "total": 8,
          "matched": 7,
          "match_rate": 87.5
        },
        "weights_used": {
          "skills": 0.6,
          "technologies": 0.35,
          "other": 0.05
        }
      }
    }
  ]
}
```

**Frontend Display:**
```
Top 5 Matching Candidates

1. Marco Ramírez - 92.5% Match ⭐⭐⭐
   📧 marco@example.com | 📍 Bogotá

   Match Breakdown:
   ✅ Skills: 95% (5/5 required, 2/3 optional)
   ✅ Technologies: 87.5% (7/8 matched)

   [View Full Profile] [Create Application]

2. Ana García - 85.0% Match ⭐⭐
   ...
```

---

## 📝 Applications

### Create Application (Manual)

**Endpoint:** `POST /api/applications/`

**Request Body:**
```json
{
  "vacancy": "vacancy-uuid",
  "candidate": "candidate-uuid",
  "status": "PENDING"
}
```

**Status Options:**
- `SUGGESTED` - Auto-generated by matching algorithm
- `PENDING` - Application under review
- `HIRED` - Candidate hired
- `REJECTED` - Application rejected
- `ON_HOLD` - On hold for later
- `CANCELLED` - Application cancelled

**Success Response (201):**
```json
{
  "success": true,
  "message": "Application created successfully",
  "data": {
    "id": "application-uuid",
    "vacancy": "vacancy-uuid",
    "vacancy_title": "Senior Python Developer",
    "candidate": "candidate-uuid",
    "candidate_name": "Marco Ramírez",
    "candidate_email": "marco@example.com",
    "status": "PENDING",
    "affinity_score": "92.50",
    "created_at": "2025-11-09T00:00:00Z"
  },
  "match_details": {
    "total_score": 92.5,
    "skills": {
      "score": 95.0,
      "required_skills": {
        "total": 5,
        "matched": 5,
        "missing": 0
      }
    }
  }
}
```

**Note:** Affinity score is **automatically calculated** by the backend based on candidate-vacancy match.

---

### List Applications

**Endpoint:** `GET /api/applications/`

**Query Parameters:**
- `status` (optional): Filter by status
- `vacancy` (optional): Filter by vacancy UUID
- `candidate` (optional): Filter by candidate UUID

**Example:** `GET /api/applications/?status=SUGGESTED`

**Success Response (200):**
```json
{
  "count": 15,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "application-uuid",
      "vacancy": "vacancy-uuid",
      "vacancy_title": "Senior Python Developer",
      "candidate": "candidate-uuid",
      "candidate_name": "Marco Ramírez",
      "status": "SUGGESTED",
      "affinity_score": "85.50",
      "created_at": "2025-11-09T00:00:00Z"
    }
  ]
}
```

---

### Update Application Status

**Endpoint:** `PATCH /api/applications/{id}/`

**Request Body:**
```json
{
  "status": "HIRED"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Application updated successfully",
  "data": { ... }
}
```

**Common Status Transitions:**
```
SUGGESTED → PENDING (HR accepts AI suggestion)
SUGGESTED → REJECTED (HR rejects suggestion)
PENDING → HIRED (Candidate hired)
PENDING → REJECTED (Application rejected)
PENDING → ON_HOLD (Save for later)
```

---

## 🏢 Companies

### List Companies

**Endpoint:** `GET /api/companies/`

**Success Response (200):**
```json
{
  "count": 5,
  "results": [
    {
      "id": "company-uuid",
      "name": "Tech Corp",
      "email": "info@techcorp.com",
      "phone": "+57 1 234 5678",
      "address": "Cra 7 #123-45, Bogotá",
      "website": "https://techcorp.com"
    }
  ]
}
```

---

## ⚠️ Error Handling

### Common HTTP Status Codes

| Code | Meaning | When it happens |
|------|---------|-----------------|
| 200 | Success | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Delete successful |
| 400 | Bad Request | Invalid data sent |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User doesn't have permission |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Backend error |

### Error Response Format

**Validation Error (400):**
```json
{
  "success": false,
  "errors": {
    "email": ["This field is required"],
    "phone": ["Invalid phone format"]
  }
}
```

**Authentication Error (401):**
```json
{
  "detail": "Given token not valid for any token type",
  "code": "token_not_valid",
  "messages": [
    {
      "token_class": "AccessToken",
      "token_type": "access",
      "message": "Token is invalid or expired"
    }
  ]
}
```

**Not Found (404):**
```json
{
  "detail": "Not found."
}
```

### Frontend Error Handling Example

```javascript
async function fetchCandidates(accessToken) {
  try {
    const response = await fetch('http://localhost:8001/api/candidates/', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      // Token expired, refresh it
      const newToken = await refreshAccessToken();
      return fetchCandidates(newToken);
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Request failed');
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching candidates:', error);
    throw error;
  }
}
```

---

## 🔄 Common Workflows

### Workflow 1: Complete Candidate Registration

```javascript
// Step 1: User uploads CV
const formData = new FormData();
formData.append('cv_file', pdfFile);

const uploadResponse = await fetch('http://localhost:8001/api/cv/upload/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});

const { cv_file_id, extraction_result } = await uploadResponse.json();

// Step 2: Display extracted data for user review
// User can edit fields if needed

// Step 3: Create candidate with CV reference
const candidateData = {
  full_name: extraction_result.documents[0].data.full_name,
  email: extraction_result.documents[0].data.email,
  phone: extraction_result.documents[0].data.phone,
  location: extraction_result.documents[0].data.location,
  cv_file_id: cv_file_id,
  supervised_data: {
    hr_notes: "Reviewed and approved",
    hr_rating: 5,
    verified_by_hr: true
  }
};

const createResponse = await fetch('http://localhost:8001/api/candidates/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(candidateData)
});

const candidate = await createResponse.json();

// ✅ Done! Auto-matching happens automatically in the background
// The candidate is now matched with all ACTIVE vacancies
```

---

### Workflow 2: Create Vacancy and Review AI Suggestions

```javascript
// Step 1: Create vacancy
const vacancyData = {
  title: "Senior Python Developer",
  description: "Looking for experienced Python developer...",
  location: "Bogotá, Colombia",
  status: "ACTIVE",
  technology_ids: [272, 961, 962],  // Python, Django, Docker
  skill_requirement_ids: [5, 8, 19]
};

const createResponse = await fetch('http://localhost:8001/api/vacancies/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(vacancyData)
});

const vacancy = await createResponse.json();
const vacancyId = vacancy.data.id;

// ✅ Auto-matching happens automatically!

// Step 2: Wait a moment for auto-matching to complete (usually < 1 second)
await new Promise(resolve => setTimeout(resolve, 1000));

// Step 3: Get AI-suggested candidates
const suggestionsResponse = await fetch(
  `http://localhost:8001/api/vacancies/${vacancyId}/suggested-applications/`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

const { suggestions } = await suggestionsResponse.json();

// Step 4: Display suggestions to HR
suggestions.forEach(app => {
  console.log(`${app.candidate_name} - ${app.affinity_score}% match`);
});

// Step 5: HR reviews and accepts/rejects suggestions
// Accept suggestion: Change status from SUGGESTED → PENDING
await fetch(`http://localhost:8001/api/applications/${app.id}/`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ status: 'PENDING' })
});
```

---

### Workflow 3: Manual Candidate Search and Application

```javascript
// Step 1: HR manually searches for candidates
const matchResponse = await fetch(
  `http://localhost:8001/api/vacancies/${vacancyId}/match-candidates/?min_score=80&top_n=10`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

const { matches } = await matchResponse.json();

// Step 2: Display top matches with scores
matches.forEach(match => {
  console.log(`
    ${match.candidate.full_name}
    Match: ${match.match_score}%
    Skills: ${match.match_details.skills.score}%
    Technologies: ${match.match_details.technologies.score}%
  `);
});

// Step 3: HR creates manual application for selected candidate
const applicationData = {
  vacancy: vacancyId,
  candidate: matches[0].candidate.id,
  status: "PENDING"
};

const appResponse = await fetch('http://localhost:8001/api/applications/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(applicationData)
});

// Affinity score is automatically calculated!
const application = await appResponse.json();
console.log(`Application created with ${application.data.affinity_score}% match`);
```

---

## 📊 Data Models Reference

### Candidate Object
```typescript
interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  cv_file: CVFile;
  supervised_data: SupervisedData;
  skills: Skill[];
  technologies: Technology[];
  created_at: string;
  updated_at: string;
}

interface SupervisedData {
  hr_notes?: string;
  hr_rating?: number;  // 1-5
  verified_by_hr?: boolean;
}
```

### Vacancy Object
```typescript
interface Vacancy {
  id: string;
  company: Company;
  title: string;
  description: string;
  location: string;
  status: 'ACTIVE' | 'INACTIVE' | 'FILLED' | 'CANCELLED';
  technologies: Technology[];
  skill_requirements: SkillRequirement[];
  application_count: number;
  created_at: string;
  updated_at: string;
}
```

### Application Object
```typescript
interface Application {
  id: string;
  vacancy: string;  // UUID
  vacancy_title: string;
  candidate: string;  // UUID
  candidate_name: string;
  candidate_email: string;
  status: 'SUGGESTED' | 'PENDING' | 'HIRED' | 'REJECTED' | 'ON_HOLD' | 'CANCELLED';
  affinity_score: string;  // "85.50" (percentage)
  created_at: string;
  updated_at: string;
}
```

### Match Details Object
```typescript
interface MatchDetails {
  total_score: number;
  skills: {
    score: number;
    required_skills: {
      total: number;
      matched: number;
      missing: number;
      match_rate: number;
    };
    optional_skills: {
      total: number;
      matched: number;
      match_rate: number;
    };
    extra_skills_count: number;
    penalty_applied: number;
    bonus_applied: number;
  };
  technologies: {
    score: number;
    total: number;
    matched: number;
    match_rate: number;
  };
  weights_used: {
    skills: number;      // 0.6 (60%)
    technologies: number; // 0.35 (35%)
    other: number;       // 0.05 (5%)
  };
}
```

---

## 🎨 UI/UX Recommendations

### Status Colors

**Application Status:**
- 🟣 `SUGGESTED` - Purple (#9c27b0) - AI recommendation
- 🟡 `PENDING` - Yellow (#ffc107) - Under review
- 🟢 `HIRED` - Green (#28a745) - Success
- 🔴 `REJECTED` - Red (#dc3545) - Rejected
- 🔵 `ON_HOLD` - Blue (#17a2b8) - On hold
- ⚫ `CANCELLED` - Gray (#6c757d) - Cancelled

**Vacancy Status:**
- 🟢 `ACTIVE` - Green (#28a745)
- ⚫ `INACTIVE` - Gray (#6c757d)
- 🔵 `FILLED` - Blue (#17a2b8)
- 🔴 `CANCELLED` - Red (#dc3545)

### Match Score Display

```
90-100%: ⭐⭐⭐ Excellent Match (Green)
75-89%:  ⭐⭐ Good Match (Light Green)
60-74%:  ⭐ Fair Match (Yellow)
< 60%:   ❌ Poor Match (Gray/Hidden)
```

### Suggested Applications Badge

```html
<div class="application-card suggested">
  <span class="ai-badge">🤖 AI Suggested</span>
  <h3>Marco Ramírez</h3>
  <div class="match-score excellent">
    <span>85.5% Match</span>
    <div class="progress-bar" style="width: 85.5%"></div>
  </div>
</div>
```

---

## 🔔 Real-time Updates (Optional)

For real-time updates when new SUGGESTED applications are created, consider implementing:

1. **Polling Approach:**
```javascript
// Poll every 10 seconds for new suggestions
setInterval(async () => {
  const response = await fetch(
    `/api/vacancies/${vacancyId}/suggested-applications/`
  );
  const { suggestions_count } = await response.json();

  if (suggestions_count > lastCount) {
    showNotification(`🤖 ${suggestions_count - lastCount} new AI suggestions!`);
    lastCount = suggestions_count;
  }
}, 10000);
```

2. **WebSocket Approach (Future):**
- Backend sends real-time events when auto-matching completes
- Frontend receives instant notifications

---

## 📝 Notes

### Auto-Matching Configuration

Current settings (can be adjusted):
- **Minimum Score:** 60% (only create suggestions for matches >= 60%)
- **Top N:** 5 (maximum 5 suggestions per vacancy/candidate)

### Affinity Score Calculation

The matching algorithm uses weighted scoring:
- **Skills:** 60% weight
  - Required skills fully matched: 100%
  - Missing required skills: Heavy penalty
  - Optional skills: Bonus
- **Technologies:** 35% weight
  - Percentage of technologies matched
- **Other factors:** 5% weight

**Example:**
- Candidate has Python, Django, React
- Vacancy requires Python, Django (required) + React (optional)
- Result: ~95% match (high score!)

### Performance

- CV extraction: ~30-45 seconds (AI processing)
- Auto-matching: < 1 second (usually)
- Manual matching: < 1 second for 100 candidates

---

## 🆘 Support

**Issues?** Contact the backend team or check:
- Django admin: `http://localhost:8001/admin/`
- Server logs for debugging
- Test suite: `python tests/test_api_endpoints.py`

**Documentation:**
- API Documentation: `API_DOCUMENTATION.md`
- Skill Mapping: `SKILL_MAPPING_GUIDE.md`
- Auto-Matching: `AUTO_MATCHING_GUIDE.md`

---

**Last Updated:** 2025-11-09
**Backend Version:** 1.0
**Auto-Matching:** ✅ Enabled

