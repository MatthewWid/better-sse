# Channels

This section covers the usage of [channels](./api.md#channels) with Better SSE. You should read the [Getting Started](./getting-started.md) guide first if you haven't already.

## Guide

### Introduction

Channels are an abstraction that make it easy to broadcast events to many clients at once.

When a client connects, you first register (subscribe) the session to one or many channels, and from then-on any events broadcast on those channels will also be sent to the client.

Don't worry about deregistering the session from the channel; that is automatically handled for you when the session disconnects, [but you can also do it manually](./api.md#createchannel%3A-(...args%3A-constructorparameters<typeof-channel>)-%3D>-channel) if you no longer wish to listen for events on a channel at any given time.

Channels can be used for things such as notification systems, chat rooms and synchronizing data between multiple clients.

### Create a channel

We are going to be making a channel that does two things:

1. Counts a number up one-by-one, synchronizing that number with all clients, and,
2. Sends a live-updating count of how many clients are currently connected to all other clients.

Let's start off from where the Getting Started guide finished as a base:

```javascript
// server.ts
import express from "express";
import {createSession} from "better-sse";

const app = express();

app.get("/sse", async (req, res) => {
	const session = await createSession(req, res);

	session.push("Hello world!");
);

app.listen(8080);
```

Right now we have a simple mechanism where a client connects and receives an event with the data `"Hello world!"`.

This is nice, but what if we want to say hi to everyone at once? Or in a more real-world example, send live updates about real-time events in our system to groups of our users? This is where we can use channels.

To make a channel, you simply call the `createChannel()` factory function exported by Better SSE.

Let's create a channel called *ticker* in a new file and export it:

```javascript
// channels/ticker.ts
import {createChannel} from "better-sse";

const tickerChannel = createChannel();

export default tickerChannel;
```

Then import the channel to where your route handler is:

```javascript
// server.ts
import tickerChannel from "./channels/ticker";
```

You then need to *register* the session with your new channel so that it can start receiving events. Inside your route handler add the following just after you create your session:

```javascript
tickerChannel.register(session);
```

Your session is now subscribed to your channel and will start receiving its broadcasted events!

Channels are powerful in that you can register your session to listen on multiple channels at once, or optionally none at all. This makes it dynamically configurable based on what channels your client may or may not be authorized to receive events from, and allows you to have a lot of flexibility in your implementation.

### Create a counter

Now that you have a channel and your sessions are registered with it, lets actually make it do something.

We are going to have a number that increments by one (1) every second, and synchronize it across all of our connected clients in real time.

Back in your `ticker.ts` file, right after your create your channel, add the following:

```javascript
let count = 0;

setInterval(() => {
	count = count + 1;

	tickerChannel.broadcast("tick", count);
}, 1000);
```

Here we have a variable `count` that gets incremented by `1` every 1000ms (one second).

We then broadcast the value of `count` on the `ticker` channel every interval under the event name `tick` which will be received by all of our registered sessions.

On our client-side let's write a handler that updates some text with the received value:

```javascript
// client.js
const countElement = document.createElement("pre");
document.body.appendChild(countElement);

const eventSource = new EventSource("/sse");

eventSource.addEventListener("tick", ({data}) => {
	countElement.innerText = `The clock has ticked! The count is now ${data}.`;
});
```

In this snippet the following is happening:

1. We create a `pre` element stored in a variable `countElement` and add it to our document body.
2. We create an [`EventSource`](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) to listen to events from our server.
3. We listen for the `tick` event and, when received, set the text in `countElement` to display the received value, corresponding to the `count` variable on the server.

Open it up in your browser (you can [run the pre-made example project](../examples) if you haven't been following along) and you will now see your ticking counter being updated in real time!

You can open the same page in multiple tabs at once and notice that the value is kept in sync across them all. Easy!

### Track active sessions

Let's add some more functionality to our *ticker* channel. This time we want to keep our users in the know about how many other users are on the site at the same time as them. No one wants to feel lonely!

Channels [emit events](https://nodejs.org/api/events.html#events_class_eventemitter) when certain things happen such as sessions being registered, deregistered and being disconnected. Let's listen on these events to broadcast the total number of connected sessions at any given time.

In our `ticker.ts` file, after you create your channel, add the following:

```javascript
const broadcastSessionCount = () => {
	ticker.broadcast("session-count", ticker.sessionCount);
};

ticker
	.on("session-registered", broadcastSessionCount)
	.on("session-deregistered", broadcastSessionCount);
```

Here we create a function `broadcastSessionCount` that broadcasts an event with the name `session-count` and a value with the current total session count exposed to us under the [Channel `sessionCount` property](./api.md#channelsessioncount-number).

We then listen on both the events `session-registered` and `session-deregistered` and set our `broadcastSessionCount` as a callback for each. This way every time a session joins or leaves the channel the count is re-broadcasted and updated for each of the existing sessions on the channel.

Back on our client lets add another listener that displays the session count:

```javascript
// client.js
const sessionsElement = document.createElement("pre");
document.body.appendChild(sessionsElement);

// Create our EventSource

eventSource.addEventListener("session-count", ({data}) => {
	sessionsElement.innerText = `There are ${data} person(s) here right now!`;
});
```

We do a similar thing to our previous example:

1. Create a `pre` element stored in a variable `sessionsElement` and add it to our document body.
2. Listen for the `session-count` event and, when received, set the text in `sessionsElement` to display the received value, corresponding the to the number of active sessions connected.

Once again open the page in your browser ([or run the example project](../examples)) and you will now see the new text element with a real-time updating display of the active sessions. Open and close more tabs on the same page and observe how the count changes to stay in sync. Amazing!

## Keep going...

Check the [API documentation](./api.md) for information on getting fine-tuned control over your data such as managing event IDs, data serialization, streams, dispatch controls and more.

You can also see the full example from this guide [in the examples directory](../examples).
