import EventEmitter from "events";
import Session from "./Session";

/**
 * A Channel is used to broadcast events to many sessions at once.
 *
 * It extends from the {@link https://nodejs.org/api/events.html#events_class_eventemitter | EventEmitter} class.
 */
class Channel extends EventEmitter {
	private sessions: Session[] = [];

	/**
	 * List of the currently active sessions subscribed to this channel.
	 */
	get activeSessions(): Session[] {
		return this.sessions;
	}

	/**
	 * Number of sessions subscribed to this channel.
	 */
	get sessionCount(): number {
		return this.sessions.length;
	}

	/**
	 * Register a session so that it can start receiving events from this channel.
	 *
	 * @param session - Session to register.
	 */
	register(session: Session): void {
		if (!session.isConnected) {
			throw new Error("Cannot register a non-active session.");
		}

		session.once("disconnected", () => {
			this.deregister(session);
		});

		this.sessions.push(session);
	}

	/**
	 * Deregister a session so that it no longer receives events from this channel.
	 *
	 * @param session - Session to deregister.
	 */
	deregister(session: Session): void {
		this.sessions = this.sessions.filter((current) => current !== session);
	}

	/**
	 * Push an event to every active session on this channel.
	 *
	 * Takes the same arguments as the `Session#push` method.
	 */
	push(...args: Parameters<Session["push"]>): void {
		for (const session of this.sessions) {
			session.push(...args);
		}
	}
}

export default Channel;
