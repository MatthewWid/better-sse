const eventSource = new EventSource("/sse");

eventSource.addEventListener("ping", (event) => {
	const {type, data} = event;

	const element = document.createElement("pre");

	element.innerText = `Got '${type}' event: ${data}.`;

	document.body.appendChild(element);
});
