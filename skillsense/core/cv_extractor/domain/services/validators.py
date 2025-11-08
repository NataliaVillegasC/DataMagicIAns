"""Document validation utilities for identity document processing.

This module provides comprehensive validation functionality for various types of
identity documents, including Colombian ID cards, passports, and other government-issued
documents. The validator ensures data integrity and format compliance according to
established standards.

The validation process includes:
- Field format validation (regex patterns)
- Data type and range validation
- Cross-field consistency checks
- Localized error messaging

Examples:
    Basic document validation:

    >>> from src.domain.services.validators import DocumentValidator
    >>> validator = DocumentValidator()
    >>>
    >>> # Validate individual fields
    >>> is_valid, cleaned_value = validator.validate_document_number('12345678')
    >>> print(f"Valid: {is_valid}, Value: {cleaned_value}")
    >>>
    >>> # Validate complete document data
    >>> data = {
    ...     'document_number': '12345678',
    ...     'first_names': 'JUAN CARLOS',
    ...     'last_names': 'RODRIGUEZ LOPEZ',
    ...     'gender': 'M'
    ... }
    >>> is_valid, validated_data, errors = validator.validate_document_data(data)
    >>> if not is_valid:
    ...     print(f"Validation errors: {errors}")

Note:
    All validation methods return tuples with (is_valid, processed_value) format,
    where processed_value contains either the cleaned/normalized value on success
    or an error message on failure.
"""

import re
from typing import Optional, Tuple, Dict, Any, List
from datetime import datetime

from ..exceptions import ValidationError

# =========================
# Generic helper functions
# =========================

def normalize_upper(value: Optional[Any]) -> Optional[str]:
    """Trim and uppercase a string; returns None for empty inputs."""
    if value is None:
        return None
    s = str(value).strip()
    return s.upper() if s else None


def only_numeric(value: Optional[Any]) -> Optional[str]:
    """Return digits-only string or None if no digits exist."""
    if value is None:
        return None
    digits = re.sub(r'[^\d]', '', str(value))
    return digits if digits else None


def only_alphabetic(value: Optional[Any]) -> Optional[str]:
    """Validate Spanish alphabetic plus spaces; returns UPPER value or None if invalid/empty."""
    if value is None:
        return None
    s = str(value).strip().upper()
    if not s:
        return None
    pattern = re.compile(r'^[A-ZÁÉÍÓÚÑÜ\s]+$')
    return s if pattern.match(s) else None


class DocumentValidator:
    """Comprehensive validator for identity document fields.

    This class provides validation methods for all common fields found in identity
    documents, with support for multiple formats and localized validation rules.
    The validator uses regex patterns and business logic to ensure data quality
    and consistency.

    Attributes:
        document_number_pattern (re.Pattern): Regex for document numbers (6-11 digits)
        name_pattern (re.Pattern): Regex for names (Spanish alphabet + spaces)
        height_pattern (re.Pattern): Regex for height format (X.XX meters)
        blood_type_pattern (re.Pattern): Regex for blood types (A/B/AB/O +/-)
        gender_pattern (re.Pattern): Regex for gender codes (M/F)
        date_patterns (List[re.Pattern]): List of supported date formats

    Examples:
        Initialize and use the validator:

        >>> validator = DocumentValidator()
        >>>
        >>> # Validate a document number
        >>> is_valid, result = validator.validate_document_number('1.234.567')
        >>> print(f"Valid: {is_valid}, Cleaned: {result}")  # Valid: True, Cleaned: 1234567
        >>>
        >>> # Validate a name
        >>> is_valid, result = validator.validate_name('juan carlos', 'Nombres')
        >>> print(f"Valid: {is_valid}, Result: {result}")  # Valid: True, Result: JUAN CARLOS
        >>>
        >>> # Validate complete document
        >>> data = {'document_number': '12345678', 'gender': 'masculino'}
        >>> is_valid, validated, errors = validator.validate_document_data(data)
    """
    def __init__(self):
        """Initialize the DocumentValidator with predefined regex patterns.

        Sets up all the regex patterns used for field validation, including
        patterns for document numbers, names, dates, physical characteristics,
        and other document fields. All patterns are optimized for Colombian
        document standards but can be extended for other countries.
        """
        self.document_number_pattern = re.compile(r'^\d{6,11}$')
        self.name_pattern = re.compile(r'^[A-ZÁÉÍÓÚÑÜ\s]+$')
        self.height_pattern = re.compile(r'^[0-2]\.\d{2}$')
        self.blood_type_pattern = re.compile(r'^(A|B|AB|O)[+-]$')
        self.gender_pattern = re.compile(r'^[MF]$')

        self.date_patterns = [
            re.compile(r'^\d{2}-[A-Z]{3}-\d{4}$'),
            re.compile(r'^\d{2}/\d{2}/\d{4}$'),
            re.compile(r'^\d{1,2}\s+[A-Z]+\s+\d{4}$'),
            re.compile(r'^\d{4}-\d{2}-\d{2}$')
        ]

    def validate_document_number(self, number: Optional[str]) -> Tuple[bool, Optional[str]]:
        """Validate and clean a document number.

        Validates that the document number follows the expected format (6-11 digits)
        and removes any formatting characters (dots, spaces, hyphens) to return
        a clean numeric string.

        Args:
            number: The document number to validate. Can contain formatting characters.

        Returns:
            A tuple containing:
                - bool: True if the number is valid, False otherwise
                - Optional[str]: The cleaned number (digits only) if valid,
                  or error message if invalid

        Examples:
            >>> validator = DocumentValidator()
            >>> validator.validate_document_number('1.234.567')
            (True, '1234567')
            >>> validator.validate_document_number('123')
            (False, 'Formato de número inválido: 123')
            >>> validator.validate_document_number('')
            (False, 'Número de documento vacío')

        Note:
            The method accepts numbers between 6 and 11 digits, which covers
            the range of valid Colombian document numbers.
        """
        if not number:
            return False, "Número de documento vacío"

        cleaned_number = only_numeric(number) or ''

        if not self.document_number_pattern.match(cleaned_number):
            return False, f"Formato de número inválido: {number}"

        return True, cleaned_number

    def validate_name(self, name: Optional[str], field_name: str = "nombre") -> Tuple[bool, Optional[str]]:
        """Validate and normalize a person's name.

        Validates that a name contains only valid characters (Spanish alphabet plus
        spaces), has appropriate length, and normalizes it to uppercase format.

        Args:
            name: The name to validate and normalize
            field_name: The field name for error messages (e.g., 'Nombres', 'Apellidos')

        Returns:
            A tuple containing:
                - bool: True if the name is valid, False otherwise
                - Optional[str]: The normalized name (uppercase) if valid,
                  or error message if invalid

        Examples:
            >>> validator = DocumentValidator()
            >>> validator.validate_name('juan carlos', 'Nombres')
            (True, 'JUAN CARLOS')
            >>> validator.validate_name('a', 'Nombres')
            (False, 'Nombres muy corto: A')
            >>> validator.validate_name('John123', 'Nombres')
            (False, 'Nombres contiene caracteres inválidos: JOHN123')

        Note:
            Names must be between 2 and 100 characters and contain only Spanish
            alphabet characters (including accented characters) and spaces.
        """
        if not name:
            return False, f"{field_name} vacío"

        name = normalize_upper(name) or ''

        if not name:
            return False, f"{field_name} vacío después de limpiar"

        if len(name) < 2:
            return False, f"{field_name} muy corto: {name}"

        if len(name) > 100:
            return False, f"{field_name} muy largo: {name}"

        if not self.name_pattern.match(name):
            return False, f"{field_name} contiene caracteres inválidos: {name}"

        return True, name

    def validate_date(self, date: Optional[str], field_name: str = "fecha") -> Tuple[bool, Optional[str]]:
        """Validate a date string in various formats.

        Validates date strings against multiple supported formats commonly found
        in identity documents, including Spanish abbreviated months and different
        separators.

        Args:
            date: The date string to validate
            field_name: The field name for error messages (e.g., 'Fecha de nacimiento')

        Returns:
            A tuple containing:
                - bool: True if the date format is valid, False otherwise
                - Optional[str]: The original date string if valid,
                  or error message if invalid, or None if date is empty

        Examples:
            >>> validator = DocumentValidator()
            >>> validator.validate_date('15-ENE-1990', 'Fecha de nacimiento')
            (True, '15-ENE-1990')
            >>> validator.validate_date('15/01/1990', 'Fecha de nacimiento')
            (True, '15/01/1990')
            >>> validator.validate_date('invalid-date', 'Fecha de nacimiento')
            (False, 'Fecha de nacimiento con formato inválido: invalid-date')

        Supported formats:
            - DD-MMM-YYYY (e.g., '15-ENE-1990')
            - DD/MM/YYYY (e.g., '15/01/1990')
            - DD MONTH YYYY (e.g., '15 ENERO 1990')
            - YYYY-MM-DD (e.g., '1990-01-15')

        Note:
            Empty dates are considered valid and return (True, None).
            The method supports Spanish month abbreviations.
        """
        if not date:
            return True, None

        date = date.strip()

        is_valid = any(pattern.match(date) for pattern in self.date_patterns)

        if not is_valid:
            return False, f"{field_name} con formato inválido: {date}"

        try:
            if self._parse_date(date):
                return True, date
        except:
            pass

        return True, date

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse a date string into a datetime object.

        Internal method that attempts to parse date strings using multiple formats
        and handles Spanish month abbreviations by converting them to English
        equivalents.

        Args:
            date_str: The date string to parse

        Returns:
            datetime object if parsing succeeds, None otherwise

        Note:
            This is a private method used internally by validate_date().
            Supports Spanish month abbreviations like 'ENE', 'ABR', 'AGO', 'DIC', etc.
        """
        formats = [
            '%d-%b-%Y',
            '%d/%m/%Y',
            '%d %B %Y',
            '%Y-%m-%d'
        ]

        months_es_to_en = {
            'ENE': 'JAN', 'FEB': 'FEB', 'MAR': 'MAR',
            'ABR': 'APR', 'MAY': 'MAY', 'JUN': 'JUN',
            'JUL': 'JUL', 'AGO': 'AUG', 'SEP': 'SEP',
            'OCT': 'OCT', 'NOV': 'NOV', 'DIC': 'DEC',
            'SEPT': 'SEP'
        }

        date_str_en = date_str
        for es, en in months_es_to_en.items():
            date_str_en = date_str_en.replace(es, en)

        for fmt in formats:
            try:
                return datetime.strptime(date_str_en, fmt)
            except:
                continue

        return None

    def validate_height(self, height: Optional[str]) -> Tuple[bool, Optional[str]]:
        """Validate a height measurement.

        Validates that a height is in the correct format (X.XX meters) and within
        reasonable human height ranges (0.5 to 2.5 meters).

        Args:
            height: The height string to validate (may include 'm' suffix or spaces)

        Returns:
            A tuple containing:
                - bool: True if the height is valid, False otherwise
                - Optional[str]: The cleaned height if valid,
                  or error message if invalid, or None if height is empty

        Examples:
            >>> validator = DocumentValidator()
            >>> validator.validate_height('1.75')
            (True, '1.75')
            >>> validator.validate_height('1.75 m')
            (True, '1.75')
            >>> validator.validate_height('3.00')
            (False, 'Estatura fuera de rango: 3.00')
            >>> validator.validate_height('175')
            (False, 'Formato de estatura inválido: 175')

        Note:
            Expected format is X.XX (e.g., 1.75) representing meters.
            Height must be between 0.5 and 2.5 meters to be considered valid.
            Empty heights are considered valid and return (True, None).
        """
        if not height:
            return True, None

        height = normalize_upper(height) or ''
        height = re.sub(r'[M\s]', '', height)

        if not self.height_pattern.match(height):
            return False, f"Formato de estatura inválido: {height}"

        height_float = float(height)
        if height_float < 0.5 or height_float > 2.5:
            return False, f"Estatura fuera de rango: {height}"

        return True, height

    def validate_blood_type(self, blood_type: Optional[str]) -> Tuple[bool, Optional[str]]:
        """Validate a blood type designation.

        Validates that a blood type follows the ABO system format with Rh factor
        (e.g., A+, B-, AB+, O-).

        Args:
            blood_type: The blood type string to validate

        Returns:
            A tuple containing:
                - bool: True if the blood type is valid, False otherwise
                - Optional[str]: The normalized blood type if valid,
                  or error message if invalid, or None if blood_type is empty

        Examples:
            >>> validator = DocumentValidator()
            >>> validator.validate_blood_type('a+')
            (True, 'A+')
            >>> validator.validate_blood_type('AB -')
            (True, 'AB-')
            >>> validator.validate_blood_type('C+')
            (False, 'Tipo de sangre inválido: C+')

        Valid blood types:
            - A+ , A-
            - B+ , B-
            - AB+, AB-
            - O+ , O-

        Note:
            The method normalizes input to uppercase and removes spaces.
            Empty blood types are considered valid and return (True, None).
        """
        if not blood_type:
            return True, None

        blood_type = normalize_upper(blood_type) or ''

        blood_type = re.sub(r'\s+', '', blood_type)

        if not self.blood_type_pattern.match(blood_type):
            return False, f"Tipo de sangre inválido: {blood_type}"

        return True, blood_type

    def validate_gender(self, gender: Optional[str]) -> Tuple[bool, Optional[str]]:
        """Validate and normalize gender designation.

        Validates gender and normalizes various representations to standard codes
        (M for male, F for female). Accepts Spanish and English variations.

        Args:
            gender: The gender designation to validate

        Returns:
            A tuple containing:
                - bool: True if the gender is valid, False otherwise
                - Optional[str]: The normalized gender code ('M' or 'F') if valid,
                  or error message if invalid

        Examples:
            >>> validator = DocumentValidator()
            >>> validator.validate_gender('masculino')
            (True, 'M')
            >>> validator.validate_gender('FEMALE')
            (True, 'F')
            >>> validator.validate_gender('X')
            (False, 'Género inválido: X')
            >>> validator.validate_gender('')
            (False, 'Género vacío')

        Accepted values:
            - Male: 'M', 'MASCULINO', 'HOMBRE', 'MALE'
            - Female: 'F', 'FEMENINO', 'MUJER', 'FEMALE'

        Note:
            Gender is a required field and empty values are not accepted.
            All input is converted to uppercase before processing.
        """
        if not gender:
            return False, "Género vacío"

        gender = normalize_upper(gender) or ''

        if gender in ['MASCULINO', 'HOMBRE', 'MALE']:
            gender = 'M'
        elif gender in ['FEMENINO', 'MUJER', 'FEMALE']:
            gender = 'F'

        if not self.gender_pattern.match(gender):
            return False, f"Género inválido: {gender}"

        return True, gender

    def validate_place(self, place: Optional[str], field_name: str = "lugar") -> Tuple[bool, Optional[str]]:
        """Validate a place name (city, region, etc.).

        Validates that a place name has appropriate length and normalizes it
        to uppercase format.

        Args:
            place: The place name to validate
            field_name: The field name for error messages (e.g., 'Lugar de nacimiento')

        Returns:
            A tuple containing:
                - bool: True if the place is valid, False otherwise
                - Optional[str]: The normalized place name (uppercase) if valid,
                  or error message if invalid, or None if place is empty

        Examples:
            >>> validator = DocumentValidator()
            >>> validator.validate_place('bogotá d.c.', 'Lugar de nacimiento')
            (True, 'BOGOTÁ D.C.')
            >>> validator.validate_place('x', 'Lugar de expedición')
            (False, 'Lugar de expedición muy corto: X')

        Note:
            Place names must be between 2 and 200 characters.
            Empty places are considered valid and return (True, None).
            All valid places are normalized to uppercase.
        """
        if not place:
            return True, None

        place = normalize_upper(place) or ''

        if len(place) < 2:
            return False, f"{field_name} muy corto: {place}"

        if len(place) > 200:
            return False, f"{field_name} muy largo: {place}"

        return True, place

    # ===== Generic helpers for other document types =====
    def validate_document_data(self, data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any], list]:
        """Validate complete document data with all fields.

        Performs comprehensive validation on a document's data dictionary,
        validating each field according to its specific rules and returning
        cleaned/normalized data along with any validation errors.

        Args:
            data: Dictionary containing document fields to validate

        Returns:
            A tuple containing:
                - bool: True if document passes validation (has required fields),
                  False otherwise
                - Dict[str, Any]: Dictionary with validated and cleaned field values
                - list: List of validation error messages for failed fields

        Examples:
            >>> validator = DocumentValidator()
            >>> data = {
            ...     'document_number': '1.234.567',
            ...     'first_names': 'juan carlos',
            ...     'last_names': 'rodriguez',
            ...     'gender': 'masculino',
            ...     'height': '1.75 m'
            ... }
            >>> is_valid, validated, errors = validator.validate_document_data(data)
            >>> print(f"Valid: {is_valid}")
            >>> print(f"Cleaned data: {validated}")
            >>> if errors:
            ...     print(f"Errors: {errors}")

        Validated fields:
            - document_number: Required, must be 6-11 digits
            - first_names: Required, Spanish alphabet + spaces
            - last_names: Required, Spanish alphabet + spaces
            - birth_date: Optional, multiple date formats supported
            - birth_place: Optional, place name validation
            - height: Optional, X.XX meter format, 0.5-2.5 range
            - blood_type: Optional, ABO system with Rh factor
            - gender: Required, normalized to M/F codes
            - expedition_date: Optional, multiple date formats
            - expedition_place: Optional, place name validation

        Note:
            A document is considered valid if it has at minimum:
            document_number, first_names, and last_names with valid values.
            Other fields can fail validation but won't invalidate the entire document.

        Raises:
            No exceptions are raised. All validation errors are captured
            in the returned error list.
        """
        validated_data = {}
        errors = []

        is_valid, value = self.validate_document_number(data.get('document_number'))
        if is_valid:
            validated_data['document_number'] = value
        else:
            errors.append(f"document_number: {value}")

        is_valid, value = self.validate_name(data.get('first_names'), 'Nombres')
        if is_valid:
            validated_data['first_names'] = value
        elif data.get('first_names'):
            errors.append(f"first_names: {value}")

        is_valid, value = self.validate_name(data.get('last_names'), 'Apellidos')
        if is_valid:
            validated_data['last_names'] = value
        elif data.get('last_names'):
            errors.append(f"last_names: {value}")

        is_valid, value = self.validate_date(data.get('birth_date'), 'Fecha de nacimiento')
        if is_valid:
            validated_data['birth_date'] = value
        elif data.get('birth_date'):
            errors.append(f"birth_date: {value}")

        is_valid, value = self.validate_place(data.get('birth_place'), 'Lugar de nacimiento')
        if is_valid:
            validated_data['birth_place'] = value
        elif data.get('birth_place'):
            errors.append(f"birth_place: {value}")

        is_valid, value = self.validate_height(data.get('height'))
        if is_valid:
            validated_data['height'] = value
        elif data.get('height'):
            errors.append(f"height: {value}")

        is_valid, value = self.validate_blood_type(data.get('blood_type'))
        if is_valid:
            validated_data['blood_type'] = value
        elif data.get('blood_type'):
            errors.append(f"blood_type: {value}")

        is_valid, value = self.validate_gender(data.get('gender'))
        if is_valid:
            validated_data['gender'] = value
        else:
            errors.append(f"gender: {value}")

        is_valid, value = self.validate_date(data.get('expedition_date'), 'Fecha de expedición')
        if is_valid:
            validated_data['expedition_date'] = value
        elif data.get('expedition_date'):
            errors.append(f"expedition_date: {value}")

        is_valid, value = self.validate_place(data.get('expedition_place'), 'Lugar de expedición')
        if is_valid:
            validated_data['expedition_place'] = value
        elif data.get('expedition_place'):
            errors.append(f"expedition_place: {value}")

        overall_valid = len(errors) == 0 or (
            'document_number' in validated_data and
            'first_names' in validated_data and
            'last_names' in validated_data
        )

        return overall_valid, validated_data, errors


# =========================
# Specific validators (thin wrappers)
# =========================

class ColombianIDValidator:
    """Thin wrapper delegating to DocumentValidator for Colombian ID fields."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any], List[str]]:
        core = DocumentValidator()
        return core.validate_document_data(data)


class CVValidator:
    """Validator for CV/Resume documents with universal structure."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any], List[str]]:
        """Validate CV data with precision-focused structure.

        Validates the new CV structure with:
        - Atomic contact data (full_name, email, phone, location)
        - social_links as array of objects
        - experience as array of job objects
        - education as array of academic objects
        - generic_skills/languages/certifications as lists

        Args:
            data: Dictionary containing CV fields

        Returns:
            Tuple of (is_valid, validated_data, errors)
        """
        errors: List[str] = []
        validated: Dict[str, Any] = {}

        # Atomic Contact Data
        validated['full_name'] = data.get('full_name')  # Preserve exactly as extracted

        # Email: validate format
        email = data.get('email')
        if email:
            email = email.strip()
            import re as _re
            if _re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
                validated['email'] = email
            else:
                errors.append(f"email: invalid format - {email}")
                validated['email'] = email  # Keep it but flag error
        else:
            validated['email'] = None

        # Phone: preserve exact format
        validated['phone'] = data.get('phone')

        # Location: preserve exact format
        validated['location'] = data.get('location')

        # Professional summary: free text
        validated['professional_summary'] = data.get('professional_summary')

        # Social Links: validate structure
        social_links = data.get('social_links')
        if social_links:
            if isinstance(social_links, list):
                # Validate each link object has 'type' and 'url'
                valid_links = []
                for link in social_links:
                    if isinstance(link, dict) and 'type' in link and 'url' in link:
                        valid_links.append(link)
                    else:
                        errors.append("social_links: each element must include 'type' and 'url'")
                validated['social_links'] = valid_links if valid_links else None
            else:
                errors.append("social_links: must be an array of objects")
                validated['social_links'] = None
        else:
            validated['social_links'] = None

        # Experience: validate array structure
        experience = data.get('experience')
        if experience:
            if isinstance(experience, list):
                validated['experience'] = experience  # Trust the structure from extraction
            else:
                errors.append("experience: must be an array of objects")
                validated['experience'] = None
        else:
            validated['experience'] = None

        # Independent work: same structure as experience
        independent_work = data.get('independent_work')
        if independent_work:
            if isinstance(independent_work, list):
                validated['independent_work'] = independent_work
            else:
                errors.append("independent_work: must be an array of objects")
                validated['independent_work'] = None
        else:
            validated['independent_work'] = None

        # Education: validate array structure
        education = data.get('education')
        if education:
            if isinstance(education, list):
                validated['education'] = education  # Trust the structure from extraction
            else:
                errors.append("education: must be an array of objects")
                validated['education'] = None
        else:
            validated['education'] = None

        # Languages: ensure it's a list or None
        languages = data.get('languages')
        if languages:
            if isinstance(languages, list):
                validated['languages'] = languages
            elif isinstance(languages, str):
                # If string, try to parse
                validated['languages'] = [l.strip() for l in languages.split(',') if l.strip()]
            else:
                errors.append("languages: must be a list")
                validated['languages'] = None
        else:
            validated['languages'] = None

        # Document language: preserve string
        validated['document_language'] = data.get('document_language')

        # Certifications: ensure it's a list or None
        certifications = data.get('certifications')
        if certifications:
            if isinstance(certifications, list):
                validated['certifications'] = certifications
            elif isinstance(certifications, str):
                # If string, try to parse
                validated['certifications'] = [c.strip() for c in certifications.split(',') if c.strip()]
            else:
                errors.append("certifications: must be a list")
                validated['certifications'] = None
        else:
            validated['certifications'] = None

        # Generic Skills: ensure it's a list or None
        generic_skills = data.get('generic_skills')
        if generic_skills:
            if isinstance(generic_skills, list):
                validated['generic_skills'] = [str(s).strip() for s in generic_skills if s]
            elif isinstance(generic_skills, str):
                # If string, try to parse as comma-separated
                validated['generic_skills'] = [s.strip() for s in generic_skills.split(',') if s.strip()]
            else:
                errors.append("generic_skills: must be a list")
                validated['generic_skills'] = None
        else:
            validated['generic_skills'] = None

        # Achievements: ensure list of strings
        achievements = data.get('achievements')
        if achievements:
            if isinstance(achievements, list):
                validated['achievements'] = [str(a).strip() for a in achievements if str(a).strip()]
            elif isinstance(achievements, str):
                validated['achievements'] = [a.strip() for a in achievements.split('\n') if a.strip()]
            else:
                errors.append("achievements: must be a list or text")
                validated['achievements'] = None
        else:
            validated['achievements'] = None

        # Volunteering: expect list similar to experience
        volunteering = data.get('volunteering')
        if volunteering:
            if isinstance(volunteering, list):
                validated['volunteering'] = volunteering
            else:
                errors.append("volunteering: must be an array of objects")
                validated['volunteering'] = None
        else:
            validated['volunteering'] = None

        # Professional affiliations: list of strings
        affiliations = data.get('professional_affiliations')
        if affiliations:
            if isinstance(affiliations, list):
                validated['professional_affiliations'] = [str(a).strip() for a in affiliations if str(a).strip()]
            elif isinstance(affiliations, str):
                validated['professional_affiliations'] = [a.strip() for a in affiliations.split(',') if a.strip()]
            else:
                errors.append("professional_affiliations: must be a list")
                validated['professional_affiliations'] = None
        else:
            validated['professional_affiliations'] = None

        # Interests: list of strings
        interests = data.get('interests')
        if interests:
            if isinstance(interests, list):
                validated['interests'] = [str(i).strip() for i in interests if str(i).strip()]
            elif isinstance(interests, str):
                validated['interests'] = [i.strip() for i in interests.split(',') if i.strip()]
            else:
                errors.append("interests: must be a list")
                validated['interests'] = None
        else:
            validated['interests'] = None

        # Consider valid if at least full_name and email are present
        is_valid = bool(validated.get('full_name')) and bool(validated.get('email'))

        return is_valid, validated, errors