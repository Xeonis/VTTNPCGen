/*
Макрос позволяет быстро изменять тип стен. 
Просто выделите стену или стены и нажмите макрос. 
Спасибо за макрос Kikimor!
Доработал Xeonis 
-------------------------------------------------------------------------------------
Эти настройки можно менять меняя значение true или false 
Стандартные настройки*/
  // оставляет окно макроса открытым по нажатии на кнопки
  let closeOnSubmit = false
  //Постоянно открытое меню кастомной стены
    let customOpen = false
/*
-------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
Разработка макросов и модулей для Fvtt писать -- Xeonis
-------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
Далее этого коментария идет функциональный код ничего не торгайте, ну или трогайте :)
-------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
*/
let doorSounds = {
 none : ""
}

for (const key in CONFIG.Wall.doorSounds) {
 if (Object.hasOwnProperty.call(CONFIG.Wall.doorSounds, key)) {
   if (key == "key") continue;
   const element = CONFIG.Wall.doorSounds[key];
   doorSounds[key] = game.i18n.localize(element.label)
 }
}



let moveNames = getNames(
 CONST.WALL_MOVEMENT_TYPES,"WALLS.SenseTypes")
let doorNames = getNames(
 CONST.WALL_DOOR_STATES,"WALLS.DoorStates")
let senseNames = getNames(
 CONST.WALL_SENSE_TYPES,"WALLS.SenseTypes")
let wallDirectionsNames = getNames(
 CONST.WALL_DIRECTIONS,"WALLS.Directions")
let doorTypesNames = getNames(
 CONST.WALL_DOOR_TYPES,"WALLS.DoorTypes")

let thresholdSight = ""
let attenuation = false
let thresholdLight = "" 
let thresholdSound = ""

let defaultThreshold = {
 "threshold": {
   "light": null,
   "sight": null,
   "attenuation": false, 
   "sound": null
 }
}

let buttonsList = [
 {
   label: `Применить кастомные параметры`,
   callback: (html) => doMain(html)
 },
 {
   label: `Обычная стена`,
   callback: (html) => doMain(html,["NORMAL","NORMAL","NONE"])
 },
 {
   label: `Ландшафтная стена`,
   callback: (html) => doMain(html,["NORMAL","LIMITED","NONE"])
 },
 {
   label: `Невидимая стена`,
   callback: (html) => doMain(html,["NORMAL","NONE","NONE"])
 },
 {
   label: `Окно`,
   callback: (html) => doMain(html,["NONE","NONE","NONE"])
 },
 {
   label: `Окно V11`,
   callback: (html) => doMain(html,["NONE","NONE","NONE",{
     "light": 10,
     "sight": 10,
     "attenuation": true, 
     "sound": null
   }])
 },
 {
   label: `Дверь`,
   callback: (html) => doMain(html,["NORMAL","NORMAL","DOOR"])
 },
 {
   label: `Секретная дверь`,
   callback: (html) => doMain(html,["NORMAL","NORMAL","SECRET"])
   
 },
 {
   label: `Решётка`,
   callback: (html) => doMain(html,["NONE","NORMAL","DOOR"])
 },

]

/**для сборки списков выбора*/
function listBuilder (label, list,id,advanced =""){
 console.log("fg");
 let htmlList = `<div class="form-group">
 <label>${label}</label>
   <div class="form-fields">
   <select id="${id}" name="${id}">`
 if (Array.isArray(list)) {
   list.forEach(element => {
     let selected = (element.active)? "selected" : "";
     htmlList += `<option value="${element.selector}"  ${selected}>${element.content}</option>\n`
   });
 }else{
   for (const key in list) {
     if (Object.hasOwnProperty.call(list, key)) {
       const element = list[key];
       let selected = (element?.active)? "selected" : "";
       let content = (element?.content)? element.content: element;
       htmlList += `<option value="${key}"  ${selected}>${content}</option>\n`
     }
   }
 }
 htmlList += `</select>
 ${advanced}
 </div>
 </div>`
 return htmlList
}

let content = () => {
 return `<form>
 <div class="form-group">
     <label>Держать окно открытым</label>
     <input type="checkbox" name="checkState" id="checkState" ${(closeOnSubmit)? "": "checked" } />
 </div>
 <details id="customWall"  ${(customOpen)? "open": ""}>
   <summary>Ручная настройка стен</summary>
   Изначальные значения макроса не соответствуют настроенным на выбранных стенах!
   ${listBuilder(game.i18n.localize("WALLS.Movement"),moveNames,"movement")}
   ${listBuilder(game.i18n.localize("WALLS.Light")   ,senseNames,"lightspropr",
       `<input class="proximity" type="number" name="thresholdLight" min="0" value="${thresholdLight}" step="any"/>`)}
   ${listBuilder(game.i18n.localize("WALLS.Sight"),senseNames,"sight",
       `<input class="proximity" type="number" name="thresholdSight" min="0" value="${thresholdSight}" step="any"/>`)}
   ${listBuilder(game.i18n.localize("WALLS.Sound"),senseNames,"sound",
       `<input class="proximity" type="number" name="thresholdSound" min="0" value="${thresholdSound}" step="any"/>`)}
   ${listBuilder(game.i18n.localize("WALLS.Direction"),wallDirectionsNames,"direction")}
   <div class="form-group">
   <label>${game.i18n.localize("WALLS.ThresholdAttenuation")} <i class="tip fas fa-info-circle" data-tooltip="WALLS.ThresholdAttenuationHint"></i></label>
     <input type="checkbox" name="attenuation" ${(!attenuation)? "": "checked"}/>
   </div>
   ${listBuilder(game.i18n.localize("WALLS.Door"),doorTypesNames,"door")}
   <fieldset class="door-options">
     <legend>${game.i18n.localize("WALLS.DoorOptions")}</legend>
   ${listBuilder(game.i18n.localize("WALLS.DoorState"),doorNames,"doorState")}
   ${listBuilder(game.i18n.localize("WALLS.DoorSoundLabel"),doorSounds,"doorSound")}
 </details>
 
 <h5>Выберите тип стены, чтобы применить его ко всем выделенным фрагментам <h5/>
</form>`
}

let dialogEditor = new Dialog({

 title: `Установка типа стены`,
 content: content(),
 buttons:  {...buttonsList},
 default: "close",
 close: () => {}
});

function setWallProperties (move = "NORMAL",sense = "NORMAL",door = "NONE",threshold = defaultThreshold) {
 return {
       "move": CONST.WALL_MOVEMENT_TYPES[move],
       "sense": CONST.WALL_SENSE_TYPES[sense],
       "door": CONST.WALL_DOOR_TYPES[door],
       "threshold": threshold,
   } 
}

async function wallUpdate(data) {
 try {
   const updates = canvas.walls.controlled.map(wall => {
     return {_id: wall.document.id, ...data};
   });
   await canvas.scene.updateEmbeddedDocuments("Wall", updates);
 } catch (error) {
   
 }
}



function doMain (html,activateProperties) {
 /**чтение формы */
 customOpenNew = html.find('[id="customWall"]')[0].open || false;
 closeOnSubmit = !html.find('[id="checkState"]')[0].checked || false;

 /**чтение выбранных параметров*/

 movement = html.find('[id="movement"]')[0].value
 LightProp = html.find('[id="lightspropr"]')[0].value
 thresholdLight = html.find('[name="thresholdLight"]')[0].value || 0
 SightProp = html.find('[id="sight"]')[0].value
 thresholdSight = html.find('[name="thresholdSight"]')[0].value || 0
 SoundProp = html.find('[id="sound"]')[0].value
 thresholdSound = html.find('[name="thresholdSound"]')[0].value || 0
 direction = html.find('[id="direction"]')[0].value || 0
 attenuation = html.find('[name="attenuation"]')[0].checked || false
 door = html.find('[id="door"]')[0].value
 doorState = html.find('[id="doorState"]')[0].value
 doorSound = html.find('[id="doorSound"]')[0].value

 console.log("work");
 
 
 if (activateProperties) {
   wallUpdate(setWallProperties(...activateProperties))
 }else{
   
   let num = (threshold,type) => {
     const thresholdTypes = [CONST.WALL_SENSE_TYPES.PROXIMITY, CONST.WALL_SENSE_TYPES.DISTANCE];
     return (thresholdTypes.includes(type) && threshold > 0)? threshold: null
   }
   let data ={
     "move": movement,
     "sense": LightProp,
     "door": door,
     "dir":direction,
     "threshold": {
       "light": num(thresholdLight,LightProp),
       "sight": num(thresholdSight,SightProp),
       "sound": num(thresholdSound,SoundProp),
       "attenuation": attenuation
     },
     "ds":(door == CONST.WALL_DOOR_TYPES.NONE)? CONST.WALL_DOOR_STATES.CLOSED : doorState,
     "doorSound": (door != 0 && doorSound != "none")? doorSound : undefined  
   }

   wallUpdate(data)
 }
 if (!closeOnSubmit) {

   dialogEditor.render(true)
 }
}

function getNames (prop, i18name) {
 return Object.keys(prop).reduce((obj, key) => {
   let k = prop[key];
   obj[k] = game.i18n.localize(`${i18name}.${key}`);
   return obj;
 }, {})
}

dialogEditor.render(true);