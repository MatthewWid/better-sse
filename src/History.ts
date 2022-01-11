import {Channel} from "./Channel";
import {Session} from "./Session";

interface Event {
	data: unknown;
	name: string;
	id: string;
}

class History {
	private idToEvent = new Map<string, Event>();
	private idToChannel = new Map<string, Channel>();
	private channelToIds = new Map<Channel, string[]>();

	get allEvents(): ReadonlyArray<Event> {
		return Array.from(this.idToEvent.values());
	}

	addEvent = (
		data: unknown,
		name: string,
		id: string,
		channel: Channel
	): this => {
		this.idToEvent.set(id, {data, name, id});
		this.idToChannel.set(id, channel);
		this.channelToIds.get(channel)?.push(id);

		return this;
	};

	register = (channel: Channel): this => {
		this.channelToIds.set(channel, []);

		channel.on("broadcast", (data, eventName, eventId) => {
			this.addEvent(data, eventName, eventId, channel);
		});

		return this;
	};

	pushSinceLastId = (session: Session): this => {
		const {lastId} = session;

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
					session.push(data, name, id);
				}
			} else if (id === lastId) {
				hasPassedLastEvent = true;
			}
		}

		return this;
	};
}

export {History};
