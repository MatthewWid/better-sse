import {Channel, DefaultChannelState} from "./Channel";
import {DefaultSessionState} from "./Session";

const createChannel = <
	State = DefaultChannelState,
	SessionState = DefaultSessionState,
>(
	...args: ConstructorParameters<typeof Channel<State, SessionState>>
): Channel<State, SessionState> => new Channel<State, SessionState>(...args);

export {createChannel};
