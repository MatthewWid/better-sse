const count = document.createElement("pre");
count.innerText = "No count just yet.";
document.body.appendChild(count);

const activeSessions = document.createElement("pre");
document.body.appendChild(activeSessions);

const eventSource = new EventSource("/sse");

eventSource.addEventListener("tick", ({data}) => {
	count.innerText = `The clock has ticked! The count is now ${data}.`;
});

eventSource.addEventListener("session-count", ({data}) => {
	activeSessions.innerText = `There are ${data} person(s) watching this pointless number.`;
});
