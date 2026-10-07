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
   this request, the same link as a QR code, and a reference to the request.
2. **Given** a triggered request, **When** the citizen opens it in their wallet, **Then** the
   wallet asks for exactly the documents and fields configured in the form connection, and
   nothing else.
3. **Given** a triggered request that the citizen has not yet answered, **When** serviceBW calls
   the pull URL with the request's reference, **Then** it receives the status "pending" and no
   documents.
4. **Given** the citizen has approved the request in their wallet, **When** serviceBW calls the
   pull URL, **Then** it receives the status "completed" and exactly the configured fields of each
   requested document.
5. **Given** the citizen declines the request in their wallet, **When** serviceBW calls the pull
   URL, **Then** it receives the status "declined" and no personal data.
6. **Given** the citizen presents a document that is expired, revoked, altered, or not from a
   trusted issuer, **When** the middleware checks it, **Then** the document is not accepted and
   serviceBW receives the status "verification failed" without any personal data.
7. **Given** the citizen has not answered within 10 minutes of the trigger, **When** serviceBW
   calls the pull URL, **Then** it receives the status "expired".
8. **Given** serviceBW has already pulled the documents of a completed request, **When** anyone
   calls the pull URL for that request again, **Then** no personal data is returned.

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
   middleware retries delivery until the retention limit in FR-020 is reached.
5. **Given** an update arrives at the webhook address, **When** serviceBW checks it, **Then**
   serviceBW can confirm that the middleware sent it.

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
   trigger URL, **Then** no request is started and serviceBW receives the status "unavailable".
4. **Given** a deactivated form connection, **When** a team member reactivates it, **Then** it
   works normally again with the same URLs.
5. **Given** a form connection that is no longer needed, **When** a team member deletes it and
   confirms the deletion, **Then** its connection URLs permanently stop starting requests and
   answer with the status "unavailable".

---

### Edge Cases

- **Citizen without a wallet, or whose wallet lacks a requested document**: The wallet returns no
  documents (see Assumptions). The request ends as "declined" if the citizen cancels in their
  wallet, or as "expired" after 10 minutes.
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
- **Webhook address unreachable**: Delivery is retried until the 30-minute retention limit, after
  which the documents are deleted.
- **Guessed or reused references**: Request references cannot be guessed, and the documents of a
  request are delivered only once.

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
  configuration they started with.
- **FR-006**: The system MUST let team members list, view, edit, deactivate, reactivate and delete
  form connections. While a form connection is deactivated, and after it is deleted, its URLs MUST
  NOT start new requests and MUST answer with the status "unavailable". Requests already in
  progress MUST be cancelled.
- **FR-007**: Only authorized DO.IT team members MUST be able to access the middleware's management
  interface.

#### Document requests

- **FR-008**: Calling a form connection's trigger URL MUST start a new document request and
  return:
  - a link that opens the citizen's EUDI Wallet with this request
  - the same link as a QR code
  - a reference to the request
- **FR-009**: Each document request MUST ask the citizen's wallet for exactly the documents and
  fields configured in the form connection, all in one wallet interaction, and nothing else.
- **FR-010**: The system MUST accept a shared document only after verifying that it:
  - is authentic and unaltered
  - comes from a trusted issuer
  - is currently valid, meaning not expired, suspended or revoked
  - is presented by the wallet it was issued to
- **FR-011**: Each document request MUST have one of these statuses: "pending" (waiting for the
  citizen), "completed", "declined", "verification failed", "expired" or "unavailable".
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
- **FR-016**: serviceBW MUST be able to confirm that an update was sent by the middleware. If an
  update cannot be delivered, the system MUST retry until the retention limit in FR-020 is reached.

#### Security and data protection

- **FR-017**: Only the serviceBW integration authorized for a form connection MUST be able to call
  its trigger URL and pull URL.
- **FR-018**: Request references MUST NOT be guessable, and the documents of a request MUST be
  delivered only once.
- **FR-019**: Documents MUST reach serviceBW in a way that no third party can read or alter them.
  Documents from one request MUST never be delivered for another request or form connection.
- **FR-020**: The system MUST delete a request's documents as soon as they have been delivered to
  serviceBW, and no later than 30 minutes after the citizen shared them.

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
  was triggered, its status and timestamps, and the shared documents, but only until they are
  delivered.
- **DO.IT Team Member**: An authorized member of staff who manages form connections.

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
- **SC-006**: The middleware holds no citizen personal data more than 30 minutes after the citizen
  shared it.
- **SC-007**: The middleware supports at least 100 simultaneous document requests while still
  meeting SC-004.
- **SC-008**: In usability testing, at least 4 of 5 DO.IT participants set up a correct form
  connection on their first attempt without assistance.

## Assumptions

- **Users and organization**: The middleware is used by the DO.IT team of the City of Stuttgart.
  Serving other municipalities is out of scope.
- **serviceBW's role**: serviceBW calls the connection URLs, shows the returned link and QR code to
  the citizen, and in webhook mode can receive updates at a webhook address. serviceBW decides what
  to do with the documents it receives. Citizens without an EUDI Wallet provide their documents
  through serviceBW's existing process.
- **All-or-nothing responses**: The citizen must provide every document in a form connection. The
  wallet enforces this: it returns either all the documents a request asks for or none, so the
  middleware never receives a partial set.
- **Wallets and trust**: The City of Stuttgart is, or will be, registered as a relying party that
  may request the configured documents from EUDI Wallets. A test or simulated wallet with sample
  documents is acceptable for validating the prototype.
- **Time limits**: The 10-minute expiry for requests and the 30-minute maximum retention of
  documents are defaults that balance usability and data minimization. They may be adjusted after
  testing.
- **Out of scope**: Custom logic on document fields, which is planned for a later iteration.
  Also out of scope: issuing documents into wallets, qualified electronic signatures, payments,
  archiving documents in the case file, and any changes to serviceBW itself.
