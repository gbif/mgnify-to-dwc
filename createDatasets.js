/*
Study = GBIF dataset
A study has multiple samples. We map those to events.
A sample can be analyzed. this is dones in runs with a pipeline and can the be analysed with multiple intruments
An analyses has a list of taxonomies based on the SSU and LSU (short/long sub-units) - These are mapped to occurrences for that event.
*/
const request = require("requestretry");
const _ = require("lodash");
const fs = require("fs");
const child_process = require("child_process");
const del = require("del");
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const eml = require("./eml");
const baseUrl = "https://www.ebi.ac.uk/metagenomics/api/v1";
const folder = require("./writers/settings").folder;
const status = require('./status')();
const adapter = new FileSync('db.json')
const db = low(adapter);
db.defaults({ failedStudies: [], errors: [] })
  .write();
db.set('failedStudies', [])
  .write();
db.set('errors', [])
  .write();

const getOccurrenceWriter = require("./writers/occurrenceWriter").getOccurrenceWriter;
const getEventWriter = require("./writers/eventWriter").getEventWriter;

let totalCount = 0;
let failedCount = 0;

// sample to analyses map
// write each sample/event (including info about dups in other studies)
// for each sample create a distinctTaxonContext and run analyses with that.
//   once final list of taxa is found, then write to file.
// repeat for next sample
/* async function iterateSamples2(studyId, pipelineVersion) {
  // create required directories
  if (!fs.existsSync(`./data`)) {
    fs.mkdirSync(`./data`);
  }
  if (!fs.existsSync(`./${folder}/${studyId}`)) {
    fs.mkdirSync(`./${folder}/${studyId}`);
  }
  // copy base meta.xml to the dataset directory. This is the same for all datasets/studies
  fs.createReadStream("./meta.xml").pipe(
    fs.createWriteStream(`./${folder}/${studyId}/meta.xml`)
  );

  // initiate writers
  const eventWriter = getEventWriter(studyId);
  const occurrenceWriter = getOccurrenceWriter(studyId);

  // get study
  const studyBody = await getData(`${baseUrl}/studies/${studyId}`);

  // write study to EML
  writeEml(studyBody, pipelineVersion);

  let next = _.get(studyBody, "data.relationships.analyses.links.related");

  // extract unique samples and their corresponding analyses. Do it in memory. Nothing seems to be too large for now.
  const sampleToAnalyses = {};
  while (next) {
    let analysesResultPage = await getData(next);
    analysesResultPage.data.forEach(analyses => {
      if (_.get(analyses, "attributes.pipeline-version") === pipelineVersion) {
        const sampleId = _.get(analyses, "relationships.sample.data.id");
        sampleToAnalyses[sampleId] = _.union(sampleToAnalyses[sampleId] || [], [
          analyses
        ]);
      }
    });
    next = _.get(analysesResultPage, "links.next"); // get the next page of analyses
  }

  // write each sample/event (including info about duplicates in other studies)
  const duplicates = require(`./samples/${pipelineVersion}`);
  let sampleIds = Object.keys(sampleToAnalyses);
  status.update({ sampleCount: sampleIds.length });
  // set a limit on this or serialize it.
  for (sampleId of sampleIds) {
    await saveSampleEvent(eventWriter, sampleId, analysis, duplicates[sampleId])
  }

  // for each sample create a distinctTaxonContext and run analyses with that.
  let sampleKeys = Object.keys(sampleToAnalyses);
  let studyCount = 0;
  for (var i = 0; i < sampleKeys.length; i++) {
    const sampleID = sampleKeys[i];
    const analysesList = sampleToAnalyses[sampleID];
    status.update({ sampleIndex: i + 1, activeSample: sampleID });
    let taxa = {}; // has format taxaID: {occ, basedOn: [{analysesID, subUnit}], primary: {analysesID, subUnit}}

    // iterate over occurrences for that analyses and add them to the taxa map
    const occurrences = await Promise.all(
      analysesList.map(analyses => getOccurrencesFromAnalyses(analyses))
    );
    occurrences.forEach(occurrenceData => {
      occurrenceData.ssu.forEach(occ => {
        const basis = { analysesID: occurrenceData.analysesID, subUnit: "ssu" };
        taxa[occ.id] = taxa[occ.id] ? taxa[occ.id] : { o: occ, basedOn: [] };
        taxa[occ.id].basedOn.push(basis); // add support claim
        // if larger or equal count, then set as primary evidence
        const count = _.get(occ, "attributes.count", 0);
        if (count >= _.get(taxa[occ.id], "attributes.count", 0)) {
          taxa[occ.id].primary = basis;
        }
      });
    });
    // save the distinct taxa as occurrences for the event
    studyCount += Object.keys(taxa).length;
    totalCount += Object.keys(taxa).length;
    status.update({ totalStudyCount: studyCount, totalOccurrenceCount: totalCount });
    _.values(taxa).forEach(taxon => {
      // save taxon
      occurrenceWriter.write(taxon, { eventID: sampleID, pipelineVersion });
    });
  }

  cleanUp(studyId, occurrenceWriter, eventWriter);
} */

async function iterateSamples(studyId, pipelineVersion) {
  // create required directories
  if (!fs.existsSync(`./data`)) {
    fs.mkdirSync(`./data`);
  }
  if (!fs.existsSync(`./${folder}/${studyId}`)) {
    fs.mkdirSync(`./${folder}/${studyId}`);
  }
  // copy base meta.xml to the dataset directory. This is the same for all datasets/studies
  fs.createReadStream("./meta.xml").pipe(
    fs.createWriteStream(`./${folder}/${studyId}/meta.xml`)
  );

  // initiate writers
  const eventWriter = getEventWriter(studyId);
  const occurrenceWriter = getOccurrenceWriter(studyId);

  // get study
  const studyBody = await getData(`${baseUrl}/studies/${studyId}`);

  // write study to EML
  writeEml(studyBody, pipelineVersion);

  // write each sample/event (including info about duplicates in other studies)
  const duplicates = require(`./samples/${pipelineVersion}`);

  let next = _.get(studyBody, "data.relationships.analyses.links.related");

  let analysisIndex = 0;
  let studyCount = 0;

  // extract unique samples and their corresponding analyses. Do it in memory. Nothing seems to be too large for now.
  while (next) {
    let analysesResultPage = await getData(next);
    status.update({ sampleCount: _.get(analysesResultPage, "meta.pagination.count") });

    for (const analysis of analysesResultPage.data) {
       // console.log(JSON.stringify(analysis))
      if (_.get(analysis, "attributes.pipeline-version") === pipelineVersion) {
        const sampleID = _.get(analysis, "relationships.sample.data.id");
        console.log(sampleID)
        await saveSampleEvent(eventWriter, sampleID, analysis, duplicates[sampleID])
        console.log('done')
        analysisIndex ++;
        status.update({ sampleIndex: analysisIndex, activeSample: analysis.id });
        let taxa = {}; // has format taxaID: {occ, basedOn: [{analysesID, subUnit}], primary: {analysesID, subUnit}}
    
        // iterate over occurrences for that analyses and add them to the taxa map
        const occurrenceData = await getOccurrencesFromAnalyses(analysis)

        
          occurrenceData.ssu.forEach(occ => {
            const basis = { analysesID: occurrenceData.analysesID, subUnit: "ssu" };
            taxa[occ.id] = taxa[occ.id] ? taxa[occ.id] : { o: occ, basedOn: [] };
            taxa[occ.id].basedOn.push(basis); // add support claim
            // if larger or equal count, then set as primary evidence
            const count = _.get(occ, "attributes.count", 0);
            if (count >= _.get(taxa[occ.id], "attributes.count", 0)) {
              taxa[occ.id].primary = basis;
            }
          });
      
        // save the distinct taxa as occurrences for the event
        studyCount += Object.keys(taxa).length;
        totalCount += Object.keys(taxa).length;
        status.update({ totalStudyCount: studyCount, totalOccurrenceCount: totalCount });
        _.values(taxa).forEach(taxon => {
          // save taxon
          occurrenceWriter.write(taxon, { eventID: _.get(analysis, 'id'), pipelineVersion }, analysis );
        });


      }
    }
    
  
    next = _.get(analysesResultPage, "links.next"); // get the next page of analyses
  }
 


  cleanUp(studyId, occurrenceWriter, eventWriter);
}

/**
 * Get the sample event and write it to file
 */
const saveSampleEvent = async (eventWriter, sampleId, analysis, studyList) => {
  const { data } = await getData(`${baseUrl}/samples/${sampleId}`);
  eventWriter.write(data, analysis, { studyList });
};

/**
 * extract occurrences. Using lsu and ssu. No duplicate testing.
 */
async function getOccurrencesFromAnalyses(analyses) {
  let lsu = _.get(analyses, "relationships.taxonomy-lsu.links.related");
  let ssu = _.get(analyses, "relationships.taxonomy-ssu.links.related");
  let lsuOccurrences = await getOccurrences(lsu);
  let ssuOccurrences = await getOccurrences(ssu);
  return { analysesID: analyses.id, lsu: lsuOccurrences, ssu: ssuOccurrences };
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

async function writeEml(study, pipeline) {
  // get all publications from study so they can be listed as bibliographical referencse on the dataset
  const { data } = study;
  const studyId = data.id;
  let publications = [];
  if (_.has(data, "relationships.publications.links.related")) {
    const pbl = await getData(
      _.get(data, "relationships.publications.links.related")
    );
    publications = pbl.data;
  }

  // Create the EML based on the infor we retrived about the study
  const emlData = eml.createEML(data.attributes, pipeline, publications);
  fs.writeFile(`./${folder}/${studyId}/eml.xml`, emlData, function (err) {
    if (err) {
      db.get('errors')
        .push({ message: 'Failed to write EML: ' + studyId, err: err.toString() })
        .write()
      throw err;
    }
  });
}

async function cleanUp(studyId, occurrenceWriter, eventWriter) {
  await occurrenceWriter.end();
  await eventWriter.end();
  try {
    child_process.execSync(
      `zip -r ${__dirname}/${folder}/${studyId}.zip *`,
      {
        cwd: `${__dirname}/${folder}/${studyId}`
      }
    );
  } catch (err) {
    db.get('errors')
      .push({ message: 'Failed to clean up studyId: ' + studyId, err: err.toString() })
      .write()
    throw err;
  }
  del.sync([`./${folder}/${studyId}/**`]);
}

async function getData(url) {
  try {
    const start = new Date();
    status.update({ latestUrl: url });
    const response = await request.get({
      url: url,
      timeout: 60000,
      maxAttempts: 5,   // (default) try 5 times
      retryDelay: 20000,
      json: true
    });
    const end = new Date();
    status.updateResponseTime(end - start);
    if (response.statusCode !== 200) {
      throw new Error("wrong status code");
    }
    // console.log(url + ',' + response.body.data.length);
    return response.body;
  } catch (err) {
    db.get('errors')
      .push({ message: 'Failed to get ressource: ' + url, err: err.toString() })
      .write()
    throw err;
  }
}

// giv mulighed for at starte ved et specifict study. nyttigt hvis et run fejler
async function run(pipelineVersion, study) {
  const list = study ? [study] : require(`./studies/${pipelineVersion}.json`);
  status.start({ studyCount: list.length });

  for (var i = 0; i < list.length; i++) {
    const studyID = list[i];
    status.update({ studyIndex: i + 1, activeStudy: studyID });
    try {
      await iterateSamples(studyID, pipelineVersion);
    } catch (err) {
      // Add a post
      failedCount++;
      status.update({ failedCount });
      del.sync([`./${folder}/${studyID}/**`]);
      db.get('failedStudies')
        .push({ id: studyID, err: err.toString() })
        .write()
    }
  }
  status.close();
}

//run('4.1', 'MGYS00003130')

module.exports = run;