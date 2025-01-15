import {suite as suiteChannelBroadcast} from "./suites/channel-broadcast";

Promise.all([suiteChannelBroadcast.setup()]).then((suites) => {
	for (const suite of suites) {
		suite.run();
	}
});
