# API Documentation

## Table of Contents

### Exports

* [Session](#session)
* [createSession](#createsession%3A-(constructorparameters<typeof-session>)-%3D>-promise<session>)
* [Channel](#channel)
* [createChannel](#createchannel%3A-(...args%3A-constructorparameters<typeof-channel>)-%3D>-channel)

## Documentation

### `Session`

*Extends from [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter)*.

A Session represents an open connection between the server and the client.

It emits the `connected` event after it has connected and flushed all headers to the client, and the `disconnected` event after client connection has been closed.

#### `new Session<State>(req: IncomingMessage, res: ServerResponse[, options = {}])`

`req` is an instance of [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage).

`res` is an instance of [ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse).

`options` is an object with the following properties:

|Property|Type|Default|Description|
|-|-|-|-|
|`serializer`|`function`|`JSON.stringify`|Serialize data to a string that can be written over the wire.<br><br>Note that only values written with `.data()` or `.push()` are serialized, as everything else is assumed to already be a string.|
|`sanitizer`|`function`||Sanitize values so as to not prematurely dispatch events when writing fields whose text inadvertently contains newlines.<br><br>By default, CR, LF and CRLF characters are replaced with a single LF character (`\n`) and then any trailing LF characters are stripped so as to prevent a blank line being written and accidentally dispatching the event before `.dispatch()` is called.|
|`trustClientEventId`|`boolean`|`true`|Whether to trust the last event ID given by the client in the `Last-Event-ID` request header.<br><br>When set to `false`, the `lastId` property will always be initialized to an empty string.|
|`retry`|`number` \| `null`|`2000`|Time in milliseconds for the client to wait before attempting to reconnect if the connection is closed.<br><br>This is equivalent to immediately calling `.retry().dispatch()` after a connection is made.<br><br>Give as `null` to avoid sending an explicit reconnection time and allow the client browser to decide itself.|
|`keepAlive`|`number` \| `null`|`10000`|Time in milliseconds interval for the session to send a comment to keep the connection alive.<br><br>Give as `null` to disable the keep-alive mechanism.|
|`statusCode`|`number`|`200`|Status code to be sent to the client. Event stream requests can be redirected using HTTP 301 and 307 status codes.<br><br>Make sure to set `Location` header when using these status codes (301/307) using the `headers` property.<br><br>A client can be asked to stop reconnecting by send a 204 status code.|
|`headers`|`object`|`{}`|Additional headers to be sent along with the response.|

#### `Session#lastId`: `string`

The last ID sent to the client.

This is initialized to the last event ID given by the user (in the `Last-Event-ID` header), and otherwise is equal to the last number given to the `.id` method.

#### `Session#isConnected`: `boolean`

Indicates whether the session and connection is open or not.

#### `Session#state`: `SessionState`

Custom state for this session.

Use this object to safely store information related to the session and user.

Use [module augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation) to safely add new properties to the `SessionState` interface.

#### `Session#dispatch`: `() => this`

Flush the buffered data to the client by writing an additional newline.

#### `Session#event`: `(type: string) => this`

Set the event to the given name (also referred to as "type" in the specification).

#### `Session#data`: `(data: any) => this`

Write arbitrary data onto the wire.

The given value is automatically serialized to a string using the `serializer` function which defaults to [JSON stringification](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify).

#### `Session#id`: `(id: string | null) => this`

Set the event ID to the given string.

Passing `null` will set the event ID to an empty string value.

#### `Session#retry`: `(time: number) => this`

Set the suggested reconnection time to the given milliseconds.

#### `Session#comment`: `(text: string) => this`

Write a comment (an ignored field).

This will not fire an event, but is often used to keep the connection alive.

#### `Session#push`: `(data: unknown[, eventName: string[, eventId: string]]) => this`

Create and dispatch an event with the given data all at once.

This is equivalent to calling `.event()`, `.id()`, `.data()` and `.dispatch()` in that order.

If no event name is given, the event name (type) is set to `"message"`.

If no event ID is given, the event ID (and thus the [`lastId` property](#session%23lastid%3A-string)) is set to a string of eight random characters (matching `a-z0-9`).

Emits the `push` event with the given data, event name and event ID in that order.

#### `Session#stream`: `(stream: Readable[, options: object]) => Promise<boolean>`

Pipe readable stream data to the client.

Each data emission by the stream emits a new event that is dispatched to the client.

This uses the [`push`](#session%23push%3A-(event%3A-string%2C-data%3A-any)-%3D>-this-%7C-(data%3A-any)-%3D>-this) method under the hood.

|`options.`|Type|Default|Description|
|-|-|-|-|
|`eventName`|`string`|`"stream"`|Event name to use when dispatching a data event from the stream to the client.|

#### `Session#iterate`: `(iterable: Iterable | AsyncIterable[, options: object]) => Promise<void>`

Iterate over an iterable and send yielded values as data to the client.

Each yield emits a new event that is dispatched to the client.

This uses the [`push`](#session%23push%3A-(event%3A-string%2C-data%3A-any)-%3D>-this-%7C-(data%3A-any)-%3D>-this) method under the hood.

|`options.`|Type|Default|Description|
|-|-|-|-|
|`eventName`|`string`|`"iteration"`|Event name to use when dispatching a data event from the yielded value to the client.|

### `createSession`: `<State>(ConstructorParameters<typeof Session>) => Promise<Session>`

Creates and returns a promise that resolves to an instance of a [Session](#session) once it has connected.

It takes the [same arguments as the Session class constructor](#new-session(req%3A-incomingmessage%2C-res%3A-serverresponse%2C-%5Boptions%5D-%3D-%7B%7D)).

### `Channel`

*Extends from [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter)*.

A Channel is used to broadcast events to many sessions at once.

#### `new Channel<State>()`

#### `Channel#state`: `State`

Custom state for this channel.

Use this object to safely store information related to the channel.

#### `Channel#activeSessions`: `ReadonlyArray<Session>`

List of the currently active sessions subscribed to this channel.

You should not mutate the contents of this array.

#### `Channel#sessionCount`: `number`

Number of sessions subscribed to this channel.

Equivalent to `channel.activeSessions.length`.

#### `Channel#register`: `(session: Session) => this`

Register a session so that it will start receiving events from this channel.

Note that a session must be [connected](#session%23isconnected%3A-boolean) before it can be registered to a channel.

Fires the `session-registered` event with the registered session as its first argument.

#### `Channel#deregister`: `(session: Session) => this`

Deregister a session so that it no longer receives events from this channel.

Note that sessions are automatically deregistered when they are disconnected.

Fires the `session-deregistered` event with the session as its first argument.

If the session was disconnected the channel will also fire the `session-disconnected` event with the disconnected session as its first argument beforehand.

#### `Channel#broadcast`: `(data: unknown[, eventName: string[, options: object]]) => this`

Broadcasts an event with the given name and data to every active session subscribed to the channel.

Under the hood this calls the [`push`](#session%23push%3A-(event%3A-string%2C-data%3A-any)-%3D>-this-%7C-(data%3A-any)-%3D>-this) method on every active session.

Emits the `broadcast` event with the given data and event name in that order.

|`options.`|Type|Default|Description|
|-|-|-|-|
|`filter`|`(session: Session) => boolean`||Filter sessions that should receive the event.<br><br>Called with each session and should return `true` to allow the event to be sent and otherwise return `false` to prevent the session from receiving the event.|

### `createChannel`: `<State>(...args: ConstructorParameters<typeof Channel>) => Channel`

Creates and returns an instance of a [Channel](#channel).

It takes the [same arguments as the Channel class](#new-channel()).
