function using(disposable, func) {
    const result = func();
    disposable.dispose();
    return result;
}

class ScopedPerformanceTimer {
    constructor(logFunc) {
        this._logFunc = logFunc;
        this._startTime = performance.now();
    }

    dispose() {
        const endTime = performance.now();
        let diff = endTime - this._startTime;
        this._logFunc(diff);
    }
}

function getEnglishTitle(jpTitle) {
    switch (jpTitle) {
        case "風花雪月": return "Three Houses";
        case "ヒーローズ": return "Heroes";
        case "Echoes もうひとりの英雄王": return "Echoes: Shadows of Valentia";
        case "Echoes": return "Echoes: Shadows of Valentia";
        case "if": return "Fates";
        case "覚醒": return "Awakening";
        case "新・紋章の謎": return "New Mystery of the Emblem";
        case "新・暗黒竜と光の剣": return "Shadow Dragon";
        case "暁の女神": return "Radiant Dawn";
        case "蒼炎の軌跡": return "Path of Radiance";
        case "聖魔の光石": return "The Sacred Stones";
        case "烈火の剣": return "The Blazing Blade";
        case "封印の剣": return "The Binding Blade";
        case "トラキア776": return "Thracia 776";
        case "聖戦の系譜": return "Genealogy of the Holy War";
        case "紋章の謎": return "Mystery of the Emblem";
        case "外伝": return "Gaiden";
        case "暗黒竜と光の剣": return "Shadow Dragon and the Blade of Light";
        case "幻影異聞録♯FE": return "Tokyo Mirage Sessions #FE";
        case "無双": return "Warriors";
        case "無双 風花雪月": return "Warriors Three Hopes";
        case "幻影異聞録♯FE Encore": return "Tokyo Mirage Sessions #FE Encore";
        case "アカネイア戦記": return "";
        case "0（サイファ）": return "cipher";
        case "エンゲージ": return "Engage";
        default: throw new Error("Unkonw title " + jpTitle);
    }
}

function isNullOrEmpty(value) {
    return value == null || value == "";
}
function parseSqlStringToArray(str) {
    if (isNullOrEmpty(str)) return [];
    return Array.from(str.split('|').filter(x => x != ""));
}
/**
 * @param  {string} name
 * @param  {string} englishName
 * @param  {string[]} series
 * @param  {string} variation
 */
function getOriginalCharacterImageNameFromEnglishName(
    name, englishName, series, variation, playable = true
) {
    englishName = englishName.replace("'", "");
    englishName = englishName.replace("& ", "");
    englishName = englishName.replace("ó", "o");
    englishName = englishName.replace("Ó", "O");
    englishName = englishName.replace("ö", "o");
    englishName = englishName.replace("á", "a");
    englishName = englishName.replace("ú", "u");
    englishName = englishName.replace("í", "i");
    englishName = englishName.replace("é", "e");
    englishName = englishName.replace(" ", "_");
    englishName = englishName.replace("ð", "o");

    if (name.endsWith("女") || name === "ベレス") {
        englishName += "_female";
    } else if (name.endsWith("男") || name === "ベレト") {
        englishName += "_male";
    }

    let seriesName = "";
    for (const title of series) {
        seriesName += getEnglishTitle(title) + " ";
    }

    seriesName = seriesName.trim();
    seriesName = seriesName.replace(/ /g, "_");
    seriesName = seriesName.replace(/:/g, "");
    seriesName = seriesName.replace(/#/g, "");

    if (seriesName === "Shadow_Dragon") {
        seriesName = "Shadow_Dragon_and_the_Blade_of_Light_Shadow_Dragon";
    } else if (seriesName === "New_Mystery_of_the_Emblem") {
        seriesName = "Mystery_of_the_Emblem_New_Mystery_of_the_Emblem";
    }

    const basePathToName = "CYL_" + englishName;
    let basePath = basePathToName + "_" + seriesName;
    const filePathNormal = `${basePath}.png`;
    if (series.includes("風花雪月")) {
        if (variation === "変化後") {
            basePath = basePathToName + "_Enlightened_" + seriesName;
        }
        if (!playable) {
            const filePath = basePath + ".png";
            return filePath;
        }
        const suffixList = [
            "_War_Arc",
            "_Academy_Arc"
        ];
        for (const suffix of suffixList) {
            const filePath = basePath + suffix + ".png";
            return filePath;
        }
    } else if (series.includes("聖戦の系譜")) {
        if (variation === "物語前半") {
            const filePath = basePath + "_G1.png";
            return filePath;
        } else if (variation === "物語後半") {
            const filePath = basePath + "_G2.png";
            return filePath;
        }
    }

    return filePathNormal;
}