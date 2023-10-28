
class SqliteDatabase {
    constructor() {
        this.dbs = [];
        this.initMessage = "初期化中..";
    }

    *__enumerateDbPaths() {
    }

    async initDatabase(postInitCallback = null) {
        const useCdn = false;
        const sqlPromise = initSqlJs({
            locateFile: file =>
                useCdn ? `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.5.0/${file}` : `/js/sql.js/dist/${file}`
        });

        for (const sqlFilePath of this.__enumerateDbPaths()) {
            const dataPromise = fetch(sqlFilePath).then(res => res.arrayBuffer());
            const [SQL, buf] = await Promise.all([sqlPromise, dataPromise]);
            this.dbs.push(new SQL.Database(new Uint8Array(buf)));
        }

        let initMilliseconds = 0;
        using(new ScopedPerformanceTimer(x => initMilliseconds = x), () => {
            this.__initDatabaseTable();
            if (postInitCallback != null) {
                postInitCallback();
            }
        });
        this.initMessage = `初期化が完了しました。使用できます。(初期化${initMilliseconds / 1000}秒)`;
    }

    __initDatabaseTable() {
    }
}
