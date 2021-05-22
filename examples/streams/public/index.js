const sse = new EventSource("/sse");

sse.addEventListener("stream", ({type, data}) => {
	const element = document.createElement("pre");
	element.innerText = `Got event:\n${JSON.stringify({type, data}, null, 2)}`;

	document.body.appendChild(element);

	if (data.done) {
		sse.close();
	}
});
