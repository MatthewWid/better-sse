# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

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
* Added support for EventStream polyfills [`event-source-polyfill`](https://www.npmjs.com/package/event-source-polyfill) and [`eventsource-polyfill`](https://www.npmjs.com/package/eventsource-polyfill).
* Added the [`Session#state`](./docs/api.md#sessionstate-) property to have a safe namespace for keeping information attached to the session.

### Fixed

* Fixed TypeScript types for the [`Session#lastId`](./docs/api.md#sessionlastid-string) not being read-only.

## 0.4.0 - 2021-07-09

### Added

* Added an automated [keep-alive mechanism](./docs/api.md#new-sessionreq-incomingmessage-res-serverresponse-options--) that can be enabled or disable in the Session constructor options.
* Added the [`Session#isConnected`](#sessionisconnected-boolean) boolean property.

### Fixed

* Fixed an issue where installing the package using `npm` would throw an error mandating it be installed with `pnpm`.
