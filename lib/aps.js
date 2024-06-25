const { SdkManagerBuilder } = require("@aps_sdk/autodesk-sdkmanager");
const { AuthenticationClient, Scopes } = require("@aps_sdk/authentication");
const { ModelDerivativeClient } = require("@aps_sdk/model-derivative");
const sqlite3 = require("sqlite3");

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
 * @param {string} sqliteDatabasePath Path to the new sqlite database.
 */
async function dumpDesignProperties(urn, accessToken, sqliteDatabasePath) {
    const CATEGORY_NAME = "Dimensions";
    const PROPERTY_NAMES = ["Width", "Height", "Length", "Area", "Volume", "Thickness"];
    const views = await getDesignViews(urn, accessToken);
    const guid = views[0].guid;
    const tree = await getDesignTree(urn, guid, accessToken);
    const props = await getDesignProperties(urn, guid, accessToken);

    const db = new sqlite3.Database(sqliteDatabasePath);
    db.serialize(() => {
        db.run(`CREATE TABLE properties (id INTEGER PRIMARY KEY, name TEXT NOT NULL, ${PROPERTY_NAMES.map(p => p.toLowerCase() + " REAL").join(", ")})`);
        const stmt = db.prepare(`INSERT INTO properties VALUES (?, ?, ${PROPERTY_NAMES.map(_ => "?").join(", ")})`);
        function traverse(node) {
            if (node.objects && node.objects.length > 0) {
                for (const child of node.objects) {
                    traverse(child);
                }
            } else {
                const { objectid, name, properties } = props.find(e => e.objectid === node.objectid);
                const category = properties[CATEGORY_NAME];
                if (category) {
                    const values = PROPERTY_NAMES.map(p => category[p] ? parseFloat(category[p]) : null);
                    stmt.run([objectid, name, ...values]);
                }
            }
        }
        traverse(tree);
        stmt.finalize();
    });
    return new Promise((resolve, reject) => {
        db.close(err => {
            if (err) reject(err);
            else resolve();
        });
    });
    
}

module.exports = {
    getCredentials,
    dumpDesignProperties
};
