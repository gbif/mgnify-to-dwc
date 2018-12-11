const request = require("requestretry");
const _ = require("lodash");
const studies = require("./studies/4.1.json");
const baseUrl = "https://www.ebi.ac.uk/metagenomics/api/v1/";

const getOccurrenceWriter = require('./writers').getOccurrenceWriter;


async function getStudy(studyId) {
	let studyCount = 0;
	const occurrenceWriter = 1;//getOccurrenceWriter(studyId);
	let body = await getData(`${baseUrl}studies/${studyId}`);

	// TODO expand and save study

	// For this study, get the related analyses and filter them - currently use only p.4.1 and only consider a sample once (so ignore multiple analyses of the same sample)
	// this choice can be questioned https://github.com/gbif/mgnify-to-dwc/issues/3
	let next = _.get(body, "data.relationships.analyses.links.related");
	let processesSampleIds = new Set();
	while (next) {
		// get the analyses
		let body = await getData(next);
		//decide which analyses to keep
		let data = body.data.filter(
			x => {
				let keep = 
					(x.id === 'MGYA00199490' || x.id === 'MGYA00199483' )
					&& _.get(x, "attributes.pipeline-version") === "4.1" 
					&& !processesSampleIds.has(_.get(x, 'relationships.sample.data.id'));
				processesSampleIds.add(_.get(x, 'relationships.sample.data.id'));
				return keep;
			}
		);
		
		// for the analyses that we keep, then get the counts in parallel assuming that this will never be a huge number
		let counts = await Promise.all(data.map(analyses => getOccurrencesFromAnalyses(analyses, occurrenceWriter)))
		
		console.log(counts);
		// for book keeping save the number of occurrences that we found
		studyCount += counts.reduce((acc, curr) => acc + curr, 0)
		next = _.get(body, "links.next"); // get the next page of analyses
		console.log(studyCount)
	}
	console.log(studyCount)
	// occurrenceWriter.end();
}

/**
 * extract occurrences. Using lsu and ssu. No duplicate testing.
 */
async function getOccurrencesFromAnalyses(analyses, occurrenceWriter) {
	let lsu = _.get(analyses, 'relationships.taxonomy-lsu.links.related')
	let ssu = _.get(analyses, 'relationships.taxonomy-ssu.links.related')
	lsuCount = await getOccurrences(lsu, occurrenceWriter, true);
	ssuCount = await getOccurrences(ssu, occurrenceWriter, false);
	console.log(lsu, ssu);
	console.log(ssuCount, lsuCount);
	return ssuCount + lsuCount;
}
async function getOccurrences(url, occurrenceWriter, isLsu) {
	let next = url;
	let count = 0;
	let totalCount = 0;
	while (next) {
		// get the occurrences
		let body = await getData(next);
		// TODO add occurrences from body
		// occurrenceWriter.write(body.data, {eventID: 'some eventID', subUnit: 'some subunit', pipeline: 'p.4.1'});
		// go to next page
		next = body.links.next;
		count += body.data.length;
		totalCount = _.get(body, "meta.pagination.count");
	}
	console.log(url, count);
	return count;
}

async function getData(url) {
	const response = await request.get({
		url: url,
		json: true
	});
	if (response.statusCode !== 200) {
		throw new Error("wrong status code");
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
