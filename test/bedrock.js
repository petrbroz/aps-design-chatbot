const { getCredentials, getDesignViews, getDesignProperties } = require("../lib/aps.js");
const { prompt } = require("../lib/bedrock.js");

const { APS_CLIENT_ID, APS_CLIENT_SECRET } = process.env;

function buildQuery(properties, query) {
    const MAX_ELEMENTS = 256;
    const input = [
        "I have the following list of objects:",
        ""
    ];
    let elements = 0;
    for (const record of properties) {
        if (record.properties["Dimensions"] && record.properties["Dimensions"]["Area"] && elements < MAX_ELEMENTS) {
            input.push(`Object ID ${record.objectid}:`);
            for (const [key, value] of Object.entries(record.properties["Dimensions"])) {
                input.push(`  - ${key}: ${value}`);
            }
            elements++;
        }
    }
    input.push("");
    input.push(query);
    return input.join("\n");
}

async function run(urn, question) {
    const credentials = await getCredentials(APS_CLIENT_ID, APS_CLIENT_SECRET);
    const views = await getDesignViews(urn, credentials.access_token);
    if (views.length === 0) {
        throw new Error("Design has no views");
    }
    const properties = await getDesignProperties(urn, views[0].guid, credentials.access_token);
    const query = buildQuery(properties, question);
    const answer = await prompt(query);
    return answer;
}

run(process.argv[2], process.argv[3])
    .then(answer => console.log(answer))
    .catch(err => { console.error(err); process.exit(1); });