const inquirer = require("inquirer");
const parseArgs = require('minimist');
const argv = parseArgs(process.argv.slice(2), {string: ['p']});
const createStudyList = require('./studies/studies');

function start(pipelineVersion){
	createStudyList(pipelineVersion);
}

if (argv.p) {
	start(argv.p);
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
			start(answers.pipelineVersion);
		});
}


