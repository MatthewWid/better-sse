import type {EventSource} from "eventsource";
import {createEventSource} from "./createEventSource";

export type CleanupClientPool = () => void;

export const createClientPool = async (
	port: number,
	numberOfClients = 1
): Promise<CleanupClientPool> => {
	const listeners = new Set<Promise<EventSource>>();

	for (let index = 0; index < numberOfClients; ++index) {
		listeners.add(createEventSource(port));
	}

	const sources = await Promise.all(listeners);

	return () => {
		for (const eventsource of sources) {
			eventsource.close();
		}
	};
};
