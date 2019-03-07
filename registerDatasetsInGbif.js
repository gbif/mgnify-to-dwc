const request = require("requestretry");
const _ = require("lodash");
const fs = require("fs");
const settings = require("./writers/settings");
const identifierPrefix = "https://www.ebi.ac.uk/metagenomics/studies/";
const config = require("./config")


const isRegisteredInGBIF = async (studyId, env) => {
  const response = await request.get({
    url: `${env.baseUrl}dataset?identifier=${identifierPrefix}${studyId}`,
    timeout: 60000,
    maxAttempts: 5, // (default) try 5 times
    retryDelay: 20000,
    json: true
  });
  const registeredAndNotDeletedDatasets = response.body.results.filter(d => _.isUndefined(d.deleted))
  if (registeredAndNotDeletedDatasets.length > 1) {
    console.error(
      `Study id ${studyId} is registered ${registeredAndNotDeletedDatasets.length} times in GBIF`
    );
  }
  return registeredAndNotDeletedDatasets.length === 1;
};
const addIdentifier = async (studyId, uuid, username, password, env) => {
  const auth =
    "Basic " + new Buffer(username + ":" + password).toString("base64");

  return request.post({
    url: `${env.baseUrl}dataset/${uuid}/identifier`,
    headers: {
      Authorization: auth
    },
    timeout: 60000,
    maxAttempts: 5, // (default) try 5 times
    retryDelay: 20000,
    json: true,

    body: {
      type: "URL",
      identifier: `${identifierPrefix}${studyId}`
    }
  });
};

const addEndpoint = async (studyId, uuid, username, password, env) => {
  const auth =
    "Basic " + new Buffer(username + ":" + password).toString("base64");

  return request.post({
    url: `${env.baseUrl}dataset/${uuid}/endpoint`,
    headers: {
      Authorization: auth
    },
    timeout: 60000,
    maxAttempts: 5, // (default) try 5 times
    retryDelay: 20000,
    json: true,

    body: {
      type: "DWC_ARCHIVE",
      url: `${env.hostUrl}${studyId}.zip`
    }
  });
};
const registerStudy = async (studyId, username, password, env) => {
  const auth =
    "Basic " + new Buffer(username + ":" + password).toString("base64");

  return request.post({
    url: `${env.baseUrl}dataset`,
    headers: {
      Authorization: auth
    },
    timeout: 60000,
    maxAttempts: 5, // (default) try 5 times
    retryDelay: 20000,
    json: true,

    body: {
      title: studyId,
      type: "SAMPLING_EVENT",
      publishingOrganizationKey: env.publishingOrganizationKey,
      installationKey: env.installationKey
    }
  });
};

const crawlDataset = (uuid, username, password, env) => {
  const auth =
    "Basic " + new Buffer(username + ":" + password).toString("base64");

  return request.post({
    url: `${env.baseUrl}dataset/${uuid}/crawl`,
    headers: {
      Authorization: auth
    },
    timeout: 60000,
    maxAttempts: 5, // (default) try 5 times
    retryDelay: 20000
  });
};

const registerStudies = async (environment, username, password) => {
  
  const env = config[environment];
  fs.readdir(env.path, function(err, studies) {
    if (err) {
      console.log("Err: " + err);
    }
    studies.forEach(s => {
      const studyId = s.split(".")[0];
      isRegisteredInGBIF(studyId, env).then(registered => {
        if (registered) {
          console.log(`Study ${studyId} is already registered`);
        } else if (!registered) {
          registerStudy(studyId, username, password, env)
            .then(response => {
              const uuid = response.body;
              console.log(`Registered new study ${studyId} with uuid: ${uuid}`);
              addIdentifier(studyId, uuid, username, password, env);
              return addEndpoint(studyId, uuid, username, password, env).then(
                () => crawlDataset(uuid, username, password, env)
              );
            })
            .catch(err => {
              console.log(err);
            });
        }
      });
    });
  });
};

module.exports = registerStudies;

