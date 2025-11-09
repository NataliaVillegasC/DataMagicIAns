"""
Management command to load O*NET data from CSV files.

This command processes O*NET CSV files and populates the database
with occupations, skills, technologies, and their relationships.

Usage:
    python manage.py load_onet_data [--clear]

Options:
    --clear: Delete all existing data before loading
"""

import csv
import os
from decimal import Decimal, InvalidOperation
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.conf import settings
from data.models import (
    Occupation,
    OccupationAlternateTitle,
    Skill,
    OccupationSkill,
    TechnologyCategory,
    Technology,
    OccupationTechnology,
)


def clean_csv_reader(file_path, encoding='utf-8-sig'):
    """
    Open a CSV file and clean column names.
    
    Removes BOM, spaces and special characters from column names.
    """
    with open(file_path, 'r', encoding=encoding) as f:
        reader = csv.DictReader(f)
        # Clean column names removing BOM and extra spaces
        reader.fieldnames = [name.strip().replace('\ufeff', '') for name in reader.fieldnames]
        for row in reader:
            # Create a new dict with clean keys
            yield {k.strip().replace('\ufeff', ''): v for k, v in row.items()}


class Command(BaseCommand):
    """Command to load O*NET data from CSVs."""
    
    help = 'Load O*NET data from CSV files to the system'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.stats = {
            'occupations': 0,
            'alternate_titles': 0,
            'skills': 0,
            'occupation_skills': 0,
            'technology_categories': 0,
            'technologies': 0,
            'occupation_technologies': 0,
        }
    
    def add_arguments(self, parser):
        """Define command arguments."""
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete all existing data before loading',
        )
        parser.add_argument(
            '--data-dir',
            type=str,
            default='data/ONetData',
            help='Directory with CSV files (relative to project)',
        )
    
    def handle(self, *args, **options):
        """Execute the command."""
        self.stdout.write(self.style.SUCCESS('=== Starting O*NET data load ===\n'))
        
        # Determine data directory
        data_dir = os.path.join(settings.BASE_DIR, options['data_dir'])
        
        if not os.path.exists(data_dir):
            raise CommandError(f'Directory {data_dir} does not exist')
        
        # Clear data if requested
        if options['clear']:
            self.clear_data()
        
        try:
            with transaction.atomic():
                # Loading order to respect dependencies
                self.load_occupations(data_dir)
                self.load_alternate_titles(data_dir)
                self.load_skills(data_dir)
                self.load_occupation_skills(data_dir)
                self.load_technologies(data_dir)
                self.load_occupation_technologies(data_dir)
            
            self.print_summary()
            self.stdout.write(self.style.SUCCESS('\n[OK] Load completed successfully'))
        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n[ERROR] Error during load: {str(e)}'))
            raise
    
    def clear_data(self):
        """Delete all existing data."""
        self.stdout.write('Deleting existing data...')
        
        OccupationTechnology.objects.all().delete()
        Technology.objects.all().delete()
        TechnologyCategory.objects.all().delete()
        OccupationSkill.objects.all().delete()
        Skill.objects.all().delete()
        OccupationAlternateTitle.objects.all().delete()
        Occupation.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS('[OK] Data deleted\n'))
    
    def load_occupations(self, data_dir):
        """Load occupations from Occupation Data.csv."""
        file_path = os.path.join(data_dir, 'Occupation Data.csv')
        self.stdout.write(f'Loading occupations from {file_path}...')
        
        occupations = []
        for row in clean_csv_reader(file_path):
            occupations.append(Occupation(
                onet_soc_code=row['O*NET-SOC Code'],
                title=row['Title'],
                description=row['Description'],
            ))
        
        # Bulk create for better performance
        Occupation.objects.bulk_create(occupations, batch_size=500)
        self.stats['occupations'] = len(occupations)
        self.stdout.write(self.style.SUCCESS(f'[OK] {len(occupations)} occupations loaded'))
    
    def load_alternate_titles(self, data_dir):
        """Load alternate titles from Alternate Titles.csv."""
        file_path = os.path.join(data_dir, 'Alternate Titles.csv')
        self.stdout.write(f'Loading alternate titles from {file_path}...')
        
        # Create occupation cache for better performance
        occupation_cache = {
            occ.onet_soc_code: occ
            for occ in Occupation.objects.all()
        }
        
        alternate_titles = []
        for row in clean_csv_reader(file_path):
            onet_code = row['O*NET-SOC Code']
            if onet_code in occupation_cache:
                alternate_titles.append(OccupationAlternateTitle(
                    occupation=occupation_cache[onet_code],
                    alternate_title=row['Alternate Title'],
                    short_title=row.get('Short Title') or None,
                    source=row.get('Source(s)') or None,
                ))
        
        OccupationAlternateTitle.objects.bulk_create(
            alternate_titles,
            batch_size=1000,
            ignore_conflicts=True  # In case of duplicates
        )
        self.stats['alternate_titles'] = len(alternate_titles)
        self.stdout.write(self.style.SUCCESS(f'[OK] {len(alternate_titles)} alternate titles loaded'))
    
    def load_skills(self, data_dir):
        """Load unique skills from Skills.csv."""
        file_path = os.path.join(data_dir, 'Skills.csv')
        self.stdout.write(f'Loading skills from {file_path}...')
        
        skills_dict = {}
        for row in clean_csv_reader(file_path):
            element_id = row['Element ID']
            element_name = row['Element Name']
            
            if element_id not in skills_dict:
                skills_dict[element_id] = Skill(
                    element_id=element_id,
                    element_name=element_name,
                )
        
        skills = list(skills_dict.values())
        Skill.objects.bulk_create(skills, batch_size=500)
        self.stats['skills'] = len(skills)
        self.stdout.write(self.style.SUCCESS(f'[OK] {len(skills)} unique skills loaded'))
    
    def load_occupation_skills(self, data_dir):
        """Load occupation-skill relationships from Skills.csv."""
        file_path = os.path.join(data_dir, 'Skills.csv')
        self.stdout.write(f'Loading occupation-skill relationships from {file_path}...')
        
        # Create caches
        occupation_cache = {
            occ.onet_soc_code: occ
            for occ in Occupation.objects.all()
        }
        skill_cache = {
            skill.element_id: skill
            for skill in Skill.objects.all()
        }
        
        occupation_skills = []
        for row in clean_csv_reader(file_path):
            onet_code = row['O*NET-SOC Code']
            element_id = row['Element ID']
            
            if onet_code in occupation_cache and element_id in skill_cache:
                try:
                    data_value = Decimal(row['Data Value']) if row['Data Value'] else Decimal('0')
                    standard_error = Decimal(row['Standard Error']) if row.get('Standard Error') else None
                    lower_ci = Decimal(row['Lower CI Bound']) if row.get('Lower CI Bound') else None
                    upper_ci = Decimal(row['Upper CI Bound']) if row.get('Upper CI Bound') else None
                    n_value = int(row['N']) if row.get('N') else 0
                    
                    occupation_skills.append(OccupationSkill(
                        occupation=occupation_cache[onet_code],
                        skill=skill_cache[element_id],
                        scale_id=row['Scale ID'],
                        scale_name=row['Scale Name'],
                        data_value=data_value,
                        n=n_value,
                        standard_error=standard_error,
                        lower_ci_bound=lower_ci,
                        upper_ci_bound=upper_ci,
                        recommend_suppress=row.get('Recommend Suppress', 'N'),
                        not_relevant=row.get('Not Relevant') or None,
                        date=row.get('Date', ''),
                        domain_source=row.get('Domain Source', ''),
                    ))
                except (InvalidOperation, ValueError) as e:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Warning: Error processing skill {element_id} '
                            f'for occupation {onet_code}: {str(e)}'
                        )
                    )
                    continue
        
        OccupationSkill.objects.bulk_create(
            occupation_skills,
            batch_size=1000,
            ignore_conflicts=True
        )
        self.stats['occupation_skills'] = len(occupation_skills)
        self.stdout.write(
            self.style.SUCCESS(f'[OK] {len(occupation_skills)} occupation-skill relationships loaded')
        )
    
    def load_technologies(self, data_dir):
        """Load technologies and categories from Technology Skills.csv."""
        file_path = os.path.join(data_dir, 'Technology Skills.csv')
        self.stdout.write(f'Loading technologies from {file_path}...')
        
        categories_dict = {}
        technologies_dict = {}
        
        for row in clean_csv_reader(file_path):
            # Process categories
            commodity_code = row['Commodity Code']
            commodity_title = row['Commodity Title']
            
            if commodity_code and commodity_code not in categories_dict:
                categories_dict[commodity_code] = TechnologyCategory(
                    commodity_code=commodity_code,
                    commodity_title=commodity_title,
                )
            
            # Process technologies
            example = row['Example']
            if example and example not in technologies_dict:
                technologies_dict[example] = {
                    'example': example,
                    'commodity_code': commodity_code,
                }
        
        # Create categories
        categories = list(categories_dict.values())
        TechnologyCategory.objects.bulk_create(categories, batch_size=500)
        self.stats['technology_categories'] = len(categories)
        self.stdout.write(self.style.SUCCESS(f'[OK] {len(categories)} technology categories loaded'))
        
        # Create category cache
        category_cache = {
            cat.commodity_code: cat
            for cat in TechnologyCategory.objects.all()
        }
        
        # Create technologies with their categories
        technologies = []
        for tech_data in technologies_dict.values():
            category = category_cache.get(tech_data['commodity_code'])
            technologies.append(Technology(
                example=tech_data['example'],
                category=category,
            ))
        
        Technology.objects.bulk_create(technologies, batch_size=1000)
        self.stats['technologies'] = len(technologies)
        self.stdout.write(self.style.SUCCESS(f'[OK] {len(technologies)} technologies loaded'))
    
    def load_occupation_technologies(self, data_dir):
        """Load occupation-technology relationships from Technology Skills.csv."""
        file_path = os.path.join(data_dir, 'Technology Skills.csv')
        self.stdout.write(f'Loading occupation-technology relationships from {file_path}...')
        
        # Create caches
        occupation_cache = {
            occ.onet_soc_code: occ
            for occ in Occupation.objects.all()
        }
        technology_cache = {
            tech.example: tech
            for tech in Technology.objects.all()
        }
        
        occupation_technologies = []
        for row in clean_csv_reader(file_path):
            onet_code = row['O*NET-SOC Code']
            example = row['Example']
            
            if onet_code in occupation_cache and example in technology_cache:
                hot_tech = row.get('Hot Technology', 'N').upper() == 'Y'
                in_demand = row.get('In Demand', 'N').upper() == 'Y'
                
                occupation_technologies.append(OccupationTechnology(
                    occupation=occupation_cache[onet_code],
                    technology=technology_cache[example],
                    hot_technology=hot_tech,
                    in_demand=in_demand,
                ))
        
        OccupationTechnology.objects.bulk_create(
            occupation_technologies,
            batch_size=1000,
            ignore_conflicts=True
        )
        self.stats['occupation_technologies'] = len(occupation_technologies)
        self.stdout.write(
            self.style.SUCCESS(
                f'[OK] {len(occupation_technologies)} occupation-technology relationships loaded'
            )
        )
    
    def print_summary(self):
        """Print load summary."""
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('LOAD SUMMARY'))
        self.stdout.write('=' * 60)
        self.stdout.write(f"Occupations:                  {self.stats['occupations']:>8,}")
        self.stdout.write(f"Alternate titles:             {self.stats['alternate_titles']:>8,}")
        self.stdout.write(f"Unique skills:                {self.stats['skills']:>8,}")
        self.stdout.write(f"Occupation-skill relations:   {self.stats['occupation_skills']:>8,}")
        self.stdout.write(f"Technology categories:        {self.stats['technology_categories']:>8,}")
        self.stdout.write(f"Technologies:                 {self.stats['technologies']:>8,}")
        self.stdout.write(f"Occupation-tech relations:    {self.stats['occupation_technologies']:>8,}")
        self.stdout.write('=' * 60)
