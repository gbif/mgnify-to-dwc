function createMetaFile(studyId){
	// copy base meta.xml to the dataset directory. This is the same for all datasets/studies
  fs.createReadStream('./meta.xml').pipe(fs.createWriteStream(`./data/${studyId}/meta.xml`));
}

function createEml(studyId){
	// Create the EML based on the infor we retrived about the study
  const emlData = eml.createEML(data.attributes, pipeline, publications);
  fs.writeFile(`./data/${studyId}/eml.xml`, emlData, function (err) {
    if (err) {
      return //console.log(err);
    }
    //console.log("The EML file was saved!");
  });
}
module.exports = {
	createMetaFile,
}