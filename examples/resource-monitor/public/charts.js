const labelsLength = 30;

const memoryData = [0];
const cpuData = [0];

const systemCanvas = document.getElementById("system");
const systemLabels = new Array(labelsLength)
	.fill(undefined)
	.map((_, index) => labelsLength - index);
const systemChart = new Chart(systemCanvas, {
	type: "line",
	responsive: true,
	maintainAspectRatio: false,
	options: {
		animation: false,
		scales: {
			x: {
				ticks: {
					callback: (value) => `${value}s`,
				},
			},
			y: {
				min: 0,
				max: 100,
				ticks: {
					callback: (value) => `${value}%`,
				},
			},
		},
	},
	data: {
		labels: systemLabels,
		datasets: [
			{
				label: "Memory Usage",
				data: memoryData,
				fill: false,
				borderColor: ["red"],
				borderWidth: 2,
			},
			{
				label: "CPU Usage",
				data: cpuData,
				fill: false,
				borderColor: ["aqua"],
				borderWidth: 2,
			},
		],
	},
});

const netInData = [0];
const netOutData = [0];

const netCanvas = document.getElementById("net");
const netLabels = new Array(labelsLength)
	.fill(undefined)
	.map((_, index) => labelsLength - index);
const netChart = new Chart(netCanvas, {
	type: "line",
	responsive: true,
	maintainAspectRatio: false,
	options: {
		animation: false,
		scales: {
			x: {
				ticks: {
					callback: (value) => `${value}s`,
				},
			},
			y: {
				ticks: {
					callback: (value) => `${value}Mb`,
				},
			},
		},
	},
	data: {
		labels: netLabels,
		datasets: [
			{
				label: "Received Data",
				data: netInData,
				fill: false,
				borderColor: ["green"],
				borderWidth: 2,
			},
			{
				label: "Sent Data",
				data: netOutData,
				fill: false,
				borderColor: ["purple"],
				borderWidth: 2,
			},
		],
	},
});
