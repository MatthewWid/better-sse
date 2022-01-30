import {suite as suiteChannelPushManySessions} from "./suites/channel-push-many-sessions";

Promise.all([suiteChannelPushManySessions.setup()]).then((suites) =>
	suites.forEach((suite) => suite.run())
);
