QuickReset — Full Project Reset and First-Install Rebuild
=========================================================

Summary
-------
This document provides safe, repeatable scripts and steps to reset the Certificate Verification System to a clean first-install state. It does NOT run anything automatically — you must run the scripts intentionally.

Important safety note
---------------------
- The reset scripts delete data and files permanently. Always back up your database and important files before running.
- The MongoDB reset requires `RESET_CONFIRM=YES` environment variable to be set to avoid accidental drops.

Quick commands
--------------
- Create env files from examples (no overwrite):

  PowerShell

  ```powershell
  .\scripts\generate_envs.ps1
  ```

  Bash

  ```bash
  ./scripts/generate_envs.sh
  ```

- Reset MongoDB (safe guard):

  ```bash
  # set confirmation env var before running
  SET "RESET_CONFIRM=YES" && python scripts/reset_db.py --uri "mongodb://localhost:27017/quickcheck"
  ```

- Cleanup generated files (PowerShell):

  ```powershell
  .\scripts\cleanup_files.ps1 -Force
  ```

- Recreate Python venv and install ai-service deps:

  PowerShell

  ```powershell
  .\scripts\recreate_venv.ps1
  ```

  Bash

  ```bash
  ./scripts/recreate_venv.sh
  ```

Recommended reset flow
----------------------
1. Backup MongoDB and uploads.
2. Stop backend, frontend, and ai-service processes.
3. Run `generate_envs` to ensure .env files exist.
4. Run `cleanup_files` (inspect output first, then run with force).
5. Set `RESET_CONFIRM=YES` and run `python scripts/reset_db.py` to drop the DB and recreate empty collections.
6. Recreate Python venv and install dependencies.
7. Start services in order: MongoDB => AI service => Backend => Frontend.
8. Visit the frontend, create admin account, and proceed with initial training flow.

Production hardening checklist
-----------------------------
- Rotate `JWT_SECRET` and other secrets.
- Use production MongoDB URI (replica set) and backup strategy.
- Run AI service in a supervised process manager (systemd, container, or supervisor).
- Configure CORS and allowed origins strictly in production.
- Remove `allow_origins: ["*"]` in production.
