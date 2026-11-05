PocketPlan is an offline personal finance application for tracking your money in one place.

### What's new in v0.1.3

- Fixed an Android startup crash caused by release code shrinking removing required enum methods.
- The app now stays in dark mode; removed the display-mode switch.
- Fixed mobile filter dropdown positioning and made filter controls slightly smaller.
- Fixed extra scrolling on short mobile pages while retaining scrolling for longer content.

### Included features

- Wallet cards with balances updated by recorded income and expenses.
- Transaction history, income tracking, and a financial calendar using Philippine dates.
- Lending and repayments, savings goals, investments, and monthly budget plans.
- Rust financial calculations, validation, and local storage in the native application.
- Responsive layouts, dark and light modes, color themes, and the coin photo logo.
- Fixed browser previews incorrectly trying to load desktop-only storage.

### Download

Download **PocketPlan-0.1.3-android-arm64.apk** on your Android phone and open it. Enable installation from this source if Android asks. The app supports Android 7.0 and later on ARM64 devices. No development server or internet connection is needed for normal use after installation.

The APK is signed with PocketPlan's release key. SHA-256 checksums are supplied in `SHA256SUMS-android.txt`. This is a direct APK download, not a Google Play Store listing.

### Your data

Financial data stays on the device. Android, desktop, and browser installations use separate storage. There is no cloud sync, bank connection, or automatic updater. Saved JSON is not encrypted. Keep the same signed app installed when updating; uninstalling it can remove its local records. This release does not include an iOS build.
