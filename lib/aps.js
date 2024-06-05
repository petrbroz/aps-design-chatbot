const { SdkManagerBuilder } = require('@aps_sdk/autodesk-sdkmanager');
const { AuthenticationClient, Scopes } = require('@aps_sdk/authentication');
const { ModelDerivativeClient } = require('@aps_sdk/model-derivative');

const sdk = SdkManagerBuilder.create().build();
const authenticationClient = new AuthenticationClient(sdk);
const modelDerivativeClient = new ModelDerivativeClient(sdk);

async function getCredentials(clientId, clientSecret) {
    const credentials = await authenticationClient.getTwoLeggedToken(clientId, clientSecret, [Scopes.DataRead]);
    return credentials;
};

async function getDesignViews(urn, accessToken) {
    const response = await modelDerivativeClient.getModelViews(accessToken, urn);
    return response.data.metadata;
}

async function getDesignTree(urn, guid, accessToken) {
    let response = await modelDerivativeClient.getObjectTree(accessToken, urn, guid);
    while (response.isProcessing) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        response = await modelDerivativeClient.getObjectTree(accessToken, urn, guid);
    }
    return response.data.objects[0];
}

async function getDesignProperties(urn, guid, accessToken) {
    let response = await modelDerivativeClient.getAllProperties(accessToken, urn, guid);
    while (response.isProcessing) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        response = await modelDerivativeClient.getAllProperties(accessToken, urn, guid);
    }
    return response.data.collection;
}

async function getSelectedDesignProperties(urn, guid, fields, accessToken) {
    const tree = await getDesignTree(urn, guid, accessToken);
    const dbids = collectLeafObjectIDs(tree);
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

module.exports = {
    getCredentials,
    getDesignViews,
    getDesignTree,
    getDesignProperties,
    getSelectedDesignProperties
};