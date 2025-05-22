const es = new EventSource("/sse")

es.addEventListener("message", ({ data })) => {
	const contents = JSON.parse(data)
	console.log(contents) // Hello world!
})
