## Overview

A **content-based music recommender** that finds similar songs by comparing what they
*are*, rather than who listened to them. Each of the roughly **10,000 songs** in the
catalogue is described in three modalities:

- **Text:** the song's lyrics
- **Audio:** features extracted from the recording
- **Video:** features extracted from the music video

A user picks a song, chooses a similarity method, and gets the most similar songs back,
with their music videos playable in the browser.

The project goes beyond the model. The recommender is packaged as two services, each in
its own container, deployed on **Kubernetes with Helm**, with health checks,
resource limits and request metrics: the shape of a system that could run in
production, not a notebook.

## Architecture

```
User
  │
  ▼
Frontend (Streamlit)        search, pick a method, watch the results
  │  REST / JSON
  ▼
Backend (FastAPI)           /search  /suggest  /recommend  /health  /metrics
  │
  ▼
Recommender engine          one feature set per modality, cosine similarity,
  │                         parallelised with Ray
  ▼
Feature store (TSV)         lyrics, audio and video features, metadata, genres
```

Both services run as separate Kubernetes deployments, so the frontend can be scaled or
redeployed without touching the recommender, and the backend can later serve other
clients through the same API.

## Similarity methods

Each method answers "which songs are closest to this one?" using a different view of
the song.

| Modality | Method | What it compares |
|---|---|---|
| Text | TF-IDF | Word importance in the lyrics |
| Text | Jaccard | Overlap of lyric vocabulary |
| Text | Word2Vec | Averaged word embeddings of the lyrics |
| Text | BERT | Contextual embeddings of the lyrics |
| Audio | MFCC bag-of-words | Timbre: how the recording sounds |
| Audio | i-vectors (256) | A compact summary of the audio signal |
| Audio | BLF spectral | Spectral patterns in the music |
| Audio | MusicNN | Features from a neural network trained on music |
| Video | Inception, ResNet, VGG19 | Visual features from the music video, from three CNNs |
| Fusion | Early fusion | Combines TF-IDF and Word2Vec vectors, reduced to 300 dimensions with PCA |
| Fusion | Late fusion | Adds the TF-IDF and Word2Vec similarity scores |
| Baseline | Random | A reference point for judging the other methods |

## How a request works

1. **Find the song.** The user types an artist and title. Search tries an exact match,
   then a partial match, then fuzzy matching, so small typos still find the song.
   `/suggest` offers matches while the user types.
2. **Score the catalogue.** `/recommend` takes the song and the chosen method, and
   computes cosine similarity between that song and every other song in the catalogue.
3. **Parallelise.** With Ray enabled, the similarity work is spread across CPU cores.
   Without Ray, the same code runs sequentially, so the service works either way.
4. **Return the top results** with artist, title, album, similarity score and the video
   link, which the frontend plays inline.

## Deployment

- **Two Docker images**, one for the FastAPI backend and one for the Streamlit frontend,
  built on a slim Python base.
- **A Helm chart** describes both services. Image names, replica counts, ports, Ray
  settings and resource limits all live in one `values.yaml`, so a deployment can be
  changed without editing the manifests.
- **Three health probes on the backend.** The service loads every feature set into
  memory at start-up, which takes time:
  - a *startup probe* gives the backend up to about six minutes to load before
    Kubernetes considers it failed;
  - a *readiness probe* only sends traffic once the data is loaded;
  - a *liveness probe* restarts the container if it stops responding.
- **Resource requests and limits.** The backend requests 2 GiB of memory and half a CPU,
  and may grow to 6 GiB and two CPUs. Sizing these correctly was what stopped the pods
  from being killed for running out of memory while loading the feature files.
- **Monitoring.** The API exposes Prometheus metrics (request counts and latency) at
  `/metrics`.
- **Local cluster.** Developed and run on Docker Desktop and Minikube, on both Windows
  and macOS, with the dataset mounted into the pod from the host.

## Engineering challenges

- **Out-of-memory restarts.** Loading every feature set at once pushed the backend past
  its first memory limit, and Kubernetes killed the pod (`OOMKilled`). Raising the limit
  and setting a matching request fixed it.
- **Slow start-up versus health checks.** Kubernetes restarted the backend before it had
  finished loading. A dedicated startup probe, separate from the liveness probe, solved
  it.
- **Local images in Kubernetes.** The cluster kept trying to download images that only
  existed locally. Setting the Helm chart's image pull policy fixed the deployment.
- **Large data in containers.** The feature files are too large to bake into an image
  comfortably, so they are mounted into the pod from the host instead.

## What I would add next

- **Evaluation.** Measure each method against genre overlap (precision at 10), so the
  methods can be compared with numbers, not by listening.
- **Cross-modal fusion.** The fusion methods currently combine two lyrics
  representations. Fusing lyrics, audio and video is the natural next step.
- **Faster retrieval.** Scoring the whole catalogue on every request is fine for 10,000
  songs. A vector index (FAISS or pgvector) would keep it fast at larger scale.

## Tech stack

`Python` · `FastAPI` · `Streamlit` · `Ray` · `scikit-learn` · `pandas` · `NumPy` · `Docker` · `Kubernetes` · `Helm` · `Prometheus`

## Links

- Code repository — https://github.com/2undeoju/Production-Multimodal-Retrieval-Recommender-System
