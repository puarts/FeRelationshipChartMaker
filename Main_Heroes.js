
ThumbRoot = "/blog/images/FehHeroThumbs/";
BaseUrl = "https://puarts.com/?pid=1839";

/**
 * @param  {CharacterInfo[]} characters
 */
function initMain(characters) {
    initMainImpl(
        characters,
        "/db/feh-heroes.sqlite3",
        db => {
            let sql = "select * from heroes";
            const queryResult = db.exec(sql)[0];
            const nameIndex = queryResult.columns.indexOf("name");
            const engNameIndex = queryResult.columns.indexOf("english_name");
            const idIndex = queryResult.columns.indexOf("id");
            const thumbIndex = queryResult.columns.indexOf("thumb");
            const originIndex = queryResult.columns.indexOf("origin");
            const characters = [];
            for (const columnValues of queryResult.values) {
                const id = columnValues[idIndex];
                const name = columnValues[nameIndex];
                let englishName = columnValues[engNameIndex];
                englishName = englishName == null ? "" : englishName;
                let origin = columnValues[originIndex];
                origin = isNullOrEmpty(origin) ? [] : parseSqlStringToArray(origin);
                let imageName = columnValues[thumbIndex];
                imageName = isNullOrEmpty(imageName) ? getOriginalCharacterImageNameFromEnglishName(
                    name, englishName, origin, variation) : imageName;

                const info = new CharacterInfo(
                    id,
                    name,
                    englishName,
                    imageName,
                    origin,
                    [],
                    "",
                    []);
                characters.push(info);
            }
            return characters;
        },
        () => {
            g_appData.currentTitle = AllTitleLabel;
            const edge = new GraphEdge(8, 13, "有利");
            edge.isRankSame = true;
            g_appData.edges.push(edge);
            g_appData.edges.push(new GraphEdge(13, 19, "有利"));
            g_appData.edges.push(new GraphEdge(19, 8, "有利"));
            updateGraph();
        });
}