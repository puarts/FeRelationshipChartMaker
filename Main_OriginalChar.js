
/**
 * @param  {CharacterInfo[]} characters
 */
function initMain(characters) {
    initMainImpl(
        characters,
        "/db/feh-original_heroes.sqlite3",
        db => {
            return createCharacterInfoListFromDb(db);
        },
        () => {
            // g_appData.currentTitle = "風花雪月";
            g_appData.currentTitle = AllTitleLabel;
            const node0 = new GraphNode(1, 851);
            node0.setPos(200, 300);
            const node1 = new GraphNode(2, 880);
            node1.setPos(300, 100);
            const node2 = new GraphNode(3, 844);
            node2.setPos(100, 100);
            g_appData.addNode(node0);
            g_appData.addNode(node1);
            g_appData.addNode(node2);
            g_appData.graph.edges.push(new GraphEdge(node0.id, node1.id, "父"));
            g_appData.graph.edges.push(new GraphEdge(node0.id, node2.id, "幼馴染", "both"));
            updateGraph();
        });
}