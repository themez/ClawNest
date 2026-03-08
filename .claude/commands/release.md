## Release ClawNest

Automate the full release process for ClawNest. Argument: version number (e.g. `0.3.0`).

### Steps

1. **Update version** in `package.json` to the provided version.

2. **Build & package** for all platforms:
   ```
   npm run package:mac
   npm run package:win
   ```

3. **Upload to Cloudflare R2** (bucket: `clawnest-releases`, MUST use `--remote`):
   - `dist/ClawNest-{ver}-arm64.dmg` → `ClawNest-{ver}-arm64.dmg`
   - `dist/ClawNest-{ver}.dmg` → `ClawNest-{ver}.dmg`
   - `dist/ClawNest Setup {ver}.exe` → upload TWICE with two keys:
     - `ClawNest-Setup-{ver}.exe` (website download link, hyphens)
     - `ClawNest Setup {ver}.exe` (auto-updater uses this, spaces, matches latest.yml)
   - `dist/latest-mac.yml` → `latest-mac.yml`
   - `dist/latest.yml` → `latest.yml`
   - `dist/ClawNest-{ver}-arm64.dmg.blockmap` → same name
   - `dist/ClawNest-{ver}.dmg.blockmap` → same name
   - `dist/ClawNest Setup {ver}.exe.blockmap` → same name

   Upload command format:
   ```
   npx wrangler r2 object put clawnest-releases/{KEY} --file="{LOCAL_PATH}" --remote
   ```

4. **Purge Cloudflare cache** for `clawnest-releases.xianz.me`:
   - Read OAuth token from `~/Library/Preferences/.wrangler/config/default.toml`
   - Get zone ID for `xianz.me` via Cloudflare API
   - POST to `/zones/{zone_id}/purge_cache` with `{"prefixes":["clawnest-releases.xianz.me/"]}`

5. **Commit & push** the clawbox repo with message: `chore: release v{ver}`

6. **Update website** at `../clawnest-website`:
   - Update `version: 'v{ver}'` in `src/i18n/en.ts` and `src/i18n/zh.ts`
   - Commit with message: `chore: bump download version to v{ver}`
   - Push to origin main
   - Build and deploy: `npm run build && npx wrangler pages deploy dist --project-name=clawnest-website`

7. **Copy Windows installer** to `~/Downloads/`

### Notes
- Always use `--remote` for R2 uploads (local is the default and won't work)
- Windows exe must be uploaded with TWO keys: hyphens for website, spaces for auto-updater (latest.yml references the space version)
- Ask for confirmation before pushing and deploying
