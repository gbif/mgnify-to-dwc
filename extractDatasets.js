const inquirer = require("inquirer");
const parseArgs = require('minimist');
const argv = parseArgs(process.argv.slice(2), {string: ['p']});
const createDatasets = require('./createDatasets');

if (argv.p) {
	createDatasets(argv.p);
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
			createDatasets(answers.pipelineVersion);
		});
}


