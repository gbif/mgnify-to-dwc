const inquirer = require("inquirer");
const argv = require("minimist")(process.argv.slice(2));
const createStudyList = require('./studies/studies');

if (argv.p) {
	createStudyList(argv.p);
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
			createStudyList(answers.pipelineVersion);
		});
}
