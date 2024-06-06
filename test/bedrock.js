const { getCredentials, getDesignViews, getSelectedDesignProperties } = require("../lib/aps.js");
const { ChatbotSession } = require("../lib/bedrock.js");

const { APS_CLIENT_ID, APS_CLIENT_SECRET } = process.env;
const MAX_ELEMENTS = 512;
const PROPERTY_CATEGORY = "Dimensions";
const PROPERTY_NAMES = ["Width", "Height", "Length", "Area", "Volume"];

function dumpDesignProperties(props) {
    const csv = props.slice(0, MAX_ELEMENTS).map(({ objectid, name, properties }) => [
        objectid,
        `"${name}"`,
        ...PROPERTY_NAMES.map(name => properties[PROPERTY_CATEGORY] && properties[PROPERTY_CATEGORY][name] ? parseFloat(properties[PROPERTY_CATEGORY][name]) : "")
    ].join(","));
    csv.unshift(["id", "name", ...PROPERTY_NAMES].join(","));
    return csv.join("\n");
}

async function run(urn) {
    const credentials = await getCredentials(APS_CLIENT_ID, APS_CLIENT_SECRET);
    const views = await getDesignViews(urn, credentials.access_token);
    if (views.length === 0) {
        throw new Error("Design has no views");
    }
    const props = await getSelectedDesignProperties(urn, views[0].guid, ["objectid", "name", `properties.${PROPERTY_CATEGORY}.*`], credentials.access_token);
    const csv = dumpDesignProperties(props);
    const chatbot = new ChatbotSession();
    const prompts = [
        "Here is a CSV table of design elements with various properties:\n\n" + csv + "\n\nYou are a data analyst providing answers to different queries related to this data.",
        "Which object has the largest area, and which one has the smallest area?",
        "List all Window elements.",
        "Find all elements with volume larger than 8, and output their IDs as a JSON array of numbers."
    ];
    for (const prompt of prompts) {
        console.log("-------- Q --------");
        console.log(prompt);
        const answer = await chatbot.prompt(prompt);
        console.log("-------- A --------");
        console.log(answer);
    }
}

run(process.argv[2])
    .catch(err => { console.error(err); process.exit(1); });