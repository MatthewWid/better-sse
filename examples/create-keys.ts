import {createCertificate} from "pem";

createCertificate({days: 1, selfSigned: true}, (error, result) => {
	if (error) {
		console.error(error);
		return;
	}

	console.log(result);
});
