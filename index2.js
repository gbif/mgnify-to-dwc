/*
Study = GBIF dataset
A study has multiple samples. We map those to events.
A sample can be analyzed. this is dones in runs with a pipeline and can the be analysed with multiple intruments
An analyses has a list of taxonomies based on the SSU and LSU (short/long sub-units) - These are mapped to occurrences for that event.
*/
const request = require('requestretry');
const _ = require('lodash');
const studies = require('./studies/4.1.json');
const baseUrl = 'https://www.ebi.ac.uk/metagenomics/api/v1';

const getOccurrenceWriter = require('./writers/occurrenceWriter').getOccurrenceWriter;
const getEventWriter = require('./writers/eventWriter').getEventWriter;

// sample to analyses map
// write each sample/event (including info about dups in other studies)
// for each sample create a distinctTaxonContext and run analyses with that.
//   once final list of taxa is found, then write to file.
// repeat for next sample
async function iterateSamples(studyId, pipelineVersion) {
	const eventWriter = getEventWriter(studyId);
	const studyBody = await getData(`${baseUrl}/studies/${studyId}`);
	let next = _.get(studyBody, 'data.relationships.analyses.links.related');

	// extract unique samples and their corresponding analyses. Do it in memory. Nothing seems to be too large for now.
	const sampleToAnalyses = {};
	while (next) {
		let analysesResultPage = await getData(next);
		analysesResultPage.data.forEach(analyses => {
			if (_.get(analyses, 'attributes.pipeline-version') === pipelineVersion) {
				const sampelId = _.get(analyses, 'relationships.sample.data.id')
      	sampleToAnalyses[sampelId] = _.union(sampleToAnalyses[sampelId] || [], [analyses]);
			}
    });
		next = _.get(analysesResultPage, 'links.next'); // get the next page of analyses
	}
	
	// write each sample/event (including info about duplicates in other studies)
	const duplicates = require(`./samples/${pipelineVersion}`);
	let sampleIds = Object.keys(sampleToAnalyses);
	await Promise.all(sampleIds.map(sampleId => saveSampleEvent(eventWriter, sampleId, duplicates[sampleId])));

	// for each sample create a distinctTaxonContext and run analyses with that.
	Object.keys(sampleToAnalyses).forEach(async sampleID => {
		const analysesList = sampleToAnalyses[sampleID];
		let taxa = {};// has format taxaID: {occ, basedOn: [{analysesID, subUnit}], primary: {analysesID, subUnit}}
		
		// iterate over occurrences for that analyses and add them to the taxa map
		const occurrences = await Promise.all(analysesList.map(analyses => getOccurrencesFromAnalyses(analyses)));
		occurrences.forEach(occurrenceData => {
			occurrenceData.ssu.forEach(occ => {
				const basis = {analysesID: occurrenceData.analysesID, subUnit: 'ssu'};
				taxa[occ.id] = taxa[occ.id] ? taxa[occ.id] : { o: occ, basedOn: [] };
				taxa[occ.id].basedOn.push(basis); // add support claim
				// if larger or equal count, then set as primary evidence
				const count = _.get(occ, 'attributes.count', 0);
				if (count >= _.get(taxa[occ.id], 'attributes.count', 0)) {
					taxa[occ.id].primary = basis;
				}
			});
		});
		console.log(taxa);
	});

	// save the distinct taxa as occurrences
	// TODO

}

/**
 * Get the sample event and write it to file
 */
const saveSampleEvent = async (eventWriter, sampleId, studyList) => {
	const { data } = await getData(`${baseUrl}/samples/${sampleId}`);
	eventWriter.write(data, {studyList});
};

/**
 * extract occurrences. Using lsu and ssu. No duplicate testing.
 */
async function getOccurrencesFromAnalyses(analyses) {
	let lsu = _.get(analyses, 'relationships.taxonomy-lsu.links.related')
	let ssu = _.get(analyses, 'relationships.taxonomy-ssu.links.related')
	let lsuOccurrences = await getOccurrences(lsu);
	let ssuOccurrences = await getOccurrences(ssu);
	return {analysesID: analyses.id, lsu: lsuOccurrences, ssu: ssuOccurrences};
}

async function getOccurrences(url) {
	let next = url;
	let occurrences = [];
	while (next) {
		// get the occurrences
		let body = await getData(next);
		occurrences = occurrences.concat(body.data);
		// go to next page
		next = body.links.next;
	}
	return occurrences;
}

async function getData(url) {
	console.log(url)
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

async function run() {
	let list = [
		'MGYS00001789',
		//'MGYS00002392'
	]
	for (studyID of list) {
		await iterateSamples(studyID, '4.1');
	}
}

run();



















async function getStudy(studyId) {
	let studyCount = 0;
	const occurrenceWriter = getOccurrenceWriter(studyId);
	const eventWriter = getEventWriter(studyId);
	let studyBody = await getData(`${baseUrl}/studies/${studyId}`);

	// TODO expand and save study

	// For this study, get the related analyses and filter them - currently use only p.4.1 and only consider a sample once (so ignore multiple analyses of the same sample)
	// this choice can be questioned https://github.com/gbif/mgnify-to-dwc/issues/3
	let next = _.get(studyBody, 'data.relationships.analyses.links.related');
	let processesSampleIds = new Set();
	while (next) {
		// get the analyses
		let analysesResultPage = await getData(next);
		//decide which analyses to keep
		let data = analysesResultPage.data.filter(
			x => {
				const sampleId = _.get(x, 'relationships.sample.data.id');
				let keep = _.get(x, 'attributes.pipeline-version') === '4.1' && !processesSampleIds.has(_.get(x, 'relationships.sample.data.id'));
				processesSampleIds.add(_.get(x, 'relationships.sample.data.id'));// save the sample id so that we have a unique list of those.
				return keep;
			}
		);

		// for the analyses that we keep, then get the counts in parallel assuming that this will never be a huge number
		let counts = await Promise.all(data.map(analyses => getOccurrencesFromAnalyses(analyses, occurrenceWriter)));

		// for book keeping save the number of occurrences that we found
		studyCount += counts.reduce((acc, curr) => acc + curr, 0);
		next = _.get(analysesResultPage, 'links.next'); // get the next page of analyses
	}

	//write samples/events
	let sampleIds = Array.from(processesSampleIds);
	// await Promise.all(sampleIds.map(sampleId => getSampleEvent(sampleId, eventWriter)));

	occurrenceWriter.end();
	// console.log(db.get('studyKeys'));
}

async function writeOccurrences(url, occurrenceWriter) {
	let next = url;
	let count = 0;
	while (next) {
		// get the occurrences
		let body = await getData(next);
		// occurrenceWriter.write(body.data, { eventID: 'some eventID', subUnit: 'some subunit', pipeline: 'p.4.1' });
		// go to next page
		next = body.links.next;
		count += body.data.length;
	}
	return count;
}