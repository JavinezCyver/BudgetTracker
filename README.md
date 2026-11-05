# PocketPlan

A responsive personal finance app with wallets, transactions, income, a calendar, lending records, savings goals, investments, and monthly budgets. PocketPlan uses a Rust finance engine in its Tauri desktop application and a JavaScript interface with mobile bottom navigation.

## Development

```sh
npm install
npm run dev
```

The browser preview uses localStorage and the browser finance engine. New accounts start empty. Dashboard charts use transactions from the current month. Adding a transaction updates its selected wallet balance.

## Rust engine and native builds

`crates/pocketplan-core` owns native financial mutations, saved-data validation, migrations, centavo arithmetic, fractional investment valuations, budget calculations, savings allocations, and lending balances. The interface sends action intents; it cannot replace the native saved document or submit arbitrary final balances.

The native application exposes `load_snapshot` and `execute_action`. Rust reads the current state, validates the action, applies it, validates the resulting state, and writes a temporary file followed by replacement. Revision checks and an OS file lock prevent stale forms or concurrent app instances from overwriting newer records. Failed loads and rejected actions preserve the existing file. IDs and the Philippine date are generated in Rust.

The app identifier and `budget.json` location remain unchanged, so existing desktop records stay in the same location. Existing schema versions 1–3 are migrated on load. The file remains local JSON; this migration does not add encryption or authentication.

`npm run build:native` creates `dist-native` with native action adapters. The browser mutation implementation is excluded from this bundle. Tauri automatically uses the native development and build scripts. `npm run build` still creates the standalone browser build in `dist`.

The DOM, forms, styles, accessibility controls, chart rendering, and display filters remain JavaScript/HTML/CSS. The browser compatibility engine also remains JavaScript: the WebAssembly Rust standard library is not installed in the current environment and could not be downloaded. A browser WebAssembly migration is not represented as complete.

### Checks

```sh
npm run test:rust
npm run test:core
npm run build
npm run build:native
node scripts/check-app.mjs
node scripts/check-app.mjs --native
cargo check --manifest-path src-tauri/Cargo.toml --offline
```

The native browser checks inject a test IPC bridge to the real Rust executable; they do not access personal app files. Rust storage tests use isolated test directories. These checks cover browser layouts and command integration, not physical Android/iOS devices.

## Native app

The current release workflow targets Android. Earlier Windows portable builds require Microsoft Edge WebView2 Runtime; they do not require Node.js or Rust to run.

Install the Tauri platform prerequisites (Rust, and on Windows the MSVC C++ build tools and WebView2), then:

```sh
npm run tauri dev
```

## Android

Install Android Studio, Android SDK/NDK, Java, and the Rust Android targets required by Tauri. Then initialize the generated platform project:

```sh
npm run tauri -- android init --ci --skip-targets-install
node scripts/prepare-android.mjs
npm run tauri android dev
```

For a physical device, set Vite's host to `0.0.0.0` and Tauri's devUrl to your development machine's LAN address. iOS development requires macOS and Xcode; use `npm run tauri ios init` and `npm run tauri ios dev` on a Mac.

The generated Android project uses SDK 36, build-tools 36.0.0, NDK 28.2.13676358, Gradle 9.3.1, Android Gradle Plugin 9.1.0, and JDK 21. The release targets ARM64 Android 7.0 or later. The generated platform project is ignored and recreated in CI; `prepare-android.mjs` applies release signing and the coin launcher icons. This app stores data on one device and does not connect to a bank or synchronize accounts.

## Publishing the Android release

One-time setup: add these [GitHub repository Actions secrets](https://github.com/JavinezCyver/BudgetTracker/settings/secrets/actions). The signing key was generated locally at the owner's request. Never commit these files or paste them into issues or release notes:

| Repository secret | Value from local file |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `.android-signing/keystore-base64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | `.android-signing/password.txt` |

Keep a private backup of the entire `.android-signing` folder. The keystore alias is `pocketplan`. Every future update must use the same key; the workflow deliberately fails if signing secrets are missing. The release workflow verifies the APK signature before publishing it with its checksum.

After committing the release changes, push a tag matching the app version, or run **Release PocketPlan for Android** manually from GitHub Actions:

```sh
git push origin main
git tag -a v0.1.4 -m "PocketPlan v0.1.4 for Android"
git push origin v0.1.4
```

For a local signed APK, set `ANDROID_HOME`, `NDK_HOME`, and `JAVA_HOME` for the installed SDK/NDK/JDK, then in PowerShell:

```powershell
$env:POCKETPLAN_ANDROID_KEYSTORE = Join-Path (Get-Location) '.android-signing/pocketplan-release.jks'
$env:POCKETPLAN_ANDROID_PASSWORD = Get-Content .android-signing/password.txt -Raw
npm run tauri -- android build --ci --apk --target aarch64 -- --locked
node scripts/package-android.mjs
```

The output is `artifacts/PocketPlan-0.1.4-android-arm64.apk` with `SHA256SUMS-android.txt`. These files are created only after a successful build and signature verification. Release notes are in `.github/RELEASE_NOTES.md`. Automatic in-app updates and a Play Store listing are not configured.

Windows builds remain available through `npm run tauri -- build --no-bundle --ci -- --locked` and `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/package-release.ps1`.
