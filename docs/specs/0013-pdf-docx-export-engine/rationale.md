# 0013 · Rationale: high fidelity PDF and DOCX export engine

## Context

Cevo students write their reports in a Tiptap canvas and format them under versioned institutional templates from spec 0011. A report only counts when it can be handed in, which means a paginated PDF and an editable Word file that both honor the locked template: margins, page size, fonts, spacing, headers, and page numbers. The compilation must survive long documents, so it cannot run inside a single web request that the platform may cut off. The pieces already exist around the problem: `ExportJob` rows with a status life cycle, private S3 storage with presigned access, Inngest for background work, and citation and section tables that carry the content to compile. What is missing is the decision on how to turn that content into two faithful files and how the student follows and fetches the result.

## Options considered

### Option 1: Synchronous render in the request

Render the file inside the API route and return it as the response body, with no job row and no background worker.

**Pros**:
* Fewest moving parts and fastest to ship.

**Cons**:
* Long documents hit platform timeouts, which directly breaks the scope contract of no server timeouts.
* No progress, no retry, and no history without adding them later anyway.

### Option 2: Single HTML intermediate plus Chromium PDF plus programmatic DOCX on Inngest

Build one shared HTML model from Tiptap content and template rules, print PDF through headless Chromium, generate DOCX with the `docx` package from the same model, and run both as Inngest background jobs with polling and presigned downloads.

**Pros**:
* Exact pagination and running headers through real CSS page rules, which is the only practical route to institutional fidelity.
* One content model feeds both formats, so wording cannot drift between PDF and DOCX.
* Reuses the S3, Inngest, and audit patterns the team already operates.

**Cons**:
* Chromium is heavyweight and cold starts can be slow in serverless, plus two renderers means some bugs show in one format only.

### Option 3: Managed conversion service or sidecar

Send HTML to a hosted converter or run a Gotenberg or LibreOffice sidecar next to the app and collect the finished files.

**Pros**:
* Keeps the heavy binary out of the app bundle and isolates render crashes from web serving.

**Cons**:
* Adds a new service to deploy, monitor, and pay for, plus another failure point between the job and the file.
* LibreOffice fidelity for exact institutional margins is weaker than Chromium page rules.

### Option 4: PDF only first, DOCX later

Ship the PDF path now on background jobs and defer the Word builder to a later slice.

**Pros**:
* Smaller first slice and earlier value for the common submission case.

**Cons**:
* Many institutions expect an editable Word file, so the feature would launch incomplete against its own scope row.
* The DOCX model would be designed without the pressure of parity, raising the odds of later drift.

## Rationale

The scope contract names publication quality output with exact margins, headers, and numbering and no server timeouts. Option 1 cannot meet the timeout term. Option 4 ships half the contract. Option 3 meets it but buys an extra service and its failure modes for a team that already runs Inngest and S3. Option 2 meets both terms with tools the team already operates, and the shared HTML model is what keeps wording shared between the two outputs (layout still needs per format checks, since Chromium CSS and the `docx` API are independent renderers). The Chromium weight is real, so the spec keeps Gotenberg as a named fallback and sizes the first slice as a thin thread that proves the pipeline before the fidelity work lands.
