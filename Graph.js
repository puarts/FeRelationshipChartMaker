const NodeAndEdgePropDelim = "|^";
const ClusterPropDelim = "^|";
const GraphPropDelim = "|~";

class GraphNode {
    constructor(id, name, displayName = "", imagePath = null, url = "") {
        /** エッジの接続に使用するノードのID @type {Number} */
        this.id = id;

        /** ノードの名前 @type {string} */
        this.name = name;

        /** ノードの表示名 @type {string} */
        this.displayName = displayName == "" ? name : displayName;
        this.imagePath = imagePath;
        this.url = url;
        this.clusterName = "";

        // d3.js で直接位置を指定するための座標
        this.x = 0;
        this.y = 0;

        this.isSelected = false;
        this.mouseOver = false;

        // select2用
        this.text = displayName;

        this.radius = 50;
    }

    get isClustered() {
        return this.clusterName != "" && this.clusterName != null;
    }

    /**
     * @returns {boolean}
     */
    get hasImage() {
        return this.imagePath != "" && this.imagePath != null;
    }

    toString() {
        return this.id
            + NodeAndEdgePropDelim + this.name
            + NodeAndEdgePropDelim + this.x
            + NodeAndEdgePropDelim + this.y;
    }

    /**
     * @param  {string} source
     */
    fromString(source) {
        let elems = source.split(NodeAndEdgePropDelim);
        let i = 0;
        this.id = elems[i++];
        this.name = elems[i++];
        this.x = Number(elems[i++]);
        this.y = Number(elems[i++]);
    }

    setPos(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * @returns {string}
     */
    toDotSource() {
        if (!this.hasImage) {
            return `\"${this.name}\"[URL=\"${this.url}\", label=\"${this.displayName}\"];`;
        }

        let displayNameHtml = this.displayName
            .replaceAll("\n", "<br/>")
            .replaceAll("&", "&amp;");

        let label = "<table cellspacing='0' border='0' cellborder='0' >";
        label += `<tr><td><img src='${this.imagePath}' /></td></tr>`;
        label += `<tr><td>&nbsp;&nbsp;${displayNameHtml}&nbsp;&nbsp;</td></tr></table>`;

        return `\"${this.name}\"[URL=\"${this.url}\", label=<${label}>];`;
    }
}

let g_edgeId = 0;

class GraphEdge {
    constructor(source, destination, label, dir = "forward", rank = "") {
        this.id = g_edgeId++;
        this.source = source; // キャラのid
        /** @type {GraphNode} */
        this.sourceNode = null;
        this.destination = destination; // キャラのid
        /** @type {GraphNode} */
        this.destinationNode = null;
        this.label = label;
        this.labelOffsetX = 0;
        this.labelOffsetY = 0;
        this.rank = rank;
        this.isRankSame = false;
        this.dir = dir;
        this.lhead = "";
        this.additionalAttrs = "";
        this.minlen = 1;
        this.usesHeadLabel = false;
        this.labelPadding = ""; // エッジ同士のラベルが繋がらないようにする隙間

        // 定義済みのノードを使わずにテキストを直接入力するための設定
        this.sourceText = "";
        this.destinationText = "";
        this.usesSourceText = false;
        this.usesDestinationText = false;

        this.isSelected = false;
        this.mouseOver = false;
    }

    toString() {
        return this.source
            + NodeAndEdgePropDelim + this.destination
            + NodeAndEdgePropDelim + this.dir
            + NodeAndEdgePropDelim + this.label
            ;
    }
    /**
     * @param  {string} source
     */
    fromString(source) {
        const elems = source.split(NodeAndEdgePropDelim);
        let i = 0;
        this.source = elems[i++];
        this.destination = elems[i++];
        this.dir = elems[i++];
        this.label = elems[i++];
    }

    swapSourceAndDestination() {
        let source = this.source;
        this.source = this.destination;
        this.destination = source;
        switch (this.dir) {
            case "forward":
                this.dir = "back";
                break;
            case "back":
                this.dir = "forward";
                break;
        }
        let sourceText = this.destinationText;
        this.sourceText = this.destinationText;
        this.destinationText = sourceText;
    }

    copyFrom(edge) {
        this.source = edge.source;
        this.destination = edge.destination;
        this.isRankSame = edge.isRankSame;
        this.label = edge.label;
        this.rank = edge.rank;
        this.dir = edge.dir;
        this.sourceText = edge.sourceText;
        this.destinationText = edge.destinationText;
        this.usesSourceText = edge.usesSourceText;
        this.usesDestinationText = edge.usesDestinationText;
    }

    get actualSource() {
        return this.usesSourceText ? this.sourceText : this.source;
    }

    get actualDestination() {
        return this.usesDestinationText ? this.destinationText : this.destination;
    }

    get isValid() {
        return this.isSourceValid && this.isDestinationValid;
    }

    get isSourceValid() {
        let actualSource = this.actualSource;
        return actualSource != NoneValue && actualSource != "";
    }

    get isDestinationValid() {
        let actualDestination = this.actualDestination;
        return actualDestination != NoneValue && actualDestination != "";
    }

    /**
     * @param  {string} dotSource
     */
    fromDotSource(dotSource) {
        // todo: rank に対応できていない
        let splittedElems = dotSource.split("[");
        if (0 < splittedElems.length && splittedElems.length < 3) {
            this.__parseSourceAndDestinationFromDotSource(splittedElems[0]);
            if (splittedElems.length == 2) {
                let attrs = splittedElems[1].replace("]", "");
                for (let elem of attrs.split(",").filter(x => x != "")) {
                    let attr = elem.trim();
                    let splittedAttr = attr.split("=");
                    if (splittedAttr.length != 2) {
                        throw new Error(`Invalid attribute. ${attr}`);
                    }
                    let name = splittedAttr[0];
                    let value = splittedAttr[1];
                    switch (name) {
                        case "label":
                            this.label = this.__trimStartAndEndDoubleQuate(value.trim());
                            break;
                        case "dir":
                            this.dir = this.__trimStartAndEndDoubleQuate(value.trim());
                            break;
                    }
                }
            }
        }
        else {
            throw new Error(`Invalid dot source. ${dotSource}`);
        }
    }

    /**
     * @param  {string} input
     */
    __trimStartAndEndDoubleQuate(input) {
        let result = input;
        if (result[0] == '"') {
            result = result.substring(1);
        }
        if (result[result.length - 1] == '"') {
            result = result.substring(0, result.length - 1);
        }
        return result;
    }

    /**
     * @param  {string} dotSource
     */
    __parseSourceAndDestinationFromDotSource(dotSource) {
        let splittedElems = dotSource.split("->");
        if (splittedElems.length != 2) {
            throw new Error(`Invalid dot source. ${dotSource}`);
        }
        this.source = this.__trimStartAndEndDoubleQuate(splittedElems[0].trim());
        this.destination = this.__trimStartAndEndDoubleQuate(splittedElems[1].trim());
    }

    /**
     * @returns {string}
     */
    toDotSource() {
        let source = this.actualSource;
        let destination = this.actualDestination;
        let dir = this.dir == null || this.dir == "" ? "" : `,dir=${this.dir}`;
        const rank = this.isRankSame ? "same" : this.rank;
        let rankDot = rank == "" ? "" : `{rank=${rank};${this.source};${this.destination};}`;
        let labelType = "label";
        if (this.usesHeadLabel) {
            labelType = "headlabel";
        }
        let minlen = "";
        if (this.minlen != 1) {
            minlen = `,minlen=${this.minlen}`;
        }
        return `\"${source}\"->\"${destination}\"[${labelType}=\"${this.label}${this.labelPadding}\"${dir}${minlen}${this.additionalAttrs}];${rankDot}`;
    }
}


function darkenColor(hex, percent) {
    // 入力された16進数の色コードをRGBの値に変換する
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);

    // 暗くする割合を計算する
    let darkenAmount = 1 - percent / 100;

    // RGBの値を暗くする
    r = Math.floor(r * darkenAmount);
    g = Math.floor(g * darkenAmount);
    b = Math.floor(b * darkenAmount);

    // RGBの値を16進数の文字列に変換する
    r = (r < 16 ? '0' : '') + r.toString(16);
    g = (g < 16 ? '0' : '') + g.toString(16);
    b = (b < 16 ? '0' : '') + b.toString(16);

    // 新しい色を返す
    return `#${r}${g}${b}`;
}

function increaseSaturation(hexColor, factor) {
    const rgb = hexToRgb(hexColor);
    const hsv = rgbToHsv(rgb);
    const s = hsv[1];
    hsv[1] = Math.min(1, s * factor);
    const newRgb = hsvToRgb(hsv);
    const newHex = rgbToHex(newRgb);
    return newHex;
}

function hexToRgb(hex) {
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);
    return [r, g, b];
}

function rgbToHex(color) {
    let r = color[0];
    let g = color[1];
    let b = color[2];
    r = (r < 16 ? '0' : '') + r.toString(16);
    g = (g < 16 ? '0' : '') + g.toString(16);
    b = (b < 16 ? '0' : '') + b.toString(16);

    // 新しい色を返す
    return `#${r}${g}${b}`;
}
function rgbToHsv(color) {
    let r = color[0] / 255;
    let g = color[1] / 255;
    let b = color[2] / 255;

    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h, s, v = max;

    let d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max === min) {
        h = 0; // achromatic
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, v];
}

function hsvToRgb(hsv) {
    let h = hsv[0];
    let s = hsv[1];
    let v = hsv[2];

    let i = Math.floor(h * 6);
    let f = h * 6 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);

    let mod = i % 6;
    let r = Math.floor([v, q, p, p, t, v][mod] * 255);
    let g = Math.floor([t, v, v, q, p, p][mod] * 255);
    let b = Math.floor([p, p, t, v, v, q][mod] * 255);

    return [r, g, b];
}


const ArrayElemDelim = "|,";
class GraphCluster {
    constructor(name, label) {
        this.name = String(name);
        /** @type {string} */
        this.label = label;
        this.color = "#eeeeff";

        /** @type {GraphNode[]} */
        this.belongingNodes = [];

        this.isSelected = false;

        // 描画用に設定するためのプロパティ(保存の必要なし)
        this.x = 0;
        this.y = 0;
        this.width = 1;
        this.height = 1;
        this.paddingTop = 10;
        this.paddingLeft = 10;
        this.paddingRight = 10;
        this.paddingBottom = 30;
        this.labelColor = "#fff";
        this.labelShadowColor = "#000";

        this.setColor(this.color);
    }

    setColor(color) {
        this.color = color;
        this.labelColor = increaseSaturation(this.color, 4);
        this.labelShadowColor = darkenColor(this.labelColor, 50);
    }

    get id() {
        return this.name;
    }

    get subgraphName() {
        // dot言語の中ではclusterプレフィックスが必要
        return "cluster" + this.name;
    }
    /**
     * @param  {GraphNode[]} nodes
     */
    addNodes(nodes) {
        for (const node of nodes) {
            node.clusterName = this.name;
            this.belongingNodes.push(node);
        }
        this.transformByBelongingNodes();
    }

    removeNode(node) {
        let index = this.belongingNodes.indexOf(node);
        this.belongingNodes.splice(index, 1);
    }

    clearBelongingNodes() {
        for (const node of this.belongingNodes) {
            node.clusterName = "";
        }
        this.belongingNodes = [];
        this.transformByBelongingNodes();
    }

    /**
     * @param  {string} source
     */
    fromString(source) {
        let elems = source.split(ClusterPropDelim);
        let i = 0;
        this.name = elems[i++];
        this.label = elems[i++];
        this.color = elems[i++];
        let nodesString = elems[i++];
        this.belongingNodes = [];
        let nodeId = 1000; // 他で生成されたノードIDと被らないように
        if (nodesString != undefined) {
            for (const nodeStr of nodesString.split(ArrayElemDelim)) {
                const node = new GraphNode(nodeId++, "");
                node.fromString(nodeStr);
                this.belongingNodes.push(node);
            }
        }
    }

    /**
     * @returns {string}
     */
    toString() {
        let result = "";
        result += this.name + ClusterPropDelim;
        result += this.label + ClusterPropDelim;
        result += this.color + ClusterPropDelim;
        for (let node of this.belongingNodes) {
            result += node.toString() + ArrayElemDelim;
        }
        result = result.substring(0, result.length - ArrayElemDelim.length);
        return result;
    }

    transformByBelongingNodes() {
        let minPosX = 10000;
        let minPosY = 10000;
        let maxPosX = -10000;
        let maxPosY = -10000;
        for (const node of this.belongingNodes) {
            minPosX = Math.min(node.x - node.radius, minPosX);
            minPosY = Math.min(node.y - node.radius, minPosY);
            maxPosX = Math.max(node.x + node.radius, maxPosX);
            maxPosY = Math.max(node.y + node.radius, maxPosY);
        }

        this.x = minPosX - this.paddingLeft;
        this.y = minPosY - this.paddingTop;
        this.width = maxPosX - minPosX + this.paddingLeft + this.paddingRight;
        this.height = maxPosY - minPosY + this.paddingTop + this.paddingBottom;
    }
}

let g_commentId = 0;
class GraphComment {
    constructor(text) {
        this.id = g_commentId++;
        this.text = text;
        this.x = 0;
        this.y = 0;
        this.isSelected = false;
    }

    setPos(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * @returns {string}
     */
    toString() {
        return this.text
            + NodeAndEdgePropDelim + this.x
            + NodeAndEdgePropDelim + this.y;
    }

    /**
     * @param  {string} source
     */
    fromString(source) {
        let elems = source.split(NodeAndEdgePropDelim);
        let i = 0;
        this.text = elems[i++];
        this.x = Number(elems[i++]);
        this.y = Number(elems[i++]);
    }
}

class Graph {
    constructor() {
        /** @type {GraphNode[]} */
        this.nodes = [];

        /** @type {Map<Number, GraphNode>} */
        this.idToNodes = {};
        /** @type {Map<string, GraphNode>} */
        this.nameToNodes = {};

        /** @type {GraphEdge[]} */
        this.edges = [];

        /** @type {GraphComment[]} */
        this.comments = [];

        /** @type {GraphCluster[]} */
        this.clusters = [];
        this.layout = "dot";
        this.rankdir = "BT";
    }

    clear() {
        this.nodes = [];
        this.edges = [];
        this.comments = [];
        this.clusters = [];
        this.idToNodes = {};
        this.nameToNodes = {};
        this.layout = "dot";
        this.rankdir = "BT";
    }

    toString() {
        return this.layout
            + GraphPropDelim + this.rankdir
            + GraphPropDelim + this.nodes.map(x => x.toString()).join(";")
            + GraphPropDelim + this.edges.map(x => x.toString()).join(";")
            + GraphPropDelim + this.clusters.map(x => x.toString()).join(";")
            + GraphPropDelim + this.comments.map(x => x.toString()).join(";")
            ;
    }

    /**
     * @param  {string} source
     */
    fromString(source) {
        this.clear();
        const elems = source.split(GraphPropDelim);
        let i = 0;
        this.layout = elems[i++];
        this.rankdir = elems[i++];
        const nodesStr = elems[i++];
        if (nodesStr != undefined && nodesStr != "") {
            for (const nodeStr of nodesStr.split(";")) {
                const node = new GraphNode(-1, "");
                node.fromString(nodeStr);
                this.addNode(node);
            }
        }
        const edgesStr = elems[i++];
        if (edgesStr != undefined && edgesStr != "") {
            for (const edgeStr of edgesStr.split(";")) {
                const edge = new GraphEdge("", "");
                edge.fromString(edgeStr);
                this.addEdge(edge);
            }
        }
        const clustersStr = elems[i++];
        if (clustersStr != undefined && clustersStr != "") {
            for (const clusterStr of clustersStr.split(";")) {
                const cluster = new GraphCluster("", "");
                cluster.fromString(clusterStr);
                this.clusters.push(cluster);
            }
        }
        const commentsStr = elems[i++];
        if (commentsStr != undefined && commentsStr != "") {
            for (const commentStr of commentsStr.split(";")) {
                const comment = new GraphComment("");
                comment.fromString(commentStr);
                this.addComment(comment);
            }
        }
    }

    /**
     * @param  {GraphNode} node
     */
    addNode(node) {
        this.nodes.push(node);
        this.idToNodes[node.id] = node;
        this.nameToNodes[node.name] = node;
    }

    /**
     * @param  {GraphEdge} edge
     */
    addEdge(edge) {
        edge.sourceNode = edge.source in this.idToNodes ? this.idToNodes[edge.source] : null;
        edge.destinationNode = edge.destination in this.idToNodes ? this.idToNodes[edge.destination] : null;
        if (edge.sourceNode == null) {
            edge.source = -1;
        }
        if (edge.destinationNode == null) {
            edge.destination = -1;
        }
        this.edges.push(edge);
    }

    addComment(comment) {
        this.comments.push(comment);
    }

    /**
     * @param  {GraphCluster} cluster
     * @param  {GraphNode[]} nodes
     */
    addCluster(cluster, nodes) {
        if (!this.clusters.includes(cluster)) {
            this.clusters.push(cluster);
        }

        for (const node of nodes) {
            if (!this.nodes.includes(node)) {
                throw new Error(`${node.name} is not added to graph`);
            }
        }

        cluster.addNodes(nodes);
    }

    removeNode(node) {
        this.nodes.splice(this.nodes.indexOf(node), 1);
        delete this.idToNodes[node.id];
        delete this.nameToNodes[node.name];
    }

    removeEdge(edge) {
        this.edges.splice(this.edges.indexOf(edge), 1);
    }

    removeComment(comment) {
        this.comments.splice(this.comments.indexOf(comment), 1);
    }

    /**
     * 存在しないノードを参照するエッジを削除します
     */
    removeInvalidEdges() {
        const invalidEdges = Array.from(this.edges.filter(
            edge => !(edge.source in this.idToNodes) || !(edge.destination in this.idToNodes)));
        for (const edge of invalidEdges) {
            this.removeEdge(edge);
        }
    }

    updateDictionaries() {
        this.idToNodes = {};
        this.nameToNodes = {};
        for (let node of this.nodes) {
            this.idToNodes[node.id] = node;
            this.nameToNodes[node.name] = node;
        }
    }

    updateClusterTransform() {
        for (const cluster of this.clusters) {
            cluster.transformByBelongingNodes();
        }
    }

    /**
     * @returns {string[]}
     */
    enumerateImagePaths() {
        return this.nodes.filter(x => x.hasImage).map(x => x.imagePath);
    }
    __getClusteredNodes() {
        let clusteredNodes = {};
        clusteredNodes[""] = [];
        for (let cluster of this.clusters) {
            clusteredNodes[cluster.name] = [];
        }

        for (let node of this.nodes) {
            if (node.clusterName in clusteredNodes) {
                clusteredNodes[node.clusterName].push(node);
            }
        }
        return clusteredNodes;
    }

    __getCluster(name) {
        for (let cluster of this.clusters) {
            if (cluster.name == name) {
                return cluster;
            }
        }
        return null;
    }


    /**
     * @returns {string}
     */
    toDotSource() {
        let dotSource = "";
        dotSource += "\n// ノード定義\n";

        // クラスターに定義された順番にするために最初にノード名だけ定義
        for (const cluster of this.clusters) {
            for (const node of cluster.belongingNodes) {
                if (node.name != NoneValue) {
                    dotSource += `"${node.name}";\n`;
                }
            }
        }

        const clusteredNodes = this.__getClusteredNodes();
        for (const clusterName of Object.keys(clusteredNodes)) {
            const nodes = clusteredNodes[clusterName];
            if (clusterName != "") {
                const cluster = this.__getCluster(clusterName);
                dotSource += `subgraph ${cluster.subgraphName} {\n`;
                dotSource += `label="${cluster.label}";\n`;
                dotSource += `bgcolor="${cluster.color}";\n`;
            }

            for (const node of nodes) {
                dotSource += node.toDotSource() + "\n";
            }

            if (clusterName != "") {
                dotSource += `}\n`;
            }
        }
        dotSource += "\n// エッジ定義\n";
        for (const sourceEdge of this.edges) {
            const edge = sourceEdge;

            // clusterへのエッジ用の対応
            {
                const sourceCluster = this.__getCluster(edge.actualSource);
                const destinationCluster = this.__getCluster(edge.actualDestination);
                if (sourceCluster != null || destinationCluster != null) {
                    edge = new GraphEdge();
                    edge.copyFrom(sourceEdge);

                    // clusterだとラベルが見づらくなる問題の対策
                    // edge.usesHeadLabel = true;
                    edge.minlen = 2;
                }
                if (sourceCluster != null) {
                    edge.usesSourceText = false;
                    const centerIndex = Math.floor(sourceCluster.belongingNodes.length / 2);
                    edge.source = sourceCluster.belongingNodes[centerIndex].name;
                    edge.additionalAttrs += `,ltail="${sourceCluster.subgraphName}"`;
                }
                if (destinationCluster != null) {
                    edge.usesDestinationText = false;
                    const centerIndex = Math.floor(destinationCluster.belongingNodes.length / 2);
                    edge.destination = destinationCluster.belongingNodes[centerIndex].name;
                    edge.additionalAttrs += `,lhead="${destinationCluster.subgraphName}"`;
                }
            }

            const cluster = edge.isRankSame ? this.__getEdgeCluster(edge) : null;
            if (cluster != null) {
                dotSource += `subgraph ${cluster.subgraphName} {\n`;
            }
            dotSource += edge.toDotSource() + "\n";
            if (cluster != null) {
                dotSource += `}\n`;
            }
        }

        return `digraph  {
compound=true;
rankdir=\"${this.rankdir}\";
graph[layout=${this.layout}];
node [shape=rect,fontname=\"times\", fontsize=\"10\", fillcolor=\"2\",style=\"filled\",colorscheme=\"blues4\"];
edge [fontsize=\"12\"];
${dotSource}
}`;
    }
    /**
     * @param  {GraphEdge} edge
     * @returns {GraphCluster}
     */
    __getEdgeCluster(edge) {
        const sourceNode = this.nodes.find(x => x.name == edge.source);
        if (sourceNode != null && sourceNode.clusterName != "") {
            return this.__getCluster(sourceNode.clusterName);
        }
        const destNode = this.nodes.find(x => x.name == edge.destination);
        if (destNode != null && destNode.clusterName != "") {
            return this.__getCluster(destNode.clusterName);
        }
        return null;
    }
}
