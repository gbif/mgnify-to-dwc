const inquirer = require("inquirer");
const argv = require("minimist")(process.argv.slice(2));
const extractSamples = require('./samples/extractCrossStudySamples');

if (argv.p) {
	extractSamples(argv.p);
} else {
	inquirer
		.prompt([
			{
				type: "input",
				name: "pipelineVersion",
				message: "What pipeline do you want to use?",
				default: "4.1"
			}
		])
		.then(answers => {
			extractSamples(answers.pipelineVersion);
		});
}


