import {createChannel} from "better-sse";

/**
 * Create a channel that allows you to broadcast messages
 * to multiple sessions at once.
 */
const ticker = createChannel();

/**
 * Count upwards and broadcast the count to every client once per second.
 */
let count = 0;

setInterval(() => {
	ticker.broadcast("tick", count++);
}, 1000);

/**
 * Keep track of how many clients are subscribed to the channel, and
 * inform existing clients of the count every time a session
 * is registered and deregistered.
 */
let activeSessions = 0;

ticker.on("session-registered", () => {
	ticker.broadcast("session-count", ++activeSessions);
});

ticker.on("session-deregistered", () => {
	ticker.broadcast("session-count", --activeSessions);
});

export default ticker;
