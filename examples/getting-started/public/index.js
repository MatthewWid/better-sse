const sse = new EventSource("/sse");

sse.addEventListener("ping", ({type, data: text}) => {
	const element = document.createElement("pre");
	element.innerText = `Got '${type}' event: ${text}.`;

	document.body.appendChild(element);
});
