export const CHALLENGE_LABS = {
  "Spot the Missing Security Headers": {
    "task": "Inspect the simulated HTTP response. Identify three missing browser security headers that help mitigate content injection, clickjacking, and MIME-type sniffing.",
    "evidence": "HTTP/1.1 200 OK\nContent-Type: text/html; charset=utf-8\nServer: OpenCore-Lab\nCache-Control: no-store\nReferrer-Policy: strict-origin-when-cross-origin\n\n<!doctype html>\n<html><head><title>Open Core Demo</title></head>\n<body><h1>Welcome to the lab</h1></body></html>",
    "hint": "Flag format: OCS{header_one_header_two_header_three}. Use lowercase header names, underscores instead of hyphens, alphabetical order.",
    "lesson": "Content-Security-Policy restricts resource execution and helps mitigate XSS; X-Content-Type-Options: nosniff prevents MIME sniffing; X-Frame-Options: DENY prevents framing. A modern alternative to X-Frame-Options is CSP frame-ancestors."
  },
  "Decode the Leaked Note": {
    "task": "Decode the sample message. Then identify the security principle demonstrated by the fact that anyone with the text can decode it.",
    "evidence": "ATTACHMENT: support-note.txt\nENCODING: Base64\nPAYLOAD:\nQmFzZTY0IGlzIG5vdCBzZWNyZWN5Lg==",
    "hint": "This is a common text-to-binary encoding. Decoding requires no secret key.",
    "lesson": "Base64 is an encoding format, not encryption. It provides no confidentiality; use authenticated encryption for sensitive data in transit or at rest."
  },
  "The Public Roadmap": {
    "task": "Review the simulated robots.txt contents. Explain why the listed path must not be treated as protected.",
    "evidence": "GET /robots.txt HTTP/1.1\nHost: demo.opencore.invalid\n\nUser-agent: *\nDisallow: /staging/\nDisallow: /backup-2025/\nAllow: /public/",
    "hint": "Search engine crawler guidance is not an access-control mechanism.",
    "lesson": "robots.txt is publicly readable and only suggests crawler behavior. Protect sensitive paths with authentication and authorization; do not publish secrets or rely on obscurity."
  },
  "One Factor Too Few": {
    "task": "Review the access policy and identify the missing control that should be required for privileged accounts.",
    "evidence": "POLICY: Admin Console\nPassword required: YES\nSecond factor required: NO\nPhishing-resistant factor: NO\nAdmin accounts included in exception: ALL",
    "hint": "A password is one factor. What adds another independent proof of identity?",
    "lesson": "Require multifactor authentication, preferably phishing-resistant FIDO2/WebAuthn for privileged access. Enforce it centrally and protect recovery flows."
  },
  "A Query Gone Wrong": {
    "task": "Choose the safe query pattern from the two examples and identify the defense that keeps user input separate from SQL syntax.",
    "evidence": "UNSAFE:\nquery = \"SELECT * FROM users WHERE email = '\" + input + \"'\"\n\nSAFER:\ndb.execute(\"SELECT * FROM users WHERE email = ?\", [input])",
    "hint": "Look for the technique that binds data values separately from the SQL statement.",
    "lesson": "Parameterized queries/prepared statements prevent untrusted input from becoming SQL syntax. Also use least-privilege database accounts and safe error handling."
  },
  "Hash or Cipher?": {
    "task": "A developer stores SHA-256(password) and says they can decrypt it later. Identify the cryptographic category error.",
    "evidence": "DEVELOPER NOTE:\nAlgorithm: SHA-256\nStored value: 64 hexadecimal characters\nClaim: \"We can decrypt this digest to recover the password.\"",
    "hint": "A hash is designed to be one-way; encryption is reversible with the right key.",
    "lesson": "SHA-256 is a cryptographic hash, not a cipher. Passwords should use a password-hashing scheme such as Argon2id, scrypt, or bcrypt with unique salts and suitable cost settings."
  },
  "Too Much Access": {
    "task": "A support-ticket service needs to create tickets but has broad customer and billing permissions. Identify the principle that should guide its permissions.",
    "evidence": "SERVICE ACCOUNT: ticket-worker\nNEEDS: create support tickets\nCURRENT PERMISSIONS:\n- read all customer profiles\n- export customer database\n- modify billing settings\n- create support tickets",
    "hint": "Give identities only the permissions necessary for their task.",
    "lesson": "Apply least privilege: scope permissions to the minimum actions and resources required, use separate service identities, and review access regularly."
  },
  "Reconstruct the Incident": {
    "task": "The event records show actions but cannot reliably be attributed or placed in sequence. Identify the two key fields missing from every record.",
    "evidence": "2026-10-20T09:15:04Z ACTION=LOGIN RESULT=FAIL\nTIME=? ACTOR=? ACTION=EXPORT RESULT=SUCCESS\nTIME=? ACTOR=? ACTION=ROLE_CHANGE RESULT=SUCCESS",
    "hint": "One field establishes when an event occurred; the other identifies the account that performed it.",
    "lesson": "Security logs need trustworthy timestamps (ideally synchronized UTC) and actor/user identifiers. Include event IDs, source context, and tamper-resistant retention where appropriate."
  },
  "The Invoice Switch": {
    "task": "Review the API behavior. A signed-in customer changes the invoice identifier and receives another customer's invoice. Identify the vulnerability and the check missing from the handler.",
    "evidence": "GET /api/invoices/INV-1042\nAuthenticated user: customer_17\nResponse owner: customer_88\nHTTP/1.1 200 OK\n\nHandler pseudocode:\ninvoice = db.getInvoice(request.params.id)\nreturn invoice",
    "hint": "Authentication proves who the caller is. What must still be checked for this specific object?",
    "lesson": "This is insecure direct object reference (IDOR)/broken object-level authorization. Check that the authenticated principal is authorized for the requested invoice on every object access; never rely on unguessable IDs."
  },
  "Trust the Token?": {
    "task": "The API decodes a JWT payload and trusts its role claim without verifying the token signature. Identify the required validation operation.",
    "evidence": "JWT HEADER:\n{\"alg\":\"RS256\",\"typ\":\"JWT\"}\n\nAPI FLOW:\n1. Split token into three parts\n2. Base64URL-decode payload\n3. Read \"role\": \"admin\"\n4. Grant access\n\nMISSING STEP: ?",
    "hint": "Decoding is not verification. Validate cryptographic authenticity using a trusted key and strict algorithm rules.",
    "lesson": "Verify the JWT signature with the expected trusted key, pin allowed algorithms, validate issuer, audience, expiry and not-before claims, and reject malformed tokens."
  },
  "The URL Fetcher": {
    "task": "A URL preview service fetches user-provided URLs from its backend. Identify the vulnerability family and the core destination-validation control.",
    "evidence": "POST /preview\n{\"url\":\"https://user-supplied.example/path\"}\n\nBACKEND:\nresponse = fetch(request.body.url)\nreturn response.title\n\nNo hostname allowlist\nNo private/reserved IP filtering\nRedirects followed automatically",
    "hint": "The server is making network requests on behalf of the user. Consider access to internal services and cloud metadata endpoints.",
    "lesson": "This is server-side request forgery (SSRF). Prefer strict destination allowlists, resolve and validate every address, block private/link-local/reserved ranges, revalidate redirects, and enforce egress controls."
  },
  "Cookie on the Loose": {
    "task": "The session cookie is missing browser protections. Identify the three attributes that reduce script access and cross-site request exposure while requiring HTTPS.",
    "evidence": "Set-Cookie: session=abc123; Path=/; Expires=Wed, 21 Oct 2026 07:28:00 GMT\n\nMissing protections:\n- JavaScript-readable cookie protection\n- HTTPS-only transmission\n- Cross-site request policy",
    "hint": "Think of the attributes commonly set as HttpOnly, Secure, and SameSite.",
    "lesson": "Set HttpOnly to prevent JavaScript access, Secure to restrict transmission to HTTPS, and SameSite=Lax or Strict as appropriate. Also use appropriate expiry and CSRF defenses."
  },
  "DNS Query Trail": {
    "task": "Analyze the simulated packet summary. Identify the likely protocol channel used to move data out of the environment.",
    "evidence": "CAPTURE SUMMARY\n09:14:01 10.0.4.21 -> 8.8.8.8 UDP/53 query aGVsbG8x.c2VydmVy.example\n09:14:02 10.0.4.21 -> 8.8.8.8 UDP/53 query d29ybGQy.c2VydmVy.example\n09:14:03 10.0.4.21 -> 8.8.8.8 UDP/53 query c2VjcmV0Mw.c2VydmVy.example\n09:14:04 10.0.4.21 -> 8.8.8.8 UDP/53 query ZGF0YTQ.c2VydmVy.example\n\nOBSERVATION: repeated long, encoded-looking subdomains",
    "hint": "Look at the destination port and repeated high-entropy subdomains. This is a common name-resolution protocol.",
    "lesson": "The pattern is consistent with DNS tunneling/exfiltration. Investigate query volume and entropy, correlate endpoint telemetry, restrict recursive resolvers, and alert on anomalous DNS patterns."
  },
  "The Double Spend": {
    "task": "Two concurrent purchase requests both pass a balance check before either deducts funds. Identify the database guarantee/technique needed to make the check-and-update indivisible.",
    "evidence": "Initial balance: 100 credits\nPurchase A: 80 credits\nPurchase B: 80 credits\n\nT1 reads balance = 100\nT2 reads balance = 100\nT1 checks sufficient funds -> YES\nT2 checks sufficient funds -> YES\nT1 writes balance = 20\nT2 writes balance = 20\nBoth orders are marked PAID",
    "hint": "The read-check-write sequence must behave as one indivisible operation, using a transaction and appropriate locking or conditional update.",
    "lesson": "Use an atomic transaction with row-level locking or a conditional UPDATE that checks and decrements the balance in one statement. Enforce invariants in the database and use idempotency keys."
  },
  "Unsafe Object Revival": {
    "task": "A service reconstructs objects from untrusted serialized input. Identify the safe handling rule that prevents attacker-controlled object behavior during deserialization.",
    "evidence": "REQUEST BODY:\n{\n  \"format\": \"serialized-object\",\n  \"source\": \"untrusted-client\",\n  \"operation\": \"deserialize_and_execute\"\n}\n\nSERVICE:\nobject = deserialize(request.body)\nprocess(object)",
    "hint": "Do not instantiate arbitrary classes or invoke behavior from untrusted serialized bytes.",
    "lesson": "Avoid deserializing untrusted data into rich objects. Prefer simple data formats and strict schemas, allowlist expected types, validate input, and isolate any unavoidable legacy parsing."
  }
};
