const sse = new EventSource("/sse");

sse.addEventListener("stream", (event) => {
	console.log(event);
});
