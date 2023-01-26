import {it, expect} from "vitest";
import {Channel} from "./Channel";
import {createChannel} from "./createChannel";

it("returns a new instance of a channel", () => {
	expect(createChannel()).toBeInstanceOf(Channel);
});
