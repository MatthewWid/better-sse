# Better SSE

<p>
    <a href="https://www.npmjs.com/package/better-sse">
        <img src="https://img.shields.io/npm/v/better-sse?color=blue&style=flat-square" alt="npm" />
    </a>
    <a href="https://jsr.io/@mwid/better-sse">
        <img src="https://jsr.io/badges/@mwid/better-sse" alt="jsr" />
    </a>
    <a href="https://github.com/MatthewWid/better-sse/blob/master/LICENSE">
        <img src="https://img.shields.io/npm/l/better-sse?color=green&style=flat-square" alt="MIT license" />
    </a>
	<img src="https://img.shields.io/npm/dt/better-sse?color=grey&style=flat-square" alt="Downloads" />
	<a href="https://github.com/MatthewWid/better-sse">
        <img src="https://img.shields.io/github/stars/MatthewWid/better-sse?style=social" alt="GitHub stars" />
    </a>
</p>

A dead simple, dependency-less, spec-compliant server-sent events implementation written in TypeScript.

This package aims to be the easiest to use, most compliant and most streamlined solution to server-sent events that is framework-agnostic and feature-rich.

Please consider starring the project [on GitHub ⭐](https://github.com/MatthewWid/better-sse).

## Why use Server-sent Events?

Server-sent events (SSE) is a standardised protocol that allows web-servers to push data to clients without the need for alternative mechanisms such as pinging, long-polling or [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API).

Using SSE can allow for significant savings in bandwidth and battery life on portable devices and will work with your existing infrastructure as it operates directly over the HTTP protocol without the need for the connection upgrade that WebSockets require.

Compared to WebSockets it has comparable performance and bandwidth usage, especially over HTTP/2, and natively includes event ID generation and automatic reconnection when clients are disconnected.

Read the [Getting Started](https://matthewwid.github.io/better-sse/guides/getting-started/) guide for more.

* [Comparison: Server-sent Events vs WebSockets vs Polling](https://medium.com/dailyjs/a-comparison-between-websockets-server-sent-events-and-polling-7a27c98cb1e3)
* [WHATWG standards section for server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
* [MDN guide to server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
* [Can I use... Server-sent events](https://caniuse.com/eventsource)

## Highlights

* Compatible with all popular frameworks and runtimes ([Express](https://nodejs.org/api/http.html), [Hono](https://hono.dev/), [Fastify](https://fastify.dev/), [Nest](https://nestjs.com/), [Next.js](https://nextjs.org/), [Bun](https://bun.sh/docs/api/http), [Deno](https://docs.deno.com/runtime/fundamentals/http_server/), [etc.](https://matthewwid.github.io/better-sse/reference/recipes/))
* Fully written in TypeScript (+ ships with types directly).
* [Thoroughly tested](./src/Session.test.ts) (+ 100% code coverage!).
* [Comprehensively documented](https://matthewwid.github.io/better-sse) with guides and API documentation.
* [Channels](https://matthewwid.github.io/better-sse/guides/channels) allow you to broadcast events to many clients at once.
* [Event buffers](https://matthewwid.github.io/better-sse/guides/batching/) allow you to batch events for increased performance and lower bandwidth usage.
* Configurable reconnection time, message serialization and data sanitization (with good defaults).
* Trust or ignore the client-given last event ID.
* Automatically send keep-alive pings to keep connections open.
* Add or override the response status code and headers.
* Pipe [streams](https://nodejs.org/api/stream.html#stream_readable_streams) and [iterables](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators) directly from the server to the client as a series of events.
* Support for popular EventSource polyfills [`event-source-polyfill`](https://www.npmjs.com/package/event-source-polyfill) and [`eventsource-polyfill`](https://www.npmjs.com/package/eventsource-polyfill).

[See a comparison with other SSE libraries in the documentation.](https://matthewwid.github.io/better-sse/reference/comparison)

# Installation

Better SSE is published as a package on [npm](https://www.npmjs.com/package/better-sse) and the [JSR](https://jsr.io/@mwid/better-sse). You can install it with any package manager:

```sh
npm install better-sse
```

```sh
yarn add better-sse
```

```sh
pnpm add better-sse
```

```sh
bun add better-sse
```

```sh
deno install jsr:@mwid/better-sse
```

_Better SSE ships with types built in. No need to install from DefinitelyTyped for TypeScript users!_

# Usage

The examples below show usage with [Express](http://expressjs.com/) and [Hono](https://hono.dev/), but Better SSE works with any web-server framework that uses the Node [HTTP module](https://nodejs.org/api/http.html) or the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

See the [Recipes](https://matthewwid.github.io/better-sse/reference/recipes/) section of the documentation for use with other frameworks and libraries.

---

Use [sessions](https://matthewwid.github.io/better-sse/guides/getting-started/#create-a-session) to push events to clients:

```typescript
// Server - Express
import { createSession } from "better-sse"

app.get("/sse", async (req, res) => {
	const session = await createSession(req, res)
	session.push("Hello world!", "message")
})
```

```typescript
// Server - Hono
import { createResponse } from "better-sse"

app.get("/sse", (c) =>
    createResponse(c.req.raw, (session) => {
        session.push("Hello world!", "message")
    })
)
```

```typescript
// Client
const eventSource = new EventSource("/sse")

eventSource.addEventListener("message", ({ data }) => {
	const contents = JSON.parse(data)
	console.log(contents) // Hello world!
})
```

Use [channels](https://matthewwid.github.io/better-sse/guides/channels/#create-a-channel) to send events to many clients at once:

```typescript
import { createSession, createChannel } from "better-sse"

const channel = createChannel()

app.get("/sse", async (req, res) => {
	const session = await createSession(req, res)

	channel.register(session)

	channel.broadcast("A user has joined.", "join-notification")
})
```

Use [batching](https://matthewwid.github.io/better-sse/guides/batching/) to send multiple events at once for improved performance and lower bandwidth usage:

```typescript
await session.batch(async (buffer) => {
    await buffer.iterate(["My", "huge", "event", "list"])
})
```

Loop over sync and async [iterables](https://matthewwid.github.io/better-sse/reference/api/#sessioniterate-iterable-iterable--asynciterable-options-object--promisevoid) and send each value as an event:

```typescript
const iterable = [1, 2, 3]

await session.iterate(iterable)
```

Pipe [readable stream](https://matthewwid.github.io/better-sse/reference/api/#sessionstream-stream-readable-options-object--promiseboolean) data to the client as a stream of events:

```typescript
const stream = Readable.from([1, 2, 3])

await session.stream(stream)
```

---

Check the [API documentation](https://matthewwid.github.io/better-sse/reference/api) and [live examples](./examples) for information on getting more fine-tuned control over your data such as managing event IDs, data serialization, event filtering, dispatch controls and more!

# Documentation

See [the documentation website](https://matthewwid.github.io/better-sse/) for guides, usage examples, compatibility information and an API reference.

# Contributing

This library is always open to contributions whether it be code, bug reports, documentation or anything else.

Please submit suggestions, bugs and issues to the [GitHub issues page](https://github.com/MatthewWid/better-sse/issues).

For code or documentation changes [submit a pull request on GitHub](https://github.com/MatthewWid/better-sse/pulls).

## Local Development

Install [Node](https://nodejs.org/en) (with [n](https://github.com/tj/n)):

```bash
curl -L https://git.io/n-install | bash
n auto
```

Install dependencies (with [pnpm](https://pnpm.io/)):

```bash
npm i -g pnpm
pnpm i
```

Run tests (with [Vitest](https://vitest.dev/)):

```bash
pnpm t
```

Lint and format (with [Biome](https://biomejs.dev/)):

```bash
pnpm lint
pnpm format
```

Bundle for distribution (with [tsup](https://tsup.egoist.dev/)):

```bash
pnpm build
```

## Documentation

The documentation is built with [Astro](https://astro.build/) and [Starlight](https://starlight.astro.build/). Its source is located in the `docs` directory.

Install dependencies:

```bash
cd docs
pnpm i
```

Run development server:

```bash
pnpm dev
```

Build for distribution:

```bash
pnpm build
```

# License

This project is licensed under the [MIT license](https://opensource.org/license/mit/).
