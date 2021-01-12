# Better SSE

<p>
	<img src="https://img.shields.io/npm/v/better-sse?color=blue&style=flat-square" />
	<img src="https://img.shields.io/npm/l/better-sse?color=green&style=flat-square" />
	<img src="https://img.shields.io/npm/dt/better-sse?color=grey&style=flat-square" />
	<a href="https://github.com/MatthewWid/better-sse"><img src="https://img.shields.io/github/stars/MatthewWid/better-sse?style=social" /></a>
</p>

A dead simple, dependency-less, spec-compliant server-side events implementation for Node, written in TypeScript.

This package aims to be the easiest to use, most compliant and most streamlined solution to server-side events with Node that is framework agnostic and feature rich.

[See the WHATWG standards section for server-sent events.](https://html.spec.whatwg.org/multipage/server-sent-events.html)

[See the MDN guide to server-sent events.](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

Please consider starring the project [on GitHub ⭐](https://github.com/MatthewWid/better-sse).

# Installation

```bash
# npm
npm install better-sse

# Yarn
yarn add better-sse
```

_Better SSE ships with types built in. No need to install from `@types` for TypeScript users!_

# Basic Usage

Better SSE has compatibility with many different frameworks and libraries, but is commonly used by users implementing an application with the [Express framework](http://expressjs.com/).

See the recipes section of the documentation for use with other frameworks and libraries.

```javascript
// Server
import sse from "better-sse";

app.get("/sse", sse(), (req, res) => {
	res.push("speak", "Hello, world!");
});

// use with streams
app.get('/sse-stream', sse(), async (req, res) => {
	try {
		const done = await res.stream(anyReadableStream, {sseEvent: "streamData"})
		res.push("streamData", "end")
	} catch(err) {}
})
```

```javascript
// Client
const sse = new EventSource("/sse");

sse.addEventListener("speak", ({data}) => {
	console.log(data);
});
```

Check the API documentation for information on getting more fine-tuned control over your data such as managing event IDs, data serialization, streams, dispatch controls and more!

# Documentation

API documentation, getting started guides and usage with other frameworks is [available on GitHub](https://github.com/MatthewWid/better-sse/tree/master/docs).

# License

This project is licensed under the MIT license.
