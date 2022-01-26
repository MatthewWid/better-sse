import {TypedEmitter, EventMap} from "./lib/TypedEmitter";
import {generateId} from "./lib/generateId";
import {Session} from "./Session";

interface BroadcastOptions {
	/**
	 * Filter sessions that should receive the event.
	 *
	 * Called with each session and should return `true` to allow the event to be sent and otherwise return `false` to prevent the session from receiving the event.
	 */
	filter?: (session: Session) => boolean;
}

interface ChannelEvents extends EventMap {
	"session-registered": (session: Session) => void;
	"session-deregistered": (session: Session) => void;
	"session-disconnected": (session: Session) => void;
	broadcast: (data: unknown, eventName: string, eventId: string) => void;
}

/**
 * A Channel is used to broadcast events to many sessions at once.
 *
 * It extends from the {@link https://nodejs.org/api/events.html#events_class_eventemitter | EventEmitter} class.
 */
class Channel<
	State extends Record<string, unknown> = Record<string, unknown>
> extends TypedEmitter<ChannelEvents> {
	/**
	 * Custom state for this channel.
	 * Use this object to safely store information related to the channel.
	 */
	state = {} as State;

	private sessions = new Set<Session>();

	constructor() {
		super();
	}

	/**
	 * List of the currently active sessions subscribed to this channel.
	 */
	get activeSessions(): ReadonlyArray<Session> {
		return Array.from(this.sessions);
	}

	/**
	 * Number of sessions subscribed to this channel.
	 */
	get sessionCount(): number {
		return this.sessions.size;
	}

	/**
	 * Register a session so that it can start receiving events from this channel.
	 *
	 * If the session is already registered this method does nothing.
	 *
	 * @param session - Session to register.
	 */
	register(session: Session): this {
		if (this.sessions.has(session)) {
			return this;
		}

		if (!session.isConnected) {
			throw new Error("Cannot register a non-active session.");
		}

		session.once("disconnected", () => {
			this.emit("session-disconnected", session);

			this.deregister(session);
		});

		this.sessions.add(session);

		this.emit("session-registered", session);

		return this;
	}

	/**
	 * Deregister a session so that it no longer receives events from this channel.
	 *
	 * If the session was not registered to begin with this method does nothing.
	 *
	 * @param session - Session to deregister.
	 */
	deregister(session: Session): this {
		if (!this.sessions.has(session)) {
			return this
		}

		this.sessions.delete(session);

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

		const eventId = generateId();

		const sessions = options.filter
			? Array.from(this.sessions).filter(options.filter)
			: this.sessions;

		for (const session of sessions) {
			session.push(data, eventName, eventId);
		}

		this.emit("broadcast", data, eventName, eventId);

		return this;
	};
}

export type {BroadcastOptions, ChannelEvents};
export {Channel};
