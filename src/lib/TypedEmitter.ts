import {EventEmitter} from "node:events";

export interface EventMap {
	// biome-ignore lint/suspicious/noExplicitAny: must be `any` to allow coercion, `unknown` does not work
	[name: string | symbol]: (...args: any[]) => void;
}

/**
 * Get event names type
 */
type EventNames<T> =
	| keyof {
			[K in keyof T as string extends K
				? never
				: number extends K
					? never
					: K]: never;
	  }
	| (string & {});

/**
 * Wraps the EventEmitter class to add types that map event names
 * to types of arguments in the event handler callback.
 */
export class TypedEmitter<Events extends EventMap> extends EventEmitter {
	addListener<EventName extends EventNames<Events>>(
		event: EventName,
		listener: Events[EventName]
	): this {
		return super.addListener(event as string, listener);
	}

	prependListener<EventName extends EventNames<Events>>(
		event: EventName,
		listener: Events[EventName]
	): this {
		return super.prependListener(event as string, listener);
	}

	prependOnceListener<EventName extends EventNames<Events>>(
		event: EventName,
		listener: Events[EventName]
	): this {
		return super.prependOnceListener(event as string, listener);
	}

	on<EventName extends EventNames<Events>>(
		event: EventName,
		listener: Events[EventName]
	): this {
		return super.on(event as string, listener);
	}

	once<EventName extends EventNames<Events>>(
		event: EventName,
		listener: Events[EventName]
	): this {
		return super.once(event as string, listener);
	}

	emit<EventName extends EventNames<Events>>(
		event: EventName,
		...args: Parameters<Events[EventName]>
	): boolean {
		return super.emit(event as string, ...args);
	}

	off<EventName extends EventNames<Events>>(
		event: EventName,
		listener: Events[EventName]
	): this {
		return super.off(event as string, listener);
	}

	removeListener<EventName extends EventNames<Events>>(
		event: EventName,
		listener: Events[EventName]
	): this {
		return super.removeListener(event as string, listener);
	}
}
