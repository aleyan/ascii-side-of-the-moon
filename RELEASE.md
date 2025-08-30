# Release Guide

This project uses GitHub Actions for automated npm publishing and releases.

## 🚀 Publishing a New Version

### Option 1: GitHub Release (Recommended)
1. Go to [Actions](https://github.com/aleyan/ascii-side-of-the-moon/actions) tab
2. Click on "Create Release" workflow
3. Click "Run workflow"
4. Enter the version (e.g., `1.0.0`, `1.1.0`, `2.0.0`)
5. Add release notes (optional)
6. Click "Run workflow"

This will:
- Create a GitHub release with the specified version
- Automatically trigger the publish workflow
- Run tests, linting, and build
- Publish to npm

### Option 2: Manual Release
1. Create a new GitHub release manually
2. Tag it with `v1.0.0` format
3. This will automatically trigger the publish workflow

### Option 3: Manual npm publish
```bash
npm version patch  # or minor, major
npm publish
```

## 📋 Prerequisites

Before using GitHub Actions, you need to:

1. **Add NPM_TOKEN to GitHub Secrets:**
   - Go to your npm account settings
   - Generate an access token
   - Add it to GitHub repository secrets as `NPM_TOKEN`

2. **Ensure tests pass locally:**
   ```bash
   pnpm test
   pnpm lint
   pnpm build
   ```

## 🔄 Workflow Details

- **CI**: Runs on every push/PR (tests, linting, build)
- **Publish**: Runs when releases are published
- **Create Release**: Manual workflow for creating releases

## 📝 Version Guidelines

- **Patch** (`1.0.1`): Bug fixes
- **Minor** (`1.1.0`): New features, backward compatible
- **Major** (`2.0.0`): Breaking changes

## 🚨 Troubleshooting

If publishing fails:
1. Check the Actions tab for error details
2. Ensure NPM_TOKEN is set correctly
3. Verify tests pass locally
4. Check npm registry access
