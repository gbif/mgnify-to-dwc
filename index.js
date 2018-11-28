const request = require("request-promise");
const fs = require("fs");
const csvWriter = require("csv-write-stream");
const eml = require("./eml");
const _ = require("lodash");
var archiver = require('archiver');
const del = require('del');
const child_process = require("child_process");
const studies = require('./studies')
const baseUrl = "https://www.ebi.ac.uk/metagenomics/api/v1/";


const writeStudyAsDataset = async (studyId, pipeline) => {
    if (!fs.existsSync(`./data`)) {
        fs.mkdirSync(`./data`);
      }
  
    if (!fs.existsSync(`./data/${studyId}`)) {
    fs.mkdirSync(`./data/${studyId}`);
  }
  fs.createReadStream('./meta.xml').pipe(fs.createWriteStream(`./data/${studyId}/meta.xml`));
  const occurrenceWriter = csvWriter({
    separator: "\t",
    newline: "\n",
    headers: [
      "coreID",
      "eventID",
      "occurrenceId",
      "kingdom",
      "phylum",
      "class",
      "order",
      "family",
      "genus",
      "scientificName",
      "rank",
      "organismQuantity",
      "organismQuantityType",
      "basisOfRecord",
      "identificationReferences",
      "identificationRemarks"
    ],
    sendHeaders: false
  });
  const eventWriter = csvWriter({
    separator: "\t",
    newline: "\n",
    headers: [
      "eventID",
      "samplingProtocol",
      "eventRemarks",
      "locality",
      "eventDate",
      "minimumDepthInMeters",
      "maximumDepthInMeters",
      "decimalLatitude",
      "decimalLongitude",
      "dynamicProperties"
    ],
    sendHeaders: false
  });
  occurrenceWriter.pipe(fs.createWriteStream(`./data/${studyId}/occurrence.txt`));
  eventWriter.pipe(fs.createWriteStream(`./data/${studyId}/event.txt`));
 // const taxonomy = rna_subunit ? `taxonomy-${rna_subunit}` : "taxonomy";
  const { data } = await request({
    uri: `${baseUrl}studies/${studyId}`,
    json: true
  });

  let publications = [];
  if (_.get(data, "relationships.publications.links.related")) {
    const pbl = await request({
      uri: _.get(data, "relationships.publications.links.related"),
      json: true
    });
    publications = pbl.data;
  }
  // write the eml here
  const emlData = eml.createEML(data.attributes, pipeline, publications);
  fs.writeFile(`./data/${studyId}/eml.xml`, emlData, function(err) {
    if (err) {
      return console.log(err);
    }

    console.log("The EML file was saved!");
  });

  let analysesNextPage = data.relationships.analyses.links.related;
  const processedSamples = {};
  while(analysesNextPage !== null){
  analysesNextPage = await traverseAnalyses(
    analysesNextPage,
    occurrenceWriter,
    eventWriter,
    pipeline,
    processedSamples
  );
  console.log("########## "+ analysesNextPage)
}   



  occurrenceWriter.end();
  eventWriter.end();
try{
  child_process.execSync(`zip -r ${__dirname}/data/${studyId}.zip *`, {
    cwd: `${__dirname}/data/${studyId}`
  });
} catch(err){
  console.log(err)
}

console.log('Cleaning up ....')
del.sync([`./data/${studyId}/**`])
console.log('Done') 

};
const traverseAnalyses = async (
  uri,
  occurrenceWriter,
  eventWriter,
  pipeline,
  processedSamples
) => {
  const analyses = await request({
    uri: uri,
    json: true
  });

  const filteredAnalyses = [];
   analyses.data.forEach((a) => 
  { if(a.attributes["pipeline-version"] === pipeline && !processedSamples[a.relationships.sample.data.id]){
    filteredAnalyses.push(a);
    processedSamples[a.relationships.sample.data.id] = true;
  } }
 )
  // Write the sample events to events.txt
  const sampleEvents = filteredAnalyses.map(a =>  {
    processedSamples[a.relationships.sample.data.id] = true;
   return getSampleEventFromApi(eventWriter, a.relationships.sample.links.related)
  })

  // Write occurrences based on SSU taxonomy to occurrences.txt
  const occurrencesSSU = filteredAnalyses.map(a => {
    console.log("Write SSU occs " + a.relationships["taxonomy-ssu"].links.related);
    return writeOccurrencesForEvent(
      occurrenceWriter,
      a.relationships["taxonomy-ssu"].links.related,
      a.relationships.sample.data.id,
      'SSU',
      pipeline
    );
  })
  // Write occurrences based on LSU taxonomy to occurrences.txt
  const occurrencesLSU = filteredAnalyses.map(a => {
   console.log("Write LSU occs " + a.relationships["taxonomy-lsu"].links.related);
   return writeOccurrencesForEvent(
     occurrenceWriter,
     a.relationships["taxonomy-lsu"].links.related,
     a.relationships.sample.data.id,
     'LSU',
     pipeline
   );
 })
  await Promise.all([...sampleEvents, ...occurrencesSSU, ...occurrencesLSU]);

  return analyses.links.next;


};

const getSampleEventFromApi = async (eventWriter, uri) => {
  const { data } = await request({
    uri: uri,
    json: true
  });
   writeSampleEvent(data, eventWriter);
};

const writeSampleEvent = (data, eventWriter) => {
  const sampleMetadata = _.get(data, "attributes.sample-metadata") || [];

  const line = [
    _.get(data, "id") || "",
    _.get(
      sampleMetadata.find(({ key }) => key === "protocol label"),
      "value"
    ) || "",
    _.get(data, "attributes.sample-desc") || "",
    _.get(sampleMetadata.find(({ key }) => key === "marine region"), "value") ||
      "",
    _.get(data, "attributes.collection-date") || "",
    _.get(
      sampleMetadata.find(({ key }) => key === "geographic location (depth)" || key === "depth"),
      "value"
    ) || "",
    _.get(
      sampleMetadata.find(({ key }) => key === "geographic location (depth)" || key === "depth"),
      "value"
    ) || "",
    _.get(data, "attributes.latitude") || "",
    _.get(data, "attributes.longitude") || "",
    JSON.stringify(
      sampleMetadata
        .filter(
          ({ key }) =>
            key !== "geographic location (depth)" &&
            key !== "depth" &&
            key !== "marine region" &&
            key !== "protocol label"
        )
        .reduce((val, o) => ({ ...val, [o.key]: o.value }), {})
    )
  ];
  eventWriter.write(line);
};

const writeOccurrencesForEvent = async (occurrenceWriter, uri, eventID, subunit, pipeline) => {
  console.log("Writing occurrences for event: "+eventID)
  const data = await request({
    uri: uri,
    json: true
  });
  try {
    writeOccurrencePageFromApi(data, eventID, occurrenceWriter, subunit, pipeline);
  } catch (err) {
    console.log(err);
  }

  if (data.links.next) {
    console.log("Occurrence Page done, moving to " + data.links.next);

    writeOccurrencesForEvent(occurrenceWriter, data.links.next, eventID, subunit, pipeline);
  } else {
    console.log(`Finished writing occurrences for eventID ${eventID}`);
    return;
  }
};

const writeOccurrencePageFromApi = (data, eventID, occurrenceWriter, subunit, pipeline) => {
  data.data.forEach(row => {
    const line = [
      eventID,
      eventID,
      `${eventID}_${subunit}_${_.get(row, "id")}`,
      _.get(row, "attributes.hierarchy.kingdom") || "",
      _.get(row, "attributes.hierarchy.phylum") || "",
      _.get(row, "attributes.hierarchy.class") || "",
      _.get(row, "attributes.hierarchy.order") || "",
      _.get(row, "attributes.hierarchy.family") || "",
      _.get(row, "attributes.hierarchy.genus") || "",
      (_.get(row, "attributes.name")) ? _.get(row, "attributes.name").replace("_", " ") : "",
      _.get(row, "attributes.rank") || "",
      _.get(row, "attributes.count") || "",
      "DNA sequence reads",
      "MATERIAL_SAMPLE",
      `https://www.ebi.ac.uk/metagenomics/pipelines/${pipeline}`,
      `${subunit} rRNA annotated using the taxonomic reference database described here: https://www.ebi.ac.uk/metagenomics/pipelines/${pipeline}`
      
    ];
    occurrenceWriter.write(line);
  });
};

// write a single study:
// writeStudyAsDataset("MGYS00002392", "4.1");

const writeAllStudies = async (pipeline) =>{
  const studylist = await studies.createStudyList(pipeline);

  // Probably do it sequential

  studylist.map(studyID => () => writeStudyAsDataset(studyID, pipeline) ).reduce((promise, fn) => promise.then(fn), Promise.resolve())



}

writeAllStudies('4.1')