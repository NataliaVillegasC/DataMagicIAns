"""
Test auto-matching signals by creating a vacancy.
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillsense.settings')
django.setup()

from core.models import Vacancy, Application, VacancyStatus
from users.models import Candidate, User
from data.models import Technology

print("\n" + "="*60)
print("TESTING AUTO-MATCHING SIGNALS")
print("="*60)

# Get a user and candidate
user = User.objects.first()
if not user:
    print("\n❌ No users found in database")
    exit(1)

candidate = Candidate.objects.first()
if not candidate:
    print("\n❌ No candidates found in database")
    exit(1)

print(f"\n📋 Found:")
print(f"   User: {user.username} (Company: {user.company.name})")
print(f"   Candidate: {candidate.full_name}")
print(f"   Candidate Skills: {candidate.skills.count()}")
print(f"   Candidate Technologies: {candidate.technologies.count()}")

# Count applications before
apps_before = Application.objects.count()
suggested_before = Application.objects.filter(status='SUGGESTED').count()

print(f"\n📊 Applications before:")
print(f"   Total: {apps_before}")
print(f"   SUGGESTED: {suggested_before}")

# Create a new vacancy
print(f"\n🔨 Creating new ACTIVE vacancy...")

# First create the vacancy without being ACTIVE to set up requirements
vacancy = Vacancy.objects.create(
    company=user.company,
    title=f"Test Auto-Match Vacancy",
    description="Testing auto-matching functionality",
    location="Remote",
    status=VacancyStatus.INACTIVE  # Create as inactive first
)

# Add technologies
techs = Technology.objects.all()[:3]
if techs:
    vacancy.technologies.set(techs)
    print(f"   Added {len(techs)} technologies")

# Now activate it - this will trigger the signal with technologies present
print(f"   Activating vacancy to trigger auto-match...")
vacancy.status = VacancyStatus.ACTIVE
vacancy.save()

print(f"   Vacancy created: {vacancy.id}")

# Count applications after
apps_after = Application.objects.count()
suggested_after = Application.objects.filter(status='SUGGESTED').count()

print(f"\n📊 Applications after:")
print(f"   Total: {apps_after}")
print(f"   SUGGESTED: {suggested_after}")

new_apps = apps_after - apps_before
new_suggested = suggested_after - suggested_before

if new_suggested > 0:
    print(f"\n✅ SUCCESS! Auto-matching created {new_suggested} SUGGESTED applications!")

    # Show details
    for app in Application.objects.filter(
        vacancy=vacancy,
        status='SUGGESTED'
    ).select_related('candidate'):
        print(f"\n   📝 {app.candidate.full_name}")
        print(f"      Affinity Score: {app.affinity_score}%")
else:
    print(f"\n⚠️  Auto-matching did not create any SUGGESTED applications")
    print(f"   This could mean:")
    print(f"   - No candidates met the 60% threshold")
    print(f"   - Signal handler didn't fire")
    print(f"   - Candidates have no skills/technologies")

print("\n" + "="*60 + "\n")
