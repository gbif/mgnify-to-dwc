const csvWriter = require("csv-write-stream");
const fs = require("fs");
const _ = require("lodash");
const settings = require("./settings");

// create required directories
if (!fs.existsSync(`./${settings.folder}`)) {
  fs.mkdirSync(`./${settings.folder}`);
}

const getOccurrenceWriter = function(studyId) {
  if (!fs.existsSync(`./${settings.folder}/${studyId}`)) {
    fs.mkdirSync(`./${settings.folder}/${studyId}`);
  }
  const occurrenceWriter = csvWriter({
    separator: ",",
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
  let writeStream = fs.createWriteStream(`./${settings.folder}/${studyId}/occurrence.txt`);
  occurrenceWriter.pipe(writeStream);
  return {
    write: (occurrence, meta, analysis) => writeOccurrence(occurrence, meta, analysis, occurrenceWriter),
    end: () => {
      return new Promise((resolve, reject) => {
        occurrenceWriter.end();
        writeStream.on('finish', () => {
          resolve('fs stream finished');
        })
      })
    }
  };
};

const writeOccurrence = (occurrence, meta, analysis, occurrenceWriter) => {
  eventID = meta.eventID;
  subUnit = occurrence.primary.subUnit;
  pipelineVersion = meta.pipelineVersion;

  let remark = 'This occurrence appeared in following analyses:';
  occurrence.basedOn.forEach(evidence => {
    remark += ` ${evidence.subUnit.toUpperCase()} taxonomy from analyses https://www.ebi.ac.uk/metagenomics/analyses/${evidence.analysesID}#taxonomic.`
  });
  const row = occurrence.o;
  let kingdom = _.get(row, "attributes.hierarchy.kingdom");
  let superKingdom = _.get(row, "attributes.hierarchy.super kingdom");
  if(kingdom !== 'Metazoa' && kingdom !== 'Viridiplantae'){
  if (!kingdom && superKingdom === "Bacteria") {
    kingdom = superKingdom;
  }
  const line = [
    eventID,
    eventID,
    `${eventID}_${_.get(row, "id")}`,
    _.get(row, "attributes.hierarchy.kingdom") || "",
    _.get(row, "attributes.hierarchy.phylum") || "",
    _.get(row, "attributes.hierarchy.class") || "",
    _.get(row, "attributes.hierarchy.order") || "",
    _.get(row, "attributes.hierarchy.family") || "",
    _.get(row, "attributes.hierarchy.genus") || "",
    _.get(row, "attributes.name")
      ? _.get(row, "attributes.name").replace("_", " ")
      : "",
    _.get(row, "attributes.rank") || "",
    _.get(row, "attributes.count") || "",
    "DNA sequence reads",
    "MATERIAL_SAMPLE",
    `https://www.ebi.ac.uk/metagenomics/pipelines/${pipelineVersion}`,
    `${subUnit.toUpperCase()} rRNA annotated using the taxonomic reference database described here: https://www.ebi.ac.uk/metagenomics/pipelines/${pipelineVersion}. ${remark}`
  ];
  occurrenceWriter.write(line);
  }
};

module.exports = {
  getOccurrenceWriter: getOccurrenceWriter
};
