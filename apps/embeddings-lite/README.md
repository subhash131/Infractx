# all-MiniLM-L6-v2 Embedding Server

An Express.js + TypeScript REST server that serves embeddings from the local **all-MiniLM-L6-v2** model via `@xenova/transformers` (ONNX runtime).

- **Embedding dimension:** 384
- **Default port:** 3000

---

## Setup & Run

```bash
# Install dependencies
npm install

# Build and start (Production)
npm run build
npm start

# Development (tsx)
npm run dev
```

---

## Endpoints

### `GET /health`

Returns model and store status.

### `POST /embed`

Generate embeddings for one or more strings.

- **Body**: `{ "input": "text" }` or `{ "input": ["text1", "text2"] }`

### `POST /store`

Ingest, auto-chunk, and store a document.

- **Body**:
  - `text`: (required) The full document text.
  - `id`: (optional) Unique identifier. Generated automatically (UUID) if missing.
  - `chunk_words`: (optional, default 250)
  - `overlap_words`: (optional, default 50)

### `GET /store`

List all ingested documents.

### `POST /match`

Search for similar chunks in the store.

- **Body**:
  - `query`: (required) The search string.
  - `top_k`: (optional, default 3)
  - `include_context`: (optional, default true)

---

## Model Reorganization

The model assets are located in the `model/` directory, containing the ONNX weights and tokenizer configuration.
