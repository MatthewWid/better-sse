/**
 * @typedef {Object} Message
 * @property {string} username
 * @property {string} content
 */

/** @type {HTMLDivElement} */
let historyEl;

/** @type {HTMLFormElement} */
let newMessageFormEl;

/** @type {HTMLInputElement} */
let newMessageInputEl;

/** @type {HTMLDivElement} */
let setUsernameOverlayEl;

/** @type {HTMLFormElement} */
let setUsernameFormEl;

/** @type {HTMLInputElement} */
let setUsernameInputEl;

/** @type {HTMLButtonElement} */
let setUsernameRandomButtonEl;

/** @type {HTMLButtonElement} */
let changeUsernameButton;

/** @type {EventSource} */
let eventSource;

/** @type {string} */
let username;

/**
 * @param {SubmitEvent} event
 */
const onSendMessage = async (event) => {
	event.preventDefault();

	const data = new FormData(newMessageFormEl);

	const content = data.get("message").trim();

	newMessageFormEl.reset();

	const url = `/chat/${username}/message`;

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			content,
		}),
	});

	if (!response.ok) {
		console.error("Failed to send message. Got status:", response.status);
	}
};

/**
 * @param {MessageEvent} event
 */
const onUserJoinedOrLeft = (event) => {
	const {data, type} = event;
	const username = JSON.parse(data);

	const messageEl = document.createElement("div");
	messageEl.classList.add("message");

	const usernameEl = document.createElement("span");
	usernameEl.classList.add("username");
	usernameEl.textContent = username;
	messageEl.appendChild(usernameEl);

	const statusText = type === "user-joined" ? "joined" : "left";
	const contentEl = document.createTextNode(` ${statusText} the chat.`);
	messageEl.appendChild(contentEl);

	historyEl.appendChild(messageEl);
};

/**
 * @param {MessageEvent} event
 */
const onUserMessage = (event) => {
	/**
	 * @type {Message}
	 */
	const message = JSON.parse(event.data);

	const messageEl = document.createElement("div");
	messageEl.classList.add("message");

	const usernameEl = document.createElement("span");
	usernameEl.classList.add("username");
	usernameEl.textContent = message.username;
	messageEl.appendChild(usernameEl);

	const contentEl = document.createTextNode(`: ${message.content}`);
	messageEl.appendChild(contentEl);

	historyEl.appendChild(messageEl);
};

const onConnectionOpen = () => {
	setUsernameOverlayEl.classList.add("hidden");
	changeUsernameButton.classList.remove("hidden");
	newMessageInputEl.focus();
};

/**
 * @param {SubmitEvent} event
 */
const onSubmitSetUsername = (event) => {
	event.preventDefault();

	const data = new FormData(setUsernameFormEl);

	username = encodeURIComponent(data.get("username").trim());

	setUsernameFormEl.reset();

	newMessageFormEl.removeEventListener("submit", onSendMessage);
	newMessageFormEl.addEventListener("submit", onSendMessage);

	eventSource = new EventSource(`/chat/${username}/sse`);

	eventSource.addEventListener("user-joined", onUserJoinedOrLeft);
	eventSource.addEventListener("user-left", onUserJoinedOrLeft);
	eventSource.addEventListener("message", onUserMessage);

	eventSource.addEventListener("open", onConnectionOpen);
};

const onSetRandomUsername = () => {
	setUsernameInputEl.value = `User-${crypto.randomUUID().split("-")[0]}`;
	setUsernameInputEl.focus();
};

const onChangeUsername = () => {
	eventSource.close();
	historyEl.replaceChildren();
	setUsernameOverlayEl.classList.remove("hidden");
	changeUsernameButton.classList.add("hidden");
	setUsernameInputEl.focus();
};

document.addEventListener("DOMContentLoaded", () => {
	historyEl = document.getElementById("history");
	newMessageFormEl = document.getElementById("new-message-form");
	newMessageInputEl = document.getElementById("new-message-input");
	setUsernameOverlayEl = document.getElementById("set-username-overlay");
	setUsernameFormEl = document.getElementById("set-username-form");
	setUsernameInputEl = document.getElementById("set-username-input");
	setUsernameRandomButtonEl = document.getElementById("set-username-random");
	changeUsernameButton = document.getElementById("change-username-button");

	setUsernameFormEl.addEventListener("submit", onSubmitSetUsername);
	setUsernameRandomButtonEl.addEventListener("click", onSetRandomUsername);
	changeUsernameButton.addEventListener("click", onChangeUsername);
});
