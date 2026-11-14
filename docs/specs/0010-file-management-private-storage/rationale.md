# 0010. Rationale for file management and private storage

## Context

Students collect material from many places. Supervisors send instruction notes, institutions publish guideline PDFs, field work produces datasets, and drafts need figures. Today Cevo has a `FileAsset` table with categories for all of these but no upload path and no private bucket and no preview and no text handling, so this material lives outside the project or in personal drives.

The decision must keep student work private while staying operable by a small team. Files can be large, so bytes must avoid serverless body limits. Previews must feel instant but links must expire fast. Text in PDFs and docs should become usable for later review without blocking the upload. Local development must work without paid cloud, while production must use durable managed storage with retries.

## Options considered

### Option 1: Presigned S3 with R2 in prod and MinIO local plus Inngest extraction

Browser requests a short lived PUT URL, uploads direct to a private bucket, then confirms. An Inngest function fetches the object with server credentials and parses PDF and DOCX and TXT and CSV in the background.

**Pros**:
* Scales to 25MB files with no serverless body limit and keeps server memory flat.
* Private by construction with deny public plus signed reads plus ownership checks.
* Retries and status come free with the durable function runner already reserved in env.

**Cons**:
* More moving parts with bucket plus presigner plus background function plus local MinIO container.
* Text arrives eventually, so the UI must handle pending and failed states.

### Option 2: Server proxied upload with inline parsing

Browser POSTs bytes to a Next route that streams to storage and parses text before responding.

**Pros**:
* Simplest client with one POST and immediate text.
* No queue to operate and no eventual state.

**Cons**:
* Hits serverless body and time limits on larger files and risks timeouts on slow networks.
* Ties upload availability to parser health, so a corrupt PDF can fail an otherwise good upload.

### Option 3: Vercel Blob with client uploads and inline parsing

Use the platform Blob store with client upload helpers and parse in the route after upload.

**Pros**:
* Least infrastructure to run with OIDC secured private Blob.
* Good client libraries for progress and resumable style UX.

**Cons**:
* Moves away from the S3 env already reserved and documented for this feature.
* Still parses inline unless a queue is added, so it keeps the timeout risk of Option 2.

### Option 4: Store bytes only with no extraction

Ship uploads and previews now and defer all text parsing to a later slice.

**Pros**:
* Fastest to ship with the smallest code surface.
* No parser dependencies and no background jobs.

**Cons**:
* Loses the searchable text that review and assistant features will need, forcing a later backfill.
* Datasets and guideline docs stay opaque, so later features must retrofit status fields anyway.

## Rationale

Option 1 fits the forces in Context. The schema already anticipates private S3 with presigned URLs, and env already reserves the bucket keys and the Inngest keys, so the boring path is to use them rather than introduce a second store. Direct to storage PUT keeps large files out of serverless limits, which Option 2 and the inline variant of Option 3 cannot promise at 25MB on slow links. Background parsing accepts eventual text in exchange for reliable uploads, and the status machine makes that tradeoff visible instead of hidden. MinIO local keeps parity without cloud cost, which matters for a team that already runs Postgres and Mailpit in compose.
