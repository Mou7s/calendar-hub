---
name: github-template-migration
description: Migrate an existing application into a GitHub-generated template repository while preserving both histories, application files, local changes, and repository-level configuration.
---

# GitHub template migration

Use this workflow when the user explicitly requests GitHub's generated-from-template relationship for an existing project. An upstream remote or README attribution does not establish that relationship.

## Preserve state

Inspect authentication, admin permission, remote branches, local HEAD, staged and unstaged changes, untracked files, workflows, secrets names, hooks, protection, Pages, deployments, and repository metadata. Back up Git history with a bundle and working changes separately. Concurrent work may advance HEAD; recheck before creating the migration commit and use an expected-old-value ref update.

Generate a temporary repository through `POST /repos/{template_owner}/{template_repo}/generate`. Verify `template_repository.full_name` with a subsequent GET; the immediate generation response can omit it while provisioning. Keep the generated initial commit reachable.

## Preserve both histories

Build a commit with the existing application's tree and two parents: the generated template commit and the existing application HEAD. `git commit-tree` avoids applying template files over the working tree. Check that the tree exactly equals the application tree, both parents are ancestors, and the remote update is a fast-forward from the template initial commit. Push existing branches and tags explicitly; do not mirror internal or remote-tracking refs.

Do not commit unrelated working changes to accomplish a repository migration. If updating the current branch to a commit with an identical tree, retain the index and working tree and verify their status afterwards.

## Cutover and verify

Complete project validation before renaming repositories. Retain the old repository under a distinct name, then give the new repository the original name. Record repository IDs before renaming and verify them afterwards; old URLs redirect and an occupied name can change where a URL resolves.

Reapply homepage, topics and relevant repository settings. Repository secrets cannot be read back through GitHub; recover them only from an authorized existing credential source or report that they remain on the legacy repository. External integrations and repository IDs need separate verification; a rename alone does not migrate them.

Update local origin/upstream/legacy remotes and tracking refs. Verify template metadata, remote HEAD/tree, original commit ancestry, branches/tags and local changes. Keep template generation SHA distinct from the application's originally copied baseline; provenance is not proof of upstream code synchronization.

Follow AGENTS.md checks and protect the read-only application and stable ICS contracts. Record durable origin details in `docs/template-origin.md`.
