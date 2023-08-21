import express from "express";
import EventSource from "eventsource";
import {
	createChannel,
	createSession,
	createHistory,
	DefaultChannelState,
	DefaultSessionState,
} from "./src/index";
import {getUrl} from "./src/lib/testUtils";

interface SessionState extends DefaultSessionState {
	id: string;
}

const app = express();

const channel = createChannel<DefaultChannelState, SessionState>();

const history = createHistory();

history.register(channel);

channel.broadcast("one").broadcast("two").broadcast("three");

const [{id: firstEventId}, {id: secondEventId}, {id: thirdEventId}] =
	history.getEvents();

app.get("/sse", async (req, res) => {
	const session = await createSession<SessionState>(req, res, {
		trustClientEventId: false,
	});

	session.lastId = firstEventId;

	channel.register(session);

	history.replay(session);

	session.push(null, "done");
});

const server = app.listen(8080, () => {
	const url = getUrl(server);

	const eventSource = new EventSource(`${url}/sse`);

	eventSource.addEventListener("message", ({data}) => {
		console.log({message: JSON.parse(data)});
	});

	eventSource.addEventListener("done", () => {
		eventSource.close();
		server.close();
	});
});
