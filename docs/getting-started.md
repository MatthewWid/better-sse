# Getting Started

This section will cover basic usage of the Better SSE package and use the [Express web-server](https://expressjs.com/) in its code examples.

Note that Better SSE works with any web-server framework (that uses the underlying [Node HTTP module](https://nodejs.org/api/http.html)). For example usage with other popular frameworks, see the [Recipes](./recipes.md) section.

## Guide

### Introduction

[Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) (SSE) is a technology that allows web-servers to push data (characterized as _events_) to a client without the client having to request it immediately before. It uses the HTTP 1 protocol and thus does not require a connection upgrade first like [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) and [HTTP/2](https://developer.mozilla.org/en-US/docs/Glossary/HTTP_2) do (but can also be used with HTTP/2!).

It works by a client connecting to a server using the [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) interface. The server then indicates in its response headers that it will send back data in a stream of events and keeps the connection open indefinitely until it is closed by the client. From this point the server is free to continuously write data to the socket and the EventSource will emit events with the sent data.

The technology can be used for things for things such as live notifications, news tickers, chat rooms, shout-boxes, event logs, progress bars, etc.

### Install

Better SSE is [shipped as package on npm](https://www.npmjs.com/package/better-sse). You can install it with any Node package manager.

With [npm](https://www.npmjs.com/get-npm):

```bash
npm install better-sse
```

With [Yarn](https://yarnpkg.com/):

```bash
yarn add better-sse
```

With [pnpm](https://pnpm.io/):

```bash
pnpm add better-sse
```

## Create a new session

"Sessions" simply represent an open connection between a client and a server. The client will first make a request to the server, and the server will open a session that it will push data to the client with.

The recommended setup is to create the session and make it available in a [middleware](https://expressjs.com/en/guide/using-middleware.html) for your next consecutive request handlers to use.

First import the module:

```javascript
// ESModules / TypeScript
import {createSession} from "better-sse";

// CommonJS
const {createSession} = require("better-sse");
```

Then open a session when the client makes a request on the specified route, and make it available to the middlewares after it:

```javascript
app.get("/sse", async (req, res, next) => {
	const session = await createSession(req, res);

	res.sse = session;

	next();
});
```

<details>
    <summary>Note for TypeScript users</summary>

If you are using Express, you can make the TypeScript compiler recognize the new property on the response object you must [add it to the global module declaration](https://stackoverflow.com/a/55718334/2954591) via [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html).

First import the raw `Session` class:

```javascript
import {Session} from "better-sse";
```

And then add it to the `Response` interface:

```javascript
declare module "express-serve-static-core" {
	interface Response {
		sse: Session;
	}
}
```

You should now be able to access `res.sse` without TypeScript showing errors.

</details>

## Push an event with some data

Now that we have an open session, we can use it to push data to the client. Access the session on the `res.sse` property and start dispatching events:

```javascript
app.get(
	"/sse",
	/* Create the session */
	(req, res) => {
		res.sse.push("ping", "Hello world!");
	}
);
```

This will push an event named `ping` (but this can be any string) and the event data as the string `Hello world!`.

## Connect from the client

From your client-side code you can now connect to the server at the given path (`GET /sse` in this example).

It is highly recommended you use the [EventSource polyfill](https://www.npmjs.com/package/eventsource) that allows for backwards compatibility with older browsers as well as giving you extra features such as request header modification and better error handling.

First we will open a connection to the server to begin receiving events from it:

```javascript
const eventSource = new EventSource("/sse");
```

Then we can attach a listener to listen for the event our server will send:

```javascript
eventSource.addEventListener("ping", (event) => {
	const {type, data} = event;

	console.log(`${type} | ${data}`);
});
```

If you check your browser console you will see `ping | "Hello world!"` logged to the console. Easy!

Note that data is [serialized as JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) by default. You can use `JSON.parse(data)` to get the real value of the event data.

You can also find a reference to the received event object interface under the [MessageEvent page on MDN](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent).

## Keep going...

Move on to [learning about channels](./channels.md) which allow you to broadcast events to multiple sessions at once.

Check the [API documentation](./api.md) for information on getting fine-tuned control over your data such as managing event IDs, data serialization, streams, dispatch controls, channels and more.

You can also see the full example from this guide [in the examples directory](../examples).
