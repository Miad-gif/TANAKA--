# Deploy & Share — Mr. Tanaka: THE BOSS

## Quick Deploy (GitHub Pages — Free & Easy)

1. **Create a GitHub account** (if you don't have one): https://github.com/signup

2. **Create a repository** on GitHub named `mr-tanaka-boss` (or any name)

3. **Enable GitHub Pages**:
   - Go to your repo → Settings → Pages
   - Source: select `main` branch, `/root` folder
   - Save

4. **Upload your game files**:
   - Clone or download the repo locally
   - Copy all files from your `TANAKA先生` folder (game.js, index.html, style.css, manifest.json, service-worker.js, assets/, etc.) into the repo root
   - Commit and push:
   ```bash
   git add .
   git commit -m "Initial game upload"
   git push origin main
   ```

5. **Your game is live!** Visit: `https://<your-username>.github.io/mr-tanaka-boss/`

6. **Generate QR code**: Open `qr-generator.html`, enter your deployed URL above, generate QR, and share!

---

## Local Play (Share via Hotspot)

If you prefer to share locally without deploying online:

1. **Start a local server on your Windows PC**:
   ```powershell
   cd "C:\Users\kmd37\OneDrive\Desktop\TANAKA先生"
   npm install
   npm run serve
   ```

2. **Find your PC's local IP**:
   ```powershell
   ipconfig
   # Look for "IPv4 Address" under your network adapter, e.g., 192.168.1.5
   ```

3. **Share the URL**: `http://<your-ip>:8080`
   - Teachers on the same WiFi can visit this URL and play

4. **Generate QR code**:
   - Open `qr-generator.html` in a browser
   - Enter `http://<your-ip>:8080` (replace `<your-ip>` with your actual IP from step 2)
   - Generate and share the QR code!

---

## Mobile & Offline Install (PWA)

After visiting the game URL (deployed or local):
- **Android**: Click menu → Install app (or look for install prompt)
- **iPhone**: Tap share → Add to Home Screen
- Game works offline (cached by service worker)

---

## Troubleshooting

- **"npm not found"**: Install Node.js (https://nodejs.org/) first
- **Port 8080 already in use**: Change in `package.json` (`-p 8081` instead of `-p 8080`)
- **localhost not working**: Use local IP (192.168.x.x) instead; see "Find your PC's local IP" above
- **QR code generator blank**: Make sure JavaScript is enabled in browser; try refreshing

---

## Next Steps for Teachers

1. **Scan QR code** with phone camera
2. **Open link** (auto-opens browser)
3. **Play game** (works on phone or tablet; keyboard also supported)
4. **Install as app** (optional) for offline play
5. **Compete on high scores** (local storage per device)

---

## Notes

- Game runs entirely in-browser; no login required
- High scores saved locally on each device (not synced across devices)
- Offline mode works after first visit (PWA service worker cached)
- For Play Store / Apple Store submission, you'll need to build signed APK/IPA (see README-PUBLISH.md)
