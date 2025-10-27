import {expect, it} from "vitest";
import {createEventBuffer} from "./createEventBuffer";
import {EventBuffer} from "./EventBuffer";

it("returns a new instance of an event buffer", () => {
	expect(createEventBuffer()).toBeInstanceOf(EventBuffer);
});
