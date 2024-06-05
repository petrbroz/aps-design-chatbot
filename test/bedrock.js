const { getCredentials, getDesignViews, getDesignProperties } = require("../lib/aps.js");
const { ChatbotSession } = require("../lib/bedrock.js");

const { APS_CLIENT_ID, APS_CLIENT_SECRET } = process.env;

function dumpDesignProperties(properties) {
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
    return input.join("\n");
}

async function run(urn) {
    const credentials = await getCredentials(APS_CLIENT_ID, APS_CLIENT_SECRET);
    const views = await getDesignViews(urn, credentials.access_token);
    if (views.length === 0) {
        throw new Error("Design has no views");
    }
    const properties = await getDesignProperties(urn, views[0].guid, credentials.access_token);
    const chatbot = new ChatbotSession();
    const prompts = [
        dumpDesignProperties(properties),
        "Which object has the largest area, and which one has the smallest area?",
        "What is the average width of all objects? Don't explain the process, just output the object IDs as a JSON array."
    ];
    for (const prompt of prompts) {
        console.log("Q", prompt);
        const answer = await chatbot.prompt(prompt);
        console.log("A", answer);
    }
}

run(process.argv[2])
    .catch(err => { console.error(err); process.exit(1); });