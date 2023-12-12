//количество ячеек сетки
let mapSizeL = 5; //ширина
let mapSizeH = 5; //высота

let mapOffsetL = 10; // смещение сетки ширина в гексах
let mapOffsetH = 10; // смещение сетки высота в гексах
let reverse = false
let debug = true
let DiceRoll = "3d6" && false; //если поставить false будет кидать 1д(макс значение) аналог фандри таблицы 
let gridSizeModifyerL = 0; //px
let gridSizeModifyerH = 0; //px
let mapTiles = {
    "empty"             : {min: 0,  max: 37, default:true},//37%
	"island"            : {min: 38,  max: 53,},//15%
    "rust"              : {min: 54,  max: 58},//5%
    "riffs"             : {min: 59, max: 64},//5%
    "otmel"             : {min: 65, max: 70},//5%
    "gypsy-waters"      : {min: 71, max: 76},//5%
    "puyushaya-glad"    : {min: 77, max: 81},//5%
    "zhuteva-pady"      : {min: 82, max: 87},//5%
    "hill"              : {min: 88, max: 90, maxCount: 1 ,diceAroundHex:"1d6", sateliteHex: "island"},//3%
    "stodimye"          : {min: 91, max: 94, maxCount: 1 ,diceAroundHex:"1d6", sateliteHex: "island"},//3%
    "svetoch"           : {min: 95, max: 97, maxCount: 1 ,diceAroundHex:"1d6", sateliteHex: "island"},//3%
    "bonefish"          : {min: 98, max: 100, maxCount: 1 ,diceAroundHex:"1d6", sateliteHex: "bone-lab"},//3%
}

DiceRoll = (DiceRoll)? DiceRoll : `1d${Object.values(mapTiles).sort((a, b) => b.max - a.max)[0].max}`
const tilesName = Object.keys(mapTiles)
const tilesObject = Object.values(mapTiles)

//таблица всех кто имеет сателиты
const hashTableMainTilesIndexes = []; tilesObject.forEach((element,index) => {if (element?.sateliteHex) hashTableMainTilesIndexes.push(index)})

//стандартный тайл на который мы будем менять всех неугодных
const defaultIndex = tilesObject.findIndex(e => e?.default)

//заполняем матрицу наших тайлов
let hashTableCount = { };
let hashTableOfmainPlaced = [];
let cells = (Array(mapSizeL).fill(Array(mapSizeH).fill(0))).map((arr,PosL) => {
    return arr.map((e,PosH) => {
        let rollValue = new Roll(DiceRoll).evaluate({async: false}).total
        let indexTile = tilesObject.findIndex((element) => {return (rollValue >= element.min && rollValue <= element.max) || defaultIndex})
        //игнорирую уже поставленные тайлы которых неможет быть чем заданное количество
        if (hashTableCount[indexTile]) {
            if (hashTableCount[indexTile] >= tilesObject[indexTile].maxCount) {
                return defaultIndex
            }
            hashTableCount[indexTile] += 1 
        }else{
            hashTableCount[indexTile] = 1
        }
        //если у гекса может быть сателитный гекс
        if (tilesObject[indexTile]?.sateliteHex) {
            //сгенерю их позицию позже 
            //ролим
            let rollAround = new Roll(tilesObject[indexTile]?.diceAroundHex || "0").evaluate({async: false}).total
            //сохраняем для дальнейшего измененния карты
            hashTableOfmainPlaced.push({rollAround,indexTile})
            indexTile = defaultIndex;
        }
        return indexTile
    })
});
let heightHashL = [];
let heightHashH = [];
//перебираю гексы и заменяю некоторые на сателиты
/*
hashTableOfmainPlaced.forEach(item => {
    function randIntExcep(min, max, exp) {
        var n;
        let save = 1000;
        while(true){
            n = Math.floor(Math.random() * (max - min + 1)) + min
            if(exp.includes(n))
            save -=1;
            if (save < 0) return new Error("Stupido!")
            return n;
            
        }
    }
    let PosL = randIntExcep(0,mapSizeL-1,heightHashL)
    heightHashL.push(PosL)
    let PosH = randIntExcep(0,mapSizeH-1,heightHashH)
    heightHashH.push(PosH)
    
    cells[PosL][PosH] = item.indexTile
    //проверю ближайшие чтобы не удалить один из "особых тайлов" случайно
    // в тупую не бейте ногами ок?
    let rollAround = item.rollAround
    let basicIndex = item.indexTile
    let sateliteHex = tilesObject[basicIndex].sateliteHex;
    for (let l = -1; l < 1; l++) {
        for (let h = -1; h < 1; h++) {
            //защищаемся от выхода за нижнюю границу
            if (PosL+l < 0 || PosH+h < 0 ) continue;
            if (PosL+l > cells.length-1 || PosH+h > cells.length-1) continue;
            let index = cells[PosL+l][PosH+h]
            //сам себя то зачем
            if (l == 0 && h == 0) continue;
            //проверяю на "особеность"
            if (hashTableMainTilesIndexes.includes(index)) continue;
            //если не осталось тайлов для размещения
            if(rollAround <= 0) break;
            cells[PosL-l][PosH-h] = sateliteHex;
            rollAround -= 1
        }
    }
})
*/

cells = cells.map((arr) =>arr.map((e) => { 
    return (debug)? tilesName[2] : (Number.isInteger(e))? tilesName[e] : e;
}))

console.log(cells);
// Получение данных сцены напрямую, без использования .data
let currentScene = game.scenes.active;
let sceneGrid = currentScene.grid
let gridSize = sceneGrid.size;
// Размеры сцены
let sceneWidth = currentScene.width;
let sceneHeight = currentScene.height;
// Расчет количества гексов

let hexesAcross = Math.ceil(sceneWidth / gridSize);
let hexesDown = Math.ceil(sceneHeight / (gridSize * 0.75)); // 0.75 - корректировка для вертикального расстояния между гексами


let mapOffsetPixelsL = gridSize * mapOffsetL; // смещение сетки ширина в гексах
let mapOffsetPixelsHEven = gridSize*0.5 + mapOffsetH*gridSize; // смещение сетки ширина в гексах
let mapOffsetPixelsHNon = mapOffsetH * gridSize; // смещение сетки высота в гексах


function even_or_odd(number) {
    return number % 2 === 0 ? true : false;
}

gridSizeL = gridSize + gridSizeModifyerL
gridSizeH = gridSize + gridSizeModifyerH

for (let posL = 0; posL < cells.length; posL++) {
mapOffsetPixelsH =  (even_or_odd(posL))? mapOffsetPixelsHEven :  mapOffsetPixelsHNon
   for (let posH = 0; posH < cells[posL].length; posH++) {
        if (cells[posL][posH] == tilesName[defaultIndex]) continue;
        let originalTile = Tagger.getByTag(cells[posL][posH])[0] 
        let newTile = originalTile.clone();

       


        let X = (even_or_odd(posH))?    gridSizeL * mapOffsetL + gridSizeL*posL           : gridSizeL * mapOffsetL + gridSizeL*0.5 + gridSizeL*posL;
        let Y = (even_or_odd(posH))?    gridSizeH * mapOffsetH*Math.sqrt(3)/2  + gridSizeH*posH*Math.sqrt(3)/2 : gridSizeH * mapOffsetH*Math.sqrt(3)/2 + (gridSizeH*Math.sqrt(3)/2)*posH;
        
        let createdTile = (await currentScene.createEmbeddedDocuments("Tile", [newTile]))[0];
        if (! createdTile) return 
        createdTile.update({y: (reverse)? Y : X, x: (reverse)? X : Y})
        Tagger.addTags(createdTile ,["mapTile", "canBeDeleted"])
        
   }
}