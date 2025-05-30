class SseError extends Error {
	constructor(message: string) {
		super(message);
		this.message = `better-sse: ${message}`;
	}
}

export {SseError};
