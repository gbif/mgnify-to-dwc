const csvWriter = require("csv-write-stream");
const fs = require("fs");
const _ = require("lodash");
const settings = require('./settings');

// create required directories
if (!fs.existsSync(`./${settings.folder}`)) {
  fs.mkdirSync(`./${settings.folder}`);
}

const getEventWriter = function(studyId) {
  if (!fs.existsSync(`./${settings.folder}/${studyId}`)) {
    fs.mkdirSync(`./${settings.folder}/${studyId}`);
  }
  const eventWriter = csvWriter({
    separator: ",",
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
      "dynamicProperties",
      "sampleSizeValue",
      "sampleSizeUnit",
      "materialSampleID",
      "country",
      "waterBody"
    ],
    sendHeaders: false
  });
  let writeStream = fs.createWriteStream(`./${settings.folder}/${studyId}/event.txt`);
  eventWriter.pipe(writeStream);
  return {
    write: (eventData, analysis) => writeSampleEvent(eventData, analysis, eventWriter, studyId),
    end: () => {
      return new Promise((resolve, reject) => {
        eventWriter.end();
        writeStream.on('finish', () => {
          resolve('fs stream finished');
        })
      })
    }
  };
};

const latLonIsSuspicious = (data) => {
  const lat = _.get(data, "attributes.latitude") || "";
  const lon = _.get(data, "attributes.longitude") || "";
  let suspicious = false;
  if(Number(lat) === 1 && Number(lon) === 1){
    suspicious = true;
  }
  if(Number(lat) === 0 && Number(lon) === 0){
    suspicious = true;
  }
  return suspicious;
}

const writeSampleEvent = (data, analysis, eventWriter, studyId) => {
	const sampleMetadata = _.get(data, "attributes.sample-metadata") || [];
  const sampleSizeValue = _.get(analysis, "attributes.analysis-summary").find(e => e.key === "Nucleotide sequences with predicted RNA")	|| _.get(analysis, "attributes.analysis-summary").find(e => e.key === "Nucleotide sequences after undetermined bases filtering");
  
  const geograficLocation = _.get(
    sampleMetadata.find(
      ({ key }) => key === "geographic location (country and/or sea,region)"
    ),
    "value"
  ) || "";
  console.log(geograficLocation)
  const splittedGeograficLocation = geograficLocation ? geograficLocation.split(':') : undefined;
  const firstLevelGeograficLocation = _.get(splittedGeograficLocation, '[0]', '');
  const isWaterBody = ['sea', 'ocean'].includes(_.get(firstLevelGeograficLocation.toLowerCase().split(' '), '[1]'));
  const lat = _.get(data, "attributes.latitude");
  const lon = _.get(data, "attributes.longitude");
  const line = [
    _.get(analysis, "id") || "",
    _.get(
      sampleMetadata.find(({ key }) => key === "protocol label"),
      "value"
    ) || "",
    _.get(data, "attributes.sample-desc") || "",
    _.get(sampleMetadata.find(({ key }) => key === "marine region"), "value") || _.get(splittedGeograficLocation, '[1]') ||
      "",
    _.get(data, "attributes.collection-date") || "",
    _.get(
      sampleMetadata.find(
        ({ key }) => key === "geographic location (depth)" || key === "depth"
      ),
      "value"
    ) || "",
    _.get(
      sampleMetadata.find(
        ({ key }) => key === "geographic location (depth)" || key === "depth"
      ),
      "value"
    ) || "",
    latLonIsSuspicious(data) ? "" : lat ,
    latLonIsSuspicious(data) ? "" : (studyId === "MGYS00002684" && Math.sign(lon) === 1) ? -lon : lon,
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
    ),
    _.get(sampleSizeValue, "value") || "",
    "DNA sequence reads",
    _.get(data, 'id') ? `https://www.ebi.ac.uk/metagenomics/samples/${_.get(data, 'id')}` : "",
    !isWaterBody ? firstLevelGeograficLocation : "",
    isWaterBody ? firstLevelGeograficLocation: ""
	];
	const cleanLine = line.map(x => cleanValue(x))
  eventWriter.write(cleanLine);
};

function cleanValue(str){
	if (typeof str !== 'string') return str;
	if (str.startsWith('"') && str.endsWith('"')) str = str
		.replace(/^\"/, '')
		.replace(/\"$/, '')
	return str
		.trim();
}
module.exports = {
  getEventWriter
};
