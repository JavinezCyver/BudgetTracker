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

For Windows releases, download the x64 `.exe` from the repository's **Releases** page and run it with Microsoft Edge WebView2 Runtime installed. The portable release does not require Node.js or Rust. Mobile binaries are not included.

Install the Tauri platform prerequisites (Rust, and on Windows the MSVC C++ build tools and WebView2), then:

```sh
npm run tauri dev
```

## Android

Install Android Studio, Android SDK/NDK, Java, and the Rust Android targets required by Tauri. Then initialize the generated platform project:

```sh
npm run tauri android init
npm run tauri android dev
npm run tauri android build
```

For a physical device, set Vite's host to `0.0.0.0` and Tauri's devUrl to your development machine's LAN address. iOS development requires macOS and Xcode; use `npm run tauri ios init` and `npm run tauri ios dev` on a Mac.

Native bundles and mobile platform projects must be generated on a configured development machine. No mobile binary is included. This app stores data on one device and does not connect to a bank or synchronize accounts.

## Publishing a Windows release

The release workflow builds and publishes the portable Windows x64 executable with a SHA-256 checksum. Push a version tag matching `package.json`, or run **Release PocketPlan for Windows** manually from GitHub Actions:

```sh
git push origin main
git tag -a v0.1.0 -m "PocketPlan v0.1.0"
git push origin v0.1.0
```

For a local release build, run `npm run tauri -- build --no-bundle --ci -- --locked`, then `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/package-release.ps1`. The output is in the ignored `artifacts` directory. Release notes are in `.github/RELEASE_NOTES.md`. Published builds are unsigned and do not implement automatic updates.
