export interface SessionOptions {}

/**
 * A session represents an open connection between the server and the client.
 *
 * It is a general implementation that is then extended by adapters the implement the logic needed to interface with any given framework.
 */
abstract class Session {
	constructor(options: SessionOptions = {}) {}
}

export default Session;
