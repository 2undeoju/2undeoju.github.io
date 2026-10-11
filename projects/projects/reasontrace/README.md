## Overview

ReasonTrace is a LangChain + FastAPI service that grades **how a student
reasoned**, not just their final answer. Given a problem, a student's
step-by-step reasoning trace, and their final answer, it scores four
dimensions, coherence, originality, depth, and integrity, and explains
exactly where the thinking is strong or where it breaks down.

## Motivation

Most grading, human or automated, checks one thing: is the final answer
correct. That misses a lot, two students can land on the same right
answer through very different quality of thinking, and a final-answer-only
grader can't tell them apart. It also misses the biggest shift happening
in higher education right now: as AI makes a polished final answer
trivial to produce, institutions are moving assessment away from checking
outputs and toward checking process. ReasonTrace grades the process.

## What I did

- Designed four independent LangChain prompt chains (coherence,
  originality, depth, integrity), each scoring a reasoning trace 0–100
  with structured feedback, sharing one evaluation engine and one response
  parser rather than duplicating LLM plumbing across files.
- Built a **heuristic fallback mode** so the API is fully functional with
  zero cost and zero setup: deterministic, explainable proxies (vocabulary
  overlap between steps, lexical diversity, justification-language
  detection, step-length uniformity) stand in when no API key is present,
  and every response says plainly which mode produced it.
- Wired the four evaluations to run **concurrently** via `asyncio.gather`
  rather than sequentially, and added an aggregate score plus automatic
  flags for low coherence or low integrity.
- Deliberately scoped the integrity dimension as a plausibility signal,
  not an AI-authorship detector, and said so explicitly in both the prompt
  and the code, given how unreliable AI detectors actually are.

## Results

Run against three deliberately contrasting example traces (same problem,
same final answer, different quality of reasoning):

```
Weak       ("Use the formula." / "Do the division." / "Get the answer.")   → 22/100
Suspicious (five uniform, templated-looking steps)                        → 48/100, flagged
Strong     (fully worked, each step justified)                            → 71/100, no flags
```

The tool reliably separates the three without ever calling an external
API, verified end-to-end in heuristic mode.

## Tech stack

`Python` · `FastAPI` · `Pydantic v2` · `LangChain` (`langchain-core`,
`langchain-openai`) · `python-dotenv`

## Links

- Code repository — https://github.com/2undeoju/reasontrace
