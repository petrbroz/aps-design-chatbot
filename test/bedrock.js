const { getCredentials, dumpDesignProperties } = require("../lib/aps.js");
const { ChatbotSession } = require("../lib/bedrock.js");

const { APS_CLIENT_ID, APS_CLIENT_SECRET } = process.env;

async function run(urn) {
    const credentials = await getCredentials(APS_CLIENT_ID, APS_CLIENT_SECRET);
    const csv = await dumpDesignProperties(urn, credentials.access_token);
    const chatbot = new ChatbotSession();
    const prompts = [
        "Here is a CSV table of design elements with various properties:\n\n" + csv + "\n\nYou are a data analyst providing answers to different queries related to this data.",
        "Which object has the largest area, and which one has the smallest area?",
        "List all Window elements.",
        "Find all elements with volume larger than 8, and output their IDs as a JSON array of numbers."
    ];
    for (const prompt of prompts) {
        console.log("-------------------------------- User --------------------------------");
        console.log(prompt);
        console.log("------------------------------ Assistant -----------------------------");
        console.log(await chatbot.prompt(prompt));
    }
}

run(process.argv[2])
    .catch(err => { console.error(err); process.exit(1); });