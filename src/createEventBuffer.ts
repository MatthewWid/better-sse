import {EventBuffer} from "./EventBuffer";

const createEventBuffer = (
	...args: ConstructorParameters<typeof EventBuffer>
): EventBuffer => new EventBuffer(...args);

export {createEventBuffer};
