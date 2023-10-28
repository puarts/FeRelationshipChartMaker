
const GraphElemId = "graph";
const g_dummyImagePath = "/blog/images/FehCylPortraits/Unknown.png";


function toDataURLAsync(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
        var reader = new FileReader();
        reader.onloadend = function () {
            callback(reader.result);
        }
        reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
}

// Worker上でしか使えない
function toDataUrlSync(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);  // `false` で同期リクエストになる
    xhr.send();

    if (xhr.status !== 200) {
        // 失敗
        throw new Error(`${url}の取得に失敗`);
    }

    var reader = new FileReaderSync();
    return reader.readAsDataURL(xhr.response);
}

const g_imagePathToDataCache = {};

let ThumbRoot = "/blog/images/FehCylPortraits/";

function convertImageElementUrlToDataUrl(rootElement, endCallback) {
    let convertTargetUrls = [];
    for (let elem of rootElement.querySelectorAll("image")) {
        let url = elem.getAttribute("href");
        if (url in g_imagePathToDataCache) {
            let dataUrl = g_imagePathToDataCache[url];
            elem.setAttribute("href", dataUrl);
            continue;
        }

        if (url.startsWith(ThumbRoot)) {
            convertTargetUrls.push([url, elem]);
        }
    }

    toDataURLAsyncRecursive(convertTargetUrls, endCallback);
}

function toDataURLAsyncRecursive(convertTargetUrls, endCallback) {
    if (convertTargetUrls.length == 0) {
        endCallback();
        return;
    }
    let url = convertTargetUrls[0][0];
    toDataURLAsync(url, dataUrl => {
        console.log(`converting ${url}`);
        g_imagePathToDataCache[url] = dataUrl;
        let elem = convertTargetUrls[0][1];
        elem.setAttribute("href", dataUrl);

        convertTargetUrls.splice(0, 1);
        toDataURLAsyncRecursive(convertTargetUrls, endCallback);
    });
}


function str_replace(search, replace, subject) {
    return subject.replaceAll(search, replace);
}


function urlExists(url) {
    var http = new XMLHttpRequest();
    http.open('HEAD', url, false);
    http.send();
    return http.status != 404;
}

class TagInfo {
    constructor(id, name, displayName) {
        this.id = id;
        this.name = name;
        this.displayName = displayName;
    }
}

class CharacterInfo {
    constructor(id, name, englishName, imageName, series, tags, variation, otherNames = []) {
        /** @type {number} */
        this.id = id;
        /** @type {string} */
        this.name = name;
        /** @type {string} */
        this.englishName = englishName;
        /** @type {string[]} */
        this.series = series;
        /** @type {string[]} */
        this.tags = tags;
        this.variation = variation;
        this.imageName = imageName;
        /** @type {string[]} */
        this.otherNames = otherNames;
    }

    get displayName() {
        let suffix = "";
        if (this.otherNames != null && this.otherNames.length > 0) {
            suffix += `\n(${this.otherNames[0]})`;
        }
        return this.name + suffix;
    }

    get imagePath() {
        if (this.imageName == "" || this.imageName == null) {
            return "";
        }
        else {
            return ThumbRoot + this.imageName;
        }
    }

    get url() {
        return `https://puarts.com/?fechar=${this.id}#main-content`;
    }
}

class FilterCategory {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.charInfos = [];
    }
}

const AllTitleLabel = "全て";
const NoneValue = -1;
const PropDelim = "||";
const ClusterIdOffset = 10000;

let g_isUpdateGraphEnabled = true;

class AppData extends SqliteDatabase {
    constructor() {
        super();

        this.dbPath = null;
        this.db = null;

        /** @type {Object.<string, CharacterInfo} */
        this.characters = {};

        /** @type {GraphEdge[]} */
        // this.edges = [];

        /** @type {GraphCluster[]} */
        this.clusters = [];

        /** @type {Graph} */
        this.graph = new Graph();

        this.charOptions = [];
        this.titleOptions = [];

        this.currentTitle = AllTitleLabel;

        this.titleToCharOptions = {};
        this.titleToCharOptions[AllTitleLabel] = [];

        this.dirOptions = [
            { id: "none", text: "－" },
            { id: "forward", text: "→" },
            { id: "back", text: "←" },
            { id: "both", text: "⇔" },
        ];

        this.layoutOptions = [
            { id: "", text: "自由配置(グループ未対応)" },
            { id: "dot", text: "階層配置" },
            { id: "circo", text: "環状配置(グループ未対応)" },

            // 実用性がないのでコメントアウト
            // { id: "neato", text: "ばねモデル配置1" },
            // { id: "fdp", text: "ばねモデル配置2" },
            // // { id: "sfdp", text: "ばねモデル配置3" }, // サポートされてない
            // { id: "twopi", text: "放射状配置" },
            // { id: "osage", text: "整列配置" },
            // { id: "patchwork", text: "パッチワーク配置" },
        ];

        this.rankdirOptions = [
            { id: "TB", text: "下向き" },
            { id: "BT", text: "上向き" },
            { id: "LR", text: "右向き" },
            { id: "RL", text: "左向き" },
        ];

        this.layout = "";
        // this.layout = "dot";
        this.rankdir = "BT";

        this.filterCharacters = [new GraphNode(-1, NoneValue)];
        /** @type {FilterCategory[]} */
        this.filterCategories = [];
        this.idToCategoryDict = {};
        this.filterCategoryOptions = [];

        this.selectedCategoryId = NoneValue;

        this.showsAllCharacters = false;


        this.graphObject = null;
        this.addedImagePathDict = {};
        this.isNodeImageDisabled = false;
        this.isAutoUpdateEnabled = true;

        this.showsCluster = false;


        this.isDebugModeEnabled = false;
        this.message = "";
        this.errorMessage = "";
        this.log = "";
        this.exportSettingUrl = "";
        this.tweetUrl = "";
        this.debugImportUrl = "";
    }

    createNewFilterCharacter() {
        this.filterCharacters.push(new GraphNode(-1, NoneValue));
    }

    removeFilterCharacter(value) {
        let index = this.filterCharacters.indexOf(value);
        this.filterCharacters.splice(index, 1);
    }

    updateTweetUrl() {
        const url = encodeURIComponent(this.exportSettingUrl);
        const text = encodeURIComponent("#FE人物相関図メーカー");
        const originalReferer = encodeURIComponent("https://puarts.com/");
        const refSrc = encodeURIComponent("twsrc^tfw|twcamp^buttonembed|twterm^share|twgr^");
        const uri = "https://twitter.com/intent/tweet?"
            + "original_referer=" + originalReferer
            + "&ref_src=" + refSrc
            + "&text=" + text
            + "&url=" + url;

        this.tweetUrl = uri;
    }

    toString() {
        return this.currentTitle
            + PropDelim + this.graph.toString();
    }

    /**
     * @param  {string} source
     */
    fromString(source, edgeSetDelayMilliseconds = 0) {
        this.clear();

        let elems = source.split(PropDelim);
        let i = 0;
        this.currentTitle = elems[i++];
        const graphStr = elems[i++];
        const graph = new Graph();
        graph.fromString(graphStr);
        this.graph = graph;

        // this.rankdir = elems[i++];
        // let dotSource = elems[i++];
        // let clusterString = elems[i++];
        // if (clusterString != undefined) {
        //     this.__parseClusterString(clusterString);
        // }
        // let nodesString = elems[i++];
        // if (nodesString != undefined) {
        //     let nodeId = 0;
        //     for (const nodeString of nodesString.split(";")) {
        //         if (nodeString == "") {
        //             continue;
        //         }

        //         const node = new GraphNode(++nodeId, "");
        //         node.fromString(nodeString);
        //         this.graph.nodes.push(node);
        //     }
        // }

        // // エッジはクラスターの後に変換する
        // if (edgeSetDelayMilliseconds == 0) {
        //     this.__parseDotSource(dotSource);
        // }
        // else {
        //     setTimeout(() => {
        //         // selectのオプションがビューに同期された後に実行しないと値が消えてしまうので
        //         // 苦肉の策で500ms待つ(初回のインポートに関しては、バインドのグラフ更新が
        //         // 行われないため、待ってしまうと、グラフが中途半端な状態で更新されてしまうので待てない)
        //         this.__parseDotSource(dotSource);
        //     }, edgeSetDelayMilliseconds);
        // }
    }

    clear() {
        this.graph.clear();
        // this.edges = [];
        this.clusters = [];
    }

    /**
     * @param  {string} dotSource
     */
    __parseDotSource(dotSource) {
        for (let edgeDotSourceElem of dotSource.split(";")) {
            let edgeDotSource = edgeDotSourceElem.trim();
            if (edgeDotSource == "") {
                continue;
            }

            let edge = new GraphEdge(NoneValue, NoneValue, "");
            edge.fromDotSource(edgeDotSource);
            this.edges.push(edge);
        }
    }
    /**
     * @param  {string} source
     */
    __parseClusterString(source) {
        for (let clusterString of source.split(";")) {
            if (clusterString == "") {
                continue;
            }

            let cluster = new GraphCluster(
                this.__getClusterId(),
                this.__getClusterDefaultName());
            cluster.fromString(clusterString);
            this.__addNewCluster(cluster);
        }
    }

    /**
     * idでなく、名前で定義されたエッジをセットします。
     * @param  {GraphEdge[]} edges
     */
    setEdgesDefinedByName(edges) {
        let charNameToCharDict = {};
        for (let id of Object.keys(this.characters)) {
            let char = this.characters[id];
            charNameToCharDict[char.name] = char.id;
        }
        for (let edge of edges) {
            if (edge.source in charNameToCharDict) {
                edge.source = charNameToCharDict[edge.source];
            }
            if (edge.destination in charNameToCharDict) {
                edge.destination = charNameToCharDict[edge.destination];
            }
        }
        this.edges = edges;
    }

    writeLogLine(message) {
        this.writeLog(message + "\n");
    }
    writeLog(message) {
        this.log += message;
    }
    writeErrorLine(message) {
        this.writeLog(message + "\n");
    }
    writeError(message) {
        this.log += "Error: " + message;
    }
    clearLog() {
        this.log = "";
    }

    init(characters, dbPath, createCharacterInfosFromDbFunc) {
        if (characters == null) {
            this.dbPath = dbPath;
            g_appData.initDatabase(() => {
                this.db = this.dbs[0];
                const createdCharacters = createCharacterInfosFromDbFunc(this.db);
                this.updateCharacterInfos(createdCharacters);
            });
        }
        else {
            this.updateCharacterInfos(characters);
        }
    }

    /**
     * @param  {CharacterInfo[]} characters
     */
    updateCharacterInfos(characters) {
        const noneOption = { id: NoneValue, text: "なし" };
        this.titleToCharOptions[AllTitleLabel] = [noneOption];
        let idToCharOption = {};
        let nameToCharOption = {};
        let redaudantIds = {};
        for (let charInfo of characters) {
            this.characters[charInfo.id] = charInfo;
            let option = { id: charInfo.id, text: charInfo.name };
            this.titleToCharOptions[AllTitleLabel].push(option);
            idToCharOption[charInfo.id] = option;

            if (charInfo.name in nameToCharOption) {
                let redaudantOption = nameToCharOption[charInfo.name];
                redaudantIds[redaudantOption.id] = redaudantOption;
                redaudantIds[option.id] = option;
            }
            nameToCharOption[charInfo.name] = option;
        }

        // 冗長な名前にはタイトル名を付与
        for (let id of Object.keys(redaudantIds)) {
            let option = idToCharOption[id];
            let charInfo = this.characters[id];
            option.text = option.text + `(${charInfo.series[0]})`;
        }

        for (let char of Object.values(this.characters)) {
            for (let title of char.series) {
                if (!(title in this.titleToCharOptions)) {
                    this.titleToCharOptions[title] = [noneOption];
                }
                this.titleToCharOptions[title].push(
                    idToCharOption[char.id]
                );
            }
        }

        for (let title of Object.keys(this.titleToCharOptions)) {
            this.titleOptions.push({ id: title, text: title });
        }
    }

    /**
     * @param  {TagInfo[]} tagInfos
     */
    createCategories(tagInfos) {
        let maxId = 0;
        let tagDict = {};
        for (let tagInfo of tagInfos) {
            tagDict[tagInfo.name] = new FilterCategory(tagInfo.id, tagInfo.displayName);
            maxId = Math.max(maxId, tagInfo.id);
        }

        let id = maxId + 1;
        for (let charInfo of Object.values(this.characters)) {
            for (let tag of charInfo.tags) {
                if (!(tag in tagDict)) {
                    tagDict[tag] = new FilterCategory(id++, tag);
                }
                tagDict[tag].charInfos.push(charInfo);
            }
        }
        this.filterCategories = Object.values(tagDict);
        this.filterCategoryOptions = [{ id: NoneValue, text: "なし" }];
        for (let category of this.filterCategories) {
            this.idToCategoryDict[category.id] = category;
            this.filterCategoryOptions.push({ id: category.id, text: category.name });
        }
    }

    duplicateEdge(edge) {
        let newEdge = this.createNewEdge();
        newEdge.copyFrom(edge);
    }

    createNewEdge() {
        let edge = new GraphEdge(NoneValue, NoneValue, "");
        this.edges.push(edge);
        return edge;
    }

    removeEdge(edge) {
        let index = this.edges.indexOf(edge);
        this.edges.splice(index, 1);
    }
    /**
     * @param  {GraphEdge} edge
     */
    swapEdgeDirection(edge) {
        edge.swapSourceAndDestination();
    }

    createNewCluster() {
        let cluster = new GraphCluster(
            this.__getClusterId(),
            this.__getClusterDefaultName());
        this.addEmptyNodeToCluster(cluster);
        this.__addNewCluster(cluster);
        return cluster;
    }

    __addNewCluster(cluster) {
        this.clusters.push(cluster);
        this.__addClusterToOptions(cluster);
    }

    createClustersByCategories() {
        const colors = [
            "#FADBD8",
            "#EBDEF0",
            // "#D4E6F1",
            "#D1F2EB",
            "#F9E79F",
            "#EDBB99",
        ]
        let index = 0;
        let nodeId = 0;
        for (let category of this.filterCategories) {
            let cluster = new GraphCluster(
                this.__getClusterId(),
                category.name);
            cluster.color = colors[index % colors.length];
            ++index;
            this.clusters.push(cluster);

            for (let charInfo of Object.values(this.characters)) {
                if (charInfo.tags.some(x => x == category.name)) {
                    cluster.belongingNodes.push(new GraphNode(nodeId++, charInfo.id));
                }
            }
        }

        // this.setClusterNodeFromTags();
    }

    // setClusterNodeFromTags() {
    //     for (let cluster of this.clusters) {
    //         for (let charInfo of Object.values(this.characters)) {
    //             if (charInfo.tags.some(x => x == cluster.name)) {
    //                 cluster.belongingNodes.push(new GraphNode(charInfo.id));
    //             }
    //         }
    //     }
    // }

    /**
     * @param  {GraphCluster} cluster
     */
    syncClusterLabelToOption(cluster) {
        let option = this.__getClusterOptionInCharOptions(cluster);

        // ラベルを書き換えるだけでは反映されなかったので、オプション配列を書き換える
        let newOption = { id: cluster.name, text: cluster.label };
        for (let options of Object.values(this.titleToCharOptions)) {
            let index = options.indexOf(option);
            options.splice(index, 1, newOption);
        }
    }

    __getClusterOptionInCharOptions(cluster) {
        // 同じインスタンスのオプションが各タイトルに追加されているので一つだけから取得すればいい
        let options = this.titleToCharOptions[AllTitleLabel];
        for (let i = options.length - 1; i >= 0; --i) {
            let option = options[i];
            if (option.id == cluster.name) {
                return option;
            }
        }
        return null;
    }

    __addClusterToOptions(cluster) {
        let option = { id: cluster.name, text: cluster.label };
        for (let options of Object.values(this.titleToCharOptions)) {
            options.push(option);
        }
    }
    __removeClusterFromOptions(cluster) {
        let option = this.__getClusterOptionInCharOptions(cluster);
        for (let options of Object.values(this.titleToCharOptions)) {
            let index = options.indexOf(option);
            options.splice(index, 1);
        }
    }
    removeCluster(cluster) {
        let index = this.clusters.indexOf(cluster);
        this.clusters.splice(index, 1);
        this.__removeClusterFromOptions(cluster);
    }

    /**
     * @param  {GraphCluster} cluster
     */
    addEmptyNodeToCluster(cluster) {
        cluster.belongingNodes.push(new GraphNode(-1, NoneValue));
    }

    removeNodeFromCluster(node, cluster) {
        let index = cluster.belongingNodes.indexOf(node);
        cluster.belongingNodes.splice(index, 1);
    }

    __getClusterId() {
        let id = ClusterIdOffset + this.clusters.length;
        while (this.__hasSameIdCluster(id)) {
            ++id;
        }
        return id;
    }

    __getClusterDefaultName() {
        let index = this.clusters.length;
        let name = `グループ${index}`;
        while (this.__hasSameNameCluster(name)) {
            name = `グループ${++index}`;
        }
        return name;
    }

    __hasSameNameCluster(name) {
        for (let cluster of this.clusters) {
            if (cluster.name == name) {
                return true;
            }
        }
        return false;
    }

    __hasSameIdCluster(id) {
        for (let cluster of this.clusters) {
            if (cluster.id == id) {
                return true;
            }
        }
        return false;
    }

    writeError(message) {
        this.errorMessage = message;
    }

    /**
     * @param  {GraphEdge[]} edges
     */
    __createNodes(edges) {
        const nodeNameToIdDict = {};
        let nodeId = 0;
        for (const edge of edges) {
            nodeNameToIdDict[edge.source] = nodeId++;
            nodeNameToIdDict[edge.destination] = nodeId++;
        }

        let nodes = [];
        if (this.showsAllCharacters && this.selectedCategoryId == NoneValue && !this.filterCharacters.some(x => x.name != NoneValue)) {
            for (let char of Object.values(this.characters)) {
                let imagePath = // "https://puarts.com" +
                    char.imagePath;
                if (this.isNodeImageDisabled) {
                    imagePath = "";
                }
                let node = new GraphNode(nodeNameToIdDict[char.id] ?? -1, char.id, char.displayName, imagePath, char.url);

                if (this.showsCluster) {
                    node.clusterName = this.getClusterName(node);
                }
                nodes.push(node);
            }

        }
        else {
            let ids = {};
            if (this.showsCluster) {
                for (let cluster of this.clusters) {
                    for (let node of cluster.belongingNodes) {
                        let charId = node.name;
                        if (charId != NoneValue) {
                            ids[charId] = this.characters[charId];
                        }
                    }
                }
            }
            for (let edge of edges) {
                if (edge.isSourceValid && !edge.usesSourceText) {
                    let charId = edge.source;
                    if (charId in this.characters) {
                        ids[charId] = this.characters[charId];
                    }
                }
                if (edge.isDestinationValid && !edge.usesDestinationText) {
                    let charId = edge.destination;
                    if (charId in this.characters) {
                        ids[charId] = this.characters[charId];
                    }
                }
            }
            for (let char of Object.values(ids)) {
                let imagePath = // "https://puarts.com" +
                    char.imagePath;
                if (this.isNodeImageDisabled) {
                    imagePath = "";
                }
                let node = new GraphNode(nodeNameToIdDict[char.id] ?? -1, char.id, char.displayName, imagePath, char.url);
                if (this.showsCluster) {
                    node.clusterName = this.getClusterName(node);
                }
                nodes.push(node);
            }
        }

        return nodes;
    }

    /**
     * @param  {GraphNode} node
     */
    getClusterName(node) {
        for (let cluster of this.clusters) {
            for (let clusterNode of cluster.belongingNodes) {
                if (clusterNode.name == node.name) {
                    return cluster.name;
                }
            }
        }
        return "";
    }

    __createEdges(edges) {
        let validEdges = [];
        for (let edge of edges) {
            if (edge.isValid) {
                validEdges.push(edge);
            }
        }
        return validEdges;
    }

    __getFilteredEdges() {
        let edges = [];
        // 描画するエッジをフィルタリング
        let filterCharDict = {};

        if (this.selectedCategoryId != NoneValue) {
            const category = this.idToCategoryDict[this.selectedCategoryId];
            for (let charInfo of category.charInfos) {
                filterCharDict[charInfo.id] = null;
            }
        }

        for (let char of this.filterCharacters) {
            if (char.name != NoneValue) {
                filterCharDict[char.name] = null;
            }
        }
        let isFilterEnabled = Object.keys(filterCharDict).length > 0;
        for (let edge of this.edges) {
            if (isFilterEnabled && !(edge.source in filterCharDict) && !(edge.destination in filterCharDict)) {
                continue;
            }
            edges.push(edge);
        }
        return edges;
    }
    /**
     * @param  {GraphNode} sourceNode
     * @param  {GraphNode} targetNode
     */
    static copyD3jsProps(sourceNode, targetNode) {
        targetNode.x = sourceNode.x;
        targetNode.y = sourceNode.y;
    }
    /**
     * @param  {Graph} graph
     * @param  {GraphEdge[]} edges
     */
    __updateGraphNodes(graph, edges) {
        const newNodes = this.__createNodes(edges);

        const isNodeCountChanged = newNodes.length != graph.nodes.length;

        // d3.js 用のノードプロパティ(位置座標など)を引き継ぐ
        for (const node of newNodes) {
            // キャラ名が一致してるノードで引き継ぎ
            if (node.name in graph.nameToNodes) {
                const oldNode = graph.nameToNodes[node.name];
                AppData.copyD3jsProps(oldNode, node);
                console.log(`${node.name}(${oldNode.id}->${node.id}): keep params by name. ${node.x}, ${node.y}`);
                continue;
            }

            // ノード数に変化がなければ、ノードのキャラを変更しただけなので、
            // ノードIDで位置を引き継ぐ
            if (!isNodeCountChanged && node.id in graph.idToNodes) {
                const oldNode = graph.idToNodes[node.id];
                AppData.copyD3jsProps(oldNode, node);
                console.log(`${node.id}(${oldNode.name}->${node.name}): keep params by id. ${node.x}, ${node.y}`);
                continue;
            }
        }
        graph.nodes = newNodes;
    }
    /**
     * @param  {Graph} graph
     */
    __updateGraph(graph) {
        graph.layout = this.layout;
        graph.rankdir = this.rankdir;

        const edges = this.__getFilteredEdges();
        graph.edges = this.__createEdges(edges);
        this.__updateGraphNodes(graph, edges);
        {
            let labelPadding = "";
            if (this.rankdir == "TB" || this.rankdir == "BT") {
                labelPadding = "   ";
            }
            for (const edge of graph.edges) {
                edge.labelPadding = labelPadding;
            }
        }

        if (this.showsCluster) {
            graph.clusters = Array.from(this.clusters.filter(x => x.belongingNodes.length > 0));
        }

        graph.updateDictionaries();
        return graph;
    }

    updateGraph(graphElementId) {
        let graph = this.__updateGraph(this.graph);
        this.__updateGraphImpl(graphElementId, graph);
    }

    /**
     * @param  {string} graphElementId
     * @param  {Graph} graph
     */
    __updateGraphImpl(graphElementId, graph, imageSize = 100) {
        this.updateMessage("グラフ更新中..");
        if (graph.layout == "") {
            AppData.__updateGraphByD3js(this, graphElementId, graph, imageSize);
        }
        else {
            AppData.__updateGraphByGraphviz(this, graphElementId, graph, imageSize);
        }

        if (this.isDebugModeEnabled) {
            const serial = this.toString();
            this.writeLogLine(serial);
        }
    }
    /**
     * @param  {AppData} self
     * @param  {string} graphElementId
     * @param  {Graph} graph
     * @param  {Number} imageSize
     */
    static __updateGraphByD3js(self, graphElementId, graph, imageSize) {
        const imageFrameInnerWidth = 5;
        const imageFrameOuterWidth = 2;
        const imageFrameColor = "#ffdd99";
        const imageFrameOuterColor = "#ffaa00";
        const fontSize = 13;
        const labelOffsetX = 0;
        const labelOffsetY = fontSize * 0.3;

        const svg = d3.create("svg")
            .attr("width", 800)
            .attr("height", 600);

        // ノードの位置が原点にある場合だけ自動的にレイアウトを決めます。
        {
            let i = 0;
            for (const node of graph.nodes) {
                if (node.x == 0 && node.y == 0) {
                    node.x = imageSize * i * 2 + imageSize;
                    node.y = imageSize;
                    ++i;
                }
            }
        }

        const radius = imageSize / 2;

        const link = svg.append("g").attr("id", "edges")
            .selectAll("line")
            .data(graph.edges)
            .enter()
            .append("line")
            .attr("stroke-width", 2)
            .attr("stroke", "gray");

        const edgeLabelShadowSize = 1;
        const edgeLabelShadowColor = "#fff";
        const edgeLabels = svg.append("g").attr("id", "edgeLabels")
            .selectAll("text")
            .data(graph.edges)
            .enter()
            .append("text")
            .attr("font-size", fontSize)
            .style("text-anchor", "middle")
            .attr("stroke", "black")
            // .attr("filter", "url(#solid)")
            .style("text-shadow", `${edgeLabelShadowColor} ${edgeLabelShadowSize}px ${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} -${edgeLabelShadowSize}px ${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} ${edgeLabelShadowSize}px -${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} -${edgeLabelShadowSize}px -${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} 0px ${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} 0px -${edgeLabelShadowSize}px 0px, ${edgeLabelShadowColor} -${edgeLabelShadowSize}px 0px 0px, ${edgeLabelShadowColor} ${edgeLabelShadowSize}px 0px 0px`)
            .text(x => x.label);

        const node = svg.append("g").attr("id", "edgePoints")
            .selectAll("circle")
            .data(graph.nodes)
            .enter()
            .append("circle")
            .attr("r", radius)
            .attr("fill", "black")
            .attr("stroke", "black");

        const imageFrame = svg.append("g").attr("id", "imageFrames")
            .selectAll("circle")
            .data(graph.nodes)
            .enter()
            .append("circle")
            .attr("r", radius)
            .attr("fill", imageFrameColor)
            .attr("stroke-width", imageFrameOuterWidth)
            .attr("stroke", imageFrameOuterColor);

        let simulation;
        const images = svg.append("g").attr("id", "images")
            .selectAll("image")
            .data(graph.nodes)
            .enter()
            .append("image")
            .attr("href", d => d.imagePath)
            .attr("height", imageSize)
            .attr("width", imageSize)
            .attr("clip-path", d => `url(#circle-clip${d.name})`)
            .call(d3.drag()
                .on("start", (e, d) => {
                    if (!e.active) simulation.alphaTarget(0.3).restart();
                    d.fx = e.x;
                    d.fy = e.y;
                })
                .on("drag", (e, d) => {
                    d.fx = e.x;
                    d.fy = e.y;
                })
                .on("end", (e, d) => {
                    if (!e.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }));
        const clipPaths = svg
            .append("defs")
            .selectAll("clipPath")
            .data(graph.nodes)
            .enter()
            .append("clipPath")
            .attr("id", d => "circle-clip" + d.name)
            .append("circle")
            .attr("r", imageSize / 2 - (imageFrameInnerWidth + imageFrameOuterWidth));

        const defs = svg.append("defs");
        const filter = defs.selectAll("filter")
            .data(["solid"])
            .enter()
            .append("filter")
            .attr("id", String);
        filter
            .append("feFlood")
            .attr("flood-color", "#eee")
            .attr("result", "bg")
            .attr("flood-opacity", "0.8");
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "bg");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");


        defs.selectAll("marker")
            .data(["arrow"])
            .enter()
            .append("marker")
            .attr("id", String)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", radius)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto-start-reverse")
            .append("svg:path")
            .attr("d", "M0,-5L10,0L0,5");

        const nodeLabelShadowSize = 1;
        const nodeLabelShadowColor = "#000";
        const nodeLabels = svg.append("g")
            .selectAll("text")
            .data(graph.nodes)
            .enter()
            .append("text")
            .attr("font-size", fontSize)
            .style("text-anchor", "middle")
            .attr("stroke", "white")
            .style("text-shadow", `${nodeLabelShadowColor} ${nodeLabelShadowSize}px ${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} -${nodeLabelShadowSize}px ${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} ${nodeLabelShadowSize}px -${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} -${nodeLabelShadowSize}px -${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} 0px ${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} 0px -${nodeLabelShadowSize}px 0px, ${nodeLabelShadowColor} -${nodeLabelShadowSize}px 0px 0px, ${nodeLabelShadowColor} ${nodeLabelShadowSize}px 0px 0px`)
            // .attr("filter", "url(#solid)")
            .text(x => x.displayName);
        const nodeDict = {};
        graph.nodes.forEach(x => nodeDict[x.name] = x);
        for (let edge of graph.edges) {
            edge.sourceNode = nodeDict[edge.source];
            edge.destinationNode = nodeDict[edge.destination];
        }
        simulation = d3.forceSimulation(graph.nodes)
            .on("tick", () => {
                link
                    .attr("x1", d => d.sourceNode?.x ?? 0)
                    .attr("y1", d => d.sourceNode?.y ?? 0)
                    .attr("x2", d => d.destinationNode?.x ?? 0)
                    .attr("y2", d => d.destinationNode?.y ?? 0)
                    .attr("marker-start", d => d.dir == "back" || d.dir == "both" ? "url(#arrow)" : "")
                    .attr("marker-end", d => d.dir == "forward" || d.dir == "both" ? "url(#arrow)" : "")
                    ;

                edgeLabels
                    .attr("x", d => ((d.sourceNode?.x ?? 0) + (d.destinationNode?.x ?? 0)) / 2 + labelOffsetX)
                    .attr("y", d => ((d.sourceNode?.y ?? 0) + (d.destinationNode?.y ?? 0)) / 2 + labelOffsetY);

                node
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y);

                images
                    .attr("x", d => d.x - radius)
                    .attr("y", d => d.y - radius);

                imageFrame
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y);

                nodeLabels
                    .attr("x", d => d.x)
                    .attr("y", d => d.y + radius - 5);

                clipPaths
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y);
            });

        const chart = svg.node();
        const area = document.getElementById(`${graphElementId}`);
        if (area.firstChild != null) {
            area.removeChild(area.firstChild);
        }
        area.appendChild(chart);
        self.updateMessage("");
    }

    /**
     * @param  {AppData} self
     * @param  {string} graphElementId
     * @param  {Graph} graph
     */
    static __updateGraphByGraphviz(self, graphElementId, graph, imageSize) {
        const startTime = performance.now();

        let dotSource = graph.toDotSource();
        self.writeLogLine(dotSource);

        if (self.graphObject == null) {
            self.graphObject = d3.select(`#${graphElementId}`)
                .graphviz()
                .fade(false)
                .zoom(false);
        }

        let graphObject = self.graphObject;
        for (let path of graph.enumerateImagePaths()) {
            if (path.startsWith("data:")) {
                continue;
            }

            if (path in self.addedImagePathDict) {
                continue;
            }

            self.addedImagePathDict[path] = null;
            graphObject = graphObject.addImage(path, `${imageSize}px`, `${imageSize}px`);
        }
        graphObject
            .renderDot(dotSource)
            .on("end", () => {
                // self.clearMessage();
                const endTime = performance.now();
                const diff = endTime - startTime;
                self.updateMessage(`グラフ更新時間:${Math.round((diff / 1000) * 100) / 100} 秒`);
            });
    }


    updateMessage(message) {
        this.message = message;
    }

    clearMessage() {
        this.message = "";
    }
    *__enumerateDbPaths() {
        yield this.dbPath;
    }
    __initDatabaseTable() {
    }
}


// select2 を使うためのVueコンポーネント
Vue.component('select2', {
    template: '<select><slot></slot></select>',
    props: {
        options: Array,
        value: Number,
    },

    mounted: function () {
        $(this.$el)
            // init select2
            .select2({ data: this.options })
            .val(this.value)
            .trigger('change')
            .on('change', (event) =>
                this.$emit('input', parseInt(event.target.value, 10))
            )
    },
    watch: {
        value: function (val) {
            $(this.$el).val(val).trigger('change');
        },
        // update options
        options: function (options) {
            let value = this.value;
            $(this.$el)
                .empty()
                .select2({ data: options })
                .val(value)
                .trigger('change');
        }
    },
    destroyed: function () {
        $(this.$el).off().select2('destroy')
    },
});

const g_appData = new AppData();

const g_app = new Vue({
    el: "#app",
    data: g_appData,
});

function initMainImpl(
    characters,
    dbPath, createCharInfoFunc, initGraphFunc
) {
    g_appData.init(characters, dbPath, createCharInfoFunc);

    if (!location.search.includes("s=")) {
        // サンプルのグラフを設定
        initGraphFunc();
    }
    else {
        importUrl(location.search);
    }
}


function updateGraphAuto() {
    if (!g_appData.isAutoUpdateEnabled) {
        return;
    }

    updateGraph();
}

function updateGraph() {
    if (!g_isUpdateGraphEnabled) {
        return;
    }

    console.log("updateGraph");
    g_appData.clearLog();
    g_appData.writeLogLine(`■グラフ更新`);
    updateGraphWithoutClearLog();
}

function updateGraphWithoutClearLog() {
    g_appData.updateGraph(GraphElemId);
    updateUrl();
}



function svg2imageData(svgElement, successCallback, errorCallback) {
    let canvas = document.createElement('canvas');
    canvas.width = svgElement.width.baseVal.value;
    canvas.height = svgElement.height.baseVal.value;
    let ctx = canvas.getContext('2d');
    let image = new Image();
    image.onload = () => {
        ctx.drawImage(image, 0, 0, image.width, image.height);
        successCallback(canvas.toDataURL());
    };
    image.onerror = (e) => {
        errorCallback(e);
    };

    convertImageElementUrlToDataUrl(svgElement, () => {
        console.log(`convert finished. serialize svg.`);
        let svgData = new XMLSerializer().serializeToString(svgElement);
        let srcUri = 'data:image/svg+xml;charset=utf-8;base64,' + window.btoa(unescape(encodeURIComponent(svgData)));
        console.log("svg data uri:");
        console.log(srcUri);
        image.src = srcUri;
    });
}

let BaseUrl = "https://puarts.com/?pid=1779";

function updateUrl() {
    g_appData.writeLogLine(`■URLの更新`);
    let settingText = g_appData.toString();
    g_appData.exportSettingUrl = BaseUrl + "&s="
        + LZString.compressToEncodedURIComponent(settingText) + `#app`;
    g_appData.updateTweetUrl();
    g_appData.writeLogLine("Tweet URL:" + g_appData.tweetUrl);

    let textarea = $("#urlTextArea")[0];
    textarea.textContent = settingText;
}

function copyUrl() {
    var textarea = $("#urlTextArea")[0];
    textarea.select();
    textarea.setSelectionRange(0, 99999); /*For mobile devices*/
    document.execCommand("copy");
}

function importUrl(url, edgeInitDelay = 0) {
    if (url == "" || url == null) {
        return;
    }

    g_appData.writeLogLine(`■URLから設定をインポート`);
    g_appData.writeLogLine("url:" + url);
    let splited = url.split("s=");
    if (splited.length != 2) {
        g_appData.writeErrorLine(`invalid url "${url}"`);
        return;
    }

    let settingText = splited[1];
    let decompressed = LZString.decompressFromEncodedURIComponent(settingText);
    g_appData.writeLogLine("decompressed:" + decompressed);
    g_isUpdateGraphEnabled = false;
    g_appData.fromString(decompressed, edgeInitDelay);
    g_isUpdateGraphEnabled = true;

    // バインドされているので自動で更新されるが、
    // 初回だけそうではないので、明示的にグラフを更新する
    updateGraphWithoutClearLog();
}
