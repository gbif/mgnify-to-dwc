const request = require("requestretry");
const _ = require("lodash");
const studies = require("./studies/4.1.json");
const baseUrl = "https://www.ebi.ac.uk/metagenomics/api/v1/";

async function getStudy(studyId) {
	let studyCount = 0;
	let body = await getData(`${baseUrl}studies/${studyId}`);

	let next = _.get(body, "data.relationships.analyses.links.related");

	let processesSampleIds = new Set();
	while (next) {
		let body = await getData(next);
		let data = body.data.filter(
			x => {
				let keep = _.get(x, "attributes.pipeline-version") === "4.1" && !processesSampleIds.has(_.get(x, 'relationships.sample.data.id'));
				processesSampleIds.add(_.get(x, 'relationships.sample.data.id'));
				return keep;
			}
		);
		
		let counts = await Promise.all(data.map(analyses => getCountFromAnalyses(analyses)))
		studyCount += counts.reduce((acc, curr) => acc + curr, 0)
		next = false;//_.get(body, "links.next");
		console.log(studyCount)
	}
	console.log(studyCount)
}

async function getCountFromAnalyses(analyses) {
	let lsu = _.get(analyses, 'relationships.taxonomy-lsu.links.related')
	let ssu = _.get(analyses, 'relationships.taxonomy-ssu.links.related')
	lsuCount = await getEstimatedCount(lsu);
	ssuCount = await getEstimatedCount(ssu);
	return lsuCount + ssuCount;
}
async function getEstimatedCount(url) {
	let body = await getData(url);
	let count = _.get(body, "meta.pagination.count");
	return body.data.length;
}

async function getData(url) {
	console.log(url)
	const response = await request.get({
		url: url,
		json: true
	});
	if (response.statusCode !== 200) {
		throw new Error("wrong status code");
	}
	return response.body;
}

async function run() {
	//getStudy('MGYS00002392');
	//getStudy('MGYS00002668');
	let list = [
		'MGYS00002376', // 55868 when ignoring all but the first sample appearance
		//'MGYS00002392',
		// 'MGYS00002401',
		// 'MGYS00002405',
		//'MGYS00002488',
		// 'MGYS00002668',
		// 'MGYS00002724',
		// 'MGYS00002766',
		// 'MGYS00002788',
		// 'MGYS00003082',
		// 'MGYS00003194',
	]
	for (item of list) {
	  await getStudy(item);
	}
}

run();
