"""
Service layer for data app.

Business logic for CV parsing, technology matching, and skill extraction.
"""

from .technology_matcher import TechnologyMatcherService
from .cv_parser import CVParserService

__all__ = ['TechnologyMatcherService', 'CVParserService']

