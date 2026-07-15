#!/usr/bin/env python3
"""Compatibility entry point for the canonical restaurant data builder.

Use ``scripts/build_data.py`` for new automation. This wrapper remains so older
notes and commands cannot generate a second, incompatible JSON schema.
"""

from build_data import main


if __name__ == "__main__":
    raise SystemExit(main())
