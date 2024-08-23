# API Documentation

## Table of Contents

### Exports

* [`Session`](#session)
* [`createSession`](#createsession%3A-(constructorparameters<typeof-session>)-%3D>-promise<session>)
* [`Channel`](#channel)
* [`createChannel`](#createchannel%3A-(...args%3A-constructorparameters<typeof-channel>)-%3D>-channel)
* [`EventBuffer`](#eventbuffer)
* [`createEventBuffer`](#createeventbuffer-args-constructorparameterstypeof-eventbuffer--eventbuffer)
* [`SseError`](#sseerror)

## Documentation

### `Session`

*Extends from [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter)*.

A `Session` represents an open connection between the server and the client.

It emits the `connected` event after it has connected and sent all headers to the client, and the `disconnected` event after the connection has been closed.

Note that creating a new session will immediately send the initial status code and headers to the client. Attempting to write additional headers after you have created a new session will result in an error.

#### `new Session<State = DefaultSessionState>(req: IncomingMessage | Http2ServerRequest, res: ServerResponse | Http2ServerResponse[, options = {}])`

`req` is an instance of [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage) or [Http2ServerRequest](https://nodejs.org/api/http2.html#class-http2http2serverrequest).

`res` is an instance of [ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse) or [Http2ServerResponse](https://nodejs.org/api/http2.html#class-http2http2serverresponse).

`options` is an object with the following properties:

|Property|Type|Default|Description|
|-|-|-|-|
|`serializer`|`function`|`JSON.stringify`|Serialize data to a string that can be written over the wire.<br><br>Note that only values written with `.data()` or `.push()` are serialized, as everything else is assumed to already be a string.|
|`sanitizer`|`function`||Sanitize values so as to not prematurely dispatch events when writing fields whose text inadvertently contains newlines.<br><br>By default, CR, LF and CRLF characters are replaced with a single LF character (`\n`) and then any trailing LF characters are stripped so as to prevent a blank line being written and accidentally dispatching the event before `.dispatch()` is called.|
|`trustClientEventId`|`boolean`|`true`|Whether to trust or ignore the last event ID given by the client in the `Last-Event-ID` request header.<br><br>When set to `false`, the `lastId` property will always be initialized to an empty string.|
|`retry`|`number` \| `null`|`2000`|Time in milliseconds for the client to wait before attempting to reconnect if the connection is closed.<br><br>This is equivalent to immediately calling `.retry().dispatch().flush()` after a connection is made.<br><br>Give as `null` to avoid sending an explicit reconnection time and allow the client browser to decide itself.|
|`keepAlive`|`number` \| `null`|`10000`|Time in milliseconds interval for the session to send a comment to keep the connection alive.<br><br>Give as `null` to disable the keep-alive mechanism.|
|`statusCode`|`number`|`200`|Status code to be sent to the client.<br><br>Event stream requests can be redirected using HTTP 301 and 307 status codes. Make sure to set `Location` header when using these status codes (301/307) using the `headers` property.<br><br>A client can be asked to stop reconnecting by send a 204 status code.|
|`headers`|`object`|`{}`|Additional headers to be sent along with the response.|
|`state`|`object`|`{}`|Initial custom state for the session.<br><br>Accessed via the [`state`](#sessionstate-state) property.<br><br>When using TypeScript, providing the initial state structure allows the type of the `state` property to be automatically inferred.|

#### `Session#lastId`: `string`

The last event ID sent to the client.

This is initialized to the last event ID given by the user (in the `Last-Event-ID` header), and otherwise is equal to the last number given to the `.id` method.

For security reasons, keep in mind that the client can provide *any* initial ID here. Use the `trustClientEventId` constructor option to ignore the client-given initial ID.

#### `Session#isConnected`: `boolean`

Indicates whether the session and underlying connection is open or not.

#### `Session#state`: `State`

Custom state for this session.

Use this object to safely store information related to the session and user.

You may set an initial value for this property using the `state` property in the [constructor `options` object](#new-sessionstate--defaultsessionstatereq-incomingmessage--http2serverrequest-res-serverresponse--http2serverresponse-options--), allowing its type to be automatically inferred.

Use [module augmentation and declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation) to safely add new properties to the `DefaultSessionState` interface.

#### `Session#push`: `(data: unknown[, eventName: string[, eventId: string]]) => this`

Push an event to the client.

If no event name is given, the event name is set to `"message"`.

If no event ID is given, the event ID (and thus the [`lastId` property](#session%23lastid%3A-string)) is set to a unique string generated using a [cryptographic pseudorandom number generator](https://nodejs.org/api/crypto.html#cryptorandomuuidoptions).

If the session has disconnected, an [`SseError`](#sseerror) will be thrown.

Emits the `push` event with the given data, event name and event ID in that order.

#### `Session#stream`: `(stream: Readable[, options: object]) => Promise<boolean>`

Pipe readable stream data to the client.

Each data emission by the stream pushes a new event to the client.

This uses the [`push`](#session%23push%3A-(event%3A-string%2C-data%3A-any)-%3D>-this-%7C-(data%3A-any)-%3D>-this) method under the hood.

|`options.`|Type|Default|Description|
|-|-|-|-|
|`eventName`|`string`|`"stream"`|Event name to use when dispatching a data event from the stream to the client.|

#### `Session#iterate`: `(iterable: Iterable | AsyncIterable[, options: object]) => Promise<void>`

Iterate over an iterable and send yielded values to the client.

Each yield pushes a new event to the client.

This uses the [`push`](#session%23push%3A-(event%3A-string%2C-data%3A-any)-%3D>-this-%7C-(data%3A-any)-%3D>-this) method under the hood.

|`options.`|Type|Default|Description|
|-|-|-|-|
|`eventName`|`string`|`"iteration"`|Event name to use when dispatching a data event from the yielded value to the client.|

#### `Session#batch`: `(batcher: EventBuffer | ((buffer: EventBuffer) => void | Promise<void>)) => Promise<void>`

Batch and send multiple events at once.

If given an [`EventBuffer`](#eventbuffer) instance, its contents will be sent to the client.

If given a callback, it will be passed an instance of [`EventBuffer`](#eventbuffer) which uses the same serializer and sanitizer as the session.  
Once its execution completes - or once it resolves if it returns a promise - the contents of the passed [`EventBuffer`](#eventbuffer) will be sent to the client.

Returns a promise that resolves once all data from the event buffer has been successfully sent to the client.

#### `Session#event`: `(type: string) => this`

**⚠ DEPRECATED:** This method is deprecated. [See here](https://github.com/MatthewWid/better-sse/issues/52). 

Set the event to the given name (also referred to as the event "type" in the specification).

#### `Session#data`: `(data: unknown) => this`

**⚠ DEPRECATED:** This method is deprecated. [See here](https://github.com/MatthewWid/better-sse/issues/52). 

Write arbitrary data with the last event.

The given value is automatically serialized to a string using the `serializer` function which defaults to [JSON stringification](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify).

#### `Session#id`: `([id: string]) => this`

**⚠ DEPRECATED:** This method is deprecated. [See here](https://github.com/MatthewWid/better-sse/issues/52). 

Set the event ID to the given string.

Defaults to an empty string if no argument is given.

#### `Session#retry`: `(time: number) => this`

**⚠ DEPRECATED:** This method is deprecated. [See here](https://github.com/MatthewWid/better-sse/issues/52). 

Set the suggested reconnection time to the given milliseconds.

#### `Session#comment`: `([text: string]) => this`

**⚠ DEPRECATED:** This method is deprecated. [See here](https://github.com/MatthewWid/better-sse/issues/52). 

Write a comment (an ignored field).

This will not fire an event, but is often used to keep the connection alive.

#### `Session#dispatch`: `() => this`

**⚠ DEPRECATED:** This method is deprecated. [See here](https://github.com/MatthewWid/better-sse/issues/52). 

Indicate that the event has finished being created by writing an additional newline character.

Note that this does **not** send the written data to the client. To do so, use the [`flush` method](#sessionflush---this) to flush the internal buffer over the wire.

#### `Session#flush`: `() => this`

**⚠ DEPRECATED:** This method is deprecated. [See here](https://github.com/MatthewWid/better-sse/issues/52). 

Flush the buffered data to the client and clear the buffer.

### `createSession`: `<State>(ConstructorParameters<typeof Session>) => Promise<Session>`

Creates and returns a promise that resolves to an instance of a [Session](#session) once it has connected.

Takes the [same arguments as the Session class constructor](#new-session(req%3A-incomingmessage%2C-res%3A-serverresponse%2C-%5Boptions%5D-%3D-%7B%7D)).

### `Channel`

*Extends from [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter)*.

A `Channel` is used to broadcast events to many sessions at once.

You may use the second generic argument `SessionState` to enforce that only sessions
with the same state type may be registered with this channel.

#### `new Channel<State, SessionState>([options = {}])`

`options` is an object with the following properties:

|Property|Type|Default|Description|
|-|-|-|-|
|`state`|`object`|`{}`|Initial custom state for the channel.<br><br>Accessed via the [`state`](#channelstate-state) property.<br><br>When using TypeScript, providing the initial state structure allows the type of the `state` property to be automatically inferred.|

#### `Channel#state`: `State`

Custom state for this channel.

Use this object to safely store information related to the channel.

You may set an initial value for this property using the `state` property in the [constructor `options` object](#new-channelstate-sessionstate), allowing its type to be automatically inferred.

Use [module augmentation and declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation) to safely add new properties to the `DefaultChannelState` interface.

#### `Channel#activeSessions`: `ReadonlyArray<Session>`

List of the currently active sessions subscribed to this channel.

You should not mutate the contents of this array.

#### `Channel#sessionCount`: `number`

Number of sessions subscribed to this channel.

Equivalent to `channel.activeSessions.length`, though slightly faster to access.

#### `Channel#register`: `(session: Session) => this`

Register a session so that it can start receiving events from this channel.

Note that a session must be [connected](#session%23isconnected%3A-boolean) before it can be registered to a channel.

Fires the `session-registered` event with the registered session as its first argument.

If the session was already registered to begin with this method does nothing.

#### `Channel#deregister`: `(session: Session) => this`

Deregister a session so that it no longer receives events from this channel.

Note that sessions are automatically deregistered when they are disconnected.

Fires the `session-deregistered` event with the session as its first argument.

If the session was disconnected the channel will also fire the `session-disconnected` event with the disconnected session as its first argument beforehand.

If the session was not registered to begin with this method does nothing.

#### `Channel#broadcast`: `(data: unknown[, eventName: string[, options: object]]) => this`

Broadcasts an event with the given data and name to every active session registered with this channel.

Under the hood this calls the [`push`](#session%23push%3A-(event%3A-string%2C-data%3A-any)-%3D>-this-%7C-(data%3A-any)-%3D>-this) method on every active session.

If no event name is given, the event name is set to `"message"`.

Emits the `broadcast` event with the given data, event name and event ID in that order.

Note that the broadcasted event will have the same ID across all receiving sessions instead of generating a unique ID for each.

|`options.`|Type|Default|Description|
|-|-|-|-|
|`eventId`|`string`||Unique ID for the event being broadcast.<br><br>If no event ID is given, the event ID is set to a unique string generated using a [cryptographic pseudorandom number generator](https://nodejs.org/api/crypto.html#cryptorandomuuidoptions).|
|`filter`|`(session: Session) => boolean`||Filter sessions that should receive the event.<br><br>Called with each session and should return `true` to allow the event to be sent and otherwise return `false` to prevent the session from receiving the event.|

### `createChannel`: `<State>(...args: ConstructorParameters<typeof Channel>) => Channel`

Creates and returns an instance of a [Channel](#channel).

Takes the [same arguments as the Channel class constructor](#new-channel()).

### `EventBuffer`

An `EventBuffer` allows you to write [raw spec-compliant SSE fields](https://html.spec.whatwg.org/multipage/server-sent-events.html#processField) into a text buffer that can be sent directly over the wire.

#### `new EventBuffer([options = {}])`

`options` is an object with the following properties:

|Property|Type|Default|Description|
|-|-|-|-|
|`serializer`|`function`|`JSON.stringify`|Serialize data to a string that can be written over the wire.<br><br>Note that only values written with `.data()` or `.push()` are serialized, as everything else is assumed to already be a string.|
|`sanitizer`|`function`||Sanitize values so as to not prematurely dispatch events when writing fields whose text inadvertently contains newlines.<br><br>By default, CR, LF and CRLF characters are replaced with a single LF character (`\n`) and then any trailing LF characters are stripped so as to prevent a blank line being written and accidentally dispatching the event before `.dispatch()` is called.|

#### `EventBuffer#event`: `(type: string) => this`

Write an event name field (also referred to as the event "type" in the specification).

#### `EventBuffer#data`: `(data: unknown) => this`

Write arbitrary data into a data field.

Data is serialized to a string using the given `serializer` function option or [JSON stringification](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) by default.

#### `EventBuffer#id`: `([id: string]) => this`

Write an event ID field.

Defaults to an empty string if no argument is given.

#### `EventBuffer#retry`: `(time: number) => this`

Write a retry field that suggests a reconnection time with the given milliseconds.

#### `EventBuffer#comment`: `([text: string]) => this`

Write a comment (an ignored field).

This will not fire an event but is often used to keep the connection alive.

#### `EventBuffer#dispatch`: `() => this`

Indicate that the event has finished being created by writing an additional newline character.

#### `EventBuffer#push`: `(data: unknown[, eventName: string[, eventId: string]]) => this`

Create, write and dispatch an event with the given data all at once.

This is equivalent to calling the methods `event`, `id`, `data` and `dispatch` in that order.

If no event name is given, the event name is set to `"message"`.

If no event ID is given, the event ID is set to a unique string generated using a [cryptographic pseudorandom number generator](https://nodejs.org/api/crypto.html#cryptorandomuuidoptions).

#### `EventBuffer#stream`: `(stream: Readable[, options: object]) => Promise<boolean>`

Pipe readable stream data as a series of events into the buffer.

This uses the [`push`](#eventbuffer%23push%3A-(event%3A-string%2C-data%3A-any)-%3D>-this-%7C-(data%3A-any)-%3D>-this) method under the hood.

|`options.`|Type|Default|Description|
|-|-|-|-|
|`eventName`|`string`|`"stream"`|Event name to use for each event created.|

#### `EventBuffer#iterate`: `(iterable: Iterable | AsyncIterable[, options: object]) => Promise<void>`

Iterate over an iterable and write yielded values as events into the buffer.

This uses the [`push`](#eventbuffer%23push%3A-(event%3A-string%2C-data%3A-any)-%3D>-this-%7C-(data%3A-any)-%3D>-this) method under the hood.

|`options.`|Type|Default|Description|
|-|-|-|-|
|`eventName`|`string`|`"iteration"`|Event name to use for each event created.|

#### `EventBuffer#clear`: `() => this`

Clear the contents of the buffer.

#### `EventBuffer#read`: `() => string`

Get a copy of the buffer contents.

### `createEventBuffer`: `(...args: ConstructorParameters<typeof EventBuffer>) => EventBuffer`

Creates and returns an instance of an [EventBuffer](#eventbuffer).

Takes the [same arguments as the EventBuffer class constructor](#new-eventbufferoptions--).

### `SseError`

*Extends from [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)*.

Represents an SSE-related error thrown from within Better SSE.
