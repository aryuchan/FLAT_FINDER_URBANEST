---
name: urbanest-safe-customization
description: "Guide safe, full-stack UI/UX and functionality improvements for the Urbanest FlatFinder project using REFERANCE_FFCNND as a reference."
source: agent-customization
scope: workspace
---

# Urbanest Safe Customization Skill

## Purpose

Use this skill whenever you need to improve the Urbanest/FlatFinder application across frontend, backend, or database layers while preserving existing functionality.

This skill is designed for:

- responsive HTML/CSS enhancements,
- accessible forms and input UX,
- consistent color and typography updates,
- safe JavaScript behavior improvements,
- backend validation, security, and performance optimization,
- database query and schema improvements when needed.

> Always treat `REFERANCE_FFCNND` as a reference only. Do not modify it. Copy structure, patterns, and design intent from it rather than directly editing it.

## When to Use

- you need to improve page layout, forms, or responsiveness,
- you want to make frontend interactions more robust,
- you need to harden backend auth, endpoints, or request validation,
- you want to optimize database access without breaking the live app,
- you want a structured, safe way to make changes across the full stack.

## Workflow

1. Review the current baseline
   - inspect existing root files: `index.html`, `tenant_index.html`, `owner_index.html`, `admin_index.html`, `style.css`, `app.js`, `server.js`, `db.js`, and utility modules.
   - identify current role flows: tenant, owner, admin.
   - note shared components, forms, buttons, and input patterns.

2. Compare with reference patterns
   - open `REFERANCE_FFCNND` as a visual and structural guide.
   - identify HTML structure, typography, spacing, and UX patterns to align.
   - prioritize HTML-first improvements for layout and accessibility.

3. Plan safe frontend changes
   - prefer semantic HTML and progressive enhancements.
   - improve form labels, placeholders, helper text, and validation messages.
   - make buttons, cards, and alerts consistent across pages.
   - ensure mobile-first responsiveness and fluid spacing.
   - use CSS changes instead of JavaScript where possible for visual updates.

4. Update JavaScript only when needed
   - add or improve form validation, accessibility helpers, and interaction feedback.
   - keep behavior consistent with existing APIs and routes.
   - avoid breaking client-side assumptions in `ff-*.js` and `app.js`.
   - preserve API request payloads and response handling.

5. Harden backend safely
   - maintain existing auth and route contracts.
   - use validation libraries like Zod to validate incoming payloads.
   - make security headers, rate limiting, and CORS handling explicit and non-breaking.
   - avoid destructive schema changes unless a migration path is defined.

6. Improve database performance carefully
   - use query optimization and indexing first.
   - avoid schema changes unless necessary and clearly documented.
   - keep `db.js` and utility helpers stable.
   - add caching or query retry only when it does not alter results.

7. Validate quality and regressions
   - test all primary user flows: signup, login, listing creation, search, admin access.
   - verify pages render correctly on desktop and mobile.
   - confirm no existing feature is removed or degraded.
   - check that changes are additive and compatible with current route names.

## Decision Points

- Prefer HTML structure changes when the issue is layout, semantics, or accessibility.
- Prefer CSS updates for color, spacing, text consistency, hover/focus states, and responsive layouts.
- Use JavaScript when behavior, validation, or dynamic state handling is required.
- Touch backend code only for validation, security, routing, or performance issues.
- Change database schema only when the existing model cannot support the requested feature.

## Completion Criteria

- existing functionality continues to work for all user roles,
- UI and forms are more usable, accessible, and consistent,
- layouts are responsive and perform well on mobile,
- backend routes keep their current contract,
- database updates do not degrade query speed or integrity,
- `REFERANCE_FFCNND` is used only as a reference source.

## Example Prompts

- "Improve the tenant signup and listing workflow with responsive UI, better form labels, and safer backend validation."
- "Align the owner dashboard design with the reference folder and keep the API behavior unchanged."
- "Update the admin portal to be fully responsive, preserve current endpoints, and optimize database queries safely."
- "Use HTML-first improvements for page structure, then enhance JavaScript only where interaction needs it."

## Notes

- Keep the skill workspace-scoped: it is meant for this repository.
- Use this skill as a checklist for full-stack improvement tasks.
- If a task is unclear, ask whether the desired outcome is a visual UI update, a backend validation change, or a database optimization.
