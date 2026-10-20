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

## How it works

Every request passes through the same stages, shown in the walk-through above:

1. **Capability API.** Every app uses the same contract.
2. **Policy gate.** Checks who is asking and why. Unknown users are refused immediately.
3. **Context resolver.** Decides which data this user may see.
4. **Retrieval and tools.** Searches documents (keyword and vector search combined) and
   calls tools for live data such as credits and timetables.
5. **Model gateway.** Picks the right model for the task and records the cost.
6. **Groundedness check.** Every claim needs a source and every number must come from a
   tool. Otherwise the answer is refused.

## Three rules, each enforced by a test

| Rule | What it means | Test |
|---|---|---|
| Permission before retrieval | Data a user may not see is never fetched. | `test_another_programme_is_never_retrieved` |
| Cite or refuse | If the answer contains a number no tool produced, it is refused. | `test_an_invented_number_is_refused_not_trimmed` |
| Tested like software | A golden set of 16 cases runs in CI and blocks a release that breaks it. | `test_the_whole_golden_set_passes` |

## See it run

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
```

## Design decisions

- **Store what is stable, fetch what changes.** Course descriptions and regulations are
  indexed. Student records are never stored in the search index; tools read them live.
- **Permissions inside the query.** The access check is part of the database query, not
  a filter applied afterwards.
- **The AI writes, the code decides.** Course choices and credit calculations come from
  deterministic code. The model only writes the sentence.
- **Tools over MCP.** The same tools run in-process or behind an MCP server, with
  permissions checked on the server.

## What is real and what is a stand-in

| Component | In the prototype | In production |
|---|---|---|
| Search | SQLite full-text search, hashed embeddings | PostgreSQL + pgvector, an EU-hosted embedding model |
| AI model | Deterministic stand-in | Routed through LiteLLM |
| Login | Fixed test tokens | The university's single sign-on (OIDC) |
| Data | Synthetic students and courses | The university's data platform |

## Limitations

- Search quality is not measured yet: that needs the real embedding model and real data.
- Speed and cost under load are not measured, because the AI model is a stand-in.

## Tech stack

`Python` · `FastAPI` · `Pydantic` · `SQLite / PostgreSQL` · `Hybrid search (BM25 + vectors)` · `MCP` · `pytest` · `GitHub Actions`
