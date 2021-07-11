# Channels

This section covers the usage of [channels](./api.md#channels) with Better SSE. You should read the [Getting Started](./getting-started.md) guide first if you haven't already.

## Guide

### Introduction

Channels are an abstraction that make it easy to broadcast events to many clients at once.

When a client connects, you first register (subscribe) the session to one or many channels, and from then-on any events broadcast on those channels will also be sent to the client.

Don't worry about deregistering the session from the channel; that is automatically handled for you when the session disconnects, [but you can also do it manually](./api.md#createchannel%3A-(...args%3A-constructorparameters<typeof-channel>)-%3D>-channel) if you no longer wish to listen for events on a channel at any given time.

Channels can be used for things such as notification systems, chat rooms and synchronizing data between multiple clients.

### Create a channel

Let's start off from where the Getting Started guide finished as a base:

```javascript
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

This is nice, but what if we want to say hi to everyone at once? Or in a more real-world example, send live updates about things to groups of our users? This is where we can use channels.
