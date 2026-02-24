#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    # Default development server port to 8001 unless addr:port is explicitly passed.
    if len(sys.argv) >= 2 and sys.argv[1] == "runserver":
        has_addrport = any(not arg.startswith("-") for arg in sys.argv[2:])
        if not has_addrport:
            sys.argv.append("8001")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
