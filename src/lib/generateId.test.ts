import {expect, it} from "vitest";
import {generateId} from "./generateId";

it("returns a string", () => {
	const id = generateId();

	expect(typeof id).toBe("string");
});
