# North Incident Response

Status: pre-launch operating procedure

Owner: Dru, acting as Incident Commander until a named delegate is recorded

This procedure covers security, privacy, availability, data-integrity, health/safety, and operational incidents affecting North. It is an operating baseline, not legal advice. Applicable notification duties and deadlines must be confirmed with qualified counsel for the operating entity, affected people, data, and territories.

## Activation

Open an incident immediately when any of the following is suspected:

- unauthorized account, admin, database, infrastructure, provider, or backup access;
- disclosure or suspected compromise of a password, recovery code, API key, signing key, database credential, webhook, or backup key;
- cross-account data access, missing authorization, private-data exposure, or incorrect account deletion/export;
- loss, corruption, duplication, silent replacement, or material delay of member records;
- malicious use, injection, account takeover, denial of service, or sustained abuse;
- a production outage, failed migration, failed restore, expired certificate, exhausted storage, or monitoring/backup failure;
- unsafe health, exercise, or Nova behavior with credible risk of harm;
- a provider or subprocessor incident that may affect North data or availability.

Anyone handling North may declare an incident. Uncertainty is not a reason to wait.

## Roles

One person may hold several roles during the controlled launch, but each role must be explicitly assigned in the incident record.

| Role | Initial owner | Responsibility |
|---|---|---|
| Incident Commander | Dru | Declares severity, coordinates work, approves recovery, and closes the incident |
| Technical Lead | Assigned at declaration | Containment, investigation, remediation, recovery, and technical timeline |
| Privacy/Legal Lead | Qualified adviser to be named before launch | Determines legal duties, regulator/member notices, preservation, and privilege requirements |
| Communications Lead | Dru until delegated | Member, support, provider, and public updates |
| Recorder | Assigned at declaration | Maintains the timestamped incident log, decisions, evidence index, and follow-up actions |

Production provider contacts, insurer contacts, legal contacts, and an alternate Incident Commander must be stored in the operator password manager or private operations register before launch. Do not place private credentials or personal contact details in this repository.

## Severity

Use the highest applicable severity. The Incident Commander may raise or lower it as evidence changes.

### P0 - Critical

- confirmed active compromise of production, admin, signing, database, or backup systems;
- confirmed cross-account or large-scale sensitive-data disclosure;
- destructive data loss with no proven recovery path;
- credible product behavior creating an immediate risk of serious harm;
- complete production outage with no safe workaround during active use.

Response: begin immediately, stop risky processing or traffic, notify the owner and required specialists, and maintain a continuous incident log until contained.

### P1 - High

- likely credential compromise without confirmed misuse;
- limited unauthorized data access or account takeover;
- material corruption, sync failure, deletion failure, or prolonged outage;
- repeated unsafe guidance or a security control failure with a practical exploit path.

Response: begin immediately and establish containment, scope, ownership, and the next update time before normal product work resumes.

### P2 - Medium

- contained operational degradation, isolated data-integrity defect, provider failure, or suspicious activity without evidence of sensitive-data access;
- backup, restore-test, monitoring, certificate, disk, or scheduled-job failure that does not yet threaten service continuity.

Response: assign an owner the same working day, contain escalation risk, and define a correction deadline.

### P3 - Low

- low-impact policy, logging, configuration, or resilience defect with no current evidence of exploitation, exposure, data loss, or material service impact.

Response: record, prioritize, and fix through normal tracked work. Raise severity if scope or exploitability changes.

## First response

For P0 and P1 incidents:

1. Create a private incident record with a unique ID, UTC declaration time, reporter, Incident Commander, severity, affected systems, and the facts known so far.
2. Preserve volatile facts before changing systems: alert payloads, request IDs, process state, deployment version, migration version, active sessions, provider status, and relevant log locations.
3. Contain the smallest safe scope. Options include maintenance mode, disabling registration, Nova, Together sends, or Push delivery, revoking sessions or Push subscriptions, rotating a credential, blocking an endpoint, isolating a host, pausing health imports, or rolling back a release.
4. Do not delete logs, rebuild a compromised host in place, contact a suspected attacker, or make public attribution before evidence and legal needs are understood.
5. Set the next internal update time and identify who can authorize downtime, data restoration, member communication, and external support.

Safety takes priority over uptime. If North cannot preserve account isolation, record integrity, or safe health boundaries, remove the affected capability from service.

## Credential compromise

When a credential is exposed or suspected exposed:

1. Revoke or disable it at the issuing provider; editing or deleting the local file is not revocation.
2. Determine where it could have appeared: workstation, shell history, chat, repository history, CI logs, build output, deployment files, backups, monitoring, or provider logs.
3. Review provider usage and access logs from before the earliest possible exposure through rotation.
4. Create a replacement using the provider's current recommended strength and scope.
5. Store it only in the protected server environment or operator secret store with least privilege.
6. Restart only the services that need the replacement and verify behavior without printing the value.
7. Record the credential type, affected system, exposure window, revoke time, replacement time, reviewer, and evidence. Never record the secret itself.

## Investigation and evidence

Maintain an append-only UTC timeline containing observations, commands or actions, people involved, decisions, and outcomes. Separate confirmed facts from hypotheses.

Preserve only evidence relevant to the incident:

- deployment artifact or commit, configuration version, migrations, and service state;
- request IDs and privacy-limited API, authentication, rate-limit, audit, job, database, proxy, and system logs;
- provider incident notices and access/usage records;
- affected account IDs, record IDs, timestamps, and hashes where practical;
- backup identifiers and restore-verification results;
- screenshots or exports required to explain member-visible behavior.

Do not copy workout notes, Nova or Together conversations, shared photos, health details, credentials, recovery codes, or complete database rows into tickets or chat unless strictly required and handled in an approved private evidence location. A Together safety report permits review only of the context deliberately submitted with that report. Record access to the evidence, preserve originals, and work from copies when possible.

## Privacy and breach assessment

The Privacy/Legal Lead must assess and record:

- what happened and whether confidentiality, integrity, or availability was affected;
- categories and approximate number of people and records affected;
- sensitivity, identifiability, encryption, account isolation, and likelihood of misuse;
- whether data was accessed, acquired, altered, deleted, made unavailable, or merely at risk;
- affected processors, systems, countries, and launch territories;
- containment already achieved and residual risk;
- contractual, insurer, law-enforcement, regulator, and member-notification duties and deadlines.

Start this assessment when a breach is suspected; do not wait for complete certainty. Preserve the time North first became aware. Qualified counsel must determine applicable legal notices. North must not promise a universal notification deadline before entity and territory requirements are confirmed.

## Communication

Communications must be accurate, useful, accessible, and updated when facts change.

### Internal update

Include incident ID, severity, current member impact, affected systems, known data impact, containment state, current owner, decisions needed, and next update time. Never include secrets.

### Member or public update

When communication is appropriate, state:

- what North knows happened and when;
- what functions or data are affected;
- what North has done to contain and recover;
- what the member should do now, if anything;
- what remains unknown;
- when the next update will be provided;
- the verified support/privacy contact route.

Do not speculate, minimize, assign blame, claim there is no risk without evidence, or describe a service as restored before verification. Legal review is required for breach notices and any communication that could affect member rights.

For credible immediate health or safety risk, disable the affected guidance and direct members to appropriate emergency or qualified professional help using the approved product language. North is not an emergency service.

## Recovery

Recovery requires evidence, not only a healthy process status.

1. Remove or remediate the root cause and close the original access path.
2. Rotate affected credentials and revoke affected sessions or devices.
3. Verify migrations, database integrity, account isolation, logs, storage, certificates, backups, and monitoring.
4. Restore from an encrypted backup only after identifying the safe restore point and preserving current evidence.
5. Run the relevant unit, integration, browser, live-contract, security, sync, deletion, and recovery checks against the exact recovery artifact.
6. Compare critical member records before and after recovery and preserve conflicts rather than silently choosing a winner.
7. Return traffic or capability gradually where possible and monitor errors, latency, auth denials, rate limits, conflicts, provider use, and support reports.
8. The Incident Commander records the recovery decision, evidence reviewed, accepted residual risk, rollback point, and next update.

Use `deploy/verify-north-restore.sh` for isolated database restore verification and follow `deploy/BACKUPS.md` for backup handling. A successful restore test does not by itself prove application-level record correctness.

## Closure and follow-up

An incident may close only when containment is stable, recovery is verified, required communications are complete or scheduled, evidence is secured, and every follow-up has an owner and due date.

Within five working days of P0/P1 containment, or as soon as legal constraints allow, record a blameless review covering:

- impact and duration;
- detection source and missed detection opportunities;
- root cause and contributing conditions;
- complete UTC timeline;
- containment and recovery effectiveness;
- data and notification assessment;
- controls that worked or failed;
- corrective actions, owner, priority, due date, and verification method.

Update this procedure, monitoring, tests, product controls, and launch checklist when the review exposes a gap.

## Exercise before launch

Run and record at least one tabletop exercise before public launch. Use a scenario combining a leaked provider key, suspicious Nova usage, and uncertainty about whether member conversations were accessed.

The exercise record must include:

- date and participants;
- assigned roles and contact-route test;
- declaration and escalation times;
- containment and rotation decisions;
- evidence requested and where it would be preserved;
- privacy/breach assessment questions;
- draft internal and member updates;
- recovery and reopen criteria;
- gaps, action owners, due dates, and a scheduled retest.

Do not mark the launch rehearsal complete because this document exists. The procedure must be exercised using the real provider, hosting, monitoring, backup, support, legal, and contact arrangements intended for launch.