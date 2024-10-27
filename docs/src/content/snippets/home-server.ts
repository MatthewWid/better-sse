import { createSession } from "better-sse"

app.get("/sse", async (req, res) => {
	const session = await createSession(req, res)
	session.push("Hello world!")
})
