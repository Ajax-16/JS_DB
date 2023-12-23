import { DB, describeDatabase } from "./index.js";

async function main() {

    let db = 'placeholder'

    console.log(await describeDatabase(db, 'example'))

}

main();