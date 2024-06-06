const { getCredentials, getDesignViews, getSelectedDesignProperties } = require("../lib/aps.js");
const { ChatbotSession } = require("../lib/bedrock.js");

const { APS_CLIENT_ID, APS_CLIENT_SECRET } = process.env;

/**
 * Converts a subset of selected properties of a design in Autodesk Platform Services into a CSV table.
 * @param {string} urn Design URN.
 * @param {string} guid Viewable GUID.
 * @param {string} accessToken Access token.
 * @returns CSV table.
 */
async function dumpDesignProperties(urn, guid, accessToken) {
    const MAX_ELEMENTS = 512;
    const PROPERTY_CATEGORY = "Dimensions";
    const PROPERTY_NAMES = ["Width", "Height", "Length", "Area", "Volume"];
    const props = await getSelectedDesignProperties(urn, guid, ["objectid", "name", `properties.${PROPERTY_CATEGORY}.*`], accessToken);
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
    const csv = await dumpDesignProperties(urn, views[0].guid, credentials.access_token);
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