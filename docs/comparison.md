# Comparison with Other Tools

This section compares Better SSE with other server-sent event libraries for Node.

Better SSE was designed to be the easiest to use but still the most flexible and powerful solution to SSE over all other existing solutions.

TL/DR: Better SSE supports all\* the features that other competing libraries do and much more. It is TypeScript-first, very well tested, scalable and much more flexible than others whilst *still* having a simpler interface than most.

|Feature|[`better-sse`](https://www.npmjs.com/package/better-sse)|[`sse-channel`](https://www.npmjs.com/package/sse-channel)|[`sse`](https://www.npmjs.com/package/sse)|[`express-sse`](https://www.npmjs.com/package/express-sse)|[`server-sent-events`](https://www.npmjs.com/package/server-sent-events)|[`easy-server-sent-events`](https://www.npmjs.com/package/easy-server-sent-events)|
|-|:-:|:-:|:-:|:-:|:-:|:-:|
|Send events to individual clients|✔|✔|✔|✔|✔|✔|
|Send events to multiple clients at once|✔|✔|❌|❌|❌|✔|
|Send/Modify individual fields|✔|✔|❌|❌|✔|❌|
|Framework independent|✔|✔|✔|❌|❌|❌|
|TypeScript types|✔|❌|❌|❌|❌|❌|
|[`EventSource` polyfill support](https://www.npmjs.com/package/event-source-polyfill)|✔|✔|❌|❌|✔|❌|
|Automatic connection keep-alive|✔|✔|❌|✔|✔|❌|
|Serialize data as JSON|✔|✔|❌|✔|❌|✔|
|Sanitize newlines from data|✔|✔|✔|✔|❌|❌|
|Ignore client-given last event ID|✔|❌|❌|❌|❌|❌|
|Event history maintenance|❌|✔|❌|❌|❌|❌|
|Modify response headers|✔|❌|❌|✔|❌|❌|
|Modify response status code|✔|❌|❌|✔|❌|❌|

\* Except event history maintenance... [Coming soon](https://github.com/MatthewWid/better-sse/issues/16)!
