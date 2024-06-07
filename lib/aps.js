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
 * Retrieves selected properties for elements in a specific design in APS.
 * @param {string} urn Design URN.
 * @param {string} guid Viewable GUID.
 * @param {number[]} dbids Object IDs to retrieve the properties for (maximum: 1000).
 * @param {string[]} fields List of filters for fields to be included in the output
 * (see https://aps.autodesk.com/en/docs/model-derivative/v2/reference/http/metadata/urn-metadata-guid-properties-query-POST/#body-structure).
 * @param {string} accessToken Access token.
 */
async function getSelectedDesignProperties(urn, guid, dbids, fields, accessToken) {
    const query = { $in: ["objectid", ...dbids] };
    let response = await modelDerivativeClient.getSpecificProperties(accessToken, urn, guid, {
        pagination: { limit: 256 },
        query,
        fields
    });
    while (response.isProcessing) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        response = await modelDerivativeClient.getSpecificProperties(accessToken, urn, guid, {
            pagination: { limit: 256 },
            query,
            fields
        });
    }
    let results = response.data.collection;
    while (response.pagination.offset + response.pagination.limit < response.pagination.totalResults) {
        response = await modelDerivativeClient.getSpecificProperties(accessToken, urn, guid, {
            pagination: { offset: response.pagination.offset + response.pagination.limit },
            query,
            fields
        });
        results = results.concat(response.data.collection);
    }
    return results;
}

/**
 * Collects IDs of leaf elements
 * @param {object} node Design element ID.
 * @param {number[]} output List to be populated with IDs of leaf elements.
 */
function collectLeafObjectIDs(node, output) {
    output = output || [];
    if (node.objects && node.objects.length > 0) {
        for (const child of node.objects) {
            collectLeafObjectIDs(child, output);
        }
    } else {
        output.push(node.objectid);
    }
    return output;
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
    const PROPERTY_FILTER = ["objectid", "name", `properties.${PROPERTY_CATEGORY}.*`];
    const PROPERTY_NAMES = ["Width", "Height", "Length", "Area", "Volume"];
    const views = await getDesignViews(urn, accessToken);
    const guid = views[0].guid;
    const tree = await getDesignTree(urn, guid, accessToken);
    const dbids = collectLeafObjectIDs(tree);
    const props = await getSelectedDesignProperties(urn, guid, dbids.slice(0, MAX_ELEMENTS), PROPERTY_FILTER, accessToken);
    const csv = props.map(({ objectid, name, properties }) => [
        objectid,
        `"${name}"`,
        ...PROPERTY_NAMES.map(name => properties[PROPERTY_CATEGORY] && properties[PROPERTY_CATEGORY][name] ? parseFloat(properties[PROPERTY_CATEGORY][name]) : "")
    ].join(","));
    csv.unshift(["id", "name", ...PROPERTY_NAMES].join(","));
    return csv.join("\n");
}

module.exports = {
    getCredentials,
    dumpDesignProperties
};