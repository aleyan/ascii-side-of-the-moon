# Release Guide

This project uses GitHub Actions for automated npm publishing and releases.

## 🚀 Publishing a New Version

### Option 1: Automated Release (Recommended)
1. **Update version locally**: `pnpm version patch` (or `minor`/`major`)
2. **Push the version bump**: `git push && git push --tags`
3. **GitHub automatically creates** a draft release with generated notes
4. **Review and publish** via the "Releases" tab
5. **npm publishing** happens automatically when you publish the release

This will:
- Automatically generate release notes from your commits
- Create a draft GitHub release
- Let you review and edit before publishing
- Automatically trigger npm publishing when you publish the release

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
- **Release Drafter**: Automatically creates draft releases when tags are pushed
- **Publish**: Runs when releases are published (triggers npm publishing)

## 📝 Version Management

### **Updating Version:**
```bash
# Bug fixes (1.0.0 → 1.0.1)
pnpm version patch

# New features (1.0.0 → 1.1.0)  
pnpm version minor

# Breaking changes (1.0.0 → 2.0.0)
pnpm version major
```

### **Version Guidelines:**
- **Patch** (`1.0.1`): Bug fixes
- **Minor** (`1.1.0`): New features, backward compatible
- **Major** (`2.0.0`): Breaking changes

### **Important:**
- **Always update version locally first** before creating GitHub release
- **Version in package.json must match** what gets published
- **GitHub Action automatically reads** the correct version

## 🚨 Troubleshooting

If publishing fails:
1. Check the Actions tab for error details
2. Ensure NPM_TOKEN is set correctly
3. Verify tests pass locally
4. Check npm registry access
