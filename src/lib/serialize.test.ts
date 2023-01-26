import {it, expect} from "vitest";
import {serialize} from "./serialize";

it("JSON-stringifies input", () => {
	expect(
		serialize({
			a: 1,
			b: "2",
			c: ["3"],
		})
	).toBe('{"a":1,"b":"2","c":["3"]}');
});
