/**
 * Consistently merge headers from an object into a Headers object.
 *
 * If the value is a string, it will replace the target header.
 * If the value is an array, it will replace the target header and then append each item.
 * If the value is undefined, it will delete the target header.
 */
const applyHeaders = (
	from: Record<string, string | string[] | undefined> | Headers,
	to: Headers
) => {
	const fromMap = from instanceof Headers ? Object.fromEntries(from) : from;

	for (const [key, value] of Object.entries(fromMap)) {
		if (Array.isArray(value)) {
			to.delete(key);

			for (const item of value) {
				to.append(key, item);
			}
		} else if (value === undefined) {
			to.delete(key);
		} else {
			to.set(key, value);
		}
	}
};

export {applyHeaders};
