const sse = new EventSource("/sse");

sse.addEventListener("ping", ({data}) => {
	console.log(data);
});
