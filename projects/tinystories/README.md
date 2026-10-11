## Overview

How small can a language model be and still write a coherent story? As part of my AI
Practical Work at Johannes Kepler University, I built an evaluation pipeline for the
**TinyStories** line of work from Microsoft Research (Eldan & Li, 2023) and compared
eight models, from **1 million to 1.1 billion parameters**, on story completion, with
GPT-4 as the grader.

## What I built

An end-to-end evaluation pipeline, in four stages:

1. **Prompt testing.** Ran the TinyStories models, GPT-2 small and TinyLlama on story
   beginnings taken from the TinyStories dataset on Hugging Face. TinyLlama ran
   locally through Ollama.
2. **Synthetic data generation.** Generated new stories with GPT-4 Turbo from
   structured instructions: a summary, required story features, a sentence that must
   appear and a list of words to include.
3. **LLM-as-judge grading.** GPT-4, at temperature 0, assesses each completion in
   writing, then scores grammar, creativity and consistency with the story's
   beginning from 0 to 10, and estimates the reader's age group.
4. **N-gram overlap.** A ROUGE-style check with NLTK n-grams, comparing completions with
   the dataset's stories, alongside the model-graded scores.

## Results

Mean GPT-4 scores (0–10) over five story prompts per model. The age group is the most
frequent estimate of who the completion suits (A: 3 or under, B: 4–5, C: 6–7, D: 8–9,
E: 10–12, F: 13–16).

| Model | Parameters | Grammar | Creativity | Consistency | Reader age |
|---|---|---|---|---|---|
| TS-1M | 1M | 6.2 | 5.0 | 4.8 | C |
| TS-3M | 3M | 8.6 | 6.6 | 7.2 | D |
| **TS-8M** | 8M | **10.0** | 7.6 | **10.0** | D |
| TS-1Layer-21M | 21M, one layer | 8.4 | 7.2 | 8.0 | D |
| TS-28M | 28M | **10.0** | 7.6 | 9.6 | D |
| **TS-33M** | 33M | **10.0** | 7.8 | **10.0** | D |
| GPT-2 small | 124M | **10.0** | 1.0 | 1.0 | B |
| TinyLlama | 1.1B | 8.8 | **8.0** | 7.8 | E / F |

**The finding:** an 8M-parameter model trained on child-level stories scored higher than
a 1.1B-parameter general model on grammar and consistency, at under 1% of its size.
Above 8M parameters, the TinyStories models barely improve. GPT-2 small shows the other
side: perfect grammar, but completions that ignore the story they were given. The
one-layer 21M model is less consistent than the 8M model despite having more
parameters, so architecture matters as well as size. For a narrow task, data that fits the task mattered more than model size.

## Limitations

- **Small sample.** Five prompts per model. The ranking is clear at the extremes, but
  differences of a point or less between the stronger models are not reliable.
- **One judge.** GPT-4 is the only grader, with no human comparison and no repeated
  grading to measure its variance.

## Tech stack

`Python` · `Hugging Face Transformers & Datasets` · `llama.cpp` · `Ollama` · `OpenAI API` · `NLTK` · `pandas` · `matplotlib`

## Links

- Code repository — https://github.com/2undeoju/TinyStories-Small-Language-Models-Big-Potential
- TinyStories paper (Microsoft Research) — https://arxiv.org/abs/2305.07759
