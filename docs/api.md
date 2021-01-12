# API Documentation

## Exports

-   default
-   middleware
    -   express

## Classes

* [Session](#session)

### Session

*Abstract class*

A Session represents an open connection between the server and the client.

This is a general implementation that is then extended by adapters that implement the logic needed to interface with any given framework. Once extended via an adapter, a middleware can call upon the sub-classed Session which then performs the program logic that is made compatible with the framework.

`new Session([options])`

|`options.`|Type|Default|Description|
|-|-|-|-|
|`serializer`|`function`|`JSON.stringify`|Serialize data to a string that can be written over the wire.<br><br>Note that only values written with `.data()` or `.push()` are serialized, as everything else is assumed to already be a string.|
|`sanitizer`|`function`||Sanitize values so as to not prematurely dispatch events when writing fields whose text inadvertently contains newlines.<br><br>By default, CR, LF and CRLF characters are replaced with a single LF character (`\n`) and then any trailing LF characters are stripped so as to prevent a blank line being written and accidentally dispatching the event before `.dispatch()` is called.|
|`trustClientEventId`|`boolean`|`true`|Whether to trust the last event ID given by the client in the `Last-Event-ID` request header.<br><br>When set to `false`, the `lastId` property will always be initialized to an empty string.|
|`retry`|`number` \| `null`|`2000`|Time in milliseconds for the client to wait before attempting to reconnect if the connection is closed.<br><br>This is equivalent to immediately calling `.retry().dispatch()` after a connection is made.<br><br>Give as `null` to avoid sending an explicit reconnection time and allow the client browser to decide itself.|
