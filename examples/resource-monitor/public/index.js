const eventSource = new EventSource("/sse");

eventSource.addEventListener("system-stats", ({data}) => {
	const {cpuUsage, memoryUsage} = JSON.parse(data);

	if (cpuData.length > systemLabels.length) {
		cpuData.splice(0, 1);
	}

	cpuData.push(cpuUsage);

	if (memoryData.length > systemLabels.length) {
		memoryData.splice(0, 1);
	}

	memoryData.push(memoryUsage);

	systemChart.update();
});

eventSource.addEventListener("net-stats", ({data}) => {
	const {inputMb, outputMb} = JSON.parse(data);

	if (netInData.length > systemLabels.length) {
		netInData.splice(0, 1);
	}

	netInData.push(inputMb);

	if (netOutData.length > systemLabels.length) {
		netOutData.splice(0, 1);
	}

	netOutData.push(outputMb);

	netChart.update();
});
