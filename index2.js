const request = require('requestretry');
const _ = require('lodash');
const studies = require('./studies/4.1.json');
const baseUrl = 'https://www.ebi.ac.uk/metagenomics/api/v1';

const getOccurrenceWriter = require('./writers/occurrenceWriter').getOccurrenceWriter;
const getEventWriter = require('./writers/eventWriter').getEventWriter;

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
	console.log(studyCount);

	//write samples/events
	let sampleIds = Array.from(processesSampleIds);
	await Promise.all(sampleIds.map(sampleId => getSampleEvent(sampleId, eventWriter)));

	occurrenceWriter.end();
}

/**
 * Get the sample event and write it to file
 */
const getSampleEvent = async (sampleId, eventWriter) => {
  const { data } = await getData(`${baseUrl}/samples/${sampleId}`);
  eventWriter.write(data);
};

/**
 * extract occurrences. Using lsu and ssu. No duplicate testing.
 */
async function getOccurrencesFromAnalyses(analyses, occurrenceWriter) {
	let lsu = _.get(analyses, 'relationships.taxonomy-lsu.links.related')
	let ssu = _.get(analyses, 'relationships.taxonomy-ssu.links.related')
	let lsuCount = await getOccurrences(lsu, occurrenceWriter);
	let ssuCount = await getOccurrences(ssu, occurrenceWriter);
	return ssuCount + lsuCount;
}
async function getOccurrences(url, occurrenceWriter) {
	let next = url;
	let count = 0;
	while (next) {
		// get the occurrences
		let body = await getData(next);
		occurrenceWriter.write(body.data, {eventID: 'some eventID', subUnit: 'some subunit', pipeline: 'p.4.1'});
		// go to next page
		next = body.links.next;
		count += body.data.length;
	}
	return count;
}

async function getData(url) {
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
		'MGYS00001789'
	]
	for (item of list) {
	  await getStudy(item);
	}
}

run();
