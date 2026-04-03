# 1. Overview

`bkn-creator` is the full lifecycle manager for KWeaver BKN (**Business Knowledge Network**). As a workflow orchestrator, it is responsible for user-intent recognition, process routing, stage-gate control, sub-skill orchestration, and result acknowledgement.

### Core Positioning

- Role: workflow orchestrator and lifecycle manager
- Coverage: create, read, update, delete (`CRUD`) and extract
- Execution mode: progressive execution; all write operations require user confirmation

### Applicable Scenarios

<sheet token="Fsv1siAiJhDf9Pt8JficbDz3n1f_oBaE1Z"/>

---

## 2. Process Routing System

`bkn-creator` uses a two-layer routing architecture.

### Layer 1: Process Routing Identification

The system routes to the corresponding subprocess based on user-intent keywords:

<sheet token="Fsv1siAiJhDf9Pt8JficbDz3n1f_cygxIX"/>

Important: before process-routing confirmation is completed, no subprocess may enter staged execution.

### Layer 2: Progressive Execution Protocol

All CRUD flows follow the same six-stage sequence:

```plaintext
discover -> preview -> confirm -> execute -> verify -> report
```

- `discover`: identify the target and context
- `preview`: show what will be executed, including scope of impact and diff
- `confirm`: wait for explicit confirmation
- `execute`: delegate execution to sub-skills
- `verify`: validate result completeness
- `report`: return the outcome and next-step suggestions to the user

---

## 3. Details of the Five Major Subprocesses

### Create Flow (`FLOW_CREATE`)

Generate a deployable BKN from business input, then complete binding, publishing, and validation.

Five-stage structure:

<sheet token="Fsv1siAiJhDf9Pt8JficbDz3n1f_pY7Auf"/>

Key characteristics:

- Supports three input paths: structured documents (`A`), partial information (`B`), and delegated modeling advisors (`C`)
- Default primary perspective: object-property-view mapping. The `ER` perspective is used only as a supplement for complex relationship scenarios.
- Strict stage-four state machine: binding evidence -> binding decision -> property backfill -> mapping gate -> difference confirmation -> stage confirmation

### Extract Flow (`FLOW_EXTRACT_TYPES`)

Extract candidate object classes and relationship classes from business descriptions or documents.

Process characteristics:

- Domain identification is performed first based on the scoring mechanism in `DOMAIN_ROUTING.md`
- Supports three domains: `supply_chain`, `crm_sales`, and `project_delivery`
- Falls back to the generic extraction flow when no domain is matched
- Output groups: `explicit_objects`, `inferred_objects`, `pending_objects`, and `rejected_candidates`
- Pending objects must be processed and decided first

### Read Flow (`FLOW_READ`)

Locate and display the knowledge network or its object and relationship structures without performing write operations.

Query capabilities:

- Fuzzy search by name keyword
- Exact search by `ID`
- Network-level, object-level, and relationship-level structure display

### Update Flow (`FLOW_UPDATE`)

Execute traceable changes without damaging the integrity of the existing network.

Execution strategy:

- Small-scope changes: object-level or relationship-level updates
- Structural changes: regenerate a draft, validate it, then publish it
- Scope of impact and diff must be shown before the update

### Delete Flow (`FLOW_DELETE`)

Safely execute deletion operations with full visibility into the impact.

Deletion types:

- Delete the entire network
- Delete part of the network, such as object classes or relationship classes

---

## 4. Domain Identification Mechanism

Domain routing is based on a scoring mechanism:

<sheet token="Fsv1siAiJhDf9Pt8JficbDz3n1f_OIlP09"/>

Decision rules:

- High-confidence match: normalized score `>= 20` and lead `>= 8`
- Candidate conflict: normalized score `>= 12` and score gap `< 8`
- No match: use the generic extraction flow

---

## 5. Sub-skill Collaboration System

`bkn-creator` never executes CLI commands directly. All execution is delegated to sub-skills:

<sheet token="Fsv1siAiJhDf9Pt8JficbDz3n1f_MH795a"/>

---

## 6. Gating and Confirmation Mechanism

### Explicit Confirmation Rules

The following responses are treated as passing the gate:

- `Confirm`
- `Confirm this perspective`
- `Continue with this perspective`
- `Confirm the list`
- `Proceed to the next stage`

The following responses are never treated as confirmation:

- `Take a look`
- `Let's keep it like this for now`
- `Go on`
- `Mm-hmm`
- Any question that contains `?`

### Key Gate Points

<sheet token="Fsv1siAiJhDf9Pt8JficbDz3n1f_qDQyM5"/>

---

## 7. Output Specification

### User Response Template

Standard format:

```plaintext
### <Title> (<Stage> | <Type>)
Description:
- <Key point 1>
- <Key point 2>
Next step: <Action or confirmation item>
```

### Display Strategy

- By default, output summaries only: quantity, status, risk, and next steps
- Only one primary display format is allowed in the same round
- Detailed output such as tables or YAML/JSON is provided only when explicitly requested by the user

### Field Display Dictionary

<sheet token="Fsv1siAiJhDf9Pt8JficbDz3n1f_JhxhFB"/>

---

## 8. Typical Usage Scenarios

### Scenario 1: Create a Knowledge Network

User: `Create a knowledge network based on this PRD`

Execution flow:

1. The process is routed to create and waits for confirmation.
2. Enter `FLOW_CREATE` and clarify modeling intent, including perspective confirmation and list confirmation.
3. Generate the BKN draft, validate it, and wait for the user to confirm the draft.
4. Perform environment checks and connectivity confirmation.
5. Bind data views, backfill properties, clear the completeness gate, and wait for the user to confirm the result.
6. Publish the network and generate an HTML report.

### Scenario 2: Extract Object Classes

User: `Extract object classes and relationship classes from this document`

Execution flow:

1. The process is routed to extract and waits for confirmation.
2. Perform domain identification based on the scoring mechanism and confirm the primary domain.
3. Execute extraction and validate naming and grouping.
4. Process pending objects and output a structured list.

### Scenario 3: Update a Knowledge Network

User: `Add a new property to object class X`

Execution flow:

1. The process is routed to update and waits for confirmation.
2. Locate the target and display the change diff and scope of impact.
3. After the user confirms the update, execute it.
4. Validate reference integrity and return the result.

---

## 9. File Structure

```plaintext
skills/bkn-creator/
├── SKILL.md                  # Main control file (process routing + top-level constraints)
├── COMMON_RULES.md           # Common gates and constraints
├── FLOW_CREATE.md            # Create flow
├── FLOW_READ.md              # Read flow
├── FLOW_UPDATE.md            # Update flow
├── FLOW_DELETE.md            # Delete flow
├── FLOW_EXTRACT_TYPES.md     # Extract flow
└── references/
    ├── DOMAIN_ROUTING.md     # Domain-identification routing table
    ├── common/
    │   └── generic_extraction.md  # Generic extraction rules
    ├── supply_chain/
    │   └── domain_supply_chain.md # Supply-chain domain knowledge
    ├── crm_sales/
    │   └── domain_crm_sales.md    # CRM and sales domain knowledge
    ├── project_delivery/
    │   └── domain_project_delivery.md # Project-delivery domain knowledge
    ├── bkn_report_template.html   # HTML report template
    └── trigger-test-set.jsonl     # Trigger-word test set
```

---

## 10. Summary

`bkn-creator` is a rigorously designed orchestrator with the following core strengths:

1. Progressive execution: every stage has clear goals and exit conditions, which prevents steps from being skipped.
2. Strict gating: all write operations require explicit user confirmation.
3. Domain intelligence: domain identification is based on a scoring mechanism and supports the three vertical domains of supply chain, CRM, and project delivery.
4. Clear separation of responsibilities: the orchestrator does not execute commands directly. All CLI commands are delegated to `kweaver-core`.
5. User-friendly output: uses a unified response template, summary-first display, and de-jargonized internal terminology.

If you need to use this skill, simply provide a business document or description and proceed step by step according to the confirmation prompts.
