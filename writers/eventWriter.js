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
      "dynamicProperties"
    ],
    sendHeaders: false
  });
  let writeStream = fs.createWriteStream(`./${settings.folder}/${studyId}/event.txt`);
  eventWriter.pipe(writeStream);
  return {
    write: eventData => writeSampleEvent(eventData, eventWriter),
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
