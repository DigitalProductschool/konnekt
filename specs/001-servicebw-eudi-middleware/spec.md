# Feature Specification: serviceBW ↔ EUDI Wallet Form Connections

**Feature Branch**: `sk-proto-1`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Middleware that connects serviceBW and the EUDI-Wallet with custom user-defined endpoints and logic

Context: When the DO.IT internal IT team from the city of Stuttgart creates a new form in serviceBW for citizens to apply for a new License or a new Social services, they want the citizens to provide identification and other type of documents called proofs (such as a driving license). DO.IT wants to allow citizens to provide these documents, through the EUDI-Wallet, if they have it. To do this, they use a middleware that allows them to create a new "form connection" where they specify which documents they need, and exactly which fields from those documents and a possible custom logic for those fields. The creation will then return multiple "connection URLs" that will be inserted in serviceBW for the full serviceBW<->EUDI-Wallet connection.

User story:
The DO.IT team create a new form in serviceBW and identifies that, in this form, the ID and the driving license are needed.
The DO.IT team then goes to the middleware UI and creates a new "form connection" that will be associated to the form in serviceBW.
In this "form connection" the DO.IT team specify the documents required by the form that they identified: in this case the ID and the driving license of the citizen.
If necessary a custom logic to some fields can be applied. For example the 'age' field in the ID can be checked to be at lest 21. Or the driving license can be checked to be issued more than 2 years ago.
After saving the "form connection", the DO.IT team gets multiple choices to connect the middleware to the serviceBW. These choices are probably multiple URLs.
DO.IT then copies the URLs in service BW.
When these URLs are used, the middleware will establish a connection to the wallet, requesting and retrieving the documents specified in the "form connection" and applying a possible custom logic on them. The documents will then be returned to serviceBW."

## Clarifications

### Session 2026-10-07

- Q: What are the "multiple choices" for connecting serviceBW to the middleware? → A: Two connection modes. In pull mode, a first URL triggers the request and returns the link and QR code for the citizen's EUDI Wallet, and a second URL is used to pull the documents. In webhook mode, the first URL is the same, and an additional field specifies a serviceBW webhook that receives updates.
- Q: Is custom logic on document fields part of this iteration? → A: No. Custom logic is a future feature and is neither specified nor implemented in this iteration.
- Q: Are fields used only by custom logic withheld from serviceBW? → A: This will be the middleware user's choice. It depends on custom logic, so it is not specified in this iteration.
- Q: Are the ID and the driving licence mandatory? → A: Not in general. The middleware user specifies which documents each form connection needs; the ID and the driving licence are only the user-story example. Within a form connection, the citizen must provide every document. The wallet enforces this, so it returns either all the requested documents or none.
- Q: Where is the webhook address set? → A: The DO.IT team enters it in the middleware UI, as part of the form connection.
- Q: What do webhook updates contain? → A: Both the status and, once the citizen has shared, the documents.
- Q: How do DO.IT team members sign in to the middleware? → A: Each team member has a personal account with a username and password. Accounts are set up outside the management interface, which has no account management in this iteration.
- Q: How is access to the trigger and pull URLs restricted to serviceBW? → A: By the network. The middleware and serviceBW operate in a restricted, controlled network in which only serviceBW can reach those URLs. Calls to the URLs carry no credentials.
- Q: How does serviceBW confirm that a webhook update came from the middleware? → A: That kind of security is out of scope for now. The restricted network is relied on, so webhook updates carry no authentication.
- Q: serviceBW may accept a "completed" webhook update without its answer ever reaching the middleware. Should the middleware retry? → A: Yes. It retries as usual. In that rare case serviceBW receives the same documents twice and drops the repeat. Once a delivery is confirmed, the documents are deleted and can't be obtained again.
- Q: How long should a document request stay open, given that the serviceBW test form currently stops waiting after 3 minutes? → A: 10 minutes. serviceBW keeps checking until it gets a final status, and has no timeout of its own that is shorter than the request's expiry.
- Q: If serviceBW's pull call fails after the middleware has handed out the documents, should those documents be lost, or may serviceBW fetch them again? → A: serviceBW may fetch them again for 60 seconds. Pulls within 60 seconds of the first pull that returned the documents return the same documents, and after that they are deleted.
- Q: Should the spec deal with the risk that someone forwards their request's QR code or link to another person, whose documents then end up in the forwarder's serviceBW application? → A: The risk is accepted for this iteration. serviceBW is assumed to check that the shared documents belong to the applicant, and DO.IT confirms this with serviceBW.
- Q: Must the DO.IT management UI meet a formal accessibility standard, namely WCAG 2.1 level AA? → A: Yes. WCAG 2.1 AA is an acceptance criterion for the management UI.
- Q: How long should the middleware keep the record of a request (its reference, status and timestamps, but no documents) after the request has ended? → A: 7 days. A request ends when it has a final status and its documents have been delivered or deleted. Its record is deleted 7 days later, and a pull with its reference then answers as for an unknown request.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set up a form connection and obtain its connection URLs (Priority: P1)

A member of the DO.IT team has built a new form in serviceBW and has identified which documents
it needs from citizens, for example the ID and the driving licence. In the middleware they create
a new form connection for that form. They give it a name, note which serviceBW form it belongs to,
choose the needed documents from the catalog, and select exactly the fields the form needs from
each document. After saving, the middleware shows the connection URLs for the two connection
modes, pull and webhook, and a field for serviceBW's webhook address. The team member copies the
URLs into serviceBW and, to use webhook mode, enters the webhook address.

**Why this priority**: Nothing can be requested from a wallet until a form connection exists. It
lets DO.IT connect a serviceBW form to the EUDI Wallet through configuration instead of a
development project.

**Independent Test**: Create a form connection with two documents and selected fields, then save
it. Verify that the connection URLs appear and can be copied, that a webhook address can be
entered, and that the same URLs are shown when the form connection is reopened.

**Acceptance Scenarios**:

1. **Given** a signed-in DO.IT team member, **When** they create a form connection, link it to a
   serviceBW form, add the ID and the driving licence with selected fields, and save, **Then** the
   form connection is stored. Its trigger URL and pull URL are shown, each copyable in a single
   action, together with the field for a webhook address.
2. **Given** a team member is choosing documents, **When** they open a document type in the
   catalog, **Then** they see the fields that document type offers and can select any of them.
3. **Given** a form connection with no document, or with a document that has no selected field,
   **When** the team member tries to save it, **Then** saving is refused with a message that names
   the problem.
4. **Given** a saved form connection, **When** the team member reopens it later, **Then** the same
   connection URLs are shown.
5. **Given** a saved form connection, **When** the team member enters serviceBW's webhook address
   and saves it, **Then** requests triggered from then on use webhook mode.

---

### User Story 2 - Retrieve a citizen's documents in pull mode (Priority: P1)

A citizen filling in the serviceBW form chooses to provide the needed documents with their EUDI
Wallet. The form connection has no webhook address, so it uses pull mode. serviceBW calls the form
connection's trigger URL and receives a link and a QR code for
the citizen's wallet, which it shows to the citizen. The citizen scans the QR code with the phone
that holds their wallet, or opens the link on that phone, and approves the request in the wallet.
serviceBW uses the pull URL to check on the request and, once the citizen has shared, receives
the requested fields of each document.

**Why this priority**: This is the end-to-end flow the feature exists for. Verified documents
travel from the citizen's wallet into the serviceBW application without uploads or manual checks.

**Independent Test**: With a saved form connection that has no webhook address, and a test wallet
that holds the requested documents, call the trigger URL, approve the request in the wallet, and call the pull URL.
Confirm that serviceBW receives exactly the configured fields and nothing else.

**Acceptance Scenarios**:

1. **Given** a form connection that requests the ID and the driving licence, **When** serviceBW
   calls its trigger URL, **Then** it receives a link that opens the citizen's EUDI Wallet with
   this request, a QR code that opens the same request from another device, and a reference to
   the request.
2. **Given** a triggered request, **When** the citizen opens it in their wallet, **Then** the
   wallet asks for exactly the documents and fields configured in the form connection, and
   nothing else.
3. **Given** a triggered request that the citizen has not yet answered, **When** serviceBW calls
   the pull URL with the request's reference, **Then** it receives the status "pending" and no
   documents.
4. **Given** the citizen has approved the request in their wallet, **When** serviceBW calls the
   pull URL, **Then** it receives the status "completed" and exactly the configured fields of each
   requested document.
5. **Given** the citizen declines the request in their wallet and the wallet reports it, **When**
   serviceBW calls the pull URL, **Then** it receives the status "declined" and no personal data.
6. **Given** the citizen presents a document that is expired, revoked, altered, or not from a
   trusted issuer, **When** the middleware checks it, **Then** the document is not accepted and
   serviceBW receives the status "verification failed" without any personal data.
7. **Given** the citizen has not answered within 10 minutes of the trigger, **When** serviceBW
   calls the pull URL, **Then** it receives the status "expired".
8. **Given** serviceBW pulled the documents of a completed request more than 60 seconds ago,
   **When** anyone calls the pull URL for that request again, **Then** no personal data is
   returned.
9. **Given** serviceBW pulled the documents of a completed request less than 60 seconds ago,
   **When** it calls the pull URL again, for example because the first answer never arrived,
   **Then** it receives the same documents.

---

### User Story 3 - Receive request updates through a webhook (Priority: P2)

Instead of calling the pull URL repeatedly, serviceBW can receive updates about a request at a
webhook address that the DO.IT team entered for the form connection in the middleware UI.
serviceBW calls the same trigger URL as in pull mode and shows the returned link and QR code to
the citizen. The middleware then sends each status change to the webhook address as it happens.
Once the citizen has shared, the update also carries the documents.

**Why this priority**: Pull mode already covers the full flow. Webhook mode spares serviceBW from
checking repeatedly whether the citizen has shared yet.

**Independent Test**: Enter a webhook address for a form connection, trigger a request, and
complete it in a test wallet. Confirm that the webhook address receives an update for each status
change, and that the "completed" update carries exactly the configured fields.

**Acceptance Scenarios**:

1. **Given** a form connection with a webhook address, **When** serviceBW calls the trigger URL,
   **Then** it receives the same link, QR code and request reference as in pull mode.
2. **Given** a triggered request in webhook mode, **When** its status changes, **Then** the
   middleware sends an update with the request reference and the new status to the webhook
   address.
3. **Given** a triggered request in webhook mode, **When** the citizen approves it in their
   wallet, **Then** the "completed" update sent to the webhook address carries exactly the
   configured fields of each requested document.
4. **Given** the webhook address cannot be reached, **When** an update is due, **Then** the
   middleware retries delivery until the limit in FR-016 is reached.

---

### User Story 4 - Maintain form connections (Priority: P3)

Forms in serviceBW change, get paused, or are retired. The DO.IT team needs an overview of all
form connections and must be able to edit, pause or delete them. Changing what a form connection
requests must not require replacing the URLs already placed in serviceBW.

**Why this priority**: This becomes necessary once several forms use the middleware. The first
form can go live without it.

**Independent Test**: With several form connections in place, check the overview. Edit one and
confirm its URLs are unchanged and requests already in progress are unaffected. Deactivate and
reactivate one, then delete one.

**Acceptance Scenarios**:

1. **Given** several form connections exist, **When** a team member opens the overview, **Then**
   each form connection is listed with its name, its serviceBW form and whether it is active.
2. **Given** an active form connection whose URLs are in use in serviceBW, **When** a team member
   adds a field and saves, **Then** the connection URLs stay the same and new requests ask for the
   added field. Requests already in progress finish with the configuration they started with.
3. **Given** a team member has deactivated a form connection, **When** serviceBW calls its
   trigger URL, **Then** no request is started and serviceBW receives the answer "unavailable".
4. **Given** a deactivated form connection, **When** a team member reactivates it, **Then** it
   works normally again with the same URLs.
5. **Given** a form connection that is no longer needed, **When** a team member deletes it and
   confirms the deletion, **Then** its connection URLs permanently stop starting requests and
   answer every call with "unavailable".

---

### Edge Cases

- **Citizen without a wallet, or whose wallet lacks a requested document**: The wallet returns no
  documents (see Assumptions). The request ends as "declined" if the wallet reports that the
  citizen cancelled. A wallet that closes without reporting it leaves the request "pending" until
  it ends as "expired" after 10 minutes.
- **Pulling too early**: Until the citizen has shared, the pull URL returns "pending" and no
  documents.
- **Configuration edited during a request**: The request finishes with the configuration that was
  in force when it was triggered.
- **Form connection deactivated or deleted during a request**: The request is cancelled, and
  serviceBW receives the status "unavailable".
- **Repeated or parallel requests**: Each call to the trigger URL starts an independent request.
  Documents from one request are never delivered for another.
- **Documents never collected**: Documents that serviceBW has not collected are deleted 30 minutes
  after the citizen shared them.
- **Webhook address unreachable**: Delivery is retried until the limit in FR-016. The documents
  are deleted no later than 30 minutes after the citizen shared them (FR-020).
- **Guessed or reused references**: Request references cannot be guessed. Once delivered, the
  documents of a request can't be obtained again, apart from the repeats FR-018 allows.
- **Answer to a pull lost in transit**: serviceBW pulls again within 60 seconds and receives the
  same documents (FR-018).
- **Link or QR code forwarded to someone else**: The middleware can't tell who filled in the form.
  If another person approves the request, their documents reach that serviceBW application.
  serviceBW checks that the documents belong to the applicant (see Assumptions).
- **Old references**: A pull for a request that ended more than 7 days ago answers as for an
  unknown request, because its record has been deleted (FR-021).

## Requirements *(mandatory)*

### Functional Requirements

#### Form connection setup and management

- **FR-001**: The system MUST allow authorized DO.IT team members to create a form connection
  consisting of a name, the serviceBW form it belongs to, and one or more documents together with
  the fields to request from each. For webhook mode, a form connection also holds a webhook address
  (FR-014).
- **FR-002**: The system MUST offer a catalog of the document types that EUDI Wallets can hold,
  listing the fields each type offers with a readable label. The catalog MUST contain at least the
  two documents from the user story: the ID (called PID, person identification data, in the EUDI
  Wallet) and the mobile driving licence.
- **FR-003**: The system MUST let team members choose which documents a form connection requests
  and select exactly which fields to request from each one. It MUST refuse to save a form
  connection with no documents, or with a document that has no selected field.
- **FR-004**: When a form connection is saved, the system MUST provide its connection URLs:
  - a **trigger URL**, used in both modes, which starts a document request
  - a **pull URL**, used in pull mode, which returns a request's status and documents

  Each URL MUST be copyable in a single action. Alongside the URLs, the system MUST offer the field
  for the webhook address used in webhook mode (FR-014).
- **FR-005**: Connection URLs MUST stay the same when a form connection is edited. Changes MUST
  apply to requests triggered after the change. Requests already in progress MUST finish with the
  configuration they started with: the requested documents and fields, and the connection mode
  with its webhook address.
- **FR-006**: The system MUST let team members list, view, edit, deactivate, reactivate and delete
  form connections. While a form connection is deactivated, and after it is deleted, its URLs MUST
  NOT start new requests and MUST answer every call with "unavailable", whatever status a request
  has reached. Its requests still in progress MUST be cancelled and get the status "unavailable".
  A request is in progress while it waits for the citizen, or while its shared documents wait to
  be delivered.
- **FR-007**: Only authorized DO.IT team members MUST be able to access the middleware's management
  interface. Each team member MUST sign in with a personal account, which is set up outside the
  management interface.

#### Document requests

- **FR-008**: Calling a form connection's trigger URL MUST start a new document request and
  return:
  - a link that opens this request in the citizen's EUDI Wallet on the device that holds it
  - a QR code that opens the same request in a wallet on another device
  - a reference to the request
- **FR-009**: Each document request MUST ask the citizen's wallet for exactly the documents and
  fields configured in the form connection, all in one wallet interaction, and nothing else.
- **FR-010**: The system MUST accept a shared document only after verifying that it:
  - is authentic and unaltered
  - comes from a trusted issuer
  - is currently valid, meaning not expired, suspended or revoked
  - is presented by the wallet it was issued to
- **FR-011**: Each document request MUST have one of these statuses: "pending" (waiting for the
  citizen), "completed", "declined", "verification failed", "expired" or "unavailable" (cancelled
  because its form connection was deactivated or deleted, FR-006).
- **FR-012**: A request that the citizen has not completed MUST expire 10 minutes after it was
  triggered.

#### Pull mode

- **FR-013**: In pull mode, calling the pull URL with a request reference MUST return the
  request's current status. For a completed request, it MUST also return the configured fields of
  each requested document, each identified so that serviceBW can tell which value is which.

#### Webhook mode

- **FR-014**: The system MUST support a webhook mode, in which serviceBW receives updates about a
  request at a webhook address instead of pulling. DO.IT team members MUST be able to enter,
  change or remove a form connection's webhook address in the middleware UI. A form connection with
  a webhook address uses webhook mode, and one without uses pull mode.
- **FR-015**: In webhook mode, the system MUST send an update to the webhook address each time a
  request's status changes. The "completed" update MUST also carry the configured fields of each
  requested document, identified as in FR-013. In webhook mode, documents MUST be delivered only to
  the webhook address.
- **FR-016**: If an update cannot be delivered to the webhook address, the system MUST retry it.
  It retries the "completed" update until the documents are deleted under FR-020, and any other
  update until 30 minutes after the status change it reports. Updates carry no proof of sender;
  the restricted network is relied on instead (see Assumptions).

#### Security and data protection

- **FR-017**: Only serviceBW MUST be able to call the trigger URLs and pull URLs. This is ensured by
  the restricted network the middleware operates in (see Assumptions), not by credentials sent
  with the calls.
- **FR-018**: Request references MUST NOT be guessable. Once a request's documents have been
  delivered, they MUST NOT be obtainable again, with two narrow exceptions that protect against
  lost answers (see Clarifications):
  - in pull mode, the pull URL returns them again for 60 seconds after the first pull that
    returned them;
  - in webhook mode, an update whose confirmation never reached the middleware may be repeated.
- **FR-019**: Documents MUST reach serviceBW in a way that no third party can read or alter them.
  Documents from one request MUST never be delivered for another request or form connection.
- **FR-020**: The system MUST delete a request's documents as soon as they have been delivered to
  serviceBW, and no later than 30 minutes after the citizen shared them. In pull mode, "as soon as
  delivered" means when the 60-second repeat window of FR-018 ends. The 30-minute limit applies in
  every case, including to any copy held by the service the middleware uses to communicate with
  wallets.
- **FR-021**: The system MUST delete the record of a document request, meaning its reference,
  status and timestamps, 7 days after the request ends. A request ends when it has a final status
  (any status except "pending") and its documents have been delivered or deleted. After that, the
  pull URL answers for its reference as for an unknown request.

### Key Entities *(include if feature involves data)*

- **Form Connection**: The configuration that connects one serviceBW form to the EUDI Wallet. It
  holds a name, the linked serviceBW form, the requested documents with their selected fields, a
  status (active or deactivated), its connection URLs, and, for webhook mode, a webhook address.
- **Document Type**: A catalog entry for a kind of document an EUDI Wallet can hold, such as the ID
  (PID) or the mobile driving licence, together with the fields it offers.
- **Requested Document**: A document type as used in one form connection, together with the
  fields selected for it.
- **Connection URL**: An address serviceBW uses to work with a form connection. The trigger URL is
  used in both modes, and the pull URL in pull mode.
- **Document Request**: One attempt to obtain a citizen's documents for a form connection, started
  through the trigger URL. It holds an unguessable reference, the configuration in force when it
  was triggered, its status and timestamps, and the shared documents, but only as long as FR-018
  and FR-020 allow. The record itself is deleted 7 days after the request ends (FR-021).
- **DO.IT Team Member**: An authorized member of staff who manages form connections and signs in
  with a personal account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A DO.IT team member can set up a form connection with two documents and their fields,
  and copy its connection URLs, in under 10 minutes without help from a developer.
- **SC-002**: Connecting a new serviceBW form to the EUDI Wallet takes less than one working day,
  from deciding which documents it needs to a working connection, with no software development or
  release involved.
- **SC-003**: Citizens whose wallet holds the requested documents take a median of under 2 minutes
  from seeing the link or QR code in serviceBW to having approved the request. At least 90% of them
  succeed on their first attempt.
- **SC-004**: In 95% of requests, serviceBW can obtain the documents, through the pull URL or the
  webhook, within 5 seconds of the citizen approving the request in their wallet.
- **SC-005**: In acceptance testing, 100% of the documents delivered to serviceBW contain only the
  fields configured for that form connection. 100% of altered, expired, revoked or untrusted test
  documents are rejected.
- **SC-006**: Neither the middleware nor the service it uses to communicate with wallets holds a
  citizen's document data more than 30 minutes after the citizen shared it. The middleware holds
  no request record more than 7 days after the request ended.
- **SC-007**: The middleware supports at least 100 simultaneous document requests while still
  meeting SC-004.
- **SC-008**: In usability testing, at least 4 of 5 DO.IT participants set up a correct form
  connection on their first attempt without assistance.
- **SC-009**: The management interface meets WCAG 2.1 level AA. An accessibility review against
  WCAG 2.1 AA before release finds no unresolved failures.

## Assumptions

- **Users and organization**: The middleware is used by the DO.IT team of the City of Stuttgart.
  Serving other municipalities is out of scope.
- **serviceBW's role**: serviceBW calls the connection URLs, shows the returned link and QR code to
  the citizen, and in webhook mode can receive updates at a webhook address. serviceBW decides what
  to do with the documents it receives. Citizens without an EUDI Wallet provide their documents
  through serviceBW's existing process.
- **serviceBW waits for a final status**: Every status except "pending" is final. In pull mode,
  serviceBW keeps calling the pull URL until it gets a final status; in webhook mode it keeps
  waiting for the update. It doesn't stop waiting before the request expires (FR-012), so it can
  show a decline or failure as soon as it is reported and never abandons a citizen who approves in
  time.
- **Documents match the applicant**: serviceBW checks that the documents it receives belong to the
  applicant, for example against the signed-in serviceBW account. The middleware can't check this,
  because it never learns who filled in the form. DO.IT confirms this with serviceBW, and until
  then the risk of a forwarded link or QR code is accepted for this iteration.
- **All-or-nothing responses**: The citizen must provide every document in a form connection. The
  wallet enforces this: it returns either all the documents a request asks for or none, so the
  middleware never receives a partial set.
- **Wallets and trust**: The City of Stuttgart is, or will be, registered as a relying party that
  may request the configured documents from EUDI Wallets. A test or simulated wallet with sample
  documents is acceptable for validating the prototype.
- **Time limits**: The 10-minute expiry for requests, the 30-minute maximum retention of
  documents, the 60-second repeat window for pulls, and the 7-day retention of request records are
  defaults that balance usability and data minimization. They may be adjusted after testing.
- **Restricted network**: The middleware and serviceBW operate in a restricted, controlled
  network. Only serviceBW can reach the connection URLs, and the middleware's updates to the
  webhook address travel only inside that network. Neither direction is authenticated by the
  middleware in this iteration.
- **Out of scope**: Custom logic on document fields, which is planned for a later iteration.
  Also out of scope: issuing documents into wallets, qualified electronic signatures, payments,
  archiving documents in the case file, and any changes to serviceBW itself. Authenticating calls
  to the connection URLs and updates to the webhook address beyond the restricted network, and
  managing team member accounts in the management interface, are out of scope for now.
