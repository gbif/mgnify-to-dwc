const request = require("requestretry");
const _ = require("lodash");
const fs = require("fs");
const settings = require("./writers/settings");
const identifierPrefix = "https://www.ebi.ac.uk/metagenomics/studies/";

const config = {
  uat: {
    publishingOrganizationKey: "480dd716-14dc-4807-a912-d0f4ac28623d",
    installationKey: "41e5ac50-ae41-4c9d-b6c6-1259b5cd9898",
    baseUrl: "http://api.gbif-uat.org/v1/",
    hostUrl: "http://labs.gbif.org/~mhoefft/mgnify/",
    path: "/var/www/html/mgnify"
    },
  dev: {
    publishingOrganizationKey: "ada9d123-ddb4-467d-8891-806ea8d94230",
    baseUrl: "http://api.gbif-dev.org/v1/",
    hostUrl: "http://labs.gbif.org/~mhoefft/mgnify/",
    path: "/var/www/html/mgnify",
    installationKey: "9e4f3516-2b98-4700-a39a-3f109252508c"
  },
  prod: {
    publishingOrganizationKey: "",
    baseUrl: "http://api.gbif.org/v1/",
    hostUrl: "https://hosted-datasets.gbif.org/",
    path: "/mnt/auto/misc/hosted-datasets.gbif.org/mgnify/",
    installationKey: "", // unknown
    publishingOrganizationKey: "" // unknown
  }
};

const isRegisteredInGBIF = async (studyId, env) => {
  const response = await request.get({
    url: `${env.baseUrl}dataset?identifier=${identifierPrefix}${studyId}`,
    timeout: 60000,
    maxAttempts: 5, // (default) try 5 times
    retryDelay: 20000,
    json: true
  });
  if (response.body.count > 1) {
    console.error(
      `Study id ${studyId} is registered ${response.body.count} times in GBIF`
    );
  }
  return response.body.count === 1;
};
const addIdentifier = async (studyId, uuid, username, password, env) => {
  const auth =
    "Basic " + new Buffer(username + ":" + password).toString("base64");

  return request.post({
    url: `${baseUrl}dataset/${uuid}/identifier`,
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
    url: `${baseUrl}dataset/${uuid}/endpoint`,
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
  // path here?
  fs.readdir(`./${settings.folder}`, function(err, studies) {
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

