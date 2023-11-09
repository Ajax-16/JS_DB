import { DB } from "./db.js";

async function main(){

    let tienda = new DB('tienda');

    await tienda.use();
    
    console.log(tienda.getOneTable('users'));

}

main();