# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Fixed

* Fixed default state type when creating sessions and channels with `createSession` and `createChannel` being set to `unknown` instead of `DefaultSessionState` and `DefaultChannelState`, respectively.
* Fixed package directly exporting a single object containing exports, breaking named imports when using ESModules, and instead dual-export two separate builds to support both ESM and CJS.

### Removed

* Dropped support for Node 17 and below.

## 0.13.0 - 2024-08-23

### Added

* Added the ability to set an initial value for the `state` property in the `Session` and `Channel` constructor `options` objects.

### Removed

* Removed constraints that enforced that `State` generics passed to `Session` and `Channel` extend from `Record<string, unknown>`.

## 0.12.1 - 2024-05-24

### Fixed

* Fixed types for channel and session emitted event names.

## 0.12.0 - 2024-05-10

### Added

* Added the ability to set a custom event ID when using [`Channel#broadcast`](./docs/api.md#channelbroadcast-data-unknown-eventname-string-options-object--this).

## 0.11.0 - 2024-02-08

### Added

* Added the [`SseError`](./docs/api.md#sseerror) custom error object that wraps all thrown errors.

### Changed

* Update the [`Session#push`](./docs/api.md#sessionpush-data-unknown-eventname-string-eventid-string--this) method to throw if the session is not connected.

### Fixed

* Fixed session not detecting a response stream disconnect.

## 0.10.0 - 2023-09-28

### Added

* Added the [`Session#batch`](./docs/api.md#sessionbatch-batcher-eventbuffer--buffer-eventbuffer--void--promisevoid--promisevoid) method that can be used to batch multiple events into a single transmission over the wire.
* Added the [`EventBuffer`](./docs/api.md#eventbuffer) class that can be used to write raw spec-compliant SSE fields into a text buffer that can be sent directly over the wire.

### Deprecated

* Deprecate the [Session](./docs/api.md#session) `.event`, `.data`, `.id`, `.retry`, `.comment`, `.dispatch` and `.flush` methods in favour of using [event buffers](./docs/api.md#eventbuffer) instead.

## 0.9.0 - 2023-08-14

### Added

* Added the ability to type the `state` property of sessions registered with a [Channel](./docs/api.md#channel) via an optional second generic argument to the `Channel` constructor.
* Added the [`DefaultChannelState` interface](./docs/api.md#channelstate-state) that may be used via module augmentation to alter the default channel state type for all channels.

### Changed

* Update the [`SessionState` interface](docs/api.md#sessionstate-state) to be named `DefaultSessionState`.

## 0.8.0 - 2022-06-02

### Added

* Added an internal data buffer to [Session](./docs/api.md#session) that buffers written data internally until it is flushed to the client using the new [`Session#flush`](./docs/api.md#sessionflush---this) method.
* Added the `Pragma`, `X-Accel-Buffering` headers and add additional values to the `Cache-Control` default header to further disable all forms of caching.
* Added support for supplying the [Node HTTP/2 compatibility API](https://nodejs.org/api/http2.html#compatibility-api) `Http2ServerRequest` and `Http2ServerResponse` objects to the [`Session`](./docs/api.md#session) constructor `req` and `res` parameters, respectively.

### Changed

* Update the [`Session#event`](./docs/api.md#sessionevent-type-string--this), [`Session#data`](./docs/api.md#sessiondata-data-any--this), [`Session#id`](./docs/api.md#sessionid-id-string--this), [`Session#retry`](./docs/api.md#sessionretry-time-number--this) and [`Session#comment`](./docs/api.md#sessioncomment-text-string--this) methods to write to the internal data buffer instead of sending the field data over the wire immediately.
* Update the [`Session#dispatch`](./docs/api.md#sessiondispatch---this) method to only write a newline (and to the internal data buffer) and not flush the written data to the client.
* Update the [`Channel#broadcast`](./docs/api.md#channelbroadcast-data-unknown-eventname-string-options-object--this) method to generate its own custom event ID and thus add it as an additional argument to its `broadcast` event callback function.
* Update the [`Channel#register`](./docs/api.md#channelregister-session-session--this) and [`Channel#deregister`](./docs/api.md#channelderegister-session-session--this) to not do anything if the channel is already registered or deregistered, respectively.
* Update the [`Session` constructor options `header` field](./docs/api.md#session) to overwrite conflicting default headers instead of being ignored.
* Update auto-generated event IDs to be guaranteed to be a cryptographically unique string instead of a pseudorandomly generated string of eight characters.

### Fixed

* Fixed the Channel `session-disconnected` being fired after instead of before the session is deregistered.

### Removed

* Removed the ability to pass `null` to [`Session#id`](./docs/api.md#sessionid-id-string--this). Give no arguments at all instead.

## 0.7.1 - 2022-01-11

### Fixed

* Removed type-declarations generated from unit testing files.

## 0.7.0 - 2022-01-08

### Added

* Added the ability to the [`Session#push`](./docs/api.md#sessionpush-data-unknown-eventname-string-eventid-string--this) method to set a custom event ID.
* Added a new Session `push` event that is emitted with the event data, name and ID when the [`Session#push`](./docs/api.md#sessionpush-data-unknown-eventname-string-eventid-string--this) method is called.
* Added the `Channel#state` property to have a safe namespace for keeping information attached to the channel.

### Changed

* Update the arguments for the [`Session#push`](./docs/api.md#sessionpush-data-unknown-eventname-string-eventid-string--this) and [`Channel#broadcast`](#channelbroadcast-data-unknown-eventname-string-options-object--this) methods and their corresponding emitted event callbacks to always have the event data first and event name as an optional argument second.
* Update the [`Channel#broadcast`](#channelbroadcast-data-unknown-eventname-string-options-object--this) method options TypeScript typings to explicitly mandate a `boolean` return-type instead of allowing any truthy or falsy value.
* Update the [`Channel#broadcast`](#channelbroadcast-data-unknown-eventname-string-options-object--this) method event name argument to be optional and default to `"message"` if not given.
* Update the [`Session#state`](./docs/api.md#sessionstate-) generic argument to default to a new `SessionState` interface that can be augmented via [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) to override the session state type for all session objects without explicitly providing a generic argument to each reference to `Session`.
* Rename the Session and Channel `Events` interfaces to `SessionEvents` and `ChannelEvents` respectively and export them publicly allowing the user to properly type non-inlined event handler callback functions.

## 0.6.0 - 2021-10-28

### Added

* Added the [`Session#iterate`](./docs/api.md#sessioniterate-iterable-iterable--asynciterable-options--promisevoid) method that allows processing iterables and sending yielded values to the client as events.
* Added types for `Session` and `Channel` event listener callback function arguments.
* Added the ability to type `Session#state` using an optional generic argument for `createSession` and the `Session` constructor.

### Changed

* Rename the [`Session#stream`](./docs/api.md#sessionstream-stream-readable-options--promiseboolean) `event` option to `eventName`.

## 0.5.0 - 2021-07-17

### Added

* Added [broadcast channels](./docs/channels.md) that allow pushing events to multiple sessions at once.
* Added support for EventSource polyfills [`event-source-polyfill`](https://www.npmjs.com/package/event-source-polyfill) and [`eventsource-polyfill`](https://www.npmjs.com/package/eventsource-polyfill).
* Added the [`Session#state`](./docs/api.md#sessionstate-) property to have a safe namespace for keeping information attached to the session.

### Fixed

* Fixed TypeScript types for the [`Session#lastId`](./docs/api.md#sessionlastid-string) not being read-only.

## 0.4.0 - 2021-07-09

### Added

* Added an automated [keep-alive mechanism](./docs/api.md#new-sessionreq-incomingmessage-res-serverresponse-options--) that can be enabled or disable in the Session constructor options.
* Added the [`Session#isConnected`](#sessionisconnected-boolean) boolean property.

### Fixed

* Fixed an issue where installing the package using `npm` would throw an error mandating it be installed with `pnpm`.
