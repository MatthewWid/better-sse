import type { IncomingMessage } from "node:http";

export const createRequest = (req: IncomingMessage | Request): Request => {
	if (req instanceof Request) {
		return req.clone();
	}

	const url = `http://${req.headers.host}${req.url}`;

	const controller = new AbortController();

	req.once("close", () => {
		controller.abort();
	});

	const request = new Request(url, {
		method: req.method,
		headers: req.headers as Record<string, string>,
		signal: controller.signal,
	});

	return request;
};
