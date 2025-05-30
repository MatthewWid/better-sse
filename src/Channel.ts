import type {DefaultSessionState, Session} from "./Session";
import {SseError} from "./utils/SseError";
import {type EventMap, TypedEmitter} from "./utils/TypedEmitter";

interface ChannelOptions<State = DefaultChannelState> {
	/**
	 * Custom state for this channel.
	 *
	 * Use this object to safely store information related to the channel.
	 */
	state?: State;
}

interface BroadcastOptions<SessionState = DefaultSessionState> {
	/**
	 * Unique ID for the event being broadcast.
	 *
	 * If no event ID is given, the event ID is set to a randomly generated UUIDv4.
	 */
	eventId?: string;

	/**
	 * Filter sessions that should receive the event.
	 *
	 * Called with each session and should return `true` to allow the event to be sent and otherwise return `false` to prevent the session from receiving the event.
	 */
	filter?: (session: Session<SessionState>) => boolean;
}

interface ChannelEvents<SessionState = DefaultSessionState> extends EventMap {
	"session-registered": (session: Session<SessionState>) => void;
	"session-deregistered": (session: Session<SessionState>) => void;
	"session-disconnected": (session: Session<SessionState>) => void;
	broadcast: (data: unknown, eventName: string, eventId: string) => void;
}

interface DefaultChannelState {
	[key: string]: unknown;
}

/**
 * A `Channel` is used to broadcast events to many sessions at once.
 *
 * It extends from the {@link https://nodejs.org/api/events.html#events_class_eventemitter | EventEmitter} class.
 *
 * You may use the second generic argument `SessionState` to enforce that only sessions with the same state type may be registered with this channel.
 */
class Channel<
	State = DefaultChannelState,
	SessionState = DefaultSessionState,
> extends TypedEmitter<ChannelEvents<SessionState>> {
	/**
	 * Custom state for this channel.
	 *
	 * Use this object to safely store information related to the channel.
	 */
	state: State;

	private sessions = new Set<Session<SessionState>>();

	constructor(options: ChannelOptions<State> = {}) {
		super();

		this.state = options.state ?? ({} as State);
	}

	/**
	 * List of the currently active sessions subscribed to this channel.
	 */
	get activeSessions(): ReadonlyArray<Session<SessionState>> {
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
	 * If the session was already registered to begin with this method does nothing.
	 *
	 * @param session - Session to register.
	 */
	register(session: Session<SessionState>): this {
		if (this.sessions.has(session)) {
			return this;
		}

		if (!session.isConnected) {
			throw new SseError("Cannot register a non-active session.");
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
	deregister(session: Session<SessionState>): this {
		if (!this.sessions.has(session)) {
			return this;
		}

		this.sessions.delete(session);

		this.emit("session-deregistered", session);

		return this;
	}

	/**
	 * Broadcast an event to every active session registered with this channel.
	 *
	 * Under the hood this calls the `push` method on every active session.
	 *
	 * If no event name is given, the event name is set to `"message"`.
	 *
	 * Note that the broadcasted event will have the same ID across all receiving sessions instead of generating a unique ID for each.
	 *
	 * @param data - Data to write.
	 * @param eventName - Event name to write.
	 */
	broadcast = (
		data: unknown,
		eventName = "message",
		options: BroadcastOptions<SessionState> = {}
	): this => {
		const eventId = options.eventId ?? crypto.randomUUID();

		const sessions = options.filter
			? this.activeSessions.filter(options.filter)
			: this.sessions;

		for (const session of sessions) {
			session.push(data, eventName, eventId);
		}

		this.emit("broadcast", data, eventName, eventId);

		return this;
	};
}

export type {
	ChannelOptions,
	BroadcastOptions,
	ChannelEvents,
	DefaultChannelState,
};
export {Channel};
