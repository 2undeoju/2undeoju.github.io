# AI Service Layer — Runnable Prototype

> An auditable, deterministically testable AI service layer: permission-scoped
> retrieval, tool orchestration over the Model Context Protocol (MCP), and a
> groundedness gate that makes every answer cite its source or refuse.

---

## Overview

Every AI application shouldn’t have to reinvent the same infrastructure, security controls
and reliability checks. I built an **AI-as-a-Service Layer** to make AI capabilities 
reusable across applications, so organisations can integrate AI into the tools their teams 
already use, rather than building a separate AI system for every use case.

The prototype was tested in a university scenario using synthetic data, but the 
architecture is **application-agnostic**. The same backend can serve different applications 
through a shared, consistent interface.

The layer exposes five capabilities through one API: **ask, find, plan, recommend and assess**. 
Permissions are decided before the model sees any data, and a groundedness check means every 
answer either cites its source or is refused. The goal is simple: make AI easier to integrate, 
safer to use, and more consistent to maintain across an organisation.

### The problem

When an organisation builds AI features across several departments or
applications, each team rebuilds the same plumbing and inherits the same three
risks:

* **Inconsistent access control.** Documents or personal records leak across
  authorisation boundaries, usually through a post-filter someone forgot.
* **Ungrounded answers.** The model states a number no system produced, and
  nothing in the pipeline stops it.
* **Unverifiable behaviour.** Open-ended model loops make a production incident
  impossible to reproduce, so nobody can say afterwards why the system did what
  it did.

Five applications means five chances to get each of those wrong, in five
different ways.

### What was built

A single AI service layer where every downstream application is just another
scoped client of one capability engine:

1. **Capability API.** One contract, five verbs — `ask`, `find`, `plan`,
   `recommend`, `assess` — for every client, now and later.
2. **Policy gate and context resolver.** Identity, purpose binding and a verb
   allow-list decide which of five context scopes (user, project, programme,
   university, global) a request may reach. One token budget is then allocated
   across exactly those scopes.
3. **Permission-first retrieval.** The access-control predicate sits *inside*
   the SQL, so denied rows are never fetched and there is no post-filter to
   forget.
4. **Typed orchestration over MCP.** Steps form a declared graph with
   dependencies, per-step timeouts, a run deadline, a fail-closed policy and a
   tool-call budget. Tools run over an MCP stdio server or in-process, with
   identical results.
5. **Groundedness gate.** Before an answer leaves the layer, every claim must
   carry a citation, every number must come from a tool result, and the text
   must be entailed by the chunk it cites. Unsupported answers are refused, not
   trimmed.
6. **Trace and offline replay.** Each request records a full trace — spans,
   tokens, cost, decisions — and a recorded trace replays to the identical
   answer, which turns an incident into a reproducible test.

The prototype runs on synthetic higher-education data (courses, regulations,
student records). The architecture is application-agnostic; the domain is
simply what it was exercised on.

---

## What was built, created and experimented with

* **Typed step-graph orchestrator (`orchestrator/`).** Open-ended model loops
  replaced by a declared graph: control flow, parallel tool calls, timeouts and
  failure policy are data you can print, diff in review and assert on in a unit
  test.
* **Hybrid retrieval engine (`retrieval/`).** Sparse BM25 and dense vectors
  fused with Reciprocal Rank Fusion (k = 60), then reranked — with the ACL
  compiled into the query rather than applied afterwards.
* **MCP tool transport (`tools/`).** A newline-delimited JSON-RPC MCP server
  over `stdio` (`initialize`, `tools/list`, `tools/call`) isolating the
  deterministic work: credit arithmetic, prerequisite checks, timetable
  clashes, registration windows, eligibility.
* **Evaluation harness (`evals/`).** A golden set with `must-call`,
  `must-cite`, `must-plan` and refusal assertions, exit-coded for CI so a lost
  refusal or a dropped citation fails the build.

---

## Tools, technologies and models

| Layer | Technologies |
|---|---|
| **Core framework and API** | Python 3.11+, FastAPI, Pydantic v2 |
| **Storage and vectors** | SQLite FTS5 (prototype) · PostgreSQL + `pgvector` (production query shape included) |
| **Retrieval and reranking** | BM25 + hashed bag-of-words embedder + RRF (k = 60) + lexical reranker |
| **Tool protocol** | Model Context Protocol over `stdio` (JSON-RPC 2.0) |
| **Model gateway** | Task→tier routing with cost accounting; deterministic `FakeProvider` offline, `LiteLLMProvider` adapter for EU-hosted models |
| **Observability** | Span traces using OpenTelemetry GenAI attribute names; record and replay |
| **Testing and CI** | `pytest` (75 tests, ~1 s), golden-set evals (16 scenarios) |

*On offline determinism:* the model provider and the embedder are deterministic
stand-ins behind the same interfaces the real ones use. Every test run finishes
in about a second with no network, no API key and no cost, and the tests assert
on behaviour rather than on luck.

### What is real, and what stands in

| Piece | What is real | What is a stand-in |
|---|---|---|
| Capability API | five verbs, one contract, status codes carry the decision | — |
| Policy gate | identity, purpose binding, verb allow-list, scope grant, fail-closed | static token table instead of OIDC |
| Context resolver | five scopes, one budget, per-verb allocation, ACL before retrieval | token estimate is `len/4` |
| Retrieval | BM25 + vectors + RRF + rerank, ACL inside the SQL | SQLite instead of Postgres; hashed embedder; lexical reranker |
| Tools | real MCP stdio server, deterministic arithmetic, server-side permission checks | synthetic records |
| Orchestrator | typed graph, parallel waves, timeouts, deadline, budgets, trace, replay | — |
| Groundedness | citation check, numeric check against tool output, entailment, refuse-not-trim | no entailment model or LLM judge |
| Evaluation | golden set, CI exit code | 16 cases |

Each stand-in is one swap away from production: `SqliteStore → PgvectorStore`,
`HashEmbedder →` an EU-hosted embedding model, `LexicalOverlapReranker →` a
multilingual cross-encoder, `FakeProvider → LiteLLMProvider`, token table →
OIDC introspection.

---

## What worked well

1. **A typed graph instead of an open-ended loop.** Control flow became
   something a unit test can assert on — that a step cannot run before its
   dependency, that a required failure halts the run, that an optional one
   degrades and says so.
2. **Permission-first retrieval.** Resolving scopes inside the SQL removed a
   whole class of post-filter leaks: a denied row is never fetched, so there is
   nothing left to scrub.
3. **Refuse, don't trim.** Halting on an uncited number rather than quietly
   dropping it is what makes the rest of the system safe to put in front of a
   real user.
4. **Replayable traces.** Recording every run turned "it behaved oddly once"
   into a reproducible test, debuggable offline months later.
5. **The evaluation set in CI.** A change that turns a refusal into an answer,
   or loses a citation, fails the build instead of reaching a person.

---

## What I would do differently next time

1. **Start from real questions.** The first evaluation set was my own
   hypotheses. Real support logs and historical queries would have produced a
   sharper suite far earlier — an eval set is only as good as the questions in
   it.
2. **Semantic models from day one.** The hashed embedder exercises the plumbing
   but not the meaning. Multilingual embeddings and German-language processing,
   including compound splitting, belong in from the start.
3. **Ingestion against a live source.** Indexing runs over static synthetic
   records. Change-data-capture from an operational database would have exposed
   indexing lag and staleness, which is where real retrieval systems hurt.

---

## Quickstart

```bash
pip install -r requirements.txt

pytest -q                          # 75 tests, ~1 s
python -m ai_layer.evals.run       # golden set: 16 scenarios, pass/fail scorecard
```

### The four-minute demo

```bash
python -m ai_layer.demo                 # 1. one planning request, stage by stage
python -m ai_layer.demo --scenarios     # 2. ten principals: answers, refusals, denials
python -m ai_layer.demo --hallucinate   # 3. the model invents a number, the gate refuses
python -m ai_layer.demo --replay        # 4. the same run, replayed from its own trace
```

### MCP transport

```bash
AI_LAYER_TOOLS=mcp pytest -q           # the same 75 tests, tools over MCP stdio
python -m ai_layer.tools.mcp_server    # the server alone, for any MCP client
```

---

## HTTP API

```bash
uvicorn ai_layer.api:app --reload

curl -s localhost:8000/v1/capabilities/plan \
  -H 'Authorization: Bearer tok-lena' \
  -H 'Content-Type: application/json' \
  -d '{"query":"What should I take next semester?","purpose":"study_planning"}' | jq
```

**Status codes carry the decision**, so a client can act without parsing the body:

* `200 OK` — answered and grounded
* `422 Unprocessable Entity` — refused by the groundedness or relevance gate
* `403 Forbidden` — denied by the policy gate

Every response carries a `trace_id`; `GET /v1/traces/{id}` returns the audit record.

---

## Execution flow

```
Client request
   │
   ▼
 Policy gate ───────────► [denied: 403]
   │
   ▼
 Context resolver (five scopes, one budget)
   │
   ▼
 Hybrid retrieval (BM25 + vectors + RRF, ACL inside the SQL)
   │
   ▼
 Typed orchestrator ────► MCP tools (parallel waves)
   │
   ▼
 Model gateway (task → tier routing, cost accounting)
   │
   ▼
 Groundedness gate ─────► [refused: 422]
   │
   ▼
 Answer with citations + audit trace (200 OK)
```

---

## The rule the design turns on

**Embed what is stable, call what is volatile.** Catalogue, regulations,
research profiles and project descriptions are chunks in the index. Personal
records are never embedded — they are reached through tools at request time,
which is why erasure is a single filtered delete and why a transcript cannot
leak through a vector.

**A scope is a permission boundary and a personalisation boundary at once.**
The gate grants scopes, the resolver spends its budget on exactly those scopes,
and the ACL travels inside the SQL. There is no second system to keep in
agreement, and therefore no gap between them for a leak to live in.

---

## Repository structure

```
ai_layer/
├── contracts.py          # every cross-module type
├── policy.py             # the gate: identity, purpose, scopes
├── context.py            # five scopes, one budget
├── ground.py             # citation, numeric and entailment checks
├── engine.py             # the one entry point; record and replay
├── api.py                # FastAPI surface
├── demo.py               # CLI scenarios and trace timeline
├── retrieval/            # embedder, store (+ pgvector SQL), hybrid search
├── tools/                # academic tools, registry, MCP server and client
├── orchestrator/         # plan, runner, steps, trace
├── gateway/              # routing, cost, fake and LiteLLM providers
├── seed/                 # synthetic catalogue, regulations, records
└── evals/                # golden set and scorecard
tests/                    # 75 tests
```

`ARCHITECTURE.md` maps each design claim to the file that implements it and the
test that holds it.

---

## See it run

## Three rules, each enforced by a test

| Rule | What it means | Test |
|---|---|---|
| Permission before retrieval | Data a user may not see is never fetched. | `test_another_programme_is_never_retrieved` |
| Cite or refuse | If the answer contains a number no tool produced, it is refused. | `test_an_invented_number_is_refused_not_trimmed` |
| Tested like software | A golden set of 16 cases runs in CI and blocks a release that breaks it. | `test_the_whole_golden_set_passes` |

The prototype runs fully offline: the AI model and the embedder are deterministic
stand-ins, so the same request always gives the same result.

**A student asks what to take next semester.** Every stage is timed and costed:

```
$ python -m ai_layer.demo
trace 3482b6e05cd146e9 · plan · s-1001 · 4.9 ms · €0.003369 · answered
⛔  policy_gate                   0.01ms |█                                             |
▸  classify                      0.06ms |█                                             |
◆  classify_intent               0.04ms |█                                             |
▸  resolve_context               2.68ms |    █████████████████████████                 |
⌕  retrieve                      2.63ms |    ████████████████████████                  |
▸  tool_balance                  0.08ms |                                █             |
⚙  ects_balance                  0.06ms |                                █             |
▸  tool_catalogue                0.08ms |                                 █            |
⚙  catalogue_lookup              0.05ms |                                 █            |
▸  tool_window                   0.03ms |                                  █           |
⚙  registration_window           0.02ms |                                  █           |
▸  candidates                    0.06ms |                                   █          |
▸  choose_courses                0.06ms |                                    █         |
⚙  check_prerequisites           0.04ms |                                    █         |
▸  confirm_eligibility           0.08ms |                                    █         |
⚙  eligibility                   0.06ms |                                     █        |
▸  synthesize                    0.11ms |                                     █        |
◆  synthesize_long               0.04ms |                                      █       |
▸  groundedness                  0.76ms |                                      ███████ |
⛔  groundedness                  0.74ms |                                      ██████  |

status      : answered
answer      : You have 24 ECTS passed and 96 remaining of 120. For 2026W you can register
              DE110 (Wissenschaftliches Arbeiten, 3 ECTS), ETH150 (Ethics and Regulation of
              AI, 3 ECTS), AI310 (Federated and Privacy-Preserving Learning, 6 ECTS), AI330
              (Reinforcement Learning, 6 ECTS), HCI220 (Human-Centred AI Systems, 3 ECTS) —
              21 ECTS in total. AI320 is not in the list: clashes with AI310 in slot WED-13.
              …
citations   : course:DE110, reg:reg-overload
tool calls  : ects_balance, catalogue_lookup, registration_window, check_prerequisites, eligibility
context     : 697 tokens · model fake:frontier-eu (frontier) · €0.003369 · 5 ms
```

**Different users, different answers.** Other students' data is refused, and the public
cannot use student features:

```
$ python -m ai_layer.demo --scenarios
principal   verb      status    outcome
----------------------------------------------------------------------------------------------------
tok-lena    plan      answered  What should I take next semester?        You have 24 ECTS passed and 96 remaining of 120. For 2026W you c
tok-tomas   plan      answered  What should I take next semester?        You have 6 ECTS passed and 114 remaining of 120. For 2026W you c
tok-lena    ask       answered  When does registration close?            Registration windows — Course registration for the winter term 2
tok-lena    ask       answered  Who works on federated learning here?    Prof. Lindner — privacy-preserving ML — Group works on federated
tok-lena    ask       refused   Why did Lena get a higher grade than m   nothing in scope answers this question (best match 0.00 < 0.34)
tok-lena    ask       answered  Wie reiche ich eine Studienplanänderun   Studienplanänderung — Eine Studienplanänderung muss vor Ende der
tok-sara    ask       refused   Tell me about the deep learning course   nothing in scope answers this question (best match 0.25 < 0.34)
tok-public  ask       answered  What programmes do you offer?            About the university — The university is an interdisciplinary in
tok-public  plan      denied    Plan my semester                         role public may not use the plan capability
tok-nobody  ask       denied    Anything at all                          unknown or missing token
```

**The model invents a number.** The groundedness check catches it and refuses the whole
answer:

```
$ python -m ai_layer.demo --hallucinate
▸  groundedness                  0.46ms |                                         ████ |
⛔! groundedness                  0.45ms |                                         ████ |
     └─ a computed claim was not backed by a tool result

status      : refused
refused     : a computed claim was not backed by a tool result
citations   : —
tool calls  : ects_balance, catalogue_lookup, registration_window, check_prerequisites, eligibility
context     : 697 tokens · model fake:frontier-eu (frontier) · €0.003579 · 5 ms
```

**The golden set,** which runs in CI:

```
$ python -m ai_layer.evals.run
case                   expect    got       result
--------------------------------------------------------------------------------------------
plan-lena              answered  answered  pass
plan-tomas             answered  answered  pass
ask-window             answered  answered  pass
ask-overload           answered  answered  pass
ask-research           answered  answered  pass
ask-german             answered  answered  pass
ask-other-student      refused   refused   pass
ask-absent             refused   refused   pass
ask-wrong-programme    refused   refused   pass
public-about           answered  answered  pass
public-plan            denied    denied    pass
public-personal        refused   refused   pass
no-token               denied    denied    pass
wrong-purpose          denied    denied    pass
staff-plan             denied    denied    pass
find-privacy           answered  answered  pass
--------------------------------------------------------------------------------------------
16/16 passed · refusals 4/4 · p50 3.0 ms · €0.000443 per request

## What this prototype does not prove

* **Retrieval quality.** A hashed embedder and a lexical reranker exercise the
  plumbing, not the semantics. Recall against a real corpus needs real models,
  including German decompounding.
* **Latency and cost at load.** Everything runs in milliseconds because the
  model is a stand-in. Trust the token counts and the routing decisions, not
  the wall clock.
* **The data platform.** Ingestion is a corpus builder over synthetic records.
  What a real source system exposes is the dependency that would most change
  the ingestion design.
