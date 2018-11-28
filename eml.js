const institutionMap = require('./institutionEnum')

const createEML = (study, pipeline, publications) => {
    const institution = institutionMap[study["centre-name"]] || {organizationName: study["centre-name"], address: {city: "", deliveryPoint: "", postalCode: ""}, phone: ""};
  return `<eml:eml xmlns:eml="eml://ecoinformatics.org/eml-2.1.1"
    xmlns:dc="http://purl.org/dc/terms/"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="eml://ecoinformatics.org/eml-2.1.1 http://rs.gbif.org/schema/eml-gbif-profile/1.1/eml.xsd"
    packageId="84d26682-f762-11e1-a439-00145eb45e9a/v9.3" system="http://gbif.org" scope="system"
    xml:lang="en">
<dataset>
<title xml:lang="en">${study["study-name"]}</title>

<creator>
<organizationName>${institution.organizationName}</organizationName>
<address>
    <deliveryPoint>${institution.address.deliveryPoint}</deliveryPoint>
    <city>${institution.address.city}</city>
    <postalCode>${institution.address.postalCode}</postalCode>
    <country>${institution.address.country}</country>
</address>
<phone>${institution.phone}</phone>
</creator>

<metadataProvider>
<organizationName>${institution.organizationName}</organizationName>
<address>
    <deliveryPoint>${institution.address.deliveryPoint}</deliveryPoint>
    <city>${institution.address.city}</city>
    <postalCode>${institution.address.postalCode}</postalCode>
    <country>${institution.address.country}</country>
</address>
<phone>${institution.phone}</phone>
</metadataProvider>

<pubDate>
 ${study["last-update"]}
</pubDate>
<language>en</language>
<abstract>
     <para>${study["study-abstract"]}</para>
</abstract>
<keywordSet>
       <keyword>Metagenomics</keyword>
       <keyword>environmental genomics</keyword>
        <keywordThesaurus>N/A</keywordThesaurus>
</keywordSet>

<intellectualRights>
<para>This work is licensed under a <ulink url="http://creativecommons.org/licenses/by/4.0/legalcode"><citetitle>Creative Commons Attribution Non Commercial (CC-BY) 4.0 License</citetitle></ulink>.</para>
</intellectualRights>
<distribution scope="document">
<online>
 <url function="information">https://www.ebi.ac.uk/metagenomics/studies/${
   study.accession
 }</url>
</online>
</distribution>

<maintenance>
<description>
 <para></para>
</description>
<maintenanceUpdateFrequency>unkown</maintenanceUpdateFrequency>
</maintenance>

 <contact>
 <organizationName>${institution.organizationName}</organizationName>
<address>
    <deliveryPoint>${institution.address.deliveryPoint}</deliveryPoint>
    <city>${institution.address.city}</city>
    <postalCode>${institution.address.postalCode}</postalCode>
    <country>${institution.address.country}</country>
</address>
<phone>${institution.phone}</phone>

 </contact>
<methods>
   <methodStep>
     <description>
       <para>Pipeline used: https://www.ebi.ac.uk/metagenomics/pipelines/${pipeline}</para>
     </description>
   </methodStep>
 <sampling>

   <samplingDescription>
     <para>
     ${study["study-abstract"]}
     </para>
   </samplingDescription>
 </sampling>
 
</methods>
<project >
<title>${study["study-name"]}</title>

</project>
</dataset>
<additionalMetadata>
<metadata>
<gbif>
${createBibliography(publications)}
</gbif>

</metadata>
</additionalMetadata>
</eml:eml>`;
};

const createBibliography = publications => {
  return `<bibliography>     
    ${publications.map(({ attributes }) => createCitation(attributes)).join(' ')}
  </bibliography>`;
};

const createCitation = publication => {
  return `<citation identifier="DOI:${publication.doi}">${publication.authors} ${
    publication["published-year"]
  }. ${publication["pub-title"]} ${publication["iso-journal"]} vol. ${
    publication.volume
  }</citation>`;
};

module.exports = {
    createEML:createEML
}