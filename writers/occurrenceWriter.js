const csvWriter = require("csv-write-stream");
const fs = require("fs");
const _ = require("lodash");
const settings = require('./settings');

// create required directories
if (!fs.existsSync(`./${settings.folder}`)) {
	fs.mkdirSync(`./${settings.folder}`);
}

const getOccurrenceWriter = function(studyId) {
	if (!fs.existsSync(`./${settings.folder}/${studyId}`)) {
		fs.mkdirSync(`./${settings.folder}/${studyId}`);
	}
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
	occurrenceWriter.pipe(fs.createWriteStream(`./${settings.folder}/${studyId}/occurrence.txt`));
	return {
		write: (occList, meta) => writeOccurrences(occList, meta, occurrenceWriter),
		end: () => occurrenceWriter.end()
	};
}

const writeOccurrences = (occList, meta, occurrenceWriter) => {
	eventID = meta.eventID;
	subUnit = meta.subUnit;
	pipeline = meta.pipeline;

  occList.forEach(row => {
    let kingdom = _.get(row, "attributes.hierarchy.kingdom");
    let superKingdom = _.get(row, "attributes.hierarchy.super kingdom");
    if (!kingdom && superKingdom === 'Bacteria') {
      kingdom = superKingdom;
    }
    const line = [
      eventID,
      eventID,
      `${eventID}_${subUnit}_${_.get(row, "id")}`,
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
      `${subUnit} rRNA annotated using the taxonomic reference database described here: https://www.ebi.ac.uk/metagenomics/pipelines/${pipeline}`

    ];
    occurrenceWriter.write(line);
  });
};

module.exports = {
	getOccurrenceWriter: getOccurrenceWriter
}