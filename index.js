import { DB } from "./db.js";

async function main(){

    let db = new DB('db');

    await db.init();

}

main();