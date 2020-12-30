# Better SSE

A dead simple, dependency-less, spec-compliant server-side events implementation for Node, written in TypeScript.

This package aims to be the easiest to use, most compliant and most streamlined solution to server-side events with Node that is framework agnostic and feature rich.

[See the WHATWG standards section for server-sent events.](https://html.spec.whatwg.org/multipage/server-sent-events.html)

[See the MDN guide to server-sent events.](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

# Installation

```bash
# npm
npm install better-sse

# Yarn
yarn add better-sse
```

_Better SSE ships with types built in. No need to install from `@types` for TypeScript users!_

# Usage

Import:

```typescript
// TypeScript / ESModules
import * as sse from "better-sse";

// or with ESModule Interop enabled in TypeScript
import sse from "better-sse";

// CommonJS
const sse = require("better-sse");
```

## Express

Add as middleware:

```javascript
app.get("/sse", sse.middleware.express());
```

Access the SSE session on the `res.sse` property:

```javascript
(req, res) => {
	res.sse.push("speak", "Hello world");
};
```

(Client-side) Connect to the server:

```javascript
const sse = new EventSource("/sse");

sse.addEventListener("speak", (event) => {
	console.log(event.data);
	sse.close();
});
```

# License

This project is licensed under the MIT license.
