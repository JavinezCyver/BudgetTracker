# PocketPlan

A responsive personal budget app with a left navigation rail, Home dashboard, Wallets, and Calendar. Built with JavaScript, CSS, Rust, and Tauri 2.

## Development

```sh
npm install
npm run dev
```

The browser preview uses localStorage. In Tauri, the Rust commands read and write `budget.json` in the application's data directory. The initial balances and transactions are demonstration data. Dashboard charts use transactions from the current month. Adding a transaction updates its wallet balance.

## Native app

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
