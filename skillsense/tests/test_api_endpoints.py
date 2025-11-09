"""
Script to test API endpoints.

Tests:
1. User Registration
2. User Login
3. Create Candidate
4. List Candidates
5. Get Candidate Detail
6. Update Candidate
7. Upload CV and Extract Data
8. Delete Candidate
"""

import requests
import json
from pathlib import Path
import uuid
import time

# Base URL
BASE_URL = "http://localhost:8001/api"

# Generate unique identifiers for this test run
test_run_id = str(uuid.uuid4())[:8]
timestamp = int(time.time())

# Test data with unique values
test_user = {
    "username": f"testuser_{test_run_id}",
    "email": f"test_{test_run_id}@example.com",
    "password": "TestPassword123!",
    "password_confirm": "TestPassword123!",
    "company_name": f"Test Company {test_run_id}",
    "first_name": "Test",
    "last_name": "User"
}

test_candidate = {
    "full_name": f"Juan Pérez {test_run_id}",
    "email": f"juan.perez_{test_run_id}@example.com",
    "phone": "+57 300 123 4567",
    "location": "Bogotá, Colombia",
    "linkedin_url": f"https://linkedin.com/in/juanperez{test_run_id}",
    "github_url": f"https://github.com/juanperez{test_run_id}",
    "supervised_data": {
        "notes": "Candidato con experiencia en Python y Django",
        "rating": 5
    }
}

# Global variables
access_token = None
candidate_id = None
cv_file_id = None
vacancy_id = None
extracted_cv_data = {}

print(f"\n🔑 Test Run ID: {test_run_id}")
print(f"📧 Test User Email: {test_user['email']}")
print(f"👤 Test Candidate Email: {test_candidate['email']}")


def print_response(title, response):
    """Print formatted response."""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    except:
        print(f"Response: {response.text}")
    print(f"{'='*60}\n")


def test_register():
    """Test user registration."""
    print("\n🔹 Testing User Registration...")
    
    response = requests.post(
        f"{BASE_URL}/auth/register/",
        json=test_user
    )
    
    print_response("REGISTER", response)
    
    if response.status_code == 201:
        global access_token
        data = response.json()
        access_token = data['tokens']['access']
        print("✅ Registration successful!")
        return True
    else:
        print("❌ Registration failed!")
        return False


def test_login():
    """Test user login."""
    print("\n🔹 Testing User Login...")
    
    response = requests.post(
        f"{BASE_URL}/auth/login/",
        json={
            "email": test_user["email"],
            "password": test_user["password"]
        }
    )
    
    print_response("LOGIN", response)
    
    if response.status_code == 200:
        global access_token
        data = response.json()
        access_token = data['tokens']['access']
        print("✅ Login successful!")
        return True
    else:
        print("❌ Login failed!")
        return False


def test_upload_cv():
    """Test CV upload without candidate (first step in workflow)."""
    print("\n🔹 Testing CV Upload (without candidate)...")

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    # Use the example CV from tests
    cv_path = Path(__file__).parent / "example_cv" / "resume.pdf"

    if not cv_path.exists():
        print(f"⚠️  CV file not found: {cv_path}")
        print("Skipping CV upload test...")
        return False

    with open(cv_path, 'rb') as cv_file:
        files = {
            'cv_file': ('resume.pdf', cv_file, 'application/pdf')
        }

        response = requests.post(
            f"{BASE_URL}/cv/upload/",
            files=files,
            headers=headers
        )

    print_response("UPLOAD CV", response)

    if response.status_code == 201:
        print("✅ CV upload and extraction successful!")

        # Save cv_file_id and extracted data globally
        data = response.json()
        global cv_file_id, extracted_cv_data
        cv_file_id = data['cv_file_id']

        if 'extraction_result' in data:
            extraction = data['extraction_result']
            print("\n📄 Extraction Summary:")
            print(f"  - Success: {extraction.get('success')}")
            print(f"  - Documents found: {extraction.get('document_count')}")
            print(f"  - Processing time: {extraction.get('processing_time')}s")

            if extraction.get('documents'):
                first_doc = extraction['documents'][0]
                print(f"  - Fidelity: {first_doc.get('fidelity')}%")
                print(f"  - Fields extracted: {len(first_doc.get('data', {}))}")

                # Save extracted data for candidate creation
                extracted_cv_data = first_doc.get('data', {})

        print(f"\n  📎 CV File ID: {cv_file_id}")
        return True
    else:
        print("❌ CV upload failed!")
        return False


def test_create_candidate():
    """Test candidate creation with CV file reference."""
    print("\n🔹 Testing Candidate Creation (with CV reference)...")

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    # Use extracted data + supervised corrections
    supervised_data = extracted_cv_data.copy() if extracted_cv_data else {}

    # HR makes corrections to the extracted data
    supervised_data['full_name'] = test_candidate['full_name']
    supervised_data['email'] = test_candidate['email']
    supervised_data['phone'] = test_candidate.get('phone', '')
    supervised_data['location'] = test_candidate.get('location', '')

    # Add HR notes
    supervised_data['hr_notes'] = "Candidato verificado y aprobado"
    supervised_data['hr_rating'] = 5
    supervised_data['verified_by_hr'] = True

    # Create candidate payload with CV reference
    candidate_data = {
        "full_name": test_candidate['full_name'],
        "email": test_candidate['email'],
        "phone": test_candidate.get('phone'),
        "location": test_candidate.get('location'),
        "linkedin_url": test_candidate.get('linkedin_url'),
        "github_url": test_candidate.get('github_url'),
        "supervised_data": supervised_data,
    }

    # Only add cv_file_id if it was successfully uploaded
    if cv_file_id is not None:
        candidate_data['cv_file_id'] = cv_file_id
        print(f"  📎 Using CV File ID: {cv_file_id}")
    else:
        print("  ⚠️  No CV file uploaded - creating candidate without CV")

    response = requests.post(
        f"{BASE_URL}/candidates/",
        json=candidate_data,
        headers=headers
    )

    print_response("CREATE CANDIDATE", response)

    if response.status_code == 201:
        global candidate_id
        data = response.json()
        candidate_id = data['data']['id']
        print(f"✅ Candidate created successfully! ID: {candidate_id}")

        # Print mapping statistics if available
        if 'mapping_statistics' in data:
            stats = data['mapping_statistics']
            print("\n📊 Skill Mapping Statistics:")
            print(f"  - Total terms: {stats.get('total_terms')}")
            print(f"  - Matched skills: {stats.get('matched_skills')}")
            print(f"  - Matched technologies: {stats.get('matched_technologies')}")
            print(f"  - Match rate: {stats.get('match_rate')}%")

        # Note: Auto-matching with vacancies happens in background (signal)
        print("\n  🤖 Auto-matching: SUGGESTED applications will be created if there are ACTIVE vacancies")

        return True
    else:
        print("❌ Candidate creation failed!")
        return False


def test_list_candidates():
    """Test listing candidates."""
    print("\n🔹 Testing List Candidates...")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(
        f"{BASE_URL}/candidates/",
        headers=headers
    )
    
    print_response("LIST CANDIDATES", response)
    
    if response.status_code == 200:
        print("✅ List candidates successful!")
        return True
    else:
        print("❌ List candidates failed!")
        return False


def test_get_candidate():
    """Test getting candidate detail."""
    print("\n🔹 Testing Get Candidate Detail...")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    response = requests.get(
        f"{BASE_URL}/candidates/{candidate_id}/",
        headers=headers
    )
    
    print_response("GET CANDIDATE", response)
    
    if response.status_code == 200:
        print("✅ Get candidate successful!")
        return True
    else:
        print("❌ Get candidate failed!")
        return False


def test_update_candidate():
    """Test updating candidate."""
    print("\n🔹 Testing Update Candidate...")
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    update_data = {
        "phone": "+57 301 999 8888",
        "location": "Medellín, Colombia"
    }
    
    response = requests.patch(
        f"{BASE_URL}/candidates/{candidate_id}/",
        json=update_data,
        headers=headers
    )
    
    print_response("UPDATE CANDIDATE", response)
    
    if response.status_code == 200:
        print("✅ Update candidate successful!")
        return True
    else:
        print("❌ Update candidate failed!")
        return False




def test_delete_candidate():
    """Test deleting candidate."""
    print("\n🔹 Testing Delete Candidate...")

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    response = requests.delete(
        f"{BASE_URL}/candidates/{candidate_id}/",
        headers=headers
    )

    print_response("DELETE CANDIDATE", response)

    if response.status_code == 204:
        print("✅ Delete candidate successful!")
        return True
    else:
        print("❌ Delete candidate failed!")
        return False


def test_create_vacancy():
    """Test vacancy creation."""
    print("\n🔹 Testing Vacancy Creation...")

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    vacancy_data = {
        "title": f"Senior Python Developer {test_run_id}",
        "description": "We are looking for an experienced Python developer with Django knowledge.",
        "location": "Bogotá, Colombia",
        "status": "ACTIVE",
        "technology_ids": [],  # We'll add after we know which exist
        "skill_requirement_ids": []  # We'll add after we know which exist
    }

    response = requests.post(
        f"{BASE_URL}/vacancies/",
        json=vacancy_data,
        headers=headers
    )

    print_response("CREATE VACANCY", response)

    if response.status_code == 201:
        global vacancy_id
        data = response.json()
        vacancy_id = data['data']['id']
        print(f"✅ Vacancy created successfully! ID: {vacancy_id}")
        print("\n  🤖 Auto-matching: SUGGESTED applications will be created for matching candidates")
        return True
    else:
        print("❌ Vacancy creation failed!")
        return False


def test_list_vacancies():
    """Test listing vacancies."""
    print("\n🔹 Testing List Vacancies...")

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    response = requests.get(
        f"{BASE_URL}/vacancies/",
        headers=headers
    )

    print_response("LIST VACANCIES", response)

    if response.status_code == 200:
        print("✅ List vacancies successful!")
        return True
    else:
        print("❌ List vacancies failed!")
        return False


def test_get_vacancy():
    """Test getting vacancy details."""
    print("\n🔹 Testing Get Vacancy Detail...")

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    response = requests.get(
        f"{BASE_URL}/vacancies/{vacancy_id}/",
        headers=headers
    )

    print_response("GET VACANCY", response)

    if response.status_code == 200:
        print("✅ Get vacancy successful!")
        return True
    else:
        print("❌ Get vacancy failed!")
        return False


def test_check_suggested_applications():
    """Test that SUGGESTED applications were auto-created."""
    print("\n🔹 Testing Auto-Generated SUGGESTED Applications...")

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    # Check suggested applications for the vacancy
    response = requests.get(
        f"{BASE_URL}/vacancies/{vacancy_id}/suggested-applications/",
        headers=headers
    )

    print_response("CHECK SUGGESTED APPLICATIONS", response)

    if response.status_code == 200:
        data = response.json()
        if data.get('success'):
            count = data.get('suggestions_count', 0)
            print(f"✅ SUGGESTED applications check successful!")
            print(f"  🤖 Auto-generated suggestions: {count}")

            if count > 0 and data.get('suggestions'):
                print(f"\n  Top suggestions:")
                for i, sugg in enumerate(data['suggestions'][:3], 1):
                    print(f"    {i}. {sugg['candidate_name']} - Score: {sugg['affinity_score']}%")
            elif count == 0:
                print(f"  ⚠️  No suggestions created (candidates may not match threshold >= 60%)")

            return True

    print("❌ SUGGESTED applications check failed!")
    return False


def test_match_candidates():
    """Test matching candidates to vacancy."""
    print("\n🔹 Testing Candidate Matching...")

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    # Test with default parameters
    response = requests.get(
        f"{BASE_URL}/vacancies/{vacancy_id}/match-candidates/",
        headers=headers
    )

    print_response("MATCH CANDIDATES (default)", response)

    if response.status_code == 200:
        data = response.json()
        if data.get('success'):
            print(f"✅ Candidate matching successful!")
            print(f"  📊 Total candidates evaluated: {data.get('total_candidates_evaluated')}")
            print(f"  ✨ Matching candidates found: {data.get('matching_candidates_count')}")

            if data.get('matches'):
                print(f"\n  Top matches:")
                for i, match in enumerate(data['matches'][:3], 1):
                    print(f"    {i}. {match['candidate']['full_name']} - Score: {match['match_score']:.2f}%")

            return True

    print("❌ Candidate matching failed!")
    return False


def test_match_candidates_with_params():
    """Test matching candidates with custom parameters."""
    print("\n🔹 Testing Candidate Matching (with params)...")

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    # Test with custom min_score and top_n
    response = requests.get(
        f"{BASE_URL}/vacancies/{vacancy_id}/match-candidates/?min_score=30&top_n=5",
        headers=headers
    )

    print_response("MATCH CANDIDATES (min_score=30, top_n=5)", response)

    if response.status_code == 200:
        data = response.json()
        if data.get('success'):
            print(f"✅ Parameterized matching successful!")
            print(f"  🎯 Min score filter: {data['filters']['min_score']}")
            print(f"  🔢 Top N: {data['filters']['top_n']}")
            return True

    print("❌ Parameterized matching failed!")
    return False


def test_create_application():
    """Test creating an application."""
    print("\n🔹 Testing Application Creation...")

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    application_data = {
        "vacancy": vacancy_id,
        "candidate": candidate_id,
        "status": "PENDING"
    }

    response = requests.post(
        f"{BASE_URL}/applications/",
        json=application_data,
        headers=headers
    )

    print_response("CREATE APPLICATION", response)

    if response.status_code == 201:
        data = response.json()
        print(f"✅ Application created successfully!")
        if 'data' in data and 'affinity_score' in data['data']:
            score = data['data']['affinity_score']
            print(f"  📊 Calculated affinity score: {score}%")

        if 'match_details' in data:
            details = data['match_details']
            print(f"\n  📋 Match Breakdown:")
            if 'skills' in details:
                skills = details['skills']
                print(f"    Skills Score: {skills.get('score', 0):.2f}%")
                if 'required_skills' in skills:
                    req = skills['required_skills']
                    print(f"      Required: {req.get('matched', 0)}/{req.get('total', 0)} matched")
                if 'optional_skills' in skills:
                    opt = skills['optional_skills']
                    print(f"      Optional: {opt.get('matched', 0)}/{opt.get('total', 0)} matched")

            if 'technologies' in details:
                tech = details['technologies']
                print(f"    Technologies Score: {tech.get('score', 0):.2f}%")
                print(f"      Matched: {tech.get('matched', 0)}/{tech.get('total', 0)}")

        return True
    else:
        print("❌ Application creation failed!")
        return False


def run_all_tests():
    """Run all tests in sequence following the correct workflow."""
    print("\n" + "="*60)
    print("🚀 Starting API Endpoint Tests - COMPREHENSIVE SUITE")
    print("="*60)
    print("\n📋 Workflow:")
    print("1. Register/Login")
    print("2. Upload CV (without candidate)")
    print("3. Create Candidate (with CV reference + supervised data)")
    print("4. List/Get/Update Candidates")
    print("5. Create Vacancy")
    print("6. Match Candidates to Vacancy")
    print("7. Create Application")
    print("="*60)

    tests = [
        # User authentication
        ("Register", test_register),
        ("Login", test_login),

        # Candidate workflow
        ("Upload CV", test_upload_cv),
        ("Create Candidate", test_create_candidate),
        ("List Candidates", test_list_candidates),
        ("Get Candidate", test_get_candidate),
        ("Update Candidate", test_update_candidate),

        # Vacancy workflow
        ("Create Vacancy", test_create_vacancy),
        ("List Vacancies", test_list_vacancies),
        ("Get Vacancy", test_get_vacancy),

        # Auto-matching workflow
        ("Check SUGGESTED Applications", test_check_suggested_applications),

        # Matching workflow
        ("Match Candidates (default)", test_match_candidates),
        ("Match Candidates (with params)", test_match_candidates_with_params),

        # Application workflow
        ("Create Application", test_create_application),

        # Cleanup (commented out for now)
        # ("Delete Candidate", test_delete_candidate),
    ]

    results = []

    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ Test '{test_name}' raised exception: {str(e)}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))

    # Print summary
    print("\n" + "="*60)
    print("📊 Test Summary")
    print("="*60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    # Group by category
    print("\n🔐 Authentication:")
    for name, result in results[:2]:
        status = "✅" if result else "❌"
        print(f"  {status} {name}")

    print("\n👥 Candidates:")
    for name, result in results[2:7]:
        status = "✅" if result else "❌"
        print(f"  {status} {name}")

    print("\n💼 Vacancies:")
    for name, result in results[7:10]:
        status = "✅" if result else "❌"
        print(f"  {status} {name}")

    print("\n🤖 Auto-Matching:")
    for name, result in results[10:11]:
        status = "✅" if result else "❌"
        print(f"  {status} {name}")

    print("\n🎯 Manual Matching:")
    for name, result in results[11:13]:
        status = "✅" if result else "❌"
        print(f"  {status} {name}")

    print("\n📝 Applications:")
    for name, result in results[13:14]:
        status = "✅" if result else "❌"
        print(f"  {status} {name}")

    print(f"\n{'='*60}")
    print(f"🎉 OVERALL: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print("="*60 + "\n")


if __name__ == "__main__":
    run_all_tests()

