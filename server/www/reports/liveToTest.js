const API = require('../../utils/api');

class LiveToTest extends API{

    async copyData() {

        if(this.request.query.token != 7617125676597003)
            throw `TOKEN MISMATCH!`;

        const db_tables = await this.mysql.query(`SHOW TABLES`);
        const tables = [];

        db_tables.map(table => tables.push(table["Tables_in_allspark"]));
        const response = [];

        for(const table of tables) {
            await this.mysql.query(`TRUNCATE TABLE allspark_test.${table}`,[], 'allSparkWrite');
            const data = await this.mysql.query(`INSERT INTO allspark_test.${table} SELECT * FROM allspark.${table}`, [], 'allSparkWrite');
            response.push({table,...data});
        }

        return response;
    }
}

exports.copyData = LiveToTest;