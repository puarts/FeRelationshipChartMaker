
/**
 * @param  {CharacterInfo[]} characters
 */
function initMain(characters) {
    initMainImpl(
        characters,
        "/db/feh-original_heroes.sqlite3",
        db => {
            let sql = "select * from original_heroes";
            const queryResult = db.exec(sql)[0];
            const nameIndex = queryResult.columns.indexOf("name");
            const engNameIndex = queryResult.columns.indexOf("english_name");
            const idIndex = queryResult.columns.indexOf("id");
            const thumbIndex = queryResult.columns.indexOf("thumb");
            const seriesIndex = queryResult.columns.indexOf("series");
            const tagsIndex = queryResult.columns.indexOf("tags");
            const variationIndex = queryResult.columns.indexOf("variation");
            const otherNamesIndex = queryResult.columns.indexOf("other_names");
            const characters = [];
            for (const columnValues of queryResult.values) {
                const id = columnValues[idIndex];
                const name = columnValues[nameIndex];
                let englishName = columnValues[engNameIndex];
                englishName = englishName == null ? "" : englishName;
                let series = columnValues[seriesIndex];
                series = isNullOrEmpty(series) ? [] : parseSqlStringToArray(series);
                let tags = columnValues[tagsIndex];
                tags = isNullOrEmpty(tags) ? [] : parseSqlStringToArray(tags);
                let variation = columnValues[variationIndex];
                variation = variation == null ? "" : variation;
                let otherNames = columnValues[otherNamesIndex];
                otherNames = isNullOrEmpty(otherNames) ? [] : parseSqlStringToArray(otherNames);
                let imageName = columnValues[thumbIndex];
                imageName = isNullOrEmpty(imageName) ? getOriginalCharacterImageNameFromEnglishName(
                    name, englishName, series, variation) : imageName;

                const info = new CharacterInfo(
                    id,
                    name,
                    englishName,
                    imageName,
                    series,
                    tags,
                    variation,
                    otherNames);
                characters.push(info);
            }
            return characters;
        },
        () => {
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
            g_appData.graph.edges.push(new GraphEdge(node0.name, node1.name, "父"));
            g_appData.graph.edges.push(new GraphEdge(node0.name, node2.name, "幼馴染", "both"));
            updateGraph();
        });
}