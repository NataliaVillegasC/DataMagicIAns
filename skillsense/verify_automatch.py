"""
Quick script to verify auto-matching functionality.
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillsense.settings')
django.setup()

from core.models import Vacancy, Application, VacancyStatus
from users.models import Candidate

# Get counts
total_vacancies = Vacancy.objects.count()
active_vacancies = Vacancy.objects.filter(status=VacancyStatus.ACTIVE).count()
total_candidates = Candidate.objects.count()
suggested_apps = Application.objects.filter(status='SUGGESTED').count()
all_apps = Application.objects.count()

print("\n" + "="*60)
print("AUTO-MATCHING VERIFICATION")
print("="*60)
print(f"\n📊 Database Status:")
print(f"   Total Vacancies: {total_vacancies}")
print(f"   Active Vacancies: {active_vacancies}")
print(f"   Total Candidates: {total_candidates}")
print(f"   All Applications: {all_apps}")
print(f"   SUGGESTED Applications: {suggested_apps}")

if suggested_apps > 0:
    print(f"\n✅ Auto-matching is WORKING!")
    print(f"   Found {suggested_apps} SUGGESTED applications\n")

    # Show details
    print("📋 SUGGESTED Applications Details:")
    for app in Application.objects.filter(status='SUGGESTED').select_related('candidate', 'vacancy'):
        print(f"\n   • {app.candidate.full_name} → {app.vacancy.title}")
        print(f"     Affinity Score: {app.affinity_score}%")
        print(f"     Created: {app.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
else:
    print(f"\n⚠️  No SUGGESTED applications found")
    print("   This could mean:")
    print("   - Auto-matching hasn't run yet")
    print("   - No matches met the 60% threshold")
    print("   - No candidates or vacancies exist")

print("\n" + "="*60 + "\n")
