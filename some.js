/*Генератор случайного лута/магазинчика по таблицам
Доработал Xeonis 
-------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
Разработка макросов и модулей для Fvtt писать -- Xeonis
-------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
-----[Стандартные настройки]-----
-----------------------------------------------------------------------------------*/
//Эти настройки можно менять меняя значение true или false 
//Постоянно открытый список таблиц
let customOpen = false
//стандартная кость бросков
let dafaultDice = 5//"1d10"
//сумморовать или игнорировать по умолчанию
let defaultSumOrIgnore = true
//сохранять в токена по умолчанию
let saveOnTockenAsDefault = true
//стоимость
const priceByType = {
  'common': '(1d6) * 10',
  'uncommon': '(1d6+1) * 100',
  'rare': '2d10 * 1000',
  'veryrare': '(1d4+1) * 10000',
  'legenrady': '2d6 * 25000',
  'artifact': '2d6 * 250000',
}

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
let blockedListTables = [
  {_id:'ZUV4rPuYHU532IHq',count:0},
  {_id:'dKfomxx8mNH2HGDZ',count:0}, 
  {_id:'qBDtPYETQPvbUGKp',count:0}, 
  {_id:'2qDg2sz8xYpmHrrC',count:0}, 
  {_id:'GXZ3jGKfQWzPZSLh',count:0}, 
  {_id:'N34NnokOfBiV1YPJ',count:0}, 
  {_id:'hHVqr7nopYSyvqb0',count:0}, 
  {_id:'gZ3sYMNujzWrV4Jx',count:0}, 
  {_id:'QiRIr0kvxo1A3Wzf',count:0}, 
  {_id:'p4okMDe6fxF0HpQN',count:0}
];

const tableCompendium = 'laaru-dnd5-hw.tables-extra';

/*-----------------------------------------------------------------------------------
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
  let applyChanges = false

  const textHeader = `<div class="table-draw" data-table-id="LMrqEBBn3L1eegpc">
    <ol class="table-results">`;
  const textFooter = `</ol></div>`;


  const itemTextHtml = async ({item, price ,count}) => {
      return (item.img != null && item.documentId != null) ? `
        <li class="table-result flexrow" data-result-id="${item.documentId}" 
          style="border-top: 1px solid var(--color-border-dark-tertiary); 
          border-bottom: 0; position: relative; 
          width: 100%; padding: 10px 0 0 10px; overflow: hidden">
          <img class="result-image" src="${item.img}">
          <div class="result-text" style="max-width: calc(100% - 44px)">
              <span>@UUID[Compendium.${item.documentCollection}.${item.documentId}]{${item.text.split('').splice(0,20).join('')}}</span>
          </div>
        </li>
        <li style="padding: 0 0 4px 0;">
          <div class="flavor-text" style="padding-left: 40px;"> за <strong>${price} ЗМ${(count > 1)? " x "+ count+'шт.':''} </strong></div>
        </li>
      ` : '';
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
            <h4>Сохранить настройку как отдельный макрос:</h4>
            <label for="count"">Название</label>
            <div style="display: inline-block;" >
              <input style=width: 50px" type="text" id="shop-gen-new-name" value="Мой магазинчиик(а)"/>
            </div>
            <input type="checkbox" id="shop-gen-new">
          </div>
      </details>
        <label for="count">Количество предметов(число и формула броска):</label>
        <input type="text" id="shop-gen-count" name="shop-gen-count" value="${dafaultDice}"/>   
      </div>
      <div class="form-group">
        <label>Максимальная редкость предмета:</label>
        <select id="shop-gen-item-rarity" name="shop-gen-item-rarity">
        <option value="common">Обычный</option>
        <option value="uncommon">Необычный</option>
        <option value="rare">Редкий</option>
        <option value="veryrare">Крайне редкий</option>
        <option value="legenrady">Легендарный</option>
        <option value="artifact" selected >Артефакт</option>
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
      </form>
        
      `,
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
  console.log("Только что бросались следующие таблицы:");
  console.info(activateList);

  
  const count = html.find('[name="shop-gen-count"]')[0].value || '1';
  const type = html.find('[name="shop-gen-item-rarity"]')[0].value || "common";
  const whisper = html.find('[name="shop-gen-whisper"]')[0].checked || false;
  const storeCreated = html.find('[id="shop-gen-store"]')[0].checked || false;
  const countSame = html.find('[id="shop-gen-same"]')[0].checked || false;


  const nameMacro = html.find('[id="shop-gen-new-name"]')[0].value || "New Macro seller";
  const createMacro = html.find('[id="shop-gen-new"]')[0].checked || false;
  console.log(createMacro,nameMacro);

  
  countItems = new Roll(count.toString());
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
    let countLocal = new Roll(table.count);
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
    let moreInfoAboutItem = await pack.getDocument(item.item.documentCollection)
    let itemRarity = moreInfoAboutItem?.system?.rarity || "uncommon"
    let price = new Roll(priceByType[itemRarity]);
    await price.evaluate();
    let itemRarityLevel = Object.keys(itemRarity).findIndex(i => i == itemRarity)
    let maxRarityLevel = Object.keys(itemRarity).findIndex(i => i == type)
    if (itemRarityLevel < maxRarityLevel) continue;
    itemlist.push(await itemTextHtml({
      item:item.item,
      count:item.count,
      price:price.total
    }))

  let chatData = {
    user: game.user._id,
    speaker: ChatMessage.getSpeaker(),
    content: textHeader + itemlist.join('') + textFooter,
  };
  if (whisper) {
      chatData.whisper = ChatMessage.getWhisperRecipients("GM");
  }

    ChatMessage.create(chatData, {});
  }
}
//-----------------------------------------------------------------------------------
