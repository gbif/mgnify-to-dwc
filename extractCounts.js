const request = require("requestretry");
const _ = require("lodash");
const studies = require("./studies/4.1.json");
const baseUrl = "https://www.ebi.ac.uk/metagenomics/api/v1/";

async function getStudy(studyId) {
	let studyCount = 0;
	let body = await getData(`${baseUrl}studies/${studyId}`);

	let next = _.get(body, "data.relationships.analyses.links.related");

	while (next) {
		let body = await getData(next);
		let data = body.data.filter(
			x => _.get(x, "attributes.pipeline-version") === "4.1"
		);
		let counts = await Promise.all(data.map(analyses => getCountFromAnalyses(analyses)))
		studyCount += counts.reduce((acc, curr) => acc + curr, 0)
		next = _.get(body, "links.next");
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
	let pages = _.get(body, "meta.pagination.pages");
	if (pages === 1) return count;
	throw new Error('more than one page for ' + url)
	return (pages - 1) * count + count / 2;
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
	for (item of studies) {
	  await getStudy(item);
	}
}

run();
