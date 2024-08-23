import {Session, Channel, createChannel} from "better-sse";

class PubSub {
	private events = new Map<string, Channel>();

	subscribe(session: Session, event: string): void {
		if (!this.events.has(event)) {
			const newChannel = createChannel();

			this.events.set(event, newChannel);

			// Clean up channel if no more subscribers
			newChannel.on("session-deregistered", () => {
				if (newChannel.sessionCount === 0) {
					this.events.delete(event);
				}
			});
		}

		const channel = this.events.get(event) as Channel;

		channel.register(session);
	}

	unsubscribe(session: Session, event: string): void {
		const channel = this.events.get(event);

		if (channel) {
			channel.deregister(session);
		}
	}

	publish(data: unknown, event: string): void {
		const channel = this.events.get(event);

		if (channel) {
			channel.broadcast(data, event);
		}
	}
}

export {PubSub};
