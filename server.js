const fse = require("fs-extra");
const express = require("express");
const session = require("cookie-session");
const { SdkManagerBuilder } = require("@aps_sdk/autodesk-sdkmanager");
const { AuthenticationClient, Scopes, ResponseType } = require("@aps_sdk/authentication");
const { dumpDesignProperties } = require("./lib/aps.js");
const { ChatbotSession } = require("./lib/chatbot.js");

const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, SERVER_SESSION_SECRET } = process.env;
if (!APS_CLIENT_ID || !APS_CLIENT_SECRET || !APS_CALLBACK_URL || !SERVER_SESSION_SECRET) {
    console.error("Missing some of the environment variables.");
    process.exit(1);
}
const PORT = process.env.PORT || 8080;

const sdk = SdkManagerBuilder.create().build();
const authenticationClient = new AuthenticationClient(sdk);
const sessions = new Map(); // Cache of chatbot sessions indexed by design URNs

let app = express();
app.use(express.static("wwwroot"));
app.use(session({ secret: SERVER_SESSION_SECRET, maxAge: 24 * 60 * 60 * 1000 }));
app.get("/auth/login", function (req, res) {
    res.redirect(authenticationClient.authorize(APS_CLIENT_ID, ResponseType.Code, APS_CALLBACK_URL, [Scopes.DataRead]));
});
app.get("/auth/logout", function (req, res) {
    req.session = null;
    res.redirect(authenticationClient.logout());
});
app.get("/auth/callback", async function (req, res, next) {
    try {
        const credentials = await authenticationClient.getThreeLeggedToken(APS_CLIENT_ID, req.query.code, APS_CALLBACK_URL, { clientSecret: APS_CLIENT_SECRET });
        req.session.access_token = credentials.access_token;
        req.session.refresh_token = credentials.refresh_token;
        req.session.expires_at = Date.now() + credentials.expires_in * 1000;
        res.redirect("/");
    } catch (err) {
        next(err);
    }
});
app.use(async function (req, res, next) {
    try {
        const { refresh_token, expires_at } = req.session;
        if (!refresh_token) {
            res.status(401).end();
            return;
        }
        if (expires_at < Date.now()) {
            const credentials = await authenticationClient.getRefreshToken(APS_CLIENT_ID, refresh_token, { clientSecret: APS_CLIENT_SECRET, scopes: [Scopes.DataRead] });
            req.session.access_token = credentials.access_token;
            req.session.refresh_token = credentials.refresh_token;
            req.session.expires_at = Date.now() + credentials.expires_in * 1000;
        }
        next();
    } catch (err) {
        next(err);
    }
});
app.get("/auth/profile", async function (req, res, next) {
    try {
        const profile = await authenticationClient.getUserInfo(req.session.access_token);
        res.json({ name: `${profile.name}` });
    } catch (err) {
        next(err);
    }
});
app.get("/auth/token", function (req, res, next) {
    res.json({
        access_token: req.session.access_token,
        expires_in: Math.round((req.session.expires_at - Date.now()) / 1000),
    });
});
app.post("/prompt/:urn", express.json(), async function (req, res, next) {
    try {
        let session = sessions.get(req.params.urn);
        if (!session) {
            const sqliteDatabasePath = `tmp/${req.params.urn}.sqlite`;
            if (!fse.existsSync(sqliteDatabasePath)) {
                await dumpDesignProperties(req.params.urn, req.session.access_token, sqliteDatabasePath);
            }
            session = await ChatbotSession.init(sqliteDatabasePath);
            sessions.set(req.params.urn, session);
        }
        const answer = await session.prompt(req.body.question);
        res.json({ answer });
    } catch (err) {
        next(err);
    }
});
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send(err.message);
});
app.listen(PORT, function () { console.log(`Server listening on port ${PORT}...`); });