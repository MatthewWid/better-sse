import {Channel, type DefaultChannelState} from "./Channel";
import type {DefaultSessionState} from "./Session";

const createChannel = <
	State = DefaultChannelState,
	SessionState = DefaultSessionState,
>(
	...args: ConstructorParameters<typeof Channel<State, SessionState>>
): Channel<State, SessionState> => new Channel<State, SessionState>(...args);

export {createChannel};
