const sse = new EventSource("/sse");

sse.addEventListener('streamData', ({ type, data }) => {
	console.log(`Received event of type ${type}`);
	console.log(data);
})
