import {Channel, ChannelEvents} from "./Channel";
import {Session} from "./Session";

type Event = [unknown, string, string];

class History {
	private idToEvent = new Map<string, Event>();
	private idToChannel = new Map<string, Channel>();
	private channelToIds = new Map<Channel, string[]>();
	private channelToListener = new Map<Channel, ChannelEvents["broadcast"]>();

	private addBroadcastListener = (channel: Channel): void => {
		const listener: ChannelEvents["broadcast"] = (
			data,
			eventName,
			eventId
		) => {
			this.addEvent(data, eventName, eventId);
			this.idToChannel.set(eventId, channel);
			this.channelToIds.get(channel)?.push(eventId);
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

	get events(): ReadonlyArray<Event> {
		return Array.from(this.idToEvent.values());
	}

	addEvent = (data: unknown, name: string, id: string): this => {
		this.idToEvent.set(id, [data, name, id]);

		return this;
	};

	register = (channel: Channel): this => {
		this.channelToIds.set(channel, []);

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

		for (const [data, name, id] of this.idToEvent.values()) {
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

export {History};
