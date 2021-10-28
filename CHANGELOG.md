# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

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
