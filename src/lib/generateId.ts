import {randomUUID, randomBytes} from "node:crypto";

let generateId: () => string;

if (randomUUID) {
	generateId = () => randomUUID();
} else {
	generateId = () => randomBytes(4).toString("hex");
}

export {generateId};
