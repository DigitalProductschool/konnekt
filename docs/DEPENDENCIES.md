# Dependencies

The code base started from the Digital Product School React + FastAPI + PostgreSQL template.
This page names every dependency added since, with the reason it was added: a new dependency
gets a row here. Whose each one is, and under which licence, is in [NOTICE.md](../NOTICE.md).

## Dependencies added to the template

| Package | Where | Why |
|---|---|---|
| `argon2-cffi` | backend | Argon2id hashes for the DO.IT team members' passwords |
| `httpx2` | backend (moved from the `dev` group) | Synchronous HTTP client for the EUDIPLO management API. FastAPI's `TestClient` needs it too, and its `MockTransport` provides the fake EUDIPLO in the tests |
| `segno` | backend | Renders the QR code that serviceBW shows the citizen, a PNG data URI of the wallet link for another device. Pure Python, and writes PNG without Pillow |
| `pytest` | backend, `dev` group | Runs the backend tests |
| `faker` | backend, `dev` group | Makes up realistic German test people for `scripts/issue_test_credentials`, which issues test documents to a test wallet ([TEST-CREDENTIALS.md](TEST-CREDENTIALS.md)). The script isn't part of the production image |
| `react-router` | frontend | Routes of the management UI, so that a form connection has its own URL |
| `@kern-ux/native` | frontend | KERN's CSS, design tokens and Fira Sans font files. KERN is the design system for German public administration ([KERN-DESIGN-SYSTEM.md](KERN-DESIGN-SYSTEM.md)) |
| `@kern-ux-annex/kern-react-kit` | frontend | KERN's React components, built for WCAG 2.1 AA, which the management UI must meet. Its own stylesheet is not imported, see [KERN-DESIGN-SYSTEM.md](KERN-DESIGN-SYSTEM.md) §2 |
| `@digitalservicebund/kern-ux-tailwind-theme` | frontend | Maps KERN's design tokens to Tailwind classes |
| `pdfkit` 0.20.2 | frontend | Draws the connection's details as a tagged PDF in the browser, in a module worker (spec 011, research R1; [ARCHITECTURE.md](ARCHITECTURE.md#the-connection-pdf-spec-011)). One package for both the drawing and the tagging: it measures and wraps text for our own pagination, embeds and subsets TrueType fonts, and writes the structure tree, artifacts, `/Lang` and the PDF/UA identification that PDF/UA-1 needs; `@react-pdf/renderer` writes no tags, pdf-lib neither wraps text nor tags, jsPDF with html2canvas draws images of pages. Its browser build loads on the first "Download PDF" only, as a chunk of its own, and its Node build runs the same drawing in the Vitest smoke test. Its own dependencies (fontkit, fflate, linebreak, @noble) arrive with it and are never imported by our code. It ships no types: `utils/connectionPdf/types.ts` declares the calls we use (spec 011, design-notes D1). MIT |
| `vitest` | frontend and rules, `devDependencies` | Runs the unit tests of `frontend/` and `rules/` (`npm test`). Some pure logic runs only in the browser, such as the rules' propagation between the variants of a form connection, so its tests in Node are a quality gate (constitution v1.1.0). Configured in the `test` block of `frontend/vite.config.ts` and in `rules/vitest.config.ts`, in the `node` environment, without a DOM. Version 4, because Vitest 5 needs Node 22.12, and the frontend still supports Node 20 |
| `@modelcontextprotocol/server` 2.4.0 | mcp | The MCP protocol, transport and schemas: the official TypeScript SDK's server, with the Skills extension |
| `@modelcontextprotocol/node` 2.1.2 | mcp | Serves the MCP endpoint from `node:http` |
| `zod` 4.6.7 | mcp | The tools' input schemas, published as JSON Schema by the SDK |
| `@modelcontextprotocol/client` 2.4.0 | mcp, `devDependencies` | The MCP client of the server's integration tests |
| `vite-node` 6.0.0 | mcp, `devDependencies` | Runs the MCP server in development (`npm run dev`) through Vite's transform, which the embedded skills (`import.meta.glob` with `?raw`) need |
| `gitleaks` 8.30.1 | pre-commit hook and CI | Looks for secrets (keys, tokens, passwords) in the staged changes and in the history, so none reaches the repository unnoticed ([Secrets (gitleaks)](CODE-QUALITY.md#secrets-gitleaks)). MIT |

The three KERN packages and `react-router` are pinned to exact versions; for KERN, a version
mismatch between the packages is the most likely cause of visual breakage.
The MCP SDK's packages, `zod` and `vite-node` are pinned to exact versions too: the SDK's
Skills extension is marked experimental in 2.4.0.
`pdfkit` is pinned exactly as well: `withoutCidSet()` in
`frontend/src/utils/connectionPdf/render.ts` works around PDFKit's incomplete `CIDSet` through
its private `_fontFamilies`, and the smoke test fails if a new version breaks it.

The PDF's fonts are files, not a package: Fira Sans (Regular, Medium, SemiBold) and Fira Mono
(Regular, Medium) as five TTFs in `frontend/src/assets/fonts/`, from Google Fonts' release,
under the SIL Open Font License 1.1, whose text is `OFL.txt` beside them. KERN's WOFF2 files
break fontkit's subsetting, and KERN 2.8.2 ships no Fira Mono (spec 011, research R7).
