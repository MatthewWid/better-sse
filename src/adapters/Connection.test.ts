import {describe, expect, it} from "vitest";
import {Connection} from "./Connection";

describe("applyHeaders", () => {
	it("given a new header, adds it without deleting others", () => {
		const from = {
			"X-Test-1": "1",
		};

		const to = new Headers({
			"X-Test-2": "2",
		});

		Connection.applyHeaders(from, to);

		expect(to.get("X-Test-1")).toBe("1");

		expect(to.get("X-Test-2")).toBe("2");
	});

	it("given a duplicate single string header, replaces the value", () => {
		const from = {
			"X-Test-1": "2",
		};

		const to = new Headers({
			"X-Test-1": "1",
		});

		Connection.applyHeaders(from, to);

		expect(to.get("X-Test-1")).toBe("2");
	});

	it("given a duplicate array string header, replaces the value instead of appending", () => {
		const from = {
			"X-Test-1": ["2", "3"],
		};

		const to = new Headers({
			"X-Test-1": ["1", "2"],
		});

		Connection.applyHeaders(from, to);

		expect(to.get("X-Test-1")).toBe("2, 3");
	});

	it("given an undefined header, deletes the value", () => {
		const from = {
			"X-Test-1": undefined,
		};

		const to = new Headers({
			"X-Test-1": "1",
		});

		Connection.applyHeaders(from, to);

		expect(to.get("X-Test-1")).toBe(null);
	});

	it("given a Headers object, applies its values as if it were a regular map", () => {
		const from = new Headers({
			// Replace single string with single string
			"X-Test-1": "2",
			// Replace single string with array
			"X-Test-2": ["3", "4"],
			// Replace array with array
			"X-Test-3": ["5", "6"],
			// Add new single string
			"X-Test-4": "7",
			// Add new array
			"X-Test-5": ["8", "9"],
		});

		const to = new Headers({
			"X-Test-1": "1",
			"X-Test-2": "2",
			"X-Test-3": ["3", "4"],
		});

		Connection.applyHeaders(from, to);

		expect(to.get("X-Test-1")).toBe("2");

		/**
		 * Passing an array to Headers#constructor or Headers#set joins values without whitespace,
		 * whereas Headers#append adds a comma *and* a space in-between in each value.
		 */
		expect(to.get("X-Test-2")).toBe("3,4");

		expect(to.get("X-Test-3")).toBe("5,6");

		expect(to.get("X-Test-4")).toBe("7");

		expect(to.get("X-Test-5")).toBe("8,9");
	});
});
