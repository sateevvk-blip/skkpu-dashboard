# AGENTS.md

## Purpose

This file defines the working rules for AI agents that contribute to this web project.
The agent must preserve a clean architecture, avoid mixing concerns, and implement changes in a way that remains understandable for human developers.

## Project principles

- Separate structure, styles, behavior, server logic, and data.
- Follow existing project patterns before introducing new ones.
- Prefer simple solutions when they fully cover the task.
- Do not complicate the architecture without a clear technical reason.
- Reuse existing modules, components, layouts, and services whenever possible.

## Architecture rules

- HTML or view structure is responsible for semantic markup and page composition.
- CSS or style layers are responsible for presentation only.
- Client-side JavaScript or frontend logic is responsible for interactivity and UI state.
- Backend or API layers are responsible for business rules, data aggregation, and access to persistent data.
- Production business data must not be treated as frontend constants unless the project explicitly defines them as static content.

## Page rules

- If the project is a content-oriented website, create pages as separate HTML files, templates, or generated routes.
- If the project is an application with high interactivity, create pages as app routes composed of reusable components.
- Do not create a separate page file for a UI state that belongs to an existing application route.
- Repeated UI fragments must be extracted into shared components, partials, or layouts.

## Data rules

- Dashboard metrics, reports, tables, and business indicators must come from backend services, APIs, databases, or approved analytics sources.
- Frontend code may store only UI state, mock data, and explicitly approved static reference data.
- Do not hardcode live dashboard values, KPIs, or operational metrics in components or templates.
- Do not place secrets, private tokens, or protected credentials in frontend code or public files.
- Treat the backend or approved API as the source of truth for dynamic business data.

## Directory expectations

Use the existing repository structure if it already exists.
If the structure is missing or being created, prefer a layout close to this:

```text
project/
  public/              # public static assets
  src/
    pages/             # pages or route-level views
    components/        # reusable UI parts
    layouts/           # shared page shells
    styles/            # global styles, themes, tokens
    scripts/           # client scripts for non-framework projects
    services/          # API access and external integrations
    store/             # client state if used
    utils/             # shared helpers
    types/             # contracts and types
  data/                # mock or local static data only
  tests/               # automated tests
  docs/                # architecture and technical notes
