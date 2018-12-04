const textBlock = `
-. .-.   .-. .-.   .-. .-.   .
  \\   \\ /   \\   \\ /   \\   \\ /
 / \\   \\   / \\   \\   / \\   \\
~   \`-~ \`-\`   \`-~ \`-\`   \`-~ \`-`;

function removeFirstLine(textBlock) {
	return textBlock
		.split("\n")
		// .slice(1)
		.join("\n");
}

function getMaxLineLength(textBlock) {
	let max = 0;
	textBlock
		.split("\n")
		.map(x => x.length)
		.forEach(x => {
			max = x > max ? x : max;
		});
	return max;
}

function equalizeLineLengths(textBlock) {
	const length = getMaxLineLength(textBlock);
	return textBlock
		.split("\n")
		.map(x => x.padEnd(length))
		.join("\n");
}

function cyclicLeftShift(s, k) {
	k = k % s.length;
	return s.substring(k) + s.substring(0, k);
}

function shiftLeft(textBlock, amount) {
	amount = amount || 1;
	return textBlock
		.split("\n")
		.map(x => cyclicLeftShift(x, amount))
		.join("\n");
}

let baseImage = equalizeLineLengths(removeFirstLine(textBlock));

module.exports = {
	baseImage,
	removeFirstLine,
	getMaxLineLength,
	equalizeLineLengths,
	cyclicLeftShift,
	shiftLeft
};
