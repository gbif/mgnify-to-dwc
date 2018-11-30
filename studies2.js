const request = require('requestretry');
const _ = require('lodash');
const fs = require('fs');
const queryString = require('query-string');

const baseUrl = 'https://www.ebi.ac.uk/ebisearch/ws/rest/metagenomics_analyses'
const standardQuery = {
  'facetcount': '10',
  'facetsdepth': '5',
  'fields': 'id,name,biome_name,description,METAGENOMICS_PROJECTS,METAGENOMICS_SAMPLES,experiment_type,pipeline_version,ASSEMBLY,ENA_RUN,ENA_WGS_SEQUENCE_SET',
  'format': 'json',
  'query': 'domain_source:metagenomics_analyses'
};
const baseQuery = queryString.stringify(standardQuery)

console.log(`
\`-:-.   ,-;"\`-:-.   ,-;"\`-:-.   ,-;"\`-:-.   ,-;"
   \`=\`,'=/     \`=\`,'=/     \`=\`,'=/     \`=\`,'=/
     y==/        y==/        y==/        y==/
   ,=,-<=\`.    ,=,-<=\`.    ,=,-<=\`.    ,=,-<=\`.
,-'-'   \`-=_,-'-'   \`-=_,-'-'   \`-=_,-'-'   \`-=_
`)

const createStudyList = async (pipeline_version) => {
  process.stdout.write(`Creating study list for pipeline version ${pipeline_version}`);
  process.stdout.write('\n\n\n')
  let studyMap = {};
  const size = 100;
  let start = 0;
  const facets = `pipeline_version:${pipeline_version},biome:Environmental,experiment_type:amplicon,experiment_type:metagenomic`
  let hitCount = 999999999999999;

  while ((start + size) < 1000) {
    const query = queryString.stringify({
      size,
      start,
      facets
    });
    const url = `${baseUrl}?${baseQuery}&${query}`;
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
        const studyID = _.get(e, 'fields.METAGENOMICS_PROJECTS[0]')
        if (studyID) {
          studyMap[studyID] = studyMap[studyID] ? studyMap[studyID]++ : 1
        }
      });
    }
    start += size;
    hitCount = data.hitCount;

    // make it more fun to watch the terminal
    printProgress(start, size, hitCount);
  }

  saveStudies(Object.keys(studyMap), 'studies');
  saveStudies(Object.keys(studyMap.filter(x => x > 1), 'duplicates'));
}

function saveStudies(studies) {
  fs.writeFile('./extract/studies.json', JSON.stringify(studies, null, 2), function (err) {
    if (err) {
      return console.error(err);
    }
    console.log('List of studies extracted and saved!');
  });
}

function printProgress(start, size, total) {
  process.stdout.moveCursor(0, -1)
  process.stdout.cursorTo(0)
  process.stdout.clearScreenDown()
  let RESOLUTION = 50;
  const percentish = Math.floor(RESOLUTION * start / total)
  process.stdout.write(`Extracting studies from analyses ${start} - ${start + size} of ${total}\n`)
  let str = '';
  for (var i = 0; i < percentish; i++) {
    str += "#"
  }
  for (var i = 0; i < RESOLUTION - percentish; i++) {
    str += "-"
  }
  process.stdout.write(str)
}

module.exports = {
  createStudyList: createStudyList
}

