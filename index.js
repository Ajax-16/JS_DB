import { DB } from "./db.js";

async function main(){

    // let db = new DB('db');

    // db.init();

    let db = new DB('cliente');

    await db.init();

    console.log(db.find({
        tableName: 'users',
        condition: 'age',
        conditionValue: 20
    }));

}

main();