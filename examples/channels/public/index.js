const eventSource = new EventSource("/sse");

const count = document.createElement("pre");
count.innerText = "No count just yet.";
document.body.appendChild(count);

eventSource.addEventListener("tick", ({data}) => {
	count.innerText = `The clock has ticked! The count is now ${data}.`;
});

const activeSessions = document.createElement("pre");
document.body.appendChild(activeSessions);

eventSource.addEventListener("session-count", ({data}) => {
	activeSessions.innerText = `There are ${data} person(s) watching this pointless number.`;
});
