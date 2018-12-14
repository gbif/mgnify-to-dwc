const inquirer = require("inquirer");
const argv = require("minimist")(process.argv.slice(2));
const createStudyList = require('./studies/studies');

function start(pipelineVersion){
	createStudyList(require(`./studies/${pipelineVersion}`));
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


