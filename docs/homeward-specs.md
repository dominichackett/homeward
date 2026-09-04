# Homeward — Project Spec

## One-line pitch
A safety app for people living with dementia/Alzheimer's, and for lost children: when a stranger finds someone who appears lost or disoriented, the app matches a captured face against a caregiver-enrolled database and **automatically alerts next-of-kin** — without ever revealing the person's identity to the stranger who found them.

## Problem
People with dementia, Alzheimer's, or young children can become lost or disoriented in public. Bystanders who find them have no reliable way to identify them or reach their family quickly. Existing solutions (ID bracelets, missing-person posts) are slow, manual, or expose sensitive personal data publicly.

## Core design principle
**The finder never sees who they found.** All identity resolution happens server-side/enclave-side. The finder only ever gets a generic confirmation. This is the non-negotiable privacy backbone of the product — it's what separates this from a facial-recognition surveillance tool.

## Primary user flows

### 1. Enrollment (caregiver/guardian-initiated)
- A legal guardian or caregiver enrolls a vulnerable person: reference photo(s), name, condition/notes, next-of-kin contact(s).
- Consent is captured at enrollment time (caregiver attests authority to enroll).
- For the hackathon demo: **synthetic/test data only** — no real photos of real minors or patients.
- Reference photo is converted to a facial embedding at enrollment time and stored (not just the raw photo, if avoidable).

### 2. Finder report (the abuse-prevention surface)
- A bystander opens the app, sees someone who appears lost/disoriented, and captures a photo.
- Before anything is processed, the finder must pass **World ID Selfie Check** — proving they're one real, distinct human (not a bot/script).
- Selfie Check outcome gates the report:
  - **Pass** → proceed to matching.
  - **Fail** → blocked or flagged low-trust (decision TBD — leaning toward hard-block for cleaner abuse-prevention story).
  - **Repeat reports from the same nullifier in a short window** → throttled, to stop mass-probing or prank-flooding.

### 3. On-device facial embedding
- The finder's device extracts a facial embedding **locally** (via face-api.js for the web build) — the raw photo is not uploaded at this stage.
- Only the embedding is sent to the backend for comparison.

### 4. Confidential matching (Chainlink CRE Confidential Workflow)
- The embedding comparison against the enrolled database happens **inside a TEE-based Confidential Workflow** (Chainlink CRE, using `handlerInTee`/`cre.HandlerInTee`).
- Raw embeddings (finder's + enrolled database) are processed only inside the enclave — not visible even to the app operator.
- Only the match result (match / no match + case ID if matched) leaves the enclave.

### 5. Photo forwarding — only on match
- If (and only if) there's a match, the finder's original photo (held locally until this point) is uploaded and forwarded **only to the matched next-of-kin** as part of the alert.
- If no match, the photo is discarded — never uploaded, never stored.
- Retention rule for the demo: matched photos deleted after a fixed window (e.g., 24–48 hrs) or on case resolution.

### 6. Auto-alert (no human in the loop)
- On match, the system automatically notifies next-of-kin — location, timestamp, and the photo — via push/SMS/call.
- The finder gets a generic confirmation only ("Thanks — we've notified their family"), identical wording regardless of match/no-match outcome, so silence/response never leaks whether a match occurred.

## Privacy/abuse-prevention design summary
| Layer | Mechanism | Purpose |
|---|---|---|
| Finder identity | World ID Selfie Check | Abuse-prevention: block bots/scripts, throttle prank/mass-probing reports |
| Photo minimization | On-device embedding extraction (face-api.js) | Raw photo doesn't leave device unless there's a match |
| Matching compute | Chainlink CRE Confidential Workflow (TEE) | Even the operator can't see the raw biometric comparison |
| Identity exposure | Auto-alert only, generic finder response | Finder never learns who they found; no signal leaks match/no-match |
| Enrollment consent | Guardian/caregiver-attested at signup | Vulnerable person can't self-consent in the moment; consent captured ahead of time |

## Data storage & encryption architecture

**Database: Postgres + pgvector, via Supabase.**
One database covers enrollment records, embeddings, case/match audit trail, and Selfie Check nullifier log (for repeat-report throttling); Supabase storage (with expiry) covers matched-case photos. Chosen for hackathon speed — relational data, vector storage, file storage, and auth in one managed platform, minimal custom backend plumbing.

**Encryption principle: all personal data encrypted, and encrypted *from the operator*, not just from external attackers.**
Infra-level disk encryption (Supabase's default) only protects against physical theft — it does not protect data from anyone holding valid DB credentials, including the app operator. Where the design claims privacy (especially the CRE Confidential Workflow story), that claim only holds if the data is application-level encrypted, not just infra-encrypted.

| Data | At rest | Decrypted where | Notes |
|---|---|---|---|
| Facial embeddings (enrolled + finder) | Application-level encrypted ciphertext | Only inside CRE TEE enclave, at match-time | Postgres/pgvector stores ciphertext, not queryable plaintext vectors — the enclave does the comparison, not a Postgres nearest-neighbor query, since Postgres can't do vector math on ciphertext |
| Enrollment PII (name, condition notes) | Encrypted at rest | Backend, only for authorized caregiver access | Standard app-level encryption, scoped access control |
| Next-of-kin contact info | Encrypted at rest | Only at alert-delivery time | Not decrypted for general backend/admin access |
| Matched-case photos | Encrypted at rest, short TTL (e.g. 24–48 hrs) | Only for delivery to matched next-of-kin | Deleted on expiry or case resolution; never stored if no match |
| Selfie Check nullifier log | Encrypted or hashed | Backend, for throttling checks only | Doesn't need to be human-readable, just comparable |
| Data in transit | TLS everywhere | — | Device → backend, backend → Supabase, backend → CRE, backend → notification service |

**Key management:** decryption key(s) for embeddings should be fetched/held only inside the CRE enclave (Confidential Workflows support fetching secrets directly inside the enclave) — the backend should never hold a plaintext-usable key. This is the detail that makes "even we can't see the raw biometric data" a real, defensible claim rather than a slogan — worth stating explicitly in the submission writeup, since a technical judge on the Chainlink track is likely to probe exactly this.

## Tech stack (hackathon build — web first, mobile later)
- **Frontend:** Web app (React likely), face-api.js for in-browser face detection + embedding
- **Abuse-prevention:** World ID Selfie Check (IDKit-style flow, tested via World ID Sandbox App)
- **Confidential compute:** Chainlink CRE Confidential Workflow (TEE) for the embedding-matching step — targeting the "Best Confidential Workflow" sponsor prize
- **Backend:** orchestrates enrollment storage, Selfie Check verification, CRE workflow invocation, and next-of-kin notification (push/SMS)
- **Future:** React Native mobile app reusing the same TensorFlow.js/face-api.js model weights

## Sponsor tracks being targeted
1. **World ID / Selfie Check** — abuse-prevention signal gating finder reports (core to the product)
2. **Chainlink CRE — Best Confidential Workflow** — TEE-based confidential facial-embedding matching (core to the product; strong non-cosmetic fit)
3. *(Considered and deprioritized: ENSv2 — only a marginal fit via caregiver-delegation/subname permissioning; not pursuing unless time allows, to avoid diluting focus)*

## Open decisions still needed
- Hard-block vs. flag-and-throttle on failed Selfie Check
- Whether Selfie Check is also used for periodic "still safe" continuity check-ins by the enrolled person (currently out of scope, report-time only)
- On-device vs. server-side embedding comparison architecture details for the CRE integration (embedding must still reach the enclave — need to confirm data flow: device → backend → CRE workflow)
- Exact retention window for matched photos
- Project name: **Homeward** (previously working-titled "Loved Ones"; other alternatives considered: Loved Ones Watch, Beacon, Safe Harbor, Tether)

## Explicitly out of scope for this build
- Any facial-recognition lookup result shown directly to the finder
- Real biometric data on real minors or real patients in the demo (synthetic data only)
- Cross-jurisdiction legal compliance work (BIPA/GDPR-style biometric consent law) — flagged as a real production concern, not solved in the hackathon build
