import {Channel, ChannelEvents} from "./Channel";
import {Session} from "./Session";

interface HistoryEvent {
	data: unknown;
	name: string;
	id: string;
}

class History {
	private idToEvent = new Map<string, HistoryEvent>();
	private idToChannel = new Map<string, Channel>();
	private channelToIds = new Map<Channel, Set<string>>();
	private channelToListener = new Map<Channel, ChannelEvents["broadcast"]>();

	private addBroadcastListener = (channel: Channel): void => {
		const listener: ChannelEvents["broadcast"] = (
			data,
			eventName,
			eventId
		) => {
			this.addEvent(data, eventName, eventId, channel);
		};

		channel.on("broadcast", listener);

		this.channelToListener.set(channel, listener);
	};

	private removeBroadcastListener = (channel: Channel): void => {
		const listener = this.channelToListener.get(channel);

		if (!listener) {
			return;
		}

		channel.removeListener("broadcast", listener);

		this.channelToListener.delete(channel);
	};

	addEvent = (
		data: unknown,
		eventName: string,
		eventId: string,
		channel?: Channel
	): this => {
		this.idToEvent.set(eventId, {data, name: eventName, id: eventId});

		if (channel) {
			if (!this.channelToIds.has(channel)) {
				this.register(channel);
			}

			this.idToChannel.set(eventId, channel);
			(this.channelToIds.get(channel) as Set<string>).add(eventId);
		}

		return this;
	};

	removeEvent = (eventId: string): this => {
		this.idToEvent.delete(eventId);

		const channel = this.idToChannel.get(eventId);

		if (channel) {
			this.idToChannel.delete(eventId);
			(this.channelToIds.get(channel) as Set<string>).delete(eventId);
		}

		return this;
	};

	get events(): ReadonlyArray<HistoryEvent> {
		return Array.from(this.idToEvent.values());
	}

	getEvent = (id: string): HistoryEvent | null =>
		this.idToEvent.get(id) ?? null;

	register = (channel: Channel): this => {
		this.channelToIds.set(channel, new Set());

		this.addBroadcastListener(channel);

		return this;
	};

	deregister = (channel: Channel): this => {
		const ids = this.channelToIds.get(channel);

		if (ids) {
			for (const id of ids) {
				this.idToEvent.delete(id);
				this.idToChannel.delete(id);
			}
		}

		this.channelToIds.delete(channel);

		this.removeBroadcastListener(channel);

		return this;
	};

	pushSinceLastId = (session: Session): this => {
		const {lastId, push} = session;

		if (!this.idToEvent.has(lastId)) {
			return this;
		}

		const channelsWithSession = new Set<Channel>();

		for (const channel of this.channelToIds.keys()) {
			if (channel.activeSessions.includes(session)) {
				channelsWithSession.add(channel);
			}
		}

		let hasPassedLastEvent = false;

		for (const {data, name, id} of this.idToEvent.values()) {
			if (hasPassedLastEvent) {
				if (
					channelsWithSession.has(this.idToChannel.get(id) as Channel)
				) {
					push(data, name, id);
				}
			} else if (id === lastId) {
				hasPassedLastEvent = true;
			}
		}

		return this;
	};
}

export type {HistoryEvent};
export {History};
