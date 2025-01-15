import {EventSource} from "eventsource";

const createEventSource = (port: number) => {
	const url = `http://localhost:${port}`;
	const eventSource = new EventSource(url);

	return new Promise<EventSource>((resolve, reject) => {
		eventSource.addEventListener("open", () => resolve(eventSource));
		eventSource.addEventListener("error", (error) => reject(error.message));
	});
};

export {createEventSource};
