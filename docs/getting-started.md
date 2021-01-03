# Getting Started

This section will cover getting started with the Better SSE package for its most common use case - [Express applications](https://expressjs.com/).

If you need to use server-sent events for another framework or use case please see the recipes section.

## Guide

### Install

Install as an npm package:

```bash
# npm
npm install better-sse

# Yarn
yarn add better-sse
```

### Import

```javascript
# ESModules / TypeScript
import sse from "better-sse";

# CommonJS
const sse = require("better-sse").default;
```

### Add as middleware

Add the SSE middleware under a specific GET route in your Express application server (`/sse` in this example).

After adding the middleware, add your own request handler to push some data to the client. In this case, we dispatch the `ping` event with the text data `Hello world!` attached.

```javascript
app.get("/sse", sse(), (req, res) => {
	res.push("ping", "Hello world!");
});
```

### Connect to the server

Create an event source that points to the `/sse` endpoint we just created and log "ping" events sent by the server.

```javascript
const sse = new EventSource("/sse");

sse.addEventListener("ping", ({data}) => console.log(data));
```

Open in your browser and you should see the sent message logged to the console. Easy!

Check the API documentation for information on getting more fine-tuned control over your data such as managing event IDs, data serialization, streams, dispatch controls and more.
