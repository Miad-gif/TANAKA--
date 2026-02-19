Mr. Tanaka — Build & Publish Guide

This file explains how to generate icon PNGs, export mockups, set up Capacitor, and produce signed builds for Android and iOS.

1) Generate app icons (PNG)

- Requirements: Node.js installed. `sharp` may require native build tools.

Run:

```bash
npm install
npm run generate-icons
```

This will read `assets/icon.svg` and produce PNGs in `assets/icons/` (sizes: 48..1024). It will also create Android mipmap folders under `assets/icons/`.

If `sharp` fails to install on Windows, you can instead use Inkscape or ImageMagick:

Inkscape (export PNG):

```bash
inkscape assets/icon.svg --export-type=png --export-filename=assets/icons/icon-512x512.png -w 512 -h 512
```

ImageMagick:

```bash
magick convert assets/icon.svg -resize 512x512 assets/icons/icon-512x512.png
```

2) Export screenshot mockups

Run:

```bash
npm run generate-mockups
```

Open `mockups/index.html` in a browser and export the SVG mockups to PNG (right-click → Save image as... or open SVG and export to PNG). Use the recommended resolutions in the Play/App Store checklist.

3) Capacitor setup (Android & iOS)

- Install Capacitor (already in devDependencies):

```bash
npm install
npx cap init
# or if config exists, skip init
```

- Android

```bash
npx cap add android
npx cap copy android
npx cap open android
```

This opens Android Studio. In Android Studio:
- Update `applicationId` in `android/app/src/main/AndroidManifest.xml` or via Gradle.
- Replace launcher icons with files from `assets/icons/mipmap-*` into `android/app/src/main/res/mipmap-*`.
- Build a signed AAB: Build > Generate Signed Bundle / APK > Android App Bundle.
- Create or use a keystore (see commands below).

Keystore generation example:

```bash
keytool -genkeypair -v -keystore my-release-key.jks -alias my_key_alias -keyalg RSA -keysize 2048 -validity 10000
```

Upload the signed AAB to Play Console (Internal test → rollout).

- iOS

```bash
npx cap add ios
npx cap copy ios
npx cap open ios
```

This opens Xcode. In Xcode:
- Set the bundle identifier to your App ID.
- Configure signing: select your team or use manual provisioning profiles and distribution certificate.
- Replace AppIcon with generated PNGs (1024×1024 in App Store Connect; Xcode asset catalog requires multiple sizes).
- Product > Archive to create an uploadable IPA, then upload to App Store Connect via Xcode Organizer.

4) Signing & App Store Connect / Play Console

- Google Play: recommended to use Play App Signing; keep your original keystore safe.
- Apple: Ensure you have Apple Developer membership and create App Store listing in App Store Connect.

5) Store listing

Prepare:
- Title, short/long descriptions, screenshots (phone/iPad), feature graphic (Play), privacy policy URL, contact email, category, keywords (iOS), release notes.

6) TestFlight & Play Internal testing

- Upload beta builds and invite testers. Verify crashes and analytics.

7) Release

- Start with a staged rollout and monitor analytics/comments.

If you'd like, I can:
- Replace `assets/icon.svg` with alternate artwork and auto-generate PNGs now (requires you to confirm the artwork),
- Generate ready-to-upload screenshot PNGs if you provide final in-game screenshot images to place inside the mockups,
- Walk through a live build on your machine step-by-step (I can provide exact commands for your Windows environment).
If you'd like, I can:
- Replace `assets/icon.svg` with alternate artwork and auto-generate PNGs now (requires you to confirm the artwork),
- Generate ready-to-upload screenshot PNGs if you provide final in-game screenshot images to place inside the mockups,
- Walk through a live build on your machine step-by-step (I can provide exact commands for your Windows environment).

---

Quick commands summary (copy/paste):

```powershell
npm install
npm run generate-icons    # create PNG icons in assets/icons/
npm run generate-mockups  # create mockup SVGs in mockups/
npm run serve             # quick local server at http://localhost:8080
npx cap add android
npx cap copy android
npx cap open android
```

For iOS (macOS only):

```bash
npx cap add ios
npx cap copy ios
npx cap open ios
```
