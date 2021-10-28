import EventEmitter from "events";

export interface EventMap {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[name: string | symbol]: (...args: any[]) => void;
}

/**
 * Wraps the EventEmitter class to add types that map event names
 * to types of arguments in the event handler callback.
 */
export class TypedEmitter<Events extends EventMap> extends EventEmitter {
	addListener<EventName extends keyof Events>(
		event: EventName,
		listener: Events[EventName]
	): this {
		return super.addListener(event as string, listener);
	}

	prependListener<EventName extends keyof Events>(
		event: EventName,
		listener: Events[EventName]
	): this {
		return super.prependListener(event as string, listener);
	}

	prependOnceListener<EventName extends keyof Events>(
		event: EventName,
		listener: Events[EventName]
	): this {
		return super.prependOnceListener(event as string, listener);
	}

	on<EventName extends keyof Events>(
		event: EventName,
		listener: Events[EventName]
	): this {
		return super.on(event as string, listener);
	}

	once<EventName extends keyof Events>(
		event: EventName,
		listener: Events[EventName]
	): this {
		return super.once(event as string, listener);
	}

	emit<EventName extends keyof Events>(
		event: EventName,
		...args: Parameters<Events[EventName]>
	): boolean {
		return super.emit(event as string, ...args);
	}

	off<EventName extends keyof Events>(
		event: EventName,
		listener: Events[EventName]
	): this {
		return super.off(event as string, listener);
	}

	removeListener<EventName extends keyof Events>(
		event: EventName,
		listener: Events[EventName]
	): this {
		return super.removeListener(event as string, listener);
	}
}
