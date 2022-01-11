import {randomBytes} from "crypto";

const generateId = (): string => randomBytes(4).toString("hex");

export {generateId};
