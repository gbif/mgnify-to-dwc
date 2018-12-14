const request = require("requestretry");
const _ = require("lodash");
const queryString = require("query-string");
const shift = require("../cli-utils/shiftLines");
const colors = require("../cli-utils/colors");
const fs = require("fs");
const baseUrl = "https://www.ebi.ac.uk/ebisearch/ws/rest/metagenomics_analyses";
const defaultQuery = {
	facetcount: 10,
	facetsdepth: 5,
	fields:
		"id,name,biome_name,description,METAGENOMICS_PROJECTS,METAGENOMICS_SAMPLES,experiment_type,pipeline_version,ASSEMBLY,ENA_RUN,ENA_WGS_SEQUENCE_SET",
	format: "json",
	query: "domain_source:metagenomics_analyses"
};
let baseImage = shift.baseImage;
let status = { start: 0, size: 0, hitCount: 0 };

const createStudyList = async pipeline_version => {
	console.log("Creating study list for pipeline version " + pipeline_version);
	let printer = startPrinter();
	const facets = `pipeline_version:${pipeline_version},biome:Environmental,experiment_type:amplicon,experiment_type:metagenomic`;
	const size = 100;
	let studyEnum = {};
	let start = 0;
	let hitCount = Number.POSITIVE_INFINITY;
	let duplicateCount = 0;
	while (start + size < hitCount) {
		const pageQuery = {
			...defaultQuery,
			size,
			start,
			facets
		};
		const url = `${baseUrl}?${queryString.stringify(pageQuery)}`;
    const response = await request({
      url: url,
      json: true
    });
    if (response.statusCode !== 200) {
      throw new Error(`API call failed for ${url}`)
    }

    const data = response.body;

		if (data.entries) {
			data.entries.forEach(e => {
				const studyID = _.get(e, "fields.METAGENOMICS_PROJECTS[0]");
				if (studyID) {
					if (studyEnum[studyID] >= 1) duplicateCount++;
					studyEnum[studyID] = studyEnum[studyID] ? studyEnum[studyID] + 1 : 1;
				}
			});
		}
		start += size;
		hitCount = data.hitCount;
		status = { start, size, hitCount };
	}
	clearInterval(printer);
	clearAndprint();

	saveFile(pipeline_version, Object.keys(studyEnum).sort());
	const duplicates = Object.keys(studyEnum).sort().filter(key => studyEnum[key] > 1);
	if (duplicates.length > 0) {
		saveFile(pipeline_version + '_duplicates', {duplicateCount, duplicates});
	}
};

function saveFile(name, content) {
	fs.writeFile(`${__dirname}/${name}.json`, JSON.stringify(content, null, 2), function(err) {
		if (err) {
			console.log(err);
		} else {
			console.log(`The results was saved to ${name}`);
		}
	});
}

function startPrinter() {
	printStatus();
	return setInterval(clearAndprint, 200);
}

function clearAndprint() {
	baseImage = shift.shiftLeft(baseImage);
	process.stdout.moveCursor(0, -6);
	process.stdout.cursorTo(0);
	printStatus();
}

function printStatus() {
	console.log(colors.FgCyan, baseImage);
	console.log(
		colors.Reset,
		`Extracting studies from analyses ${status.start} - ${status.start +
			status.size} of ${status.hitCount}`
	);
}

module.exports = createStudyList;
