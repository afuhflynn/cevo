# Database Design: Cevo

## 1. Overview & Data Integrity Principles

The Cevo data model is implemented on **PostgreSQL** using **Prisma ORM**. It is organized into 9 normalized functional groups designed for strong consistency, strict multi-tenant ownership enforcement, auditability, and double-entry financial ledger integrity.

### Core Database Rules:
1. **Explicit Ownership:** All student resources reference `userId` and/or `projectId` with foreign key constraints.
2. **Cascading Deletions:** Deleting a `Project` safely cascades to its `ProjectSection`, `Document`, `ProjectSource`, and `ExportJob` records, while financial records (`Payment`, `CreditLedger`) are preserved permanently for accounting and audit compliance.
3. **Financial Invariants:** Balances are never modified in isolation; every change is accompanied by an immutable `CreditLedger` entry within a database transaction.
4. **Optimistic Concurrency:** High-velocity authoring models (`ProjectSection`, `Document`) include integer `version` columns to prevent lost updates.

---

## 2. Entity Groups & Schemas

### 2.1 Identity, Authentication & Profiles

```prisma
enum UserRole {
  STUDENT
  ADMIN
  SUPER_ADMIN
}

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  role          UserRole  @default(STUDENT)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Auth Relations
  sessions      Session[]
  accounts      Account[]

  // Profile Relations
  studentProfile   StudentProfile?
  academicProfile  AcademicProfile?

  // Domain Relations
  projects         Project[]
  creditWallet     CreditWallet?
  payments         Payment[]
  supportTickets   SupportTicket[]
  notifications    Notification[]
  auditEvents      AuditEvent[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id           String    @id @default(cuid())
  userId       String
  accountId    String
  providerId   String
  accessToken  String?
  refreshToken String?
  expiresAt    DateTime?
  password     String?
  createdAt    DateTime  @default(now())

  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())

  @@index([identifier])
}

model StudentProfile {
  id                  String   @id @default(cuid())
  userId              String   @unique
  firstName           String
  lastName            String
  preferredLanguage   String   @default("en") // "en" | "fr"
  country             String   @default("Cameroon")
  onboardingCompleted Boolean  @default(false)
  onboardingStep      Int      @default(1)
  referralSource      String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum QualificationLevel {
  HND
  BACHELORS
  MASTERS
  PHD
  OTHER
}

model AcademicProfile {
  id                  String             @id @default(cuid())
  userId              String             @unique
  institutionId       String?
  facultyId           String?
  departmentId        String?
  programmeId         String?
  customInstitution   String?
  qualification       QualificationLevel @default(BACHELORS)
  academicSession     String             // e.g. "2025/2026"
  preferredStyle      String             @default("APA_7") // "APA_7" | "HARVARD"
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  user                User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  institution         Institution?       @relation(fields: [institutionId], references: [id])
  faculty             Faculty?           @relation(fields: [facultyId], references: [id])
  department          Department?        @relation(fields: [departmentId], references: [id])
  programme           Programme?         @relation(fields: [programmeId], references: [id])
}
```

### 2.2 Academic Hierarchy

```prisma
model Institution {
  id          String      @id @default(cuid())
  name        String      @unique // e.g. "University of Buea"
  code        String      @unique // e.g. "UB"
  country     String      @default("Cameroon")
  city        String?     // e.g. "Buea"
  logoUrl     String?
  isVerified  Boolean     @default(false)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  faculties   Faculty[]
  templates   ProjectTemplate[]
  academicProfiles AcademicProfile[]
}

model Faculty {
  id            String       @id @default(cuid())
  institutionId String
  name          String       // e.g. "Faculty of Engineering & Technology"
  code          String?      // e.g. "FET"
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  institution   Institution  @relation(fields: [institutionId], references: [id], onDelete: Cascade)
  departments   Department[]
  templates     ProjectTemplate[]
  academicProfiles AcademicProfile[]

  @@unique([institutionId, name])
}

model Department {
  id          String       @id @default(cuid())
  facultyId   String
  name        String       // e.g. "Computer Science"
  code        String?      // e.g. "CSC"
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  faculty     Faculty      @relation(fields: [facultyId], references: [id], onDelete: Cascade)
  programmes  Programme[]
  templates   ProjectTemplate[]
  academicProfiles AcademicProfile[]

  @@unique([facultyId, name])
}

model Programme {
  id            String             @id @default(cuid())
  departmentId  String
  name          String             // e.g. "Software Engineering"
  qualification QualificationLevel @default(BACHELORS)
  durationYears Int                @default(3)
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  department    Department         @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  templates     ProjectTemplate[]
  academicProfiles AcademicProfile[]

  @@unique([departmentId, name, qualification])
}
```

### 2.3 Institutional Templates & Rules

```prisma
model ProjectTemplate {
  id            String              @id @default(cuid())
  title         String              // e.g. "University of Buea FET B.Sc. Template"
  description   String?
  institutionId String?
  facultyId     String?
  departmentId  String?
  programmeId   String?
  qualification QualificationLevel  @default(BACHELORS)
  projectType   ProjectType         @default(APPLIED_SOFTWARE)
  isOfficial    Boolean             @default(false)
  isActive      Boolean             @default(true)
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  institution   Institution?        @relation(fields: [institutionId], references: [id])
  faculty       Faculty?            @relation(fields: [facultyId], references: [id])
  department    Department?         @relation(fields: [departmentId], references: [id])
  programme     Programme?          @relation(fields: [programmeId], references: [id])
  versions      TemplateVersion[]
  projects      Project[]
}

model TemplateVersion {
  id          String          @id @default(cuid())
  templateId  String
  version     Int             @default(1) // 1, 2, 3
  isPublished Boolean         @default(false)
  changelog   String?
  createdAt   DateTime        @default(now())
  publishedAt DateTime?

  template    ProjectTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  rules       TemplateRule?
  sections    TemplateSection[]
  projects    Project[]

  @@unique([templateId, version])
}

model TemplateRule {
  id                String          @id @default(cuid())
  templateVersionId String          @unique
  pageSize          String          @default("A4") // A4, LETTER
  marginTopMm       Float           @default(25.4) // 1 inch
  marginBottomMm    Float           @default(25.4)
  marginLeftMm      Float           @default(38.1) // 1.5 inches binding margin
  marginRightMm     Float           @default(25.4)
  fontFamily        String          @default("Times New Roman")
  fontSizeBodyPt    Float           @default(12.0)
  lineSpacing       Float           @default(1.5)
  paragraphIndentMm Float           @default(12.7) // 0.5 inch
  heading1FontPt    Float           @default(16.0)
  heading1Style     String          @default("BOLD_UPPERCASE")
  heading2FontPt    Float           @default(14.0)
  heading2Style     String          @default("BOLD_TITLECASE")
  citationStyle     String          @default("APA_7")
  requirePrelims    Json            // Array of required preliminary page keys
  createdAt         DateTime        @default(now())

  templateVersion   TemplateVersion @relation(fields: [templateVersionId], references: [id], onDelete: Cascade)
}

model TemplateSection {
  id                String          @id @default(cuid())
  templateVersionId String
  orderIndex        Int
  title             String          // e.g. "Chapter 1: Introduction"
  sectionType       String          // "PRELIMINARY" | "CHAPTER" | "REFERENCES" | "APPENDIX"
  description       String?
  requiredSubsections Json?         // Array of required headings e.g. ["Problem Statement", "Aim"]
  createdAt         DateTime        @default(now())

  templateVersion   TemplateVersion @relation(fields: [templateVersionId], references: [id], onDelete: Cascade)

  @@index([templateVersionId, orderIndex])
}
```

### 2.4 Projects, Briefs & Outlines

```prisma
enum ProjectType {
  APPLIED_SOFTWARE
  RESEARCH_ACADEMIC
}

enum ProjectStatus {
  DRAFT
  PLANNING
  IN_PROGRESS
  READY_FOR_REVIEW
  COMPLETED
  ARCHIVED
}

model Project {
  id                String              @id @default(cuid())
  userId            String
  templateId        String?
  templateVersionId String?
  title             String
  projectType       ProjectType         @default(APPLIED_SOFTWARE)
  qualification     QualificationLevel  @default(BACHELORS)
  programmeName     String?
  submissionDeadline DateTime?
  status            ProjectStatus       @default(PLANNING)
  progressPercent   Int                 @default(0)
  referencingStyle  String              @default("APA_7")
  isArchived        Boolean             @default(false)
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  user              User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  template          ProjectTemplate?    @relation(fields: [templateId], references: [id])
  templateVersion   TemplateVersion?    @relation(fields: [templateVersionId], references: [id])

  brief             ProjectBrief?
  outline           ProjectOutline?
  sections          ProjectSection[]
  tasks             ProjectTask[]
  activities        ProjectActivity[]
  sources           ProjectSource[]
  files             FileAsset[]
  exportJobs        ExportJob[]

  @@index([userId, status])
  @@index([userId, isArchived])
}

model ProjectBrief {
  id                String   @id @default(cuid())
  projectId         String   @unique
  background        String   @db.Text
  problemStatement  String   @db.Text
  aim               String   @db.Text
  objectives        Json     // Array of strings (measurable objectives)
  researchQuestions Json     // Array of strings
  scope             String   @db.Text
  limitations       String   @db.Text
  methodology       String   @db.Text
  expectedOutcomes  String   @db.Text
  targetEnvironment String?  @db.Text
  isApproved        Boolean  @default(false)
  approvedAt        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  project           Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model ProjectOutline {
  id          String   @id @default(cuid())
  projectId   String   @unique
  structure   Json     // Hierarchical JSON of chapters, sections, sub-sections
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model ProjectSection {
  id          String   @id @default(cuid())
  projectId   String
  parentId    String?  // Hierarchical parent section
  orderIndex  Int
  title       String
  sectionType String   @default("CHAPTER") // "PRELIMINARY" | "CHAPTER" | "REFERENCES" | "APPENDIX"
  slug        String
  content     Json?    // ProseMirror / Tiptap JSON node tree
  wordCount   Int      @default(0)
  version     Int      @default(1)
  isCompleted Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parent      ProjectSection?  @relation("SectionHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children    ProjectSection[] @relation("SectionHierarchy")
  citations   Citation[]
  versions    DocumentVersion[]

  @@index([projectId, orderIndex])
  @@index([projectId, parentId])
}

model DocumentVersion {
  id          String         @id @default(cuid())
  sectionId   String
  versionNumber Int
  content     Json           // ProseMirror JSON snapshot
  wordCount   Int
  changeSummary String?
  createdAt   DateTime       @default(now())

  section     ProjectSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  @@index([sectionId, versionNumber])
}

model ProjectTask {
  id          String    @id @default(cuid())
  projectId   String
  title       String
  description String?
  isCompleted Boolean   @default(false)
  completedAt DateTime?
  dueDate     DateTime?
  orderIndex  Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, isCompleted])
}

model ProjectActivity {
  id          String   @id @default(cuid())
  projectId   String
  action      String   // e.g. "SECTION_UPDATED", "CITATION_ADDED", "BRIEF_APPROVED"
  description String
  metadata    Json?
  createdAt   DateTime @default(now())

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, createdAt])
}
```

### 2.5 Research, Citations & Source Verification

```prisma
enum VerificationState {
  METADATA_VERIFIED
  DOI_VERIFIED
  FULL_TEXT_AVAILABLE
  REQUIRES_REVIEW
  INCOMPLETE_METADATA
}

model ResearchSource {
  id                String            @id @default(cuid())
  doi               String?           @unique
  openAlexId        String?           @unique
  semanticScholarId String?           @unique
  title             String            @db.Text
  authors           Json              // Array of { name, orcid, affiliation }
  publicationYear   Int?
  venue             String?           // Journal or Conference name
  volume            String?
  issue             String?
  pages             String?
  publisher         String?
  abstract          String?           @db.Text
  pdfUrl            String?
  isOpenAccess      Boolean           @default(false)
  verificationState VerificationState @default(METADATA_VERIFIED)
  rawMetadata       Json?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  projectSources    ProjectSource[]
  citations         Citation[]

  @@index([title])
  @@index([publicationYear])
}

model ProjectSource {
  id          String         @id @default(cuid())
  projectId   String
  sourceId    String
  studentNote String?        @db.Text
  tags        Json?          // Array of strings
  isPinned    Boolean        @default(false)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  project     Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  source      ResearchSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  @@unique([projectId, sourceId])
}

model Citation {
  id          String         @id @default(cuid())
  sectionId   String
  sourceId    String
  inlineText  String         // e.g. "(Nkem et al., 2024)"
  citationKey String         // Reference key
  createdAt   DateTime       @default(now())

  section     ProjectSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  source      ResearchSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  @@index([sectionId])
  @@index([sourceId])
}
```

### 2.6 Files & Document Exports

```prisma
enum FileCategory {
  GUIDELINE
  SUPERVISOR_NOTE
  FIGURE
  DATASET
  LITERATURE
  OTHER
}

model FileAsset {
  id           String       @id @default(cuid())
  projectId    String
  fileName     String
  fileSize     Int
  mimeType     String
  s3Key        String       @unique
  category     FileCategory @default(OTHER)
  extractedText String?     @db.Text
  isProcessed  Boolean      @default(false)
  createdAt    DateTime     @default(now())

  project      Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, category])
}

enum ExportFormat {
  PDF
  DOCX
}

enum JobStatus {
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
}

model ExportJob {
  id           String       @id @default(cuid())
  projectId    String
  format       ExportFormat @default(PDF)
  status       JobStatus    @default(QUEUED)
  s3Key        String?
  fileSize     Int?
  errorMessage String?
  createdAt    DateTime     @default(now())
  completedAt  DateTime?

  project      Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, status])
}
```

### 2.7 AI Operations, Telemetry & Cost Accounting

```prisma
model AiUsage {
  id            String   @id @default(cuid())
  userId        String
  projectId     String?
  operationType String   // "BRAINSTORM", "BRIEF", "POLISH", "REVIEW", "RESEARCH"
  provider      String   @default("openrouter")
  modelName     String   // e.g. "anthropic/claude-3.5-sonnet", "openai/gpt-4o-mini"
  inputTokens   Int
  outputTokens  Int
  totalTokens   Int
  providerCostUsd Float  // Actual cost from OpenRouter
  creditsCharged  Int    // Platform credits deducted
  durationMs    Int
  status        String   // "SUCCESS" | "FAILED"
  errorMessage  String?
  createdAt     DateTime @default(now())

  @@index([userId, createdAt])
  @@index([operationType])
  @@index([modelName])
}

model OperationPricing {
  id            String   @id @default(cuid())
  operationType String   @unique // e.g. "BRAINSTORM", "BRIEF", "PARAGRAPH_IMPROVE"
  displayName   String
  creditCost    Int      // Fixed credit price per operation
  modelTier     String   @default("ECONOMICAL") // "ECONOMICAL" | "ADVANCED"
  defaultModel  String   // OpenRouter model ID
  isActive      Boolean  @default(true)
  updatedAt     DateTime @updatedAt
}
```

### 2.8 Billing, Credits & Mobile Money Payments

```prisma
model CreditWallet {
  id        String   @id @default(cuid())
  userId    String   @unique
  balance   Int      @default(50) // Free 50 starter credits on signup
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  ledgers   CreditLedger[]
}

enum LedgerType {
  CREDIT_PURCHASE
  OPERATION_DEBIT
  PROMOTIONAL_CREDIT
  REFUND
  ADMIN_ADJUSTMENT
}

model CreditLedger {
  id          String     @id @default(cuid())
  walletId    String
  type        LedgerType
  amount      Int        // Positive for credits, negative for debits
  balanceAfter Int
  description String
  referenceId String?    // PaymentId or AiUsageId
  metadata    Json?
  createdAt   DateTime   @default(now())

  wallet      CreditWallet @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@index([walletId, createdAt])
  @@unique([walletId, referenceId, type]) // Idempotency protection
}

model CreditPackage {
  id          String   @id @default(cuid())
  name        String   // e.g. "Starter Pack", "Research Pack", "Project Pack"
  priceXaf    Int      // In FCFA, e.g. 1000, 2500, 5000
  credits     Int      // e.g. 120, 350, 800
  isPopular   Boolean  @default(false)
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  payments    Payment[]
}

enum PaymentStatus {
  PENDING
  SUCCESSFUL
  FAILED
  EXPIRED
}

model Payment {
  id              String        @id @default(cuid())
  userId          String
  packageId       String
  amountXaf       Int
  creditsAllocated Int
  status          PaymentStatus @default(PENDING)
  provider        String        @default("fapshi") // "fapshi"
  providerTransId String?       @unique
  payerPhone      String?
  paymentUrl      String?
  failureReason   String?
  createdAt       DateTime      @default(now())
  completedAt     DateTime?

  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  package         CreditPackage @relation(fields: [packageId], references: [id])
  webhookEvents   PaymentWebhookEvent[]

  @@index([userId, status])
  @@index([providerTransId])
}

model PaymentWebhookEvent {
  id          String   @id @default(cuid())
  paymentId   String?
  eventType   String
  payload     Json
  isProcessed Boolean  @default(false)
  createdAt   DateTime @default(now())

  payment     Payment? @relation(fields: [paymentId], references: [id])
}
```

### 2.9 Operations, Notifications & Audit Logs

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  message   String
  linkUrl   String?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

model SupportTicket {
  id          String           @id @default(cuid())
  userId      String
  subject     String
  category    String           // "PAYMENT", "EXPORT", "AI", "ACCOUNT", "OTHER"
  status      TicketStatus     @default(OPEN)
  priority    String           @default("NORMAL")
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages    SupportMessage[]

  @@index([userId, status])
}

model SupportMessage {
  id        String        @id @default(cuid())
  ticketId  String
  senderId  String
  isAdmin   Boolean       @default(false)
  message   String        @db.Text
  createdAt DateTime      @default(now())

  ticket    SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
}

model AuditEvent {
  id         String   @id @default(cuid())
  userId     String?  // Actor (e.g. Admin or Student)
  action     String   // e.g. "PAYMENT_RECONCILED", "CREDIT_ADJUSTMENT", "TEMPLATE_PUBLISHED"
  targetType String   // "USER", "PAYMENT", "TEMPLATE", "WALLET"
  targetId   String
  details    Json?
  ipAddress  String?
  createdAt  DateTime @default(now())

  user       User?    @relation(fields: [userId], references: [id])

  @@index([action, createdAt])
  @@index([targetType, targetId])
}
```
