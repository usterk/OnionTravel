# Testing Strategy - Merge Commit Testing

## Overview

OnionTravel uses **merge commit testing** to ensure that Pull Requests will work correctly AFTER merging to the target branch. This prevents situations where tests pass on a PR branch but fail after merge due to conflicts or integration issues.

## How It Works

### GitHub's Merge Commit

When you create a Pull Request, GitHub automatically creates a special "merge commit" that represents what the code will look like AFTER merging your PR branch with the target branch.

```
Your PR branch:        A---B---C  (your changes)
                      /
Target branch (main): D---E---F  (latest main)

Merge commit:         D---E---F---M  (your changes + latest main)
                                  ^
                                  This is what gets tested!
```

### Testing Flow

1. **PR Created**: Developer creates a Pull Request
2. **Merge Commit Created**: GitHub automatically creates merge commit
3. **Tests Run on Merge Commit**: CI/CD tests the actual code that will exist after merge
4. **New Commit Pushed**: If you push another commit to the PR, old tests are cancelled
5. **Tests Run Again**: New merge commit is tested (latest PR commit + latest target)
6. **Tests Pass**: PR is ready to merge
7. **PR Merged**: Code is merged to main
8. **Tests Run Again**: Validation on actual main commit
9. **Deploy**: If all tests pass, deploy to production

### Automatic Cancellation of Old Tests

When you push a new commit to your PR, GitHub Actions automatically **cancels old test runs** that are still in progress. This ensures:

- **Faster feedback**: No need to wait for outdated tests to finish
- **Resource efficiency**: CI/CD runners are not wasted on obsolete code
- **Always testing latest**: Only the most recent commit is tested

**How it works:**

```
PR #123 opened
  └─> Tests start for commit A (merge commit A+main)

You push commit B to PR #123
  └─> Tests for commit A are CANCELLED
  └─> Tests start for commit B (merge commit B+main)

You push commit C to PR #123
  └─> Tests for commit B are CANCELLED
  └─> Tests start for commit C (merge commit C+main)
```

**Concurrency groups:**
- Each PR has its own group: `test-pr-123`, `test-pr-124`, etc.
- Main branch has its own group: `test-main`
- Tests from different PRs don't cancel each other

## Benefits

### ✅ Prevents Integration Issues

**Without merge commit testing:**
```
Your branch:    Tests pass ✅
Main branch:    Tests pass ✅
After merge:    Tests fail ❌  (integration issue discovered too late!)
```

**With merge commit testing:**
```
Your branch:         Not tested directly
Main branch:         Tests pass ✅
Merge commit:        Tests fail ❌  (integration issue caught before merge!)
After fixing:        Tests pass ✅
After merge:         Tests pass ✅  (guaranteed!)
```

### ✅ Catches Conflicts Early

If someone else merged changes to main while you were working on your PR, merge commit testing will catch any conflicts or incompatibilities immediately.

### ✅ Safe to Merge

When tests pass on the merge commit, you can be **100% confident** that merging your PR won't break main.

## Implementation

### Workflow Configuration

In `.github/workflows/test.yml`, we use GitHub's merge ref for PRs and concurrency control:

```yaml
# Concurrency: Cancel old test runs when new commits are pushed
concurrency:
  group: ${{ github.event_name == 'pull_request' && format('test-pr-{0}', github.event.pull_request.number) || 'test-main' }}
  cancel-in-progress: true

jobs:
  backend-tests:
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          # For PRs: test merge commit (PR + target merged)
          # For pushes: test actual commit
          ref: ${{ github.event_name == 'pull_request' && format('refs/pull/{0}/merge', github.event.pull_request.number) || github.ref }}
```

### What Gets Tested

- **For Pull Requests**: `refs/pull/:prNumber/merge` (merge commit)
- **For pushes to main**: `refs/heads/main` (actual commit)

### Concurrency Control

- **For Pull Requests**: Each PR has its own group (`test-pr-123`)
  - New commits to PR #123 cancel old tests for PR #123
  - Tests for PR #124 are not affected
- **For main branch**: All pushes share one group (`test-main`)
  - New pushes to main cancel old tests on main

## Real-World Example

### Scenario: Two developers working simultaneously

**Developer A's PR:**
- Adds new API endpoint `/api/users`
- Tests pass ✅

**Developer B's PR:**
- Also adds `/api/users` endpoint (didn't know about A's work)
- Tests pass on their branch ✅

**What happens:**

1. Developer A merges first
2. Developer B's PR is now tested with merge commit (their changes + A's merged changes)
3. Tests **fail** ❌ - duplicate endpoint detected!
4. Developer B fixes the conflict before merging
5. Tests pass ✅ - safe to merge

**Without merge commit testing:**
Both PRs would pass tests, both would be merged, production would break! 🔥

## Best Practices

### For Developers

1. **Push commits freely**: Old test runs are automatically cancelled when you push new commits
   - No need to wait for tests to finish before pushing
   - The latest commit is always tested
2. **Always wait for tests to pass** before requesting review
   - Check the "Actions" tab to see test progress
   - Old runs show as "Cancelled" (this is expected)
3. **Re-run tests manually if needed**: If target branch changed while your PR was open
   - Click "Re-run jobs" in the Actions tab
4. **Check test logs** to understand what's being tested:
   ```
   Testing context:
     Event: Pull Request #123
     Testing: MERGE COMMIT (PR + target branch)
     Source: feature/my-feature
     Target: main
     Concurrency group: test-pr-123
     Old test runs for this PR are automatically cancelled
   ```

### For Reviewers

1. **Check that tests passed** on the merge commit
   - Look for the latest test run (old cancelled runs are normal)
2. **Don't approve** if tests are failing
3. **Re-request tests** if target branch was updated since last test run
4. **Ignore cancelled test runs** - these are automatically cancelled by newer commits

### For CI/CD Maintainers

1. **Monitor test failures** on merge commits
2. **Update test workflow** if false positives occur
3. **Ensure adequate test coverage** (90% backend, comprehensive frontend)

## Troubleshooting

### Problem: Tests pass on my branch but fail on merge commit

**Reason**: Your branch is outdated with target branch. Someone else merged changes that conflict with yours.

**Solution**:
```bash
# Update your branch with latest main
git checkout main
git pull origin main
git checkout your-branch
git merge main
# Resolve conflicts if any
git push
```

### Problem: Merge commit tests are taking too long

**Reason**: GitHub needs to create the merge commit, which can take a few seconds.

**Solution**: This is normal. If it takes more than 1-2 minutes, check GitHub status page.

### Problem: "Merge commit is not available"

**Reason**: There are conflicts between your branch and target branch that prevent automatic merge.

**Solution**: Resolve conflicts manually (see solution above).

## Technical Details

### GitHub Refs

GitHub provides several refs for PRs:

- `refs/pull/:prNumber/head` - The tip of the PR branch
- `refs/pull/:prNumber/merge` - The merge commit (PR + target) ⭐ **We use this**
- `refs/pull/:prNumber/merge-commit` - Legacy, don't use

### Merge Commit Properties

- **Automatic**: GitHub creates it automatically for every PR
- **Updated**: Regenerated when PR branch or target branch changes
- **Temporary**: Deleted after PR is closed/merged
- **Read-only**: Cannot be modified directly

### When Merge Commit is Not Created

GitHub will NOT create a merge commit if:
- PR has merge conflicts (must be resolved first)
- PR is in draft mode (some configurations)
- Target branch doesn't exist

In these cases, tests will fail with "ref not found" error.

## Related Documentation

- **Workflow Implementation**: `.github/workflows/test.yml`
- **CI/CD Overview**: `.github/README.md`
- **Deployment Guide**: `.github/DEPLOYMENT_SETUP.md`
- **Project Guidelines**: `../CLAUDE.md`

## References

- [GitHub Actions: Checkout Action](https://github.com/actions/checkout)
- [GitHub API: Pull Request Refs](https://docs.github.com/en/rest/pulls/pulls)
- [Continuous Integration Best Practices](https://docs.github.com/en/actions/automating-builds-and-tests/about-continuous-integration)

---

**Summary**: Merge commit testing ensures your PR will work correctly AFTER merging. Always wait for tests to pass on the merge commit before merging to main.
