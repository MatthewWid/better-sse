import EventSource from "eventsource";

export interface ClientPoolOptions {
	port: number;
	numberOfClients?: number;
}

export const createClientPool = async ({
	port,
	numberOfClients = 1,
}: ClientPoolOptions): Promise<() => void> => {
	const sources = new Set<EventSource>();
	const listeners = new Set<Promise<unknown>>();

	for (let index = 0; index < numberOfClients; ++index) {
		const eventsource = new EventSource(`http://localhost:${port}`);
		const listener = new Promise((resolve) =>
			eventsource.addEventListener("open", resolve)
		);

		sources.add(eventsource);
		listeners.add(listener);
	}

	await Promise.all(listeners);

	return () => {
		for (const eventsource of sources) {
			eventsource.close();
		}
	};
};
