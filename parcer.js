const FILENAME = "exp.fqa"

const fs = require('fs');
let rawdata = fs.readFileSync(FILENAME);
let punishments= JSON.parse(rawdata);
console.log(punishments);

let data = JSON.stringify(punishments, null, "\t");

fs.writeFileSync(FILENAME +'_parced.json', data);
fs.writeFileSync(FILENAME +'_parcedContent.lua', punishments.files[0].content);

