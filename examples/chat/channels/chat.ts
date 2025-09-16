import {createChannel} from "better-sse";

type EventData = unknown;

type EventName = string;

type EventId = string;

type HistoryItem = [EventData, EventName, EventId];

type ChannelState = {
	history: HistoryItem[];
};

type SessionState = {
	username: string;
};

export const chatChannel = createChannel<ChannelState, SessionState>({
	state: {
		history: [],
	},
});

chatChannel.on("session-registered", async (session) => {
	await session.batch((buffer) => {
		for (const args of chatChannel.state.history) {
			buffer.push(...args);
		}
	});

	chatChannel.broadcast(session.state.username, "user-joined");
});

chatChannel.on("session-deregistered", (session) => {
	chatChannel.broadcast(session.state.username, "user-left");
});

chatChannel.on("broadcast", (...args) => {
	chatChannel.state.history.push(args);
});
