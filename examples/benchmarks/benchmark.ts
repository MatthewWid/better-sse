import {suite as suiteChannelPushManySessions} from "./suites/channel-push-many-sessions";

Promise.all([suiteChannelPushManySessions.setup()]).then((suites) => {
	for (const suite of suites) {
		suite.run();
	}
});
