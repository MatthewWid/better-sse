import {
	type DefaultSessionState,
	Session,
	type SessionOptions,
} from "./Session";
import {SseError} from "./lib/SseError";

type CreateResponseCallback<State> = (session: Session<State>) => void;

/**
 * Create a new session using the Fetch API and return its Response immediately.
 *
 * The last argument should be a callback function that will be invoked with
 * a session instance once it has connected.
 */
function createResponse<State = DefaultSessionState>(
	request: Request,
	callback: CreateResponseCallback<State>
): Response;
function createResponse<State = DefaultSessionState>(
	request: Request,
	response: Response,
	callback: CreateResponseCallback<State>
): Response;
function createResponse<State = DefaultSessionState>(
	request: Request,
	options: SessionOptions<State>,
	callback: CreateResponseCallback<State>
): Response;
function createResponse<State = DefaultSessionState>(
	request: Request,
	response: Response,
	options: SessionOptions<State>,
	callback: CreateResponseCallback<State>
): Response;
function createResponse<State = DefaultSessionState>(
	request: Request,
	response: Response | SessionOptions<State> | CreateResponseCallback<State>,
	options?: SessionOptions<State> | CreateResponseCallback<State>,
	callback?: CreateResponseCallback<State>
): Response {
	const args = [request, response, options, callback];

	let givenCallback: CreateResponseCallback<State> | undefined;

	for (let index = args.length - 1; index >= 0; --index) {
		const arg = args.pop();

		if (arg) {
			givenCallback = arg as CreateResponseCallback<State>;
			break;
		}
	}

	if (typeof givenCallback !== "function") {
		throw new SseError(
			"Last argument given to createResponse must be a callback function."
		);
	}

	/**
	 * TypeScript compares every type in the union with every type in every overload,
	 * guaranteeing an incompatibility even if each of the passed combinations of arguments
	 * actually does have at least one matching counterpart.
	 *
	 * As such, we must decide between this small ignore-line or having the
	 * `createResponse` and `Session#constructor` functions not be overloaded at all.
	 *
	 * @see https://github.com/microsoft/TypeScript/issues/14107
	 */
	// @ts-ignore
	const session = new Session<State>(...args);

	session.once("connected", () => {
		givenCallback(session);
	});

	return session.getResponse();
}

export {createResponse};
