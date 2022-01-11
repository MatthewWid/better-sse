import {generateId} from "./generateId";

it("generates a string with eight characters", () => {
	expect(generateId()).toHaveLength(8);
});

it("generates an all-lowercase string", () => {
	const id = generateId();
	const lowercased = id.toLowerCase();

	expect(id).toEqual(lowercased);
});
