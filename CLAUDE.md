# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Lint/Test Commands

### Django Backend
- Start server: `python server/manage.py runserver`
- Run migrations: `python server/manage.py migrate`
- Run single test: `python server/manage.py test sensor_api.tests.TestCaseName.test_name`

### React Frontend
- Dev server: `cd client && npm run dev`
- Build: `cd client && npm run build`
- Lint: `cd client && npm run lint`

## Code Style Guidelines

### Django (Python)
- Imports: standard lib → Django → third-party → local
- Use descriptive variable names in snake_case
- Document functions with docstrings
- Handle exceptions with try/except and proper logging
- Follow REST API patterns with appropriate status codes

### React (JavaScript)
- Use functional components with hooks
- Follow ESLint config with React best practices
- Component naming: PascalCase
- Props/variables: camelCase
- Context API for state management
- Group imports: React → third-party → local components → styles