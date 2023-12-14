const FILENAME = "exp.fqa"

const fs = require('fs');
let parced = fs.readFileSync(FILENAME+"_parced.json");
let rawdata = fs.readFileSync(FILENAME+'_parcedContent.lua');
let punishments= JSON.parse(parced);
console.log(punishments);
punishments.files[0].content = rawdata;
let data = JSON.stringify(punishments);

fs.writeFileSync('new_' + FILENAME, data);

