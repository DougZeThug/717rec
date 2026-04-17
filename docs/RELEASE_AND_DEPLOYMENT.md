# Release, Deployment, and Rollback Runbook

This document defines the minimum release governance for this repository so audits and incident response are repeatable.

## Versioning policy

- We use **Semantic Versioning** (`MAJOR.MINOR.PATCH`).
- Update `package.json` version for every release.
- Bump rules:
  - **MAJOR**: breaking changes
  - **MINOR**: backward-compatible features
  - **PATCH**: backward-compatible fixes

## Release checklist

1. Confirm a clean working tree:
   ```bash
   git status
   ```
2. Run quality checks:
   ```bash
   npm run lint
   npm run test
   npm run typecheck
   npm run build
   ```
3. Bump version in `package.json`.
4. Commit the release changes:
   ```bash
   git add package.json
   git commit -m "chore(release): vX.Y.Z"
   ```
5. Create and push a signed (or annotated) Git tag:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin main --follow-tags
   ```
6. Publish/deploy from the tagged commit.
7. Record release notes (included changes, risks, rollback owner).

## Deployment procedure

Current production deploy path is Lovable Publish.

1. Ensure the release tag exists and points to the intended commit:
   ```bash
   git rev-list -n 1 vX.Y.Z
   ```
2. Open the project in Lovable.
3. Use **Share → Publish**.
4. Verify post-deploy:
   - Home page loads.
   - Authentication works.
   - Core season/match workflows load without console errors.

## Rollback procedure

Use the fastest safe option for incident mitigation.

### Option A (preferred): redeploy previous stable tag

1. Identify the last known good release tag (example: `v1.2.3`).
2. Redeploy that exact version through the publish workflow.
3. Confirm service recovery with the same checks used post-deploy.

### Option B: revert commit(s) and publish

1. Revert offending commit(s):
   ```bash
   git revert <bad_commit_sha>
   ```
2. If multiple commits were involved, revert as a sequence and resolve conflicts.
3. Run checks:
   ```bash
   npm run test
   npm run build
   ```
4. Create a patch release (`vX.Y.(Z+1)`), tag, and publish.

## Incident record requirements

For every rollback or hotfix, log:

- Detection time (UTC)
- User impact summary
- Root cause (or current hypothesis)
- Mitigation used (A or B above)
- Recovery verification evidence
- Follow-up prevention tasks and owners
