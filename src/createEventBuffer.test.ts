import {it, expect} from "vitest";
import {EventBuffer} from "./EventBuffer";
import {createEventBuffer} from "./createEventBuffer";

it("returns a new instance of an event buffer", () => {
	expect(createEventBuffer()).toBeInstanceOf(EventBuffer);
});
