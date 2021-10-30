import {sanitize} from "./sanitize";

describe("newline standarization", () => {
	it("leaves newlines as-is", () => {
		expect(sanitize("\n123456")).toBe("\n123456");
		expect(sanitize("123\n456")).toBe("123\n456");
	});

	it("replaces carriage returns with newlines", () => {
		expect(sanitize("\r123456")).toBe("\n123456");
		expect(sanitize("123\r456")).toBe("123\n456");
	});

	it("replaces CRLF with newlines", () => {
		expect(sanitize("\r\n123456")).toBe("\n123456");
		expect(sanitize("123\r\n456")).toBe("123\n456");
	});
});

it("strips trailing newlines", () => {
	expect(sanitize("123456\n")).toBe("123456");
	expect(sanitize("123456\n\n\n")).toBe("123456");
});
