const { SdkManagerBuilder } = require("@aps_sdk/autodesk-sdkmanager");
const { AuthenticationClient, Scopes } = require("@aps_sdk/authentication");
const { ModelDerivativeClient } = require("@aps_sdk/model-derivative");

const sdk = SdkManagerBuilder.create().build();
const authenticationClient = new AuthenticationClient(sdk);
const modelDerivativeClient = new ModelDerivativeClient(sdk);

/**
 * Generates 2-legged credentials with read access to APS.
 * @param {string} clientId APS client ID.
 * @param {string} clientSecret APS client secret.
 * @returns Credentials.
 */
async function getCredentials(clientId, clientSecret) {
    const credentials = await authenticationClient.getTwoLeggedToken(clientId, clientSecret, [Scopes.DataRead]);
    return credentials;
};

/**
 * Lists all viewables generated for a specific design in APS.
 * @param {string} urn Design URN.
 * @param {string} accessToken Access token.
 */
async function getDesignViews(urn, accessToken) {
    const response = await modelDerivativeClient.getModelViews(accessToken, urn);
    return response.data.metadata;
}

/**
 * Retrieves hierarchy of elements for a specific design in APS.
 * @param {string} urn Design URN.
 * @param {string} guid Viewable GUID.
 * @param {string} accessToken Access token.
 */
async function getDesignTree(urn, guid, accessToken) {
    let response = await modelDerivativeClient.getObjectTree(accessToken, urn, guid);
    while (response.isProcessing) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        response = await modelDerivativeClient.getObjectTree(accessToken, urn, guid);
    }
    return response.data.objects[0];
}

/**
 * Retrieves all element properties for a specific design in APS.
 * @param {string} urn Design URN.
 * @param {string} guid Viewable GUID.
 * @param {string} accessToken Access token.
 */
async function getDesignProperties(urn, guid, accessToken) {
    let response = await modelDerivativeClient.getAllProperties(accessToken, urn, guid);
    while (response.isProcessing) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        response = await modelDerivativeClient.getAllProperties(accessToken, urn, guid);
    }
    return response.data.collection;
}

/**
 * Converts a subset of selected properties of a design in Autodesk Platform Services into a CSV table.
 * @param {string} urn Design URN.
 * @param {string} accessToken Access token.
 * @returns CSV table.
 */
async function dumpDesignProperties(urn, accessToken) {
    const MAX_ELEMENTS = 512;
    const PROPERTY_CATEGORY = "Dimensions";
    const PROPERTY_NAMES = ["Width", "Height", "Length", "Area", "Volume"];
    const views = await getDesignViews(urn, accessToken);
    const guid = views[0].guid;
    const tree = await getDesignTree(urn, guid, accessToken);
    const props = await getDesignProperties(urn, guid, accessToken);
    let output = [];
    function traverse(node) {
        if (node.objects && node.objects.length > 0) {
            for (const child of node.objects) {
                traverse(child);
            }
        } else {
            const { objectid, name, properties } = props.find(e => e.objectid === node.objectid);
            output.push([
                objectid,
                `"${name}"`,
                ...PROPERTY_NAMES.map(name => properties[PROPERTY_CATEGORY] && properties[PROPERTY_CATEGORY][name] ? parseFloat(properties[PROPERTY_CATEGORY][name]) : "")
            ].join(","));
        }
    }
    traverse(tree);
    output = output.slice(0, MAX_ELEMENTS);
    output.unshift(["id", "name", ...PROPERTY_NAMES.map(name => name.toLowerCase())].join(","));
    return output.join("\n");
}

module.exports = {
    getCredentials,
    dumpDesignProperties
};