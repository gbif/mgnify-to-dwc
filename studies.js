const request = require("request-promise");
const _ = require('lodash')
const baseUrl = `https://www.ebi.ac.uk/ebisearch/ws/rest/metagenomics_analyses?format=json&fields=id%2Cname%2Cbiome_name%2Cdescription%2CMETAGENOMICS_PROJECTS%2CMETAGENOMICS_SAMPLES%2Cexperiment_type%2Cpipeline_version%2CASSEMBLY%2CENA_RUN%2CENA_WGS_SEQUENCE_SET&facetcount=10&facetsdepth=5&query=domain_source%3Ametagenomics_analyses`

const createStudyList = async (pipeline_version) => {
    console.log("Creating study list for pipeline version "+ pipeline_version);
    let studyEnum = {};
    const size = 100;
    let start = 0;
    const facets = `pipeline_version%3A${pipeline_version}%2Cbiome%3AEnvironmental%2Cexperiment_type%3Aamplicon%2Cexperiment_type%3Ametagenomic`
    let hitCount = 999999999999999;
    while((start+size) <  hitCount){
        const data = await request({
            uri: `${baseUrl}&size=${size}&start=${start}&facets=${facets}`,
            json: true
          });
       
        if(data.entries){
            data.entries.forEach(e => {
                const studyID = _.get(e, 'fields.METAGENOMICS_PROJECTS[0]')
                if(studyID){
                    studyEnum[studyID] = true;
                }
            });
        }
        start += size;
        hitCount = data.hitCount;
        console.log(`Extracting studies from analyses ${start} - ${start + size} of ${hitCount}`)
    }

    return Object.keys(studyEnum);
}

module.exports = {
    createStudyList: createStudyList
}

