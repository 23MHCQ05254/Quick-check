# QUICK START - Certificate Fraud Detection System

## ⚡ 5-Minute Setup

### 1. Start MongoDB
```bash
# Docker (easiest)
docker run -d -p 27017:27017 --name quickcheck-mongo mongo:latest

# OR macOS (if installed)
brew services start mongodb-community

# OR verify it's already running
mongosh --eval "db.version()"
```

### 2. Seed Database
```bash
cd backend
npm run seed
```

### 3. Start AI Service
```bash
cd ai-service
python main.py
# Should show: "Uvicorn running on http://0.0.0.0:8000"
```

### 4. Start Backend
```bash
cd backend
npm run dev
# Should show: "[quickcheck] MongoDB connected: localhost"
```

### 5. Start Frontend (in another terminal)
```bash
cd frontend
npm run dev
# Open: http://localhost:5173
```

---

## ✅ WHAT'S FIXED TODAY

| Issue | Status | Details |
|-------|--------|---------|
| Fake AI scores (39.5% repeats) | ✅ FIXED | Demo mode disabled, now uses real AI |
| Same file uploaded multiple times | ✅ FIXED | SHA256 hash check prevents duplicates |
| Hardcoded dashboard defaults | ✅ FIXED | Dashboard shows "—" until real data exists |
| Static readiness graph | ✅ FIXED | Graph shows only actual verified certs |
| Account isolation | ✅ VERIFIED | Auth middleware properly enforces roles |
| Empty organization dropdowns | ✅ FIXABLE | Run `npm run seed` to populate |

---

## 🧪 QUICK TEST

1. **Create Student Account** → Sign up as student
2. **Check Dashboard** → Verify it shows "—" (not fake 38%, 42)
3. **Upload Certificate** → Upload a certificate image
4. **Upload Again** → Upload same file again → Should fail with "duplicate" error
5. **Check Scores** → Verify AI score is different from hardcoded 39.5%

---

## 📋 KNOWN REQUIREMENTS

- **MongoDB:** Must be running (no demo mode fallback)
- **AI Service:** Must be running on port 8000
- **MONGODB_URI:** Must be set in environment or backend/.env
- **Templates:** Organizations need trained templates (upload samples in template manager)

---

## 🔍 COMMON ISSUES & FIXES

| Problem | Solution |
|---------|----------|
| "MONGODB_URI is required" | Set env var: `export MONGODB_URI=mongodb://localhost:27017/quickcheck` |
| "AI analysis failed" | Start AI service: `cd ai-service && python main.py` |
| Empty organization list | Run seed: `cd backend && npm run seed` |
| Dashboard shows defaults | ✅ Fixed - should show "—" now |
| Same file accepted twice | ✅ Fixed - now rejected with duplicate error |

---

## 📊 VERIFICATION COMMANDS

```bash
# Check MongoDB
mongosh --eval "db.version()" mongodb://localhost:27017/quickcheck

# Check AI Service
curl -s http://localhost:8000/health

# Check organizations seeded
mongosh quickcheck --eval "db.organizations.count()"
# Should return: 7

# Check certifications seeded
mongosh quickcheck --eval "db.certifications.count()"
# Should return: 6
```

---

## 📁 FILES MODIFIED

1. `backend/src/services/duplicate.service.js` - Added SHA256 hashing
2. `backend/src/controllers/certificate.controller.js` - Restructured upload flow
3. `backend/src/models/Certificate.js` - Added fileHash fields
4. `frontend/src/pages/StudentDashboard.jsx` - Removed fake defaults

---

## 🚀 NEXT STEPS

1. Start all services (MongoDB, AI, Backend, Frontend)
2. Run seed script
3. Test upload flow
4. Report any remaining issues

---

## 📞 SUPPORT

If you encounter issues:
1. Check backend console for error messages
2. Run verification commands above
3. Check browser console (F12) for API errors
4. Share error messages and I'll help debug

---

**STATUS:** ✅ Production fixes applied, ready for testing

