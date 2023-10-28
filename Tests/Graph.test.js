
test('Graph_Serialize', () => {
    // ノード
    const sourceNode = new GraphNode(1, "11");
    sourceNode.x = 1;
    sourceNode.y = 2;

    const copiedNode = new GraphNode(0, "");
    copiedNode.fromString(sourceNode.toString());
    expect(copiedNode.x).toBe(1);
    expect(copiedNode.y).toBe(2);
    expect(copiedNode.name).toBe("11");

    const destinationNode = copiedNode;
    destinationNode.name = "12";

    // エッジ
    const sourceEdge = new GraphEdge();
    sourceEdge.source = sourceNode.name;
    sourceEdge.destination = destinationNode.name;
    sourceEdge.label = "e";

    // dot言語変換
    {
        const copiedEdge = new GraphEdge();
        copiedEdge.fromDotSource(sourceEdge.toDotSource());
        expect(copiedEdge.source).toBe(sourceNode.name);
        expect(copiedEdge.destination).toBe(destinationNode.name);
        expect(copiedEdge.label).toBe(sourceEdge.label);
    }

    // 文字列変換
    {
        const copiedEdge = new GraphEdge();
        copiedEdge.fromString(sourceEdge.toString());
        expect(copiedEdge.source).toBe(sourceNode.name);
        expect(copiedEdge.destination).toBe(destinationNode.name);
        expect(copiedEdge.label).toBe(sourceEdge.label);
    }

    // クラスター
    const sourceCluster = new GraphCluster();
    sourceCluster.label = "c";
    sourceCluster.color = "#fff";
    sourceCluster.name = "22";
    sourceCluster.belongingNodes.push(sourceNode);

    const copiedCluster = new GraphCluster();
    copiedCluster.fromString(sourceCluster.toString());
    expect(copiedCluster.label).toBe(sourceCluster.label);
    expect(copiedCluster.color).toBe(sourceCluster.color);
    expect(copiedCluster.name).toBe(sourceCluster.name);
    expect(copiedCluster.belongingNodes.length).toBe(sourceCluster.belongingNodes.length);

    // グラフ
    const graph = new Graph();
    graph.layout = "";
    graph.rankdir = "LR";
    graph.nodes.push(sourceNode);
    graph.nodes.push(destinationNode);
    graph.edges.push(sourceEdge);
    graph.clusters.push(sourceCluster);

    const copiedGraph = new Graph();
    copiedGraph.fromString(graph.toString());
    expect(copiedGraph.layout).toBe("");
    expect(copiedGraph.rankdir).toBe("LR");
    expect(copiedGraph.nodes.length).toBe(graph.nodes.length);
    expect(copiedGraph.edges.length).toBe(graph.edges.length);
    expect(copiedGraph.clusters.length).toBe(graph.clusters.length);

    {
        const node = copiedGraph.nodes[0];
        expect(node.x).toBe(1);
        expect(node.y).toBe(2);
        expect(node.name).toBe("11");
    }

    {
        const node = copiedGraph.nodes[1];
        expect(node.x).toBe(1);
        expect(node.y).toBe(2);
        expect(node.name).toBe("12");
    }

    {
        const edge = copiedGraph.edges[0];
        expect(edge.source).toBe(sourceNode.name);
        expect(edge.destination).toBe(destinationNode.name);
        expect(edge.label).toBe(sourceEdge.label);
    }

    {
        const cluster = copiedGraph.clusters[0];
        expect(cluster.label).toBe(sourceCluster.label);
        expect(cluster.color).toBe(sourceCluster.color);
        expect(cluster.name).toBe(sourceCluster.name);
        expect(cluster.belongingNodes.length).toBe(sourceCluster.belongingNodes.length);
    }

});
