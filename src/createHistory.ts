import {History} from "./History";

const createHistory = (
	...args: ConstructorParameters<typeof History>
): History => new History(...args);

export {createHistory};
