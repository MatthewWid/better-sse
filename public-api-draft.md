# Better-SSE Public API Draft

# Install

```bash
# npm
npm install better-sse

# Yarn
yarn add better-sse
```

## Import

```javascript
// CommonJS
const sse = require("better-sse");

// ESModules
import sse from "better-sse";
```

## Use

### As Express Middleware

```javascript
// Express
app.get(
	"/sse",
	sse.middleware.express,
	(req, res) => {
		// Add event line
		// event: ping\n
		res.sse.event("ping");

		// Add data line
		// data: my text here\n
		res.sse.data("my text here");
		// data: 5\n
		res.sse.data(5);
		// data: {"hello":"world"}\n
		res.sse.data({hello: "world"});
		// data: x\ndata: y\ndata: z\n
		res.sse.data(readStream);

		// Add ID field
		// id: 1\n
		res.sse.id(1);

		// Get client-sent last ID field, if any
		res.sse.lastId;

		// Add retry field
		// retry: 2000\n
		res.sse.retry(2000);

		// Add ignored line (comment)
		// :Ignore me\n
		res.sse.comment("Ignore me");
		
		// Dispatch the event
		// \n
		res.sse.dispatch():

		// Chain method calls together
		res
			.sse
			.event("speak")
			.id(1)
			.data("Hi there!")
			.dispatch();

		// Create and dispatch an event with data all at once
		// (Auto-incrementing ID field)
		res.sse.push("speak", "Hi there!");
		
		// Or with no associated event name
		// (No event or ID field will be added)
		res.sse.push("Hi there!");

		// Alias on the root response object
		res.push("speak", "Hi there!");
	}
);
```

# Stretch Goals

## Broadcast to Connected Clients

```javascript
app.use(sse.middleware.express);

// Same methods as individual connections
// Event IDs remain sequential from their individual connection instance
sse.broadcast.push("greet", "Hello my minions.");

// Send a disconnect event to all connected users
sse
	.broadcast
	.event("disconnect")
	.dispatch();
```

## Client/Browser Wrapper

```javascript
import client from "better-sse/client";
```

```javascript
const sse = client.connect("/sse");
```

```javascript
sse.on("connected", () => {});

// When receiving the 'disconnect' event, automatically close the connection
sse.on("disonnected", () => {});

// Listen on all event types no matter their name
sse.on("message", (event) => {
	event.name;
	event.id;
	// Event data is automatically parsed back to a string, a number or an object (JSON)
	event.data;
});

// Listen on custom event name
sse.on("custom", (event) => {});
