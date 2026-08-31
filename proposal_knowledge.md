# Virtual Data Room (VDR) – Product, Architecture & Commercial Knowledge Base

## 1. Purpose

This document captures the current working knowledge for a custom Virtual Data Room (VDR) solution intended for secure document sharing with investors, buyers, auditors, legal advisors, and other external stakeholders.

The target initial deployment is intentionally lean:

- 2–3 internal administrators
- ~10 initial external viewers
- ~20 documents per project
- Multiple projects / data rooms
- Initial storage target: 50–100 GB
- Hosted on Google Cloud Platform
- Focus on controlled access, secure viewing, watermarking, download control, and auditability

The product should feel production-grade without overengineering the infrastructure.

---

# 2. Core Business Objective

Provide a secure, controlled, and traceable environment for sharing confidential documents during:

- Fundraising
- Due diligence
- M&A processes
- Strategic partnerships
- Legal reviews
- Financial audits
- Corporate transactions

The solution should replace ad-hoc sharing through email, Google Drive links, generic file-sharing tools, or manually controlled folders.

---

# 3. Core Product Requirements

## 3.1 Access Management

Administrators must be able to:

- Create and manage data rooms
- Invite viewers
- Assign users to specific projects
- Revoke access immediately
- Set access expiration dates
- Control permissions by data room
- Control document download permission
- Manage administrator and viewer roles

Suggested role model:

- Admin
- Viewer

Future role extensions:

- Auditor
- Legal Advisor
- Internal Reviewer
- Deal Team
- External Buyer / Investor

---

## 3.2 Document Management

Required capabilities:

- Upload document
- Bulk upload
- Organize documents in folders
- Rename and delete documents
- Replace document versions
- Store original documents privately
- View documents in browser
- Configure download permission
- Track document access

Typical project structure:

```text
Project / Data Room
├── Corporate
├── Financial
├── Legal
├── Commercial
└── Supporting Documents
```

Average expected volume:

- ~20 documents/project

---

## 3.3 Secure Document Viewing

The browser viewer should support:

- View-only access
- View + download access
- No public file URLs
- Short-lived signed access
- Viewer-specific watermark
- Progressive/lazy document loading
- Large-file friendly viewing

Important principle:

> The original document should not be publicly exposed to the browser unless download permission is explicitly granted.

---

## 3.4 Dynamic Watermark

Watermark should be generated dynamically per viewer.

Example:

```text
CONFIDENTIAL
viewer@email.com
Project Alpha
31 Aug 2026 08:30 WIB
```

Possible watermark inputs:

- User name
- User email
- Project / data room name
- Document ID
- Session ID
- Timestamp

Watermark should act as:

- Deterrence
- Traceability
- Accountability

Avoid regenerating a full PDF for every viewer if possible. Prefer viewer-layer or page-level watermark rendering.

---

## 3.5 Audit Trail

Audit logging is a core feature, not an optional afterthought.

Recommended events:

```text
LOGIN
LOGIN_FAILED
LOGOUT
DATA_ROOM_OPENED
DOCUMENT_OPENED
DOCUMENT_DOWNLOADED
FILE_UPLOADED
FILE_DELETED
USER_INVITED
ACCESS_REVOKED
PERMISSION_CHANGED
WATERMARK_APPLIED
```

Audit records should capture:

- User
- Project
- Document
- Event
- Timestamp
- IP address
- Session ID
- Device / browser metadata where appropriate

---

# 4. Initial User & Capacity Assumptions

## Initial Target

| Parameter | Initial Target |
|---|---:|
| Admin Accounts | 2–3 |
| External Viewers | ~10 initially |
| Recommended commercial allowance | 25 or no per-seat fee |
| Documents / Project | ~20 |
| Initial Storage | 50–100 GB |
| Active Projects | Multiple |
| Hosting | Google Cloud |
| Primary Region | Jakarta preferred |

For commercial positioning, it may be better to include 3 admins in the Professional package even if the client only needs 2.

This removes a direct comparison weakness against a competitor requiring a minimum of 3 paid personnel licenses.

---

# 5. Recommended Google Cloud Architecture

## 5.1 Lean Production Architecture

Recommended stack:

| Layer | Technology |
|---|---|
| Frontend | Next.js + TypeScript |
| Backend | Next.js API routes or NestJS |
| Hosting | Google Cloud Run |
| Database | Cloud SQL PostgreSQL |
| Authentication | Google Identity Platform / Firebase Auth |
| File Storage | Google Cloud Storage |
| Secrets | Secret Manager |
| Logging | Cloud Logging |
| Deployment | GitHub/GitLab + Cloud Build / CI |
| Domain | Existing registrar + custom subdomain |
| HTTPS | Google-managed SSL |

Simplified architecture:

```text
User
  ↓
Custom Domain
  ↓
Cloud Run
  ↓
├── Identity Platform
├── Cloud SQL PostgreSQL
└── Cloud Storage
```

Avoid unnecessary early infrastructure:

- Kubernetes / GKE
- Redis
- Kafka
- Elasticsearch
- Complex microservices
- Dedicated CDN
- Heavy SIEM
- Multi-region active-active

---

# 6. Development & Deployment Model

Recommended workflow:

```text
Developer Laptop
   ↓
Git Repository
   ↓
CI/CD
   ↓
Cloud Run
```

Suggested environments:

```text
vdr-dev
vdr-prod
```

Recommended production separation:

```text
DEV
├── Cloud Run Dev
├── Cloud SQL Dev
└── Cloud Storage Dev

PROD
├── Cloud Run Prod
├── Cloud SQL Prod
└── Cloud Storage Prod
```

Never mix development and production data.

---

# 7. Domain Management

The domain itself remains managed at the registrar or DNS provider.

Example:

```text
yourcompany.com
└── vdr.yourcompany.com
      ↓
    Cloud Run
```

Possible DNS providers:

- Cloudflare
- Namecheap
- GoDaddy
- Squarespace
- Existing corporate DNS

Google Cloud DNS is not required for the initial deployment.

Managed HTTPS / SSL should be used so there is no need to separately purchase an SSL certificate.

---

# 8. Large File Handling

Large files must not be proxied through Cloud Run unnecessarily.

## Upload Flow

Recommended:

```text
Browser
  ↓
Cloud Run checks permission
  ↓
Create resumable upload session
  ↓
Browser uploads directly to Cloud Storage
```

Use:

- Direct-to-Cloud-Storage upload
- Resumable upload
- Upload progress
- Retry / resume support

Avoid:

```text
Browser
  ↓
Cloud Run
  ↓
Large File
  ↓
Cloud Storage
```

---

## Viewer Flow for Large Files

Avoid loading an entire huge PDF into browser memory before displaying page 1.

Prefer:

```text
Open document
  ↓
Load metadata
  ↓
Load first pages
  ↓
Load more pages on scroll
```

Recommended product-level file limit for initial release:

| File Type | Suggested Max |
|---|---:|
| PDF | 500 MB |
| PPTX | 500 MB |
| DOCX | 250 MB |
| XLSX | 250 MB |
| Image | 100 MB |

These can be increased later.

---

# 9. Document Conversion

For Office files:

```text
Original XLSX/PPTX/DOCX
   ↓
Private Storage
   ↓
Convert to PDF / Viewer Format
   ↓
Secure Viewer
```

If download permission is enabled:

```text
Viewer
  ↓
Download Original
```

If download is disabled:

```text
Viewer
  ↓
View Converted Version Only
```

This improves both usability and document control.

---

# 10. Initial Cloud Cost Structure

For the initial scale:

- 2 admins
- ~10 viewers
- ~20 docs/project
- 50–100 GB storage
- low/moderate usage

Recommended internal infrastructure budget:

## Rp1.5m–2m / month

Indicative breakdown:

| Expense | Monthly Planning Budget |
|---|---:|
| Domain amortized | Rp30k |
| DNS | Rp0 |
| SSL | Rp0 |
| Cloud Run | Rp100k |
| Cloud SQL | Rp500k |
| Cloud SQL storage / backup | Rp150k |
| Cloud Storage | Rp100k |
| Authentication | Rp0 |
| Secret Manager | Rp30k |
| Logging | Rp100k |
| Network / bandwidth | Rp200k |
| Build / Artifact Registry | Rp50k |
| Email service | Rp100k |
| Contingency | Rp540k |
| **Total Budget** | **~Rp1.8m/month** |

Actual early usage may be lower.

Main cost driver initially:

- Cloud SQL

Main cost driver at scale:

- Bandwidth / document traffic

Storage itself is unlikely to be the dominant expense.

---

# 11. Competitor Proposal – Observed Pricing

Based on the uploaded competitor proposal:

## Initial Setup

### Rp75,000,000 one-time

Includes:

- VDR setup
- Purview security
- Q&A
- UAT
- Guidelines
- Perimeter infrastructure
- Domain
- WHOIS privacy
- SSL
- Cloudflare

---

## Personnel Licenses

### Rp2,800,000 / user / month
Minimum 3 users

Minimum monthly internal license cost:

```text
3 × Rp2.8m
= Rp8.4m/month
```

External buyers and guests reportedly consume no per-seat license.

---

## Ad-hoc Services

| Service | Competitor Price |
|---|---:|
| Onsite L1 Support | Rp8m/month |
| Support & Maintenance | Rp10m/month |
| Additional 500 GB Storage | Rp2.5m/month |
| Retain Perimeter Infra – Y2 onward | Rp10m/year |
| Personnel License – Y2 | Rp30m/user/year |

Competitor remark indicates that a personnel license may be required to retain data after the active data room period; otherwise data may be automatically wiped.

This must be clarified with the competitor.

---

# 12. Competitor – Indicative Year-1 Cost

If the competitor requires 3 licenses for 12 months:

```text
Setup
Rp75m

Personnel licenses
3 × Rp2.8m × 12
= Rp100.8m

Indicative Year 1
= Rp175.8m
```

This is before VAT and optional support.

If Support & Maintenance is added:

```text
Rp10m × 12
= Rp120m
```

Indicative total becomes:

```text
Rp175.8m + Rp120m
= Rp295.8m
```

If onsite support is also used:

```text
Rp8m × 12
= Rp96m
```

Potential total exposure:

```text
Rp391.8m/year
```

These figures are indicative only and depend on contract duration and optionality.

---

# 13. Competitor vs Custom VDR

| Area | Competitor | Custom VDR |
|---|---|---|
| Initial Setup | Rp75m | Rp69m / Rp85m / Rp120m |
| Internal Licensing | Rp2.8m/user/month, min 3 | Included |
| External Viewers | No per-seat cost | Can offer no per-seat fee / fair use |
| Watermark | Not explicit | Included |
| Download Control | Not explicit | Included |
| Audit Trail | Not explicit | Included |
| Q&A | Included | Recommended in Professional |
| Storage | Additional pricing shown | Included by package |
| Extra 500 GB | Rp2.5m/month | Rp1.5m/month |
| Support | Rp10m/month | Lower / partly included |
| Onsite Support | Rp8m/month | Rp5m/month |
| Year-2 Infra | Rp10m/year | Included in renewal |
| Year-2 Personnel License | Rp30m/user/year | Included in renewal |
| Customization | Appears configuration-oriented | Purpose-built |
| Hosting | Perimeter / licensing model | Google Cloud |
| Commercial Model | Seat + setup + add-ons | Predictable package pricing |

---

# 14. Key Competitive Positioning

Do not position the custom solution merely as:

> Cheaper than the competitor.

Position it as:

> Purpose-built controls, simpler commercial model, and greater customization without recurring seat economics.

Strong commercial differentiators:

- No mandatory monthly internal seat licensing
- No per-viewer fee within agreed capacity
- Predictable Year-1 cost
- Custom branding
- Custom workflow
- Dynamic watermark
- Download restriction
- Audit trail
- Google Cloud hosting
- Lower storage expansion pricing
- Lower support pricing
- Easier Year-2 renewal model

---

# 15. Areas Where Competitor Appears Strong

Before making aggressive claims, recognize possible competitor advantages:

## Microsoft Purview

If the competitor is using actual Microsoft Purview Information Protection, they may have deeper capabilities such as:

- Sensitivity labels
- DLP
- Rights management
- Microsoft ecosystem integration

Do not claim the custom VDR has stronger security without detailed validation.

Better positioning:

> Purpose-built VDR controls with secure cloud architecture and predictable commercial terms.

---

## Q&A

Competitor explicitly includes Q&A.

Recommendation:

Add Basic Q&A to the Professional package.

Suggested Basic Q&A:

- Viewer asks question
- Link question to document
- Admin reviews question
- Admin responds
- Status: Open / Answered / Closed
- Email notification

---

## Delivery Speed

Competitor mentions approximately 1 working week after requirements are received.

A custom build may require longer.

Do not compete on unrealistic speed unless delivery capability supports it.

---

# 16. Recommended Commercial Packages

## Launch

### Rp69,000,000 – Year 1

Designed for a focused transaction.

Includes:

- 2 admins
- 25 external viewers
- 50 GB storage
- Secure document viewer
- Watermark
- Download control
- Audit trail
- Access expiration
- Custom domain
- SSL
- 12 months cloud hosting
- 1 month support

---

## Professional – Recommended

### Rp85,000,000 – Year 1

Target package to actively sell.

Includes:

- Custom VDR implementation
- 3 admins
- No per-seat external viewer fee within fair-use policy
- 100 GB storage
- Multiple data rooms
- Secure browser viewer
- Dynamic watermark
- Download controls
- Audit trail
- Access expiration
- Immediate access revocation
- Basic Q&A
- Custom branding
- Custom domain
- SSL
- Google Cloud production deployment
- UAT
- Guidelines
- 12 months hosting
- 3 months post-launch support

Core commercial message:

> One predictable investment. No mandatory per-viewer licensing within the included capacity.

---

## Enterprise

### Rp120,000,000 – Year 1

Includes:

- 5 admins
- No per-seat viewer fee / fair-use
- 500 GB storage
- Advanced Q&A
- Advanced branding
- Advanced access controls
- Secure viewer
- Watermark
- Download control
- Audit trail
- 12 months hosting
- 6 months support
- Priority support

---

# 17. Renewal Pricing

Recommended renewal options:

| Option | Price |
|---|---:|
| Monthly | Rp3.5m/month |
| Annual Prepaid | Rp36m/year |
| 2-Year Commitment | Rp65m / 2 years |

Annual prepaid should be the preferred commercial option.

Professional renewal includes:

- Cloud infrastructure
- Platform operation
- Standard maintenance
- Monitoring
- Backup
- Security updates
- Existing admin allocation
- Existing viewer policy
- Existing 100 GB storage

---

# 18. Add-on Pricing

| Add-on | Recommended Price |
|---|---:|
| Additional Admin | Rp750k/month |
| Additional 25 Viewers | Rp500k/month |
| Additional 100 GB Storage | Rp500k/month |
| Additional 500 GB Storage | Rp1.5m/month |
| Priority Support | Rp3m/month |
| Onsite Support | Rp5m/month |
| Additional Training | Rp2.5m/session |
| Data Migration | Starting Rp3m |
| Custom Development | By quotation |

---

# 19. Recommended Commercial Positioning

The Professional package should be presented as the recommended option.

Suggested positioning:

## Professional VDR – Rp85m Year 1

```text
Rp85m
ALL-IN YEAR 1

3 Admins
External Viewers
100 GB Storage
Basic Q&A
Secure Viewer
Watermark
Audit Trail
Download Control
Google Cloud Hosting
Custom Domain
UAT
3 Months Support
```

This simplifies the buyer's decision compared with:

```text
Setup Fee
+
Minimum Licenses
+
Monthly Seat Fees
+
Support Fees
+
Storage Fees
+
Retention Fees
+
Infrastructure Fees
```

---

# 20. Proposal Messaging

Recommended headline:

## Secure. Controlled. Predictable.

Supporting line:

> A purpose-built Virtual Data Room designed to support sensitive transactions without the complexity and recurring seat economics of conventional VDR platforms.

Recommended pricing message:

> Rp85,000,000 – Complete Year-1 implementation and platform provision.

Key value statements:

### Secure
Controlled document distribution through private cloud infrastructure.

### Traceable
Viewer-specific watermarking and comprehensive activity records.

### Predictable
Transparent commercial model without mandatory per-viewer licensing within the included capacity.

### Scalable
A foundation designed to evolve from a focused transaction environment into a broader enterprise VDR capability.

---

# 21. Future Roadmap

Potential future capabilities:

## Security

- MFA
- SSO
- Microsoft Entra ID integration
- IP allowlisting
- Device controls
- Session restrictions
- Retention policies

## Transaction Collaboration

- Advanced Q&A
- Document request lists
- Notifications
- User groups
- Advanced audit reports

## Document Intelligence

- OCR
- Full-text search
- AI document search
- AI summaries
- Document comparison
- Automated classification

## Enterprise Platform

- White-label environment
- Customer-specific domains
- API access
- Advanced analytics
- Data residency options
- Multi-region DR

---

# 22. Key Decision Principles

When reviewing scope, architecture, or pricing:

1. Do not overengineer the initial infrastructure.
2. Keep original documents private.
3. Design large-file upload and viewing correctly from the start.
4. Treat audit logging as a core capability.
5. Avoid per-viewer licensing unless commercially necessary.
6. Include enough capacity in the package to make pricing predictable.
7. Sell security outcomes, not cloud components.
8. Do not claim superior security against Purview without evidence.
9. Add Basic Q&A to the recommended Professional package.
10. Position Rp85m Professional as the primary offer.
11. Use Rp69m Launch as the lower anchor.
12. Use Rp120m Enterprise as the upper anchor.
13. Keep Year-2 renewal simple and predictable.
14. Maintain healthy margin between cloud operating cost and customer pricing.

---

# 23. Recommended Current Baseline

For the immediate custom VDR proposal, use:

```text
Professional VDR

Year 1
Rp85,000,000

Includes:
- 3 Admins
- External viewers with no per-seat fee / fair use
- 100 GB secure storage
- Multiple data rooms
- Secure browser document viewer
- Dynamic watermark
- Download control
- Audit trail
- Basic Q&A
- Access expiration
- Immediate revocation
- Custom branding
- Custom domain + SSL
- Google Cloud hosting for 12 months
- UAT + guidelines
- 3 months post-launch support

Year 2
Rp36,000,000/year
```

This should be treated as the current preferred commercial baseline unless later requirements materially change the scope.
