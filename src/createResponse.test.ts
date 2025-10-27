import {expect, it} from "vitest";
import {createResponse} from "./createResponse";
import {Session, type SessionOptions} from "./Session";
import {
	createRequest as createTestRequest,
	createResponse as createTestResponse,
} from "./utils/testUtils";

it("calls the callback with a connected instance of a Session", () =>
	new Promise<void>((done) => {
		const {request} = createTestRequest();

		createResponse(request, (session) => {
			expect(session).toBeInstanceOf(Session);
			expect(session.isConnected).toBeTruthy();
			done();
		});
	}));

it("throws when no callback is given", () => {
	const {request} = createTestRequest();

	// @ts-expect-error testing no callback argument
	expect(() => createResponse(request)).toThrowError("callback");
});

it("returns the session response", () =>
	new Promise<void>((done) => {
		const {request} = createTestRequest();

		const returnedResponse = createResponse(request, (session) => {
			expect(session.getResponse()).toBe(returnedResponse);
			done();
		});
	}));

it("passes arguments to the Session constructor as-is", () =>
	new Promise<void>((done) => {
		const {request} = createTestRequest({
			headers: {
				"Last-Event-ID": "123",
			},
		});

		const {response} = createTestResponse({
			headers: {
				"X-Test-1": "456",
			},
		});

		type SessionState = {
			myState: string;
		};

		const options: SessionOptions<SessionState> = {
			state: {
				myState: "789",
			},
		};

		createResponse(request, response, options, (session) => {
			expect(session.lastId).toBe("123");
			expect(session.getResponse().headers.get("X-Test-1")).toBe("456");
			expect(session.state.myState).toBe("789");
			done();
		});
	}));
