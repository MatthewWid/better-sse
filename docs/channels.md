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
// ticker.ts
import {createChannel} from "better-sse";

const tickerChannel = createChannel();

export default tickerChannel;
```

Then import the channel to where your route handler is:

```javascript
// server.ts
import tickerChannel from "./ticker";
```

You then need to *register* the session with your new channel so that it can start receiving events. Inside your route handler add the following just after you create your session:

```javascript
tickerChannel.register(session);
```

Your session is now subscribed to your channel and will start receiving its broadcasted events!

Channels are powerful in that you can register your session to listen on multiple channels at once, or optionally none at all. This makes it dynamically configurable based on what channels your client may or may not be authorized to receive events from, and allows you to have a lot of flexibility in your implementation.
