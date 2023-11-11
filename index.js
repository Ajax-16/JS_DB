async function main(){

    const DB = await import('./db.js')

    let db = new DB('db');

    await db.init();

    await db.createTable('test', 'id', ['name', 'desc'])

}

main();