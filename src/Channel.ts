import {TypedEmitter, EventMap} from "./lib/TypedEmitter";
import {Session} from "./Session";

interface BroadcastOptions {
	/**
	 * Filter sessions that should receive the event.
	 *
	 * Called with each session and should return `true` to allow the event to be sent and otherwise return `false` to prevent the session from receiving the event.
	 */
	filter?: (session: Session) => boolean;
}

interface Events extends EventMap {
	"session-registered": (session: Session) => void;
	"session-deregistered": (session: Session) => void;
	"session-disconnected": (session: Session) => void;
	broadcast: (data: unknown, eventName: string) => void;
}

/**
 * A Channel is used to broadcast events to many sessions at once.
 *
 * It extends from the {@link https://nodejs.org/api/events.html#events_class_eventemitter | EventEmitter} class.
 */
class Channel extends TypedEmitter<Events> {
	private sessions: Session[] = [];

	constructor() {
		super();
	}

	/**
	 * List of the currently active sessions subscribed to this channel.
	 */
	get activeSessions(): ReadonlyArray<Session> {
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
	register(session: Session): this {
		if (!session.isConnected) {
			throw new Error("Cannot register a non-active session.");
		}

		session.once("disconnected", () => {
			this.deregister(session);

			this.emit("session-disconnected", session);
		});

		this.sessions.push(session);

		this.emit("session-registered", session);

		return this;
	}

	/**
	 * Deregister a session so that it no longer receives events from this channel.
	 *
	 * @param session - Session to deregister.
	 */
	deregister(session: Session): this {
		this.sessions = this.sessions.filter((current) => current !== session);

		this.emit("session-deregistered", session);

		return this;
	}

	/**
	 * Push an event to every active session on this channel.
	 *
	 * Takes the same arguments as the `Session#push` method.
	 */
	broadcast = (
		data: unknown,
		eventName?: string,
		options: BroadcastOptions = {}
	): this => {
		if (!eventName) {
			eventName = "message";
		}

		for (const session of this.sessions) {
			if (options.filter && !options.filter(session)) {
				continue;
			}

			session.push(data, eventName);
		}

		this.emit("broadcast", data, eventName);

		return this;
	};
}

export type {BroadcastOptions};
export {Channel};
