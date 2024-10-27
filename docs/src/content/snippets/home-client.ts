const es = new EventSource("/sse")

es.addEventListener("message", (event) => {
	const data = JSON.parse(event.data)
	console.log(data)
})
