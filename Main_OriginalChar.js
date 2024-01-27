
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

            // フェリクス
            const node0 = new GraphNode(1, 851);
            node0.setPos(100, 300);

            // ロドリグ
            const node1 = new GraphNode(2, 880);
            node1.setPos(100, 100);

            // ディミトリ
            const node2 = new GraphNode(3, 844);
            node2.setPos(300, 300);

            // ランベール
            const node3 = new GraphNode(4, 891);
            node3.setPos(300, 100);

            g_appData.addNode(node0);
            g_appData.addNode(node1);
            g_appData.addNode(node2);
            g_appData.addNode(node3);
            g_appData.addEdge(new GraphEdge(node0.id, node1.id, "父"));
            g_appData.addEdge(new GraphEdge(node2.id, node3.id, "父"));
            g_appData.addEdge(new GraphEdge(node0.id, node2.id, "幼馴染", "both"));
            {
                const comment = new GraphComment("これはコメントです");
                comment.setPos(100, 10);
                g_appData.addComment(comment);
            }
            {

                const cluster1 = g_appData.createCluster("子世代");
                cluster1.setColor("#eeeeff");
                g_appData.addCluster(cluster1, [node0, node2]);

                // ここで追加を実行しないとidがインクリメントしない
                g_appData.__executeAllCommands();

                const cluster2 = g_appData.createCluster("親世代");
                cluster2.setColor("#ffeeee");
                g_appData.addCluster(cluster2, [node1, node3]);
            }
            g_appData.__executeAllCommands();
            updateGraph();
        });
}