const { getCredentials, getDesignViews, getDesignProperties } = require("../lib/aps.js");
const { prompt } = require("../lib/bedrock.js");

const { APS_CLIENT_ID, APS_CLIENT_SECRET } = process.env;
const MAX_ELEMENTS = 256;
const PROPERTY_CATEGORY = "Dimensions";

async function run(urn, query) {
    const credentials = await getCredentials(APS_CLIENT_ID, APS_CLIENT_SECRET);
    const views = await getDesignViews(urn, credentials.access_token);
    if (views.length === 0) {
        throw new Error("Design has no views");
    }
    const properties = await getDesignProperties(urn, views[0].guid, credentials.access_token);
    const input = [
        "I have the following list of objects:",
        ""
    ];
    for (const record of properties.slice(0, MAX_ELEMENTS)) {
        if (PROPERTY_CATEGORY in record.properties) {
            input.push(`Object ID ${record.objectid}:`);
            for (const [key, value] of Object.entries(record.properties[PROPERTY_CATEGORY])) {
                input.push(`  - ${key}: ${value}`);
            }
        }
    }
    input.push("");
    input.push(query);
    const answer = await prompt(input.join("\n"));
    return answer;
}

run(process.argv[2], process.argv[3])
    .then(answer => console.log(answer))
    .catch(err => { console.error(err); process.exit(1); });