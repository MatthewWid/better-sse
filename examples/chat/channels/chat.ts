import {createChannel} from "better-sse";

type Message = {
	username: string;
	content: string;
};

type ChannelState = {
	history: Message[];
};

type SessionState = {
	username: string;
};

export const chatChannel = createChannel<ChannelState, SessionState>({
	state: {
		history: [],
	},
});

chatChannel.on("session-registered", (session) => {
	chatChannel.broadcast(session.state.username, "user-joined");
});

chatChannel.on("session-deregistered", (session) => {
	chatChannel.broadcast(session.state.username, "user-left");
});
