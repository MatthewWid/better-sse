import {it, expect} from "vitest";
import {createHistory} from "./createHistory";
import {History} from "./History";

it("returns a new instance of a history log", () => {
	expect(createHistory()).toBeInstanceOf(History);
});
