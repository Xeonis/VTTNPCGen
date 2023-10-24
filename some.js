/*
Макрос позволяет быстро изменять тип стен. 
Просто выделите стену или стены и нажмите макрос. 
Спасибо за макрос Kikimor!
Доработал Xeonis 
-------------------------------------------------------------------------------------
Эти настройки можно менять меняя значение true или false 
Стандартные настройки*/
  // оставляет окно макроса открытым по нажатии на кноп
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
  
  let dafaultListTables = [
      'ot0pQ5yrnB92mm5R'
  ];
  
  let blockedListTables = [
      'ZUV4rPuYHU532IHq',
      'dKfomxx8mNH2HGDZ', 
      'qBDtPYETQPvbUGKp', 
      '2qDg2sz8xYpmHrrC', 
      'GXZ3jGKfQWzPZSLh', 
      'N34NnokOfBiV1YPJ', 
      'hHVqr7nopYSyvqb0', 
      'gZ3sYMNujzWrV4Jx', 
      'QiRIr0kvxo1A3Wzf', 
      'p4okMDe6fxF0HpQN'
  ];
  
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
      if (blockedListTables.includes(table._id)) return;
      let active = (dafaultListTables.includes(table._id))? true: false;
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
      
      title: `Генератор торговца`,
      content: `<form style = "height:400px width:300px">
      <details id="customWall"  ${(customOpen)? "open": ""}>
          <summary>Список таблиц </summary>
          Значение количества для конкретной таблицы будет проссумировано с общим значением
              ${buildTable(header,buildRows(currentTables))}
      </details>
      <label for="count">Количество предметов(число и формула броска):</label>
      <input type="text" id="shop-gen-count" name="shop-gen-count" value="1d6" />   
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
          let usedTables = new Collection()
          currentTables.forEach(table => {
              table.active = html.find(`[id="active_${table._id}"]`)[0].checked || false
              console.log(table.active);
              console.log(html.find(`[id="count_${table._id}"]`));
              table.count = html.find(`[id="count_${table._id}"]`)[0].value || 0
              if (table.active) activateList.push(table._id)
              table.reference = await tablePacks.getDocument(table._id);
              usedTables.set(table._id,table)
          })
          console.log("Только что бросались следующие таблицы:");
          console.log(activateList);
          const count = html.find('[name="shop-gen-count"]')[0].value || '1';
          const type = html.find('[name="shop-gen-item-rarity"]')[0].value || "common";
          const whisper = html.find('[name="shop-gen-whisper"]')[0].checked || false;
  
          countItems = new Roll(count.toString());
          
          
          
          await rollTable.evaluate();
          console.log(usedTables);
  
          
  
  
  
  
          console.log(draw);
          textAr = draw.results.map((item) => {
              rollPrice = new Roll(priceDice);
              let price = rollPrice.evaluate({async: false});
  
              return itemTextHtml({
                  ...item,
                  price: `${price.total} ЗМ`
              });
  
  
          }).join('');
  
          let chatData = {
              user: game.user._id,
              speaker: ChatMessage.getSpeaker(),
              content: textHeader + textAr + textFooter,
          };
          if (whisper) {
              chatData.whisper = ChatMessage.getWhisperRecipients("GM");
          }
  
            ChatMessage.create(chatData, {});
          
      }
  }).render(true);
  
  
  
  
  
  
  
  
  default: "yes",
  close: async html => {
      let priceDice = '';
      let rollTable = null;
      let rollPrice = null;
      let textAr = [];
  
      if (applyChanges) {
  
          const tablePack = game.packs.get(tableCompendium);
          if (!tablePack.index.length) await tablePack.getIndex();
          
  
         
          priceDice = priceByType[type];
          rollTable = new Roll(count.toString());
  
          
          
          if (!table) {
              table = game.tables.get(tableIds[type]);
          }
  
          let draw = await table.drawMany(rollTable.total, { displayChat: false });
          
      }
  }
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  let applyChanges = false;
  const tableCompendium = 'laaru-dnd5-hw.tables-extra';
  const itemsCompendium = 'laaru-dnd5-hw.items';
  const tableIds = {
      'common': 'qPouW0h2zXtFo62a',
      'uncommon': '6wcTUmhT2Hny9vNf',
      'rare': 'WNZghiAhzqWMqkB4',
      'veryrare': '587UR1kqHq9vw0gf',
      'legenrady': 'jHMMeaB95As4WxLu',
      'artifact': 'Smv2hyvMQh02YOrg',
  }
  const priceByType = {
      'common': '(1d6) * 10',
      'uncommon': '(1d6+1) * 100',
      'rare': '2d10 * 1000',
      'veryrare': '(1d4+1) * 10000',
      'legenrady': '2d6 * 25000',
      'artifact': '2d6 * 250000',
  }
  
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
  
  new Dialog({
      title: `Генератор торговца`,
      content: `
      <form>
        <div class="form-group">
          <label for="count">Количество предметов(число и формула броска):</label>
          <input type="text" id="shop-gen-count" name="shop-gen-count" value="1d6" />   
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
          let priceDice = '';
          let rollTable = null;
          let rollPrice = null;
          let textAr = [];
  
          if (applyChanges) {
  
              const tablePack = game.packs.get(tableCompendium);
              if (!tablePack.index.length) await tablePack.getIndex();
              
  
              const count = html.find('[name="shop-gen-count"]')[0].value || '1';
              const type = html.find('[name="shop-gen-item-rarity"]')[0].value || "common";
              const whisper = html.find('[name="shop-gen-whisper"]')[0].checked || false;
              priceDice = priceByType[type];
              rollTable = new Roll(count.toString());
  
              await rollTable.evaluate();
              let table = await tablePack.getDocument(tableIds[type]);
              if (!table) {
                  table = game.tables.get(tableIds[type]);
              }
  
              let draw = await table.drawMany(rollTable.total, { displayChat: false });
              console.log(draw);
              textAr = draw.results.map((item) => {
                  rollPrice = new Roll(priceDice);
                  let price = rollPrice.evaluate({async: false});
  
                  return itemTextHtml({
                      ...item,
                      price: `${price.total} ЗМ`
                  });
  
  
              }).join('');
  
              let chatData = {
                  user: game.user._id,
                  speaker: ChatMessage.getSpeaker(),
                  content: textHeader + textAr + textFooter,
              };
              if (whisper) {
                  chatData.whisper = ChatMessage.getWhisperRecipients("GM");
              }
  
                ChatMessage.create(chatData, {});
          }
      }
  }).render(true);
  
  
  
  
  
  
  
  
  
  
  
  
  
  
    