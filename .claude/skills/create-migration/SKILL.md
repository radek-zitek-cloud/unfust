---
name: create-migration
description: Create and apply an Alembic database migration. Usage - /create-migration <description of model changes>
disable-model-invocation: true
---

# Create Alembic Migration

## Workflow

1. **Apply the model changes** described by the user in `backend/app/models/`
2. **Generate the migration:**
   ```bash
   cd /home/radek/Code/unfust/backend && uv run alembic revision --autogenerate -m "<short description>"
   ```
3. **Review the generated migration** in `backend/alembic/versions/` — read the new file and verify:
   - The upgrade/downgrade operations are correct
   - No unwanted changes were auto-detected
   - Indexes and constraints are properly named
4. **Apply the migration:**
   ```bash
   cd /home/radek/Code/unfust/backend && uv run alembic upgrade head
   ```
5. **Run tests** to verify nothing broke:
   ```bash
   cd /home/radek/Code/unfust/backend && uv run pytest tests/ -v
   ```
6. **Commit** the model changes and migration file together.

## Rules
- Always review auto-generated migrations before applying — they can miss renames (treating them as drop+create)
- Migration messages should be lowercase, descriptive: `add email_verified to users`, `create audit_log table`
- If downgrade is complex, verify it works: `uv run alembic downgrade -1` then `uv run alembic upgrade head`
