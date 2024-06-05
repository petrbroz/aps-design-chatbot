class DataManagementClient {
    async #token() {
        const resp = await fetch("/auth/token");
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const credentials = await resp.json();
        return credentials["access_token"];
    }

    async #get(endpoint) {
        const token = await this.#token();
        const resp = await fetch(`https://developer.api.autodesk.com/${endpoint}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const { data } = await resp.json();
        return data;
    }
    
    getHubs() {
        return this.#get(`/project/v1/hubs`);
    }

    getProjects(hubId) {
        return this.#get(`/project/v1/hubs/${encodeURIComponent(hubId)}/projects`);
    }

    getContents(hubId, projectId, folderId = null) {
        return this.#get(folderId
            ? `/data/v1/projects/${encodeURIComponent(projectId)}/folders/${encodeURIComponent(folderId)}/contents`
            : `/project/v1/hubs/${encodeURIComponent(hubId)}/projects/${encodeURIComponent(projectId)}/topFolders`);
    }

    getVersions(hubId, projectId, itemId) {
        return this.#get(`/data/v1/projects/${encodeURIComponent(projectId)}/items/${encodeURIComponent(itemId)}/versions`);
    }
}

const dataManagementClient = new DataManagementClient();

export function initBrowser(selector, onSelectionChanged) {
    const tree = new InspireTree({ // http://inspire-tree.com
        data: async function (node) {
            const createTreeNode = (id, text, icon, children = false) => ({ id, text, children, itree: { icon } });
            if (!node || !node.id) {
                return dataManagementClient.getHubs().then(hubs => hubs.map(hub => createTreeNode(`hub|${hub.id}`, hub.attributes.name, "icon-hub", true)))
            } else {
                const tokens = node.id.split("|");
                switch (tokens[0]) {
                    case "hub":
                        return dataManagementClient.getProjects(tokens[1])
                            .then(projects => projects.map(project => createTreeNode(`project|${tokens[1]}|${project.id}`, project.attributes.name, "icon-project", true)));
                    case "project":
                    case "folder":
                        return dataManagementClient.getContents(tokens[1], tokens[2], tokens[3])
                            .then(items => items.map(item => {
                                if (item.type === "folders") {
                                    return createTreeNode(`folder|${tokens[1]}|${tokens[2]}|${item.id}`, item.attributes.displayName, "icon-my-folder", true);
                                } else {
                                    return createTreeNode(`item|${tokens[1]}|${tokens[2]}|${item.id}`, item.attributes.displayName, "icon-item", true);
                                }
                            }));
                    case "item":
                        return dataManagementClient.getVersions(tokens[1], tokens[2], tokens[3])
                            .then(versions => versions.map(version => createTreeNode(`version|${version.id}`, version.attributes.createTime, "icon-version")));
                    default: return [];
                }
            }
        }
    });
    tree.on("node.click", function (event, node) {
        event.preventTreeDefault();
        const tokens = node.id.split("|");
        if (tokens[0] === "version") {
            onSelectionChanged(tokens[1]);
        }
    });
    return new InspireTreeDOM(tree, { target: selector });
}
