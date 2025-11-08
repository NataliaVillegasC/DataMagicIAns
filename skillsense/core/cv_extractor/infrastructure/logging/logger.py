"""Logging utilities for the ID extraction system.

This module provides centralized logging configuration and management for the
entire application. It supports both console and file logging with configurable
levels and formats optimized for development and production environments.

Typical usage example:
    # Setup application logging
    logger = setup_logger('my_app', 'app.log')
    logger.info('Application started')

    # Get existing logger
    logger = get_logger('my_app')
    logger.error('Something went wrong')
"""

import logging
import sys
from typing import Optional
from pathlib import Path
from datetime import datetime

from ..config import get_settings

def setup_logger(name: str = 'id_extractor', log_file: Optional[str] = None) -> logging.Logger:
    """Set up and configure a logger with console and optional file output.

    Creates a new logger instance with standardized formatting and handlers.
    Supports both console output (stdout) and optional file logging with
    automatic directory creation.

    Args:
        name: Name of the logger instance. Defaults to 'id_extractor'.
        log_file: Optional path to log file. If provided, enables file logging
            with automatic parent directory creation.

    Returns:
        Configured logging.Logger instance ready for use.

    Example:
        Basic logger setup:

        >>> # Console only logging
        >>> logger = setup_logger('my_app')
        >>> logger.info('Application started')
        >>>
        >>> # Console and file logging
        >>> logger = setup_logger('my_app', 'logs/app.log')
        >>> logger.warning('This goes to both console and file')

    Note:
        - Log level is controlled by LOG_LEVEL setting
        - Format includes timestamp, logger name, level, file:line, and message
        - Existing handlers are cleared to prevent duplicate logging
        - File logging creates parent directories automatically
    """
    settings = get_settings()

    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))

    if logger.handlers:
        logger.handlers.clear()

    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger

def get_logger(name: str = 'id_extractor') -> logging.Logger:
    """Retrieve an existing logger instance by name.

    Gets a previously configured logger instance. If the logger doesn't exist
    or hasn't been configured with setup_logger(), it will return a basic
    logger that may not have the desired handlers or formatting.

    Args:
        name: Name of the logger to retrieve. Defaults to 'id_extractor'.

    Returns:
        logging.Logger instance associated with the given name.

    Example:
        Using get_logger after setup:

        >>> # First setup the logger
        >>> setup_logger('my_app', 'logs/app.log')
        >>>
        >>> # Later, get the same logger instance
        >>> logger = get_logger('my_app')
        >>> logger.debug('Using existing logger configuration')

    Warning:
        If no logger with the given name has been set up using setup_logger(),
        this will return a basic logger without custom formatting or handlers.
        Always use setup_logger() first for proper configuration.
    """
    return logging.getLogger(name)