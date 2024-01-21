
const ThumbRoot = "https://fire-emblem.fun/images/FehCylPortraits/";

class CharacterInfo {
    constructor(
        id, name, englishName, imageName, series, tags, variation, otherNames = [],
        sex = "",
        playable = false
    ) {
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
        this.sex = sex;
        /** @type {Boolean} */
        this.playable = playable;

        this.addsOtherNameToDisplayName = false;
    }

    get displayName() {
        if (this.addsOtherNameToDisplayName) {
            let suffix = "";
            if (this.otherNames != null && this.otherNames.length > 0) {
                suffix += `\n(${this.otherNames[0]})`;
            }
            return this.name + suffix;
        }
        return this.name;
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
        return `https://www.fire-emblem.fun/?fechar=${this.id}#main-content`;
    }
}

function createCharacterInfoListFromDb(db, additionalQuery = "") {
    const sql = `select * from original_heroes ${additionalQuery}`;
    const queryResult = db.exec(sql)[0];
    const nameIndex = queryResult.columns.indexOf("name");
    const engNameIndex = queryResult.columns.indexOf("english_name");
    const idIndex = queryResult.columns.indexOf("id");
    const thumbIndex = queryResult.columns.indexOf("thumb");
    const seriesIndex = queryResult.columns.indexOf("series");
    const tagsIndex = queryResult.columns.indexOf("tags");
    const variationIndex = queryResult.columns.indexOf("variation");
    const otherNamesIndex = queryResult.columns.indexOf("other_names");
    const sexIndex = queryResult.columns.indexOf("sex");
    const playableIndex = queryResult.columns.indexOf("playable");

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
        const playable = columnValues[playableIndex];
        let imageName = columnValues[thumbIndex];
        imageName = isNullOrEmpty(imageName) ? getOriginalCharacterImageNameFromEnglishName(
            name, englishName, series, variation, playable) : imageName;

        const info = new CharacterInfo(
            id,
            name,
            englishName,
            imageName,
            series,
            tags,
            variation,
            otherNames,
            columnValues[sexIndex],
            isNullOrEmpty(playable) ? false : playable == "true"
        );
        characters.push(info);
    }
    return characters;
}
