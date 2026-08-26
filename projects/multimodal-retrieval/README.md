## Overview

A production-style **multimodal retrieval system** covering text, audio, and video —
built and deployed as a Kubernetes retrieval pipeline that combines LLM embeddings with
Retrieval-Augmented Generation (RAG).

> Replace this paragraph with what the system actually does end-to-end: what a user
> queries, what gets retrieved, and how the answer is generated/returned.

## Architecture

Describe the pipeline stages, e.g.:

1. **Ingestion** — how text/audio/video get embedded and indexed
2. **Retrieval** — vector store, index type, ranking approach
3. **Generation** — how the LLM combines retrieved context into a response
4. **Serving** — how it's containerised and deployed on Kubernetes (services, scaling, etc.)

```
[ client ] → [ API / FastAPI ] → [ retriever ] → [ vector DB ]
                                 ↘ [ LLM ] → [ response ]
```

Feel free to replace the diagram above with a real architecture image:
`![Architecture](media/architecture.png)`

## Live demo

This project has a **Live Demo** button on its project page (top of this page), wired to
an `<iframe>` in `index.html`. To use it:

1. Deploy your frontend somewhere public (Vercel, Netlify, a GitHub Pages subproject, etc.)
2. Open `index.html` for this project and replace `https://your-deployed-demo-url` with
   your real URL.
3. If the target site blocks being embedded in an iframe (many do, via
   `X-Frame-Options`), just keep the "Live Demo" button linking out instead — remove the
   `<iframe>` block and leave the button.

## Screenshots / Video

```markdown
![Retrieval UI](media/ui-screenshot.png)
<video controls src="media/demo.mp4" style="max-width:100%"></video>
```

## Tech stack

`Kubernetes` · `RAG` · `LLM embeddings` · `Python` · (add your vector DB, framework, etc.)

## Links

- Code repository — https://github.com/2undeoju/Production-Multimodal-Retrieval-Recommender-System
- Live demo — add your deployed URL here too, for anyone reading the raw README
