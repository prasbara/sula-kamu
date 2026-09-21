# SULA — Student Social & Matchmaking Platform

> **"Meet someone worth knowing."**  
> *Student-focused social platform, serving the Semarang campus community.*

---

## 📌 Legal & Product Mission Notice

**SULA is NOT an official university service, student-affairs service, campus organization, or university-endorsed dating platform.**  
SULA is an independent platform. University and institute names (such as UNDIP, UNNES, UIN Walisongo, UDINUS, UNISSULA, UNIKA, etc.) function strictly as **factual verification metadata and discovery filters**, never as claims of institutional endorsement, sponsorship, or ownership.

---

## 🛡️ Core Security Architecture & Principles

1. **Student Verification First:** Identity is anchored in authentic Kartu Tanda Mahasiswa (KTM) verification. No fake or dummy bypasses.
2. **18+ Only Gate:** Explicit birth date & adult agreement gate. Underage profiles are rejected from discovery.
3. **Privacy by Default:** Minimal data collection. NIM, full address, email, phone numbers, and raw Telegram handles are **never** exposed.
4. **Anti-Catfish & Duplicate Prevention:** Dual hashing (Cryptographic SHA-256 + 64-bit Perceptual Hash) detects reused or stolen student cards.
5. **Image Processing Pipeline:** File uploads undergo magic-bytes inspection (`FF D8 FF` / `89 50 4E 47` / `RIFF..WEBP`), automatic EXIF/GPS stripping, and re-encoding via `sharp`.
6. **In-Bot Mediated Chat:** Matched students communicate safely through SULA without revealing personal phone numbers or Telegram handles until mutual comfort is established.
7. **Incident Case Management:** Standardized report codes (`REP-XXXXXX`), anonymous reporting, automatic blocking, and role-based moderator resolution.
8. **Incident Response Killswitches:** Instant runtime toggles to pause registrations, matchmaking, or verification during attacks.

---

## 🏛️ Supported Semarang Institutions Registry

Pre-seeded with 32 higher-education institutions in the Semarang region:
- **Universities (18):** UNDIP, UNNES, UIN Walisongo, UDINUS, UNISSULA, SCU (UNIKA Soegijapranata), UNIMUS, USM, UNWAHAS, UPGRIS, UNISBANK, UNAKI, Universitas Ivet, Universitas Karya Husada, Universitas Telogorejo, STEKOM, Universitas Pandanaran, UNTAG Semarang.
- **Polytechnics & Services (8):** POLINES, POLIMARIN, Politeknik PU, PIP Semarang, AKPOL, POLTEKA Mangunwijaya, Politeknik Bina Trada, Politeknik STiBISNIS.
- **Health Academies (7):** Poltekkes Kemenkes Semarang, STIKES Semarang, STIKES St. Elisabeth, STIKES Hakli, STIKES Kesdam IV/Diponegoro, STIFAR Semarang, Universitas Widya Husada.

---

## 🚀 Quick Start

### 1. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your Telegram Bot Token obtained from `@BotFather`:
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
ADMIN_API_KEY=sula_admin_secret_key_2026
```

### 2. Run Automated Security Test Suite
```bash
npm run test:security
```
Validates magic-byte validation, EXIF stripping, phone number leaking filter, attempt cooldown limits, and audit logs.

### 3. Run End-to-End Simulation
```bash
npm run simulate
```
Executes a complete 10-step simulated student journey: Onboarding → KTM Upload → Duplicate Card Defense → Discovery → Mutual Match → In-bot Chat → Report Submission → Moderator Sanction → Emergency Killswitch.

### 4. Start the Application
```bash
npm start
```
Starts the SQLite database, boots the Telegram Bot (if token provided), and launches the Web Admin Console at `http://127.0.0.1:3000`.

---

## 🎛️ Admin & Trust/Safety Console

Accessible at: `http://localhost:3000`

### Roles (Strict RBAC):
- `SUPER_ADMIN`: Full access, emergency killswitches, staff management.
- `VERIFICATION_REVIEWER`: Inspects OCR snippets, approves/rejects pending student cards.
- `MODERATOR`: Manages incident reports (`REP-XXXXXX`), issues warnings, suspensions, and bans. (Does **NOT** have access to raw KTM documents).
- `AUDITOR`: Read-only access to immutable audit trails and security events.

---

## 📁 Directory Structure

```
├── src/
│   ├── admin/
│   │   ├── public/              # Glassmorphic Admin Web UI
│   │   │   └── index.html
│   │   └── server.ts            # RBAC Admin & Incident Response API
│   ├── bot/
│   │   ├── handlers/
│   │   │   ├── onboarding.ts    # 18+ gate & Semarang campus picker
│   │   │   ├── profile.ts       # Profile wizard & contact leak filter
│   │   │   ├── discovery.ts     # Verified card renderer & like/pass
│   │   │   ├── matches.ts       # Mediated chat & safety action bar
│   │   │   ├── safety.ts        # 8 report categories & Safety Charter
│   │   │   └── settings.ts      # Privacy toggle & account deletion
│   │   └── index.ts             # GrammY bot initialization & middlewares
│   ├── config/                  # Environment & path configs
│   ├── database/
│   │   ├── db.ts                # node:sqlite DatabaseSync wrapper
│   │   ├── schema.sql           # Separated privacy-by-default schema
│   │   └── seed.ts              # 32 Semarang universities & kill switches
│   ├── services/
│   │   ├── matchmaking/         # Matching engine, discovery, daily limits
│   │   ├── safety/              # Case management, blocking, audit logs
│   │   └── verification/        # Magic bytes, EXIF strip, duplicate hash, OCR
│   ├── types/                   # Strong TypeScript domain definitions
│   ├── cli/
│   │   └── simulate.ts          # End-to-end user journey simulation
│   └── index.ts                 # Master entry point
├── tests/
│   └── security.test.ts         # Automated security test suite
├── .env.example
├── package.json
└── tsconfig.json
```
>>>>>>> 05423ac (feat: SULA student matchmaking platform with verification, photo moderation, and secure admin login)
