import { DB } from "./index.js";

async function main() {

    let db = new DB('example')

    await db.init();

    console.log(db.describeAllTables());

}

main();