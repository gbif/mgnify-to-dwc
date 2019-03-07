const inquirer = require("inquirer");
const parseArgs = require('minimist');
const argv = parseArgs(process.argv.slice(2), {string: ['p']});
const registerDatasets = require('./registerDatasetsInGbif');

function start(env, username, password){
	registerDatasets(env, username, password);
}

if (argv.p) {
	start(argv.p);
} else {
	inquirer
		.prompt([
			{
				type: "list",
				name: "env",
                message: "In which environment will you register datasets?",
                choices:["dev", "uat", "prod"],
				default: "uat"
            },
            {
				type: "input",
				name: "username",
				message: "Your GBIF username?"
            },
            {
				type: "password",
				name: "password",
				message: "Your GBIF password?"
			}
		])
		.then(answers => {
			start(answers.env, answers.username, answers.password);
		});
}


