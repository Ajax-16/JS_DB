import { DB } from "./db.js";

async function main(){

    let db = new DB('db');

    await db.init();

    await db.createTable('test', 'id', ['name', 'desc'])

}

main();