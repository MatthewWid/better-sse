import {suite as suiteChannelBroadcast} from "./suites/channel-broadcast";
import {suite as suiteSessionPush} from "./suites/session-push";

Promise.all([suiteSessionPush.setup()]).then((suites) => {
	for (const suite of suites) {
		suite.run();
	}
});
