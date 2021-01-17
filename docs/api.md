# API Documentation

## Table of Contents

### Exports

* [default](#middleware.express)
* [middleware](#middleware)
	* [express](#express)

### Classes

* [Session](#session)

### Middlewares

* express

## Documentation

### Session

*Abstract class*

A Session represents an open connection between the server and the client.

This is a general implementation that is then extended by adapters that implement the logic needed to interface with any given framework. Once extended via an adapter, a middleware can call upon the sub-classed Session which then performs the program logic that is made compatible with the framework.

#### `new Session([options])`

|`options.`|Type|Default|Description|
|-|-|-|-|
|`serializer`|`function`|`JSON.stringify`|Serialize data to a string that can be written over the wire.<br><br>Note that only values written with `.data()` or `.push()` are serialized, as everything else is assumed to already be a string.|
|`sanitizer`|`function`||Sanitize values so as to not prematurely dispatch events when writing fields whose text inadvertently contains newlines.<br><br>By default, CR, LF and CRLF characters are replaced with a single LF character (`\n`) and then any trailing LF characters are stripped so as to prevent a blank line being written and accidentally dispatching the event before `.dispatch()` is called.|
|`trustClientEventId`|`boolean`|`true`|Whether to trust the last event ID given by the client in the `Last-Event-ID` request header.<br><br>When set to `false`, the `lastId` property will always be initialized to an empty string.|
|`retry`|`number` \| `null`|`2000`|Time in milliseconds for the client to wait before attempting to reconnect if the connection is closed.<br><br>This is equivalent to immediately calling `.retry().dispatch()` after a connection is made.<br><br>Give as `null` to avoid sending an explicit reconnection time and allow the client browser to decide itself.|
|`statusCode`|`number`|`200`|Status code to be sent to the client. Event stream requests can be redirected using HTTP 301 and 307 redirects. Make sure to set `Location` header when using these status codes(301/307) using the `headers` property. A client can be told to stop reconnecting by using 204 status code.|
|`headers`|`Record<string, string>`|`{}`|Headers to be sent along with the initial response. Refer to the [example](#custom-headers-and-status-code-example) below for custom headers|
#### `Session#lastId`: `string`

The last ID sent to the client.

This is initialized to the last event ID given by the user (in the `Last-Event-ID` header), and otherwise is equal to the last number given to the `.id` method.

#### `Session#dispatch`: `() => this`

Flush the buffered data to the client by writing an additional newline.

#### `Session#event`: `(type: string) => this`

Set the event to the given name (also referred to as "type" in the specification).

#### `Session#data`: `(data: any) => this`

Write arbitrary data onto the wire.

The given value is automatically serialized to a string using the `serializer` function, and other defaults to [JSON stringification](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify).

#### `Session#id`: `(id: string | null) => this`

Set the event ID to the given string.

Passing `null` will set the event ID to an empty string value.

#### `Session#retry`: `(time: number) => this`

Set the suggested reconnection time to the given milliseconds.

#### `Session#comment`: `(text: string) => this`

Write a comment (an ignored field).

This will not fire an event, but is often used to keep the connection alive.

#### `Session#push`: `(event: string, data: any) => this` | `(data: any) => this`

Create and dispatch an event with the given data all at once.

This is equivalent to calling `.event()`, `.id()`, `.data()` and `.dispatch()` in that order.

If no event name is given, the event name (type) is set to `"message"`.

Note that this sets the event ID (and thus the [`lastId` property](#session%23lastid%3A-string)) to a string of eight random characters (`a-z0-9`).

#### `Session#stream`: `(stream: Readable[, options]) => Promise<boolean>`

Pipe readable stream data to the client.

Each data emission by the stream emits a new event that is dispatched to the client.

|`options.`|Type|Default|Description|
|-|-|-|-|
|`event`|`string`|`"stream"`|Event name/type to use when dispatching a data event from the stream to the client.|

### middleware

#### express

*Express middleware factory function*

Create and return an Express middleware that attaches the [SSE session object](#session) to the `sse` property of the `res` object.

Additionally, it directly modifies the `res` object to add the `push` method that is an alias to [Session#push](#session%23push%3A-(event%3A-string%2C-data%3A-any)-%3D>-this-%7C-(data%3A-any)-%3D>-this), and the `stream` method that is an alias to.

### Custom Headers and Status Code Example
```javascript
app.get("/sse", sse({ headers: { Location: '/sse2' }, statusCode: 307 }), (req, res) => {
	// temporary redirect to /sse2
});

app.get('/sse2', sse(), (req, res) => {
	res.push("ping", "hello")
})
```