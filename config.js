module.exports = {
    uat: {
      publishingOrganizationKey: "480dd716-14dc-4807-a912-d0f4ac28623d",
      installationKey: "41e5ac50-ae41-4c9d-b6c6-1259b5cd9898",
      baseUrl: "http://api.gbif-uat.org/v1/",
      hostUrl: "http://labs.gbif.org/mgnify/",
      path: "/var/www/html/mgnify"
      },
    dev: {
      publishingOrganizationKey: "ada9d123-ddb4-467d-8891-806ea8d94230",
      baseUrl: "http://api.gbif-dev.org/v1/",
      hostUrl: "http://labs.gbif.org/mgnify/",
      path: "/var/www/html/mgnify",
      installationKey: "9e4f3516-2b98-4700-a39a-3f109252508c"
    },
    prod: {
      publishingOrganizationKey: "ab733144-7043-4e88-bd4f-fca7bf858880",
      baseUrl: "http://api.gbif.org/v1/",
      hostUrl: "https://hosted-datasets.gbif.org/mgnify/",
      path: "/mnt/auto/misc/hosted-datasets.gbif.org/mgnify/",
      installationKey: "fb5e4c2a-579c-434b-a446-3a665dd732ad" 
    }
  };