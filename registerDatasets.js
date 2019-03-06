const inquirer = require("inquirer");
const parseArgs = require('minimist');
const argv = parseArgs(process.argv.slice(2), {string: ['p']});
const registerDatasets = require('./registerDatasets');

function start(env, username, password){
	registerDatasets(env, username, password);
}

if (argv.p) {
	start(argv.p);
} else {
	inquirer
		.prompt([
			{
				type: "input",
				name: "env",
				message: "In which environment will you register datasets?",
				default: "uat"
            },
            {
				type: "input",
				name: "username",
				message: "Your GBIF username?"
            },
            {
				type: "input",
				name: "password",
				message: "Your GBIF password?"
			}
		])
		.then(answers => {
			start(answers.pipelineVersion, answers.username, answers.password);
		});
}


