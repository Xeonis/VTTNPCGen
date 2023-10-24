/*
Генератор случайного лута/магазинчика по таблицам
Доработал Xeonis 
-------------------------------------------------------------------------------------
Эти настройки можно менять меняя значение true или false 
Стандартные настройки*/
  // оставляет окно макроса открытым по нажатии на кноп
  //Постоянно открытый список таблиц
  let customOpen = true
let dafaultDice = "1d10"
//список стандартно включенных
  let dafaultListTables = [
    {
        "_id": "3V2isuiDLKEOzu54",
        "count": "0"
    },
    {
        "_id": "746WbvDuyKiRF8xC",
        "count": "0"
    },
    {
        "_id": "oxNQoYotKiCeHL6m",
        "count": "0"
    },
    {
        "_id": "ot0pQ5yrnB92mm5R",
        "count": "0"
    },
    {
        "_id": "zb7ed6u7Ng80y6oD",
        "count": "0"
    },
    {
        "_id": "d1yRwrFcFE3k8R6c",
        "count": "0"
    },
    {
        "_id": "1DKyrEhTfMDppA7S",
        "count": "0"
    }
];
  
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
/*-------------------------------------------------------------------------------------
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
  

  const textHeader = `
  <div class="table-draw" data-table-id="LMrqEBBn3L1eegpc">
  <ol class="table-results">
  `;
  const textFooter = `
  </ol>
  </div>
  `;
  const itemTextHtml = ({ text, price, img, documentId, documentCollection }) => {
      return img != null && documentId != null ? `
        <li class="table-result flexrow" data-result-id="${documentId}" style="border-top: 1px solid var(--color-border-dark-tertiary); border-bottom: 0; position: relative; width: 100%; padding: 10px 0 0 10px; overflow: hidden">
          <img class="result-image" src="${img}">
          <div class="result-text" style="max-width: calc(100% - 44px)">
              <span>@UUID[Compendium.${documentCollection}.${documentId}]{${text}}</span>
          </div>
        </li>
        <li style="padding: 0 0 4px 0;">
          <div class="flavor-text" style="padding-left: 40px;"> за <strong>${price}</strong></div>
        </li>
  ` : '';
  }

  
  
  
  let currentTables = new Collection()
  const tableCompendium = 'laaru-dnd5-hw.tables-extra';
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
              <td style="text-align: center;"><input type="checkbox" id="active_${table._id}" name="shop-gen-whisper" ${checked} ></td>
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
      options: {
        width: "300px",
        height: "450px",
        scale: true,
      },
      title: `Генератор торговца`,
      content: `<form style = "height:400px width:300px">
      <details id="customWall"  ${(customOpen)? "open": ""}>
          <summary>Список таблиц </summary>
          Значение количества для конкретной таблицы будет проссумировано с общим значением
              ${buildTable(header,buildRows(currentTables))}
      </details>
      <label for="count">Количество предметов(число и формула броска):</label>
      <input type="text" id="shop-gen-count" name="shop-gen-count" value="${dafaultDice}" />   
      </div>
      <div class="form-group">
      <label>Редкость предмета:</label>
      <select id="shop-gen-item-rarity" name="shop-gen-item-rarity">
      <option value="common">Обычный</option>
      <option value="uncommon">Необычный</option>
      <option value="rare">Редкий</option>
      <option value="veryrare">Крайне редкий</option>
      <option value="legenrady">Легендарный</option>
      <option value="artifact">Артефакт</option>
      </select>
      </div>
      <div class="form-group">
      <label>Шепот себе:</label>
      <input type="checkbox" id="shop-gen-whisper" name="shop-gen-whisper" checked >
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
      close: async html => {
          if (applyChanges == false) return;
          let activateList = []
          currentTables.forEach(table => {
              table.active = html.find(`[id="active_${table._id}"]`)[0].checked || false

              table.count = html.find(`[id="count_${table._id}"]`)[0].value || 0
              if (table.active) activateList.push({_id:table._id, count: table.count})
          })
          console.log("Только что бросались следующие таблицы:");
          console.log(activateList);
          const count = html.find('[name="shop-gen-count"]')[0].value || '1';
          const type = html.find('[name="shop-gen-item-rarity"]')[0].value || "common";
          const whisper = html.find('[name="shop-gen-whisper"]')[0].checked || false;
  
          countItems = new Roll(count.toString());
          await countItems.evaluate();
          countItems = countItems.total
          console.log(countItems);
          for (let count = 0; count < countItems; count++) {
            if (countItems <= 0) break;
            let itemsOnThisRoll = new Roll(`1d${countItems}`);
            await itemsOnThisRoll.evaluate();
            roll(itemsOnThisRoll.total)
            
            countItems -= itemsOnThisRoll.total
          }
          let itemlist = []
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
            draw.results.forEach((item) => {
              itemlist.push(itemTextHtml({
                  ...item,
                  //price: `${price.total} ЗМ`
              })) 
            })
           
          } 

        let chatData = {
          user: game.user._id,
          speaker: ChatMessage.getSpeaker(),
          content: textHeader + itemlist.join('\n') + textFooter,
        };
        if (whisper) {
            chatData.whisper = ChatMessage.getWhisperRecipients("GM");
        }

          ChatMessage.create(chatData, {});
      }
  }).render(true);
