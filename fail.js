const request = require("requestretry");

async function start() {
	const data = [
		{
			lsu: 'https://www.ebi.ac.uk/metagenomics/api/v1/analyses/MGYA00199483/taxonomy/lsu',
			ssu: 'https://www.ebi.ac.uk/metagenomics/api/v1/analyses/MGYA00199483/taxonomy/ssu',
		},
		{
			lsu: 'https://www.ebi.ac.uk/metagenomics/api/v1/analyses/MGYA00199490/taxonomy/lsu',
			ssu: 'https://www.ebi.ac.uk/metagenomics/api/v1/analyses/MGYA00199490/taxonomy/ssu',
		}
	];
	let counts = await Promise.all(data.map(analyses => getOccurrencesFromAnalyses(analyses)))
	console.log(counts);
}

async function getOccurrencesFromAnalyses(analyses) {
	lsuCount = await getOccurrences(analyses.lsu);
	ssuCount = await getOccurrences(analyses.ssu);
	console.log(ssuCount, lsuCount);
	return ssuCount + lsuCount;
}
async function getOccurrences(url) {
	let next = url;
	let count = 0;
	let body = await getData(next);
	count += body.data.length;
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

start();
