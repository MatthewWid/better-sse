const sse = new EventSource("/sse");

sse.addEventListener("stream", ({type, data}) => {
	console.log(`Received event of type ${type}`);
	console.log(data);
});
