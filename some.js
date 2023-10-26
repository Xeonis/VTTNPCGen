/*Генератор случайного лута/магазинчика по таблицам
если выбран актер будет добавлять предметы нароленные ему в инвентарь
Доработал Xeonis 
-------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
Разработка макросов и модулей для Fvtt писать -- Xeonis
-------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
-----[Стандартные настройки]-----
---[Само изменяемые настройки]---
-----------------------------------------------------------------------------------*/
//Эти настройки можно менять и ручками и они еще будут сохранятся!
//ВАЖНО! все настройки должны быть написаны построчно!
// для каждой настройки своя строка!
//Постоянно открытый список таблиц
let customOpen = false;
//стандартная кость бросков
//поддерживаются формулы бросков fvtt
let dafaultDice = "1d10 + 1 * (5 + 1d3)";
//сумморовать или игнорировать по умолчанию
let defaultSumOrIgnore = false;
//сохранять в токена по умолчанию (если он выбран)
let saveOnTockenAsDefault = false;
//максимальная редкость по умолчанию
let typeItemAsDefault = 'artifact';
//стоимость
const priceByType = {
  'common': '(1d6) * 10',
  'uncommon': '(1d6+1) * 100',
  'rare': '2d10 * 1000',
  'veryrare': '(1d4+1) * 10000',
  'legenrady': '2d6 * 25000',
  'artifact': '2d6 * 250000',
};

//в эти списки можно включать и выключать новые таблицы
//после генерации макрос отпавляет в консоль оспользованные им таблицы
//список стандартно используемых
let dafaultListTables = [
  { "_id": "3V2isuiDLKEOzu54", "count": "0" },
  { "_id": "746WbvDuyKiRF8xC", "count": "0" },
  { "_id": "oxNQoYotKiCeHL6m", "count": "0" },
  { "_id": "ot0pQ5yrnB92mm5R", "count": "0" },
  { "_id": "zb7ed6u7Ng80y6oD", "count": "0" },
  { "_id": "d1yRwrFcFE3k8R6c", "count": "0" },
  { "_id": "1DKyrEhTfMDppA7S", "count": "0" }
];
//список игнорируемых
//-----[Тут придется добавлять ручками]-----
let blockedListTables = [
];
//в каком компендиуме искать (можно переназначить под свой)
const tableCompendium = 'laaru-dnd5-hw.tables-extra';

/*-----------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
Далее этого коментария идет функциональный код ничего не торгайте, ну или трогайте :)
-------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
*/
  let applyChanges = false

  const textHeader = `<div class="table-draw" data-table-id="LMrqEBBn3L1eegpc">
    <ol class="table-results">`;
  const textFooter = `</ol></div>`;


  const itemTextHtml = async ({item, price ,count}) => {
    let name = ''
    if (item.text.includes("Безделушка:")){
      name = item.text.slice(11)
    }else{
      name = item.text.slice(0,25)
    }
    let answer = ''
    if (item.img != null && item.documentId != null) {
      answer = `<li class="table-result flexrow" data-result-id="${item.documentId}" 
        style="border-top: 1px solid var(--color-border-dark-tertiary); 
        border-bottom: 0; position: relative; 
        width: 100%; padding: 10px 0 0 10px; overflow: hidden">
        <img class="result-image" src="${item.img}">
        <div class="result-text" style="max-width: calc(100% - 44px)">
            <span>@UUID[Compendium.${item.documentCollection}.${item.documentId}]{${name}}</span>
        </div>
      </li>
      <li style="padding: 0 0 4px 0;">
        <div class="flavor-text" style="padding-left: 40px;"> за <strong>${price} ЗМ${(count > 1)? " x "+ count+'шт.':''} </strong></div>
      </li>`
    }else if (item?.text) {
      answer = `<li class="table-result flexrow" data-result-id="${item._id}" 
        style="border-top: 1px solid var(--color-border-dark-tertiary); 
        border-bottom: 0; position: relative; 
        width: 100%; padding: 10px 0 0 10px; overflow: hidden">
        <img class="result-image" src="${item.img}">
        <div class="result-text" style="max-width: calc(100% - 44px)">
          <span>${item.text}</span>
        </div>
      </li>`
    }
    return answer;
  }

  
  
  
  let currentTables = new Collection()
  const tablePacks = game.packs.get(tableCompendium);
  if (!tablePacks.index.length) await tablePacks.getIndex();
  
  tablePacks.index.forEach(table => {
      if (blockedListTables.findIndex(blocked => blocked._id == table._id) > 0) return;
      let active = (dafaultListTables.findIndex(activ => activ._id == table._id) >= 0)? true: false;
      currentTables.set([table._id],{
              '_id':table._id,
              "name":table.name,
              "img":table.img,
              active
          })
  })
  
  
  
  function buildRows(collecton) {
      return collecton.map(table => {
          let checked = (table.active)? "checked" : "";
          return `
              <tr id="id_${table._id}">
              <td style="background-image:url(${table.img});
                  background-repeat:no-repeat;
                  background-size:40px 40px;   
                  width: 40px; height: 40px;"
              ></td>
              <td>${table.name}</td>
              <td><input type="text" id="count_${table._id}" value="0" /></td>
              <td style="text-align: center;"><input type="checkbox" 
                                                id="active_${table._id}" 
                                                name="shop-gen-whisper" ${checked}></td>
              </tr>`
      })    
  }
  
  let header = `<tr>
      <th style="length:15px"></th>
      <th style = "text-align: center; width: 120px">Таблица</th>
      <th style = " width: 50px ">Количество</th>
      <th style = " width: 15px">Исп.</th>
  </tr>`
  function buildTable(header,rows = []) {
      let mass = ''
      rows.forEach(item => mass += item + "\n")
      return `<table>
          ${header}
          ${mass}
          </table>
      `
  }
  
  
  
  new Dialog({
      title: `Генератор торговца`,
      content: `<form>
      <details id="customWall"  ${(customOpen)? "open": ""}>
          <summary>Список таблиц </summary>
          Значение количества для конкретной таблицы будет проссумировано с общим значением
          <div style="height: 300px; overflow: auto;">
            ${buildTable(header,buildRows(currentTables))}
          </div>
          <div>
            <h4>Сохранить настройки:</h4>
            <input type="checkbox" id="shop-gen-new">
          </div>
      </details>
        <label for="count">Количество предметов(число и формула броска):</label>
        <input type="text" id="shop-gen-count" name="shop-gen-count" value="${dafaultDice}"/>   
      </div>
      <div class="form-group">
        <label>Максимальная редкость предмета:</label>
        <select id="shop-gen-item-rarity" name="shop-gen-item-rarity">
        <option value="common"  ${(typeItemAsDefault == "common")? "selected": ""}>Обычный</option>
        <option value="uncommon" ${(typeItemAsDefault == "uncommon")? "selected": ""}>Необычный</option>
        <option value="rare"      ${(typeItemAsDefault == "rare")? "selected": ""}>Редкий</option>
        <option value="veryrare" ${(typeItemAsDefault == "veryrare")? "selected": ""} >Крайне редкий</option>
        <option value="legenrady"${(typeItemAsDefault == "legenrady")? "selected": ""}>Легендарный</option>
        <option value="artifact" ${(typeItemAsDefault == "artifact")? "selected": ""} >Артефакт</option>
        </select>
      </div>
      <div class="form-group">
        <label>Шепот себе:</label>
        <input type="checkbox" id="shop-gen-whisper" name="shop-gen-whisper" checked >
      </div>
      <div class="form-group">
        <label>Сложите это все в рюкзак выбранного актера</label>
        <input type="checkbox" id="shop-gen-store" ${(saveOnTockenAsDefault)? "checked": ""}>
      </div>
      <div class="form-group">
        <label>✅Суммировать/Игнорировать одинаковые</label>
        <input type="checkbox" id="shop-gen-same" ${(defaultSumOrIgnore)? "checked": ""} >
      </div>
      </form>`,
      buttons: {
          yes: {
              icon: "<i class='fas fa-check'></i>",
              label: `Сгенерировать`,
              callback: () => applyChanges = true
          },
          no: {
              icon: "<i class='fas fa-times'></i>",
              label: `Отмена`
          },
      },
      default: "yes",
      close: async (html) => {
       await domain (html)
      }
  },
  {
    height: "450px",
    scale: true,
    resizable:true,
    
  }).render(true);

async function domain (html) {
  let itemsRList = []

  
  let itemlist = []
  if (applyChanges == false) return;
  let activateList = []
  currentTables.forEach(table => {
    table.active = html.find(`[id="active_${table._id}"]`)[0].checked || false

    table.count = html.find(`[id="count_${table._id}"]`)[0].value || "0"
    if (table.active) activateList.push({_id:table._id, count: table.count})
  })
  console.groupCollapsed("Макрос бросков торговца")
    console.log("Только что бросались следующие таблицы:");
    console.info(activateList);
    console.log("Для вставки в настройки использайте эту строку:");
    let savelist = JSON.stringify(activateList).split('},{').join('},\n{')
    console.info(JSON.stringify(activateList).split('},{').join('},\n{'));
  console.groupEnd()
  
  if (!activateList.length > 0) return;

  const count = html.find('[name="shop-gen-count"]')[0].value || '1';
  const type = html.find('[name="shop-gen-item-rarity"]')[0].value || "common";
  const whisper = html.find('[name="shop-gen-whisper"]')[0].checked || false;
  const storeCreated = html.find('[id="shop-gen-store"]')[0].checked || false;
  const countSame = html.find('[id="shop-gen-same"]')[0].checked || false;


  const createMacro = html.find('[id="shop-gen-new"]')[0].checked || false;


  countItems = new Roll(""+count.toString());
  await countItems.evaluate();
  countItems = countItems.total
  for (let count = 0; count < countItems; count++) {
    if (countItems <= 0) break;
    let itemsOnThisRoll = new Roll(`1d${countItems}`);
    await itemsOnThisRoll.evaluate();
    await roll(itemsOnThisRoll.total)
    countItems -= itemsOnThisRoll.total
  }




  async function roll (onThisIteration) {
    let currentTable = new Roll(`1d${activateList.length}`);
    await currentTable.evaluate();
    let table = activateList[currentTable.total-1]
    let countLocal = new Roll(""+table.count);
    await countLocal.evaluate();
    if (countLocal.total < 0) activateList[currentTable.total-1].count = 0
    let realTable = await tablePacks.getDocument(table._id);
    let draw = await realTable.drawMany(countLocal.total+onThisIteration, { displayChat: false });
    activateList[currentTable.total-1].count -= countLocal.total
    draw.results.forEach(item => {itemsRList.push({item:item,count:1})})
  }
  



  if (countSame) {
    let itemsRList2 = []
    let tobe = []
    itemsRList.forEach ((item,ind,arr) => {
      if (!tobe.includes(item.documentId)) {
        let same = arr.filter((same) => item.item.documentId == same.item.documentId)
        item.count = same.length
        itemsRList2.push(item)
        tobe.push(item.item.documentId);
      }
    })
  
    itemsRList = itemsRList2
    itemsRList2 = null
    tobe = null
  }else{
    itemsRList.forEach ((item) => {
        item.count = 1
    })
  }
  
  for (let i = 0; i < itemsRList.length; i++) {
    const item = itemsRList[i];
    let pack = game.packs.get(item.item.documentCollection);
    let moreInfoAboutItem = await pack?.getDocument(item.item?.documentId)
    let itemRarity = moreInfoAboutItem?.system?.rarity || "uncommon"
    let price = new Roll(""+priceByType[itemRarity]);
    await price.evaluate();
    let itemRarityLevel = Object.keys(priceByType).findIndex(i => i == itemRarity)
    let maxRarityLevel = Object.keys(priceByType).findIndex(i => i == type)
    if (itemRarityLevel > maxRarityLevel) continue;
    itemsRList[i].moreInfoAboutItem = moreInfoAboutItem
    itemlist.push(await itemTextHtml({
      item:item.item,
      count:item.count,
      price:price.total
    }))
  }
  if (storeCreated) {
    additems(itemsRList)
  }
  let chatData = {
    user: game.user._id,
    speaker: ChatMessage.getSpeaker(),
    content: textHeader + itemlist.join('') + textFooter,
  };
  if (whisper) {
      chatData.whisper = ChatMessage.getWhisperRecipients("GM");
  }


    ChatMessage.create(chatData, {});
    if (createMacro) {
      saveSettings({ activateList:JSON.parse(savelist),count,type,storeCreated,countSame})
    }
}
  
let additems = (items) => {
  let actor = canvas.tokens.controlled[0].actor
  items.forEach(item => {
    if (item.moreInfoAboutItem) actor.createEmbeddedDocuments("Item", [item.moreInfoAboutItem]);
  })
}
let change = false;
let saveSettings = (inputParams) => {
  let command = this.command
  const parameters = [
    {
      inside:"activateList",
      outside:"dafaultListTables",
      typeOf: Array
    },
    {
      inside:"count",
      outside:"dafaultDice",
      typeOf: String
    },
    {
      inside:"type",
      outside:"typeItemAsDefault",
      typeOf: String
    },
    {
      inside:"storeCreated",
      outside:"saveOnTockenAsDefault",
      typeOf: Boolean
    },
    {
      inside:"countSame",
      outside:"defaultSumOrIgnore",
      typeOf: Boolean
    },
  ]
  parameters.forEach (parameter =>{
    let beginChar = command.indexOf(parameter.outside)
    if (beginChar != -1) {
      let beginProperty = command.indexOf("=",beginChar)+1
      let endProperty = 0
      if (parameter.typeOf == Array) {
        let endPropertySep = "]"
        endProperty = command.indexOf(endPropertySep,beginProperty)
      }else{
        let endPropertySep = "\n"
        endProperty = command.indexOf(endPropertySep,beginProperty)
      }
      let value = JSON.stringify(inputParams[parameter.inside]).split('},{').join('},\n{')
      console.log([command.slice(beginChar,beginProperty),command.slice(beginProperty+1,endProperty-1),value])
      command = command.slice(0, beginProperty+1) + value + command.slice(endProperty-1)
    }
    
    
    
    
  })
  change = true
}

if (change) {
  this.command = command
}
//-----------------------------------------------------------------------------------
