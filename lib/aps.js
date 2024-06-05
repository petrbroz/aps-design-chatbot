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

async function getDesignProperties(urn, guid, accessToken) {
    const response = await modelDerivativeClient.getAllProperties(accessToken, urn, guid);
    return response.data.collection;
    // TODO: wait and repeat if the response is 201/202
}

module.exports = {
    getCredentials,
    getDesignViews,
    getDesignProperties
};