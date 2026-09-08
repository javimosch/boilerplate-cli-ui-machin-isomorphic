# boilerplate-cli-ui-machin-isomorphic

A starting point for **isomorphic web apps in machin** — a single static native
binary that is a **CLI**, an **HTTP server**, a **JSON API**, and serves its own
**reactive WebAssembly UI**. No Node, no bundler, no `node_modules`; the whole app
(server, client, and shared model) is MFL.


<!-- FLEET-TABLE:BEGIN -->

| Stack | Binary | Cold start | Idle RSS | Specs | SDK |
|-------|--------|-----------:|---------:|:-----:|----:|
| [machin + React 18 CDN](https://github.com/javimosch/boilerplate-cli-ui-machin) | 63 KB | 2 ms | 3.1 MB | 28/28 | ~2 MB |
| **machin isomorphic (wasm UI)** | **76 KB** | **2 ms** | **3.1 MB** | **28/28** | **~2 MB** |
| [Nim + Vue 3](https://github.com/javimosch/boilerplate-cli-ui-nim) | 372 KB | 1 ms | 2.0 MB | 2/21 | ~50 MB |
| [C++ + Vue 3](https://github.com/javimosch/boilerplate-cli-ui-cpp) | 692 KB | 4 ms | 7.4 MB | 28/28 | ~2000 MB |
| [Zig + Vue 3](https://github.com/javimosch/boilerplate-cli-ui-zig) | 971 KB | 1 ms | 2.0 MB | 28/28 | ~50 MB |
| [Rust + vanilla JS](https://github.com/javimosch/boilerplate-cli-ui-rust) | 1003 KB | 1 ms | 2.5 MB | 28/28 | ~800 MB |
| [V + Vue 3](https://github.com/javimosch/boilerplate-cli-ui-v) | 1.2 MB | 2 ms | 2.5 MB | 5/20 | ~5 MB |
| [Crystal + Vue 3](https://github.com/javimosch/boilerplate-cli-ui-crystal) | 3.1 MB | 3 ms | 5.9 MB | 5/20 | ~50 MB |
| [Go + Vue 3 CDN](https://github.com/javimosch/boilerplate-cli-ui-go-v2-vue) | 5.5 MB | 3 ms | 5.8 MB | 28/28 | ~150 MB |
| [Go + React 18 CDN](https://github.com/javimosch/boilerplate-cli-ui-go-v2-react) | 5.5 MB | 4 ms | 5.6 MB | 28/28 | ~150 MB |
| [Dart + Vue 3](https://github.com/javimosch/boilerplate-cli-ui-dart) | 6.3 MB | 6 ms | 7.2 MB | 2/21 | ~400 MB |
| [Deno + vanilla JS](https://github.com/javimosch/boilerplate-cli-ui-deno) | 76.1 MB | 25 ms | 45.0 MB | 28/28 | ~100 MB |
| [Node.js + vanilla JS](https://github.com/javimosch/boilerplate-cli-ui-node) | 122.8 MB | 62 ms | 53.3 MB | 28/28 | ~500 MB |

Not measured in this run (toolchain unavailable): [Python + React CDN](https://github.com/javimosch/boilerplate-cli-ui-python), [.NET 8 + Vue 3](https://github.com/javimosch/boilerplate-cli-ui-dotnet).

*Binary size, cold start (median of 11 `version` runs) and idle RSS measured on Linux-x86_64 on 2026-09-08. **Specs** is the [cli-spec-conformance](https://github.com/javimosch/cli-spec-conformance) score across cli-output-spec, cli-guide-spec and cli-daemon-spec, measured by running each binary — not claimed. Every row builds the same reference app; a row at 28/28 also implements the same agent-first contract, which is what makes its size comparable to the others. Rows below 28/28 have not been converted yet, so read their sizes as a floor. Regenerate with [boilerplate-cli-ui-fleet](https://github.com/javimosch/boilerplate-cli-ui-fleet); never edit this table by hand.*

<!-- FLEET-TABLE:END -->

The example is a live poll: server-rendered for first paint, then **hydrated** by a
wasm client where signals + templating drive surgical DOM updates.

![screenshot](screenshot.png)

## What it demonstrates

| concern | how |
|---|---|
| **CLI** | `flags` framework — `./machin-poll --port 8080`, auto `--help` |
| **SSR** | machweb renders the poll HTML server-side (works with JS off) |
| **single binary serves its own wasm** | `GET /app.wasm` → `ok_wasm(read_file_bytes("app.wasm"))` |
| **JSON API** | `GET /api/results`, `POST /api/vote?o=N` |
| **reactive client** | `reactive` framework — signals, a computed total, templating |
| **isomorphic hydration** | the server's `data-s` spans are *reused* by the client (no re-render) |
| **shared code** | `models.src` (the poll schema) is compiled into **both** server and client |

The single binary is both ends of the wire, in one language.

## Architecture

```
                 ┌── src/models.src ──┐         (shared: options, labels)
                 │                    │
  src/reactive.src ─ src/client.src ──┴─ machin --target wasm ─▶ app.wasm  (the SPA)
                                                                    │ served by ↓
  src/machweb.src ─ src/flags.src ─ src/styles.src ─ src/server.src ┴─ machin ─▶ ./machin-poll
                                                       (web/host.js embedded as host_js)
```

- **`src/models.src`** — the schema (poll options + labels), the one source of
  truth shared by server and client.
- **`src/client.src`** — the reactive UI (wasm). Holds the vote state in machin
  signals; `vote(i)` updates optimistically and asks the host to `POST`.
- **`src/server.src`** — the CLI + machweb routes; holds the authoritative state
  and **SSR-renders** the poll with `data-s` span names that match the client's
  slots, so the client **hydrates** that exact DOM.
- **`web/host.js`** — the generic ~25-line JS host (instantiate wasm, wire the
  reactive runtime's DOM ops, seed from the SSR page, hydrate, forward clicks). It
  is **app-agnostic** — embedded into the binary at build time; adding components
  changes only the MFL.

The hydration contract is just the `data-s` names: the server renders
`<span data-s="opt_0">5</span>`, the client's `slot("opt_0", …)` binds to it. First
paint is server HTML; once the wasm loads it takes over with surgical patches (a
vote repaints only that option's count + the total).

## Build & run

Needs `machin` (**v0.55.0+**) and [`zig`](https://ziglang.org) (the C→wasm compiler).

```sh
./build.sh                 # → ./app.wasm and ./machin-poll
./machin-poll              # serves http://localhost:48096/
./machin-poll --port 8080  # …or another port;  --help for flags
```

## Make it your own

- **A new dynamic value:** add `slot("name", func(){ return str(…) })` to the
  client's `start()` and a matching `<span data-s="name">` in the server's
  `ssr_app()`.
- **A list:** use `list("id", keys, item)` (keyed reconciliation) instead of fixed
  slots — see [machin-web-demo-reactive](https://github.com/javimosch/machin-web-demo-reactive).
- **A route / API:** add a branch in `handle(req)` returning `ok_json(...)` /
  `ok_html(...)`.
- **Shared logic:** put anything both ends need in `models.src`.

> The frameworks under `src/` (`machweb`, `flags`, `reactive`) are vendored from
> [machin/framework](https://github.com/javimosch/machin/tree/main/framework). The
> reactive copy here adds `hydrate` and a value-embedding `slot` (initial paint
> with no flash). See the [web north star](https://github.com/javimosch/machin/blob/main/docs/NORTH-STAR-WEB.md).

## License

MIT
