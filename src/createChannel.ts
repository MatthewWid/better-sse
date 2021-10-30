import {Channel} from "./Channel";

const createChannel = (
	...args: ConstructorParameters<typeof Channel>
): Channel => new Channel(...args);

export {createChannel};
