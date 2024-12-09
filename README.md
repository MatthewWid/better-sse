# Better SSE

<p>
	<img src="https://img.shields.io/npm/v/better-sse?color=blue&style=flat-square" />
	<img src="https://img.shields.io/npm/l/better-sse?color=green&style=flat-square" />
	<img src="https://img.shields.io/npm/dt/better-sse?color=grey&style=flat-square" />
	<a href="https://github.com/MatthewWid/better-sse"><img src="https://img.shields.io/github/stars/MatthewWid/better-sse?style=social" /></a>
</p>

A dead simple, dependency-less, spec-compliant server-sent events implementation for Node, written in TypeScript.

This package aims to be the easiest to use, most compliant and most streamlined solution to server-sent events with Node that is framework-agnostic and feature-rich.

Please consider starring the project [on GitHub ⭐](https://github.com/MatthewWid/better-sse).

## Why use Server-sent Events?

Server-sent events (SSE) is a standardised protocol that allows web-servers to push data to clients without the need for alternative mechanisms such as pinging, long-polling or [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API).

Using SSE can allow for significant savings in bandwidth and battery life on portable devices and will work with your existing infrastructure as it operates directly over the HTTP protocol without the need for the connection upgrade that WebSockets require.

Compared to WebSockets it has comparable performance and bandwidth usage, especially over HTTP/2, and natively includes event ID generation and automatic reconnection when clients are disconnected.

* [Comparison: Server-sent Events vs WebSockets vs Polling](https://medium.com/dailyjs/a-comparison-between-websockets-server-sent-events-and-polling-7a27c98cb1e3)
* [WHATWG standards section for server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
* [MDN guide to server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

## Highlights

* Compatible with all popular Node HTTP frameworks ([Express](https://nodejs.org/api/http.html), [Fastify](https://fastify.dev/), [Nest](https://nestjs.com/), [Next.js](https://nextjs.org/), etc.)
* Fully written in TypeScript (+ ships with types directly).
* [Thoroughly tested](./src/Session.test.ts) (+ 100% code coverage!).
* [Comprehensively documented](https://matthewwid.github.io/better-sse) with guides and API documentation.
* [Channels](https://matthewwid.github.io/better-sse/guides/channels) allow you to broadcast events to many clients at once.
* Configurable reconnection time, message serialization and data sanitization (with good defaults).
* Trust or ignore the client-given last event ID.
* Automatically send keep-alive pings to keep connections open.
* Add or override the response status code and headers.
* Send [individual fields](https://matthewwid.github.io/better-sse/guides/batching#send-individual-event-fields) of events or send [full events with simple helpers](https://matthewwid.github.io/better-sse/reference/api/#sessionpush-data-unknown-eventname-string-eventid-string--this).
* Pipe [streams](https://nodejs.org/api/stream.html#stream_readable_streams) and [iterables](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators) directly from the server to the client as a series of events.
* Support for popular EventSource polyfills [`event-source-polyfill`](https://www.npmjs.com/package/event-source-polyfill) and [`eventsource-polyfill`](https://www.npmjs.com/package/eventsource-polyfill).

[See a comparison with other Node SSE libraries in the documentation.](https://matthewwid.github.io/better-sse/reference/comparison)

# Installation

```bash
# npm
npm install better-sse

# Yarn
yarn add better-sse

# pnpm
pnpm add better-sse
```

_Better SSE ships with types built in. No need to install from DefinitelyTyped for TypeScript users!_

# Usage

The following example shows usage with [Express](http://expressjs.com/), but Better SSE works with any web-server framework that uses the underlying Node [HTTP module](https://nodejs.org/api/http.html).

See the [Recipes](https://matthewwid.github.io/better-sse/reference/recipes/) section of the documentation for use with other frameworks and libraries.

---

Use [sessions](https://matthewwid.github.io/better-sse/reference/api/#sessionstate) to push events to clients:

```typescript
// Server
import { createSession } from "better-sse";

app.get("/sse", async (req, res) => {
	const session = await createSession(req, res);

	session.push("Hello world!");
});
```

```typescript
// Client
const sse = new EventSource("/sse");

sse.addEventListener("message", ({ data }) => {
	console.log(JSON.parse(data));
});
```

Use [channels](https://matthewwid.github.io/better-sse/reference/api/#channelstate-sessionstate) to send events to many clients at once:

```typescript
import { createSession, createChannel } from "better-sse";

const channel = createChannel();

app.get("/sse", async (req, res) => {
	const session = await createSession(req, res);

	channel.register(session);

	channel.broadcast("A user has joined.", "join-notification");
});
```

Loop over sync and async [iterables](https://matthewwid.github.io/better-sse/reference/api/#sessioniterate-iterable-iterable--asynciterable-options-object--promisevoid) and send each value as an event:

```typescript
const session = await createSession(req, res);

const list = [1, 2, 3];

await session.iterate(list);
```

Pipe [readable stream](https://matthewwid.github.io/better-sse/reference/api/#sessionstream-stream-readable-options-object--promiseboolean) data to the client as a stream of events:

```typescript
const session = await createSession(req, res);

const stream = Readable.from([1, 2, 3]);

await session.stream(stream);
```

---

Check the [API documentation](https://matthewwid.github.io/better-sse/reference/api) and [live examples](./examples) for information on getting more fine-tuned control over your data such as managing event IDs, data serialization, event filtering, dispatch controls and more!

# Documentation

API documentation, getting started guides and usage with other frameworks is [available on the documentation website](https://matthewwid.github.io/better-sse/).

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

# License

This project is licensed under the [MIT license](https://opensource.org/license/mit/).
