/*
Multiple studies can deal with the same sample. When mapped to GBIF terms, then that means that events will be duplicated as 
we consider the study the dataset.

In these cases it is likely that some occurrences will also be duplicated (same species/same place/same event/same date).

This information seem useful to have on the event page - that is that it is also dealt with in another study. 
To do so we need to extract samples that occur in multiple studies.
*/
const request = require('requestretry');
const _ = require('lodash');
const fs = require('fs');
const baseUrl = 'https://www.ebi.ac.uk/metagenomics/api/v1';
let sampleToStudy = {};

async function iterateSamples(studyId, pipelineVersion) {
	let studyBody = await getData(`${baseUrl}/studies/${studyId}`);
	let next = _.get(studyBody, 'data.relationships.analyses.links.related');
	while (next) {
		let analysesResultPage = await getData(next);
		analysesResultPage.data.forEach(analyses => {
			if (_.get(analyses, 'attributes.pipeline-version') === pipelineVersion) {
				const sampelId = _.get(analyses, 'relationships.sample.data.id')
      	sampleToStudy[sampelId] = _.union(sampleToStudy[sampelId] || [], [studyId]);
			}
    });
		next = _.get(analysesResultPage, 'links.next'); // get the next page of analyses
  }
}

function saveSampelsWithMultipleStudies(pipelineVersion) {
  Object.keys(sampleToStudy).forEach(sampleID => {
    if (sampleToStudy[sampleID].length < 2) {
      delete sampleToStudy[sampleID];
    }
  });
  saveFile(pipelineVersion, sampleToStudy);
}

function saveFile(name, content) {
	fs.writeFile(`${__dirname}/${name}.json`, JSON.stringify(content, null, 2), function(err) {
		if (err) {
			console.log(err);
		} else {
			console.log(`The results was saved to ${name}`);
		}
	});
}

async function getData(url) {
	console.log(url);
	const response = await request.get({
		url: url,
		json: true
	});
	if (response.statusCode !== 200) {
		throw new Error('wrong status code');
	}
	// console.log(url + ',' + response.body.data.length);
	return response.body;
}

async function run(pipelineVersion) {
	const studies = require(`../studies/${pipelineVersion}`)
	// const studies = [
  //   'MGYS00001789',
  //   'MGYS00002392'
	// ]
	for (studyId of studies) {
		await iterateSamples(studyId, pipelineVersion);
	}
	saveSampelsWithMultipleStudies(pipelineVersion);
}

module.exports = run;
