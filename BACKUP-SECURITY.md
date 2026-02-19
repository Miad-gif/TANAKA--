# Project Backup & Export Guide

## 🔒 Protect Your Project

### Option 1: GitHub Backup (Recommended)

Keep your code safe and version-controlled on GitHub:

**Steps:**
1. Create a GitHub account: https://github.com/signup
2. Create a new repository named `mr-tanaka-boss`
3. Initialize git locally:
   ```powershell
   cd "C:\Users\kmd37\OneDrive\Desktop\TANAKA先生"
   git init
   git remote add origin https://github.com/<your-username>/mr-tanaka-boss.git
   git add .
   git commit -m "Initial commit: Mr. Tanaka game"
   git push -u origin main
   ```
4. Your code is now backed up and version-controlled on GitHub

**Benefits:**
- Free cloud backup
- Track changes with commits
- Collaborate with others
- Easy deployment to GitHub Pages

---

### Option 2: Local Backup (Zip Archive)

Create a backup copy on your computer:

**Steps:**
1. Navigate to your OneDrive folder
2. Right-click `TANAKA先生` folder → Send to → Compressed (zipped) folder
3. This creates `TANAKA先生.zip` — save this in a safe location (USB drive, cloud storage, etc.)

**Or from PowerShell:**
```powershell
Compress-Archive -Path "C:\Users\kmd37\OneDrive\Desktop\TANAKA先生" -DestinationPath "C:\Users\kmd37\Desktop\TANAKA先生-backup-$(Get-Date -Format yyyyMMdd).zip"
```

**Restore from backup:**
```powershell
Expand-Archive -Path "TANAKA先生-backup.zip" -DestinationPath "C:\Users\kmd37\OneDrive\Desktop"
```

---

### Option 3: Cloud Storage Backup

Automatically sync your project folder to cloud storage:

**Google Drive / OneDrive:**
- Your project is already in OneDrive (great!)
- Ensure it's syncing: Settings → Sync

**Dropbox:**
- Install Dropbox (https://www.dropbox.com)
- Move your `TANAKA先生` folder to Dropbox folder
- Auto-synced and backed up

---

## 📤 Export Game Data (High Scores)

Teachers or players can export their high scores from the game:

**How it works:**
1. In browsers, open the game
2. Press F12 to open Developer Tools → Console
3. Run this command:
   ```javascript
   JSON.stringify(localStorage.getItem('tanaka_highscores'))
   ```
4. Copy the output and save as `scores-backup.json`

**To restore scores on another device:**
1. Open Developer Tools → Console
2. Run:
   ```javascript
   // Replace SCORES with your JSON data
   localStorage.setItem('tanaka_highscores', 'SCORES')
   ```

---

## 🔐 Security Checklist

- ✅ Privacy policy added (`PRIVACY.md`)
- ✅ Security headers in HTML (CSP, XSS protection, etc.)
- ✅ No external API calls (offline-safe)
- ✅ Local storage only (no server leaks)
- ✅ No analytics or tracking by default
- ✅ HTTPS recommended for deployment (GitHub Pages provides this)
- ✅ Service Worker cache validated

---

## 📋 Backup Checklist

Before sharing with teachers:
- [ ] GitHub repo created & pushed
- [ ] Local zip backup created
- [ ] Privacy policy reviewed
- [ ] Game tested locally (npm run serve)
- [ ] QR code generated
- [ ] Teachers have QR code

---

## 🚨 Data Safety Notes

**Your game is safe:**
- No login required → no password breaches
- No personal data collected → nothing to leak
- Offline-ready → works without internet
- Local storage only → data never leaves device
- Open source → anyone can audit the code

**But be aware:**
- Clearing browser data deletes high scores
- Backup scores regularly (export as JSON)
- Keep your GitHub backup updated
- For production, use HTTPS (GitHub Pages does this by default)

---

## 💾 Disaster Recovery

**If you lose your local files:**
1. Clone from GitHub:
   ```powershell
   git clone https://github.com/<your-username>/mr-tanaka-boss.git
   ```

2. Or restore from zip backup:
   ```powershell
   Expand-Archive -Path "TANAKA先生-backup.zip" -DestinationPath .
   ```

3. Run and test:
   ```powershell
   npm install
   npm run serve
   ```

---

**Keep your project safe and always maintain backups!** 🛡️
