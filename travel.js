


/*Макрос для расчета темпа путешествия
Спасибо за макрос Salamander!
Доработал Xeonis 
-------------------------------------------------------------------------------------
Эти настройки можно изменять
сохранение вытрет все коментарии в настройках  :(
Стандартные настройки*/

let settings = {


defaultSpeed    :   30  , // Базовая скорость 30 футов за раунд
defaultHoursPerDay : 8, //Базовое время путешествий
crewedTransportHoursPerDay : 24, // часов в сутках
undergroundTravelDivider : 4, //модификатор подземья
difficultyMovement : 0.5, //модификатор трудной местности
weekLength : 7, // количество дней в неделе
overhourCheckModifier: "0", //модификатор сложности бросков для форсорованного марша


paceOptions : {
    fast: {
        modifier: 1.3334,
        description: "Быстрый темп: Штраф −5 к пассивному значению Мудрости (Внимательность)",
        name: "Быстрый"
    },
    normal: {
        modifier: 1,
        description: "Нормальный темп",
        name: "Нормальный"
    },
    slow: {
        modifier: 0.6667,
        description: "Медленный темп: Возможность перемещаться скрытно",
        name: "Быстрый"
    },
},


//Формылы 
TypesOfMoves : {
    underground: {
        default: true,
        label: "Морской транспорт",
        paceOptionsActive:true,
        difficultTerrain: true,
        mainFormulaInDays: false,
        formula: ({speed}) => {return ((speed / 10) / settings.undergroundTravelDivider);},
        placeholder: 'Введите скорость судна (мили/ч)'
    },
    shipped: {
        default: true,
        label: "Подземье",
        paceOptionsActive:true,
        difficultTerrain: true,
        mainFormulaIsDays: true,
        formula: ({speed}) => {return (speed);},
        placeholder: 'Темп путешествия в подземье'
    },
    default: {
        default: true,
        paceOptionsActive:true,
        difficultTerrain: true,
        mainFormulaIsDays: false,
        formula: ({speed}) => {return (speed) / 10;},
        placeholder: 'Базовый темп (при пустом поле)'
    },
    gallop:{
        default: true,
        label: "Галоп",
        paceOptionsActive:true,
        difficultTerrain: true,
        mainFormulaIsDays: true,
        formula: ({speed, overhour = 1, hoursPerDay, defaultSpeed}) => {
            return ((speed* (hoursPerDay-overhour)) + (overhour*2*defaultSpeed*settings.paceOptions.fast.modifier)) / 10;
        },
        placeholder: 'Темп путешествия в галопом'
    }
}


}
/*-----------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
Разработка макросов и модулей для Fvtt писать -- Xeonis
-------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
Далее этого коментария идет функциональный код ничего не торгайте, ну или трогайте :)
-------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------
-----------------------------------------------------------------------------------*/

const shiftKey = event?.shiftKey ? true : false;
const simpleClendarModule = game.modules.get("foundryvtt-simple-calendar")?.active

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
/*
    ФУНКЦИИ ОТОБРАЖЕНИЯ ДИАЛОГОВОГО ОКНА
*/
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////



const buttonBlocker = (box,travel) =>  {
    const speedInput = document.getElementById('speed-input');
    speedInput.placeholder = settings.TypesOfMoves.default.placeholder;
    //перебираю, включаю нужные и выключаю не нужные
    for (const key in settings.TypesOfMoves) {
        if (Object.hasOwnProperty.call(settings.TypesOfMoves, key)) {
            if (key == "default" ) continue; 
            const element = document.getElementById(`move-checkbox-${key}`);
            if (!element === null) continue;
            if (travel == key && box.checked) {
                speedInput.placeholder = settings.TypesOfMoves[key].placeholder
                element.checked = box.checked;
            } else {
                element.checked = false;
            }
        }
    }
}
const buttonActiveStageList = () => {
   console.log( "считать стразу все")
}



//style="display: flex; align-items: center;"
const content = () => {
    let moveCheckbox = []
    for (const key in settings.TypesOfMoves) {
        if (Object.hasOwnProperty.call(settings.TypesOfMoves, key)) {
            if (key == "default" ) continue; 
            const element = settings.TypesOfMoves[key];
            moveCheckbox.push(`<div style="text-align: center;"><p class="move-checkbox">${element.label.replace(/ /g ,"<br>")}</p>
                                <input type="checkbox" style="margin:auto" id="move-checkbox-${key}"></div>`)
        }
    }
    // позсказки
    let assist = (text) => {return `<i class="tip fas fa-info-circle" data-tooltip="${text}"></i>`}
    let LongTravel = "Это продвинутый калькулятор, его так же можно вызвать через shift -> вызов макроса"

    let styles = `
        .move-checkbox {
            line-height: 1; font-size: smaller;
        }
        .macro-button-swich {
            display: flex;
            height: 50px;
            width: min-content;
            font-size: x-small;
            flex-wrap: wrap;
            justify-content: space-between;
            margin:auto;
        }
    `


    return `<style>${styles}</style>
    <div class ="macro-travel">
        <div style="flex-grow: 1; display: flex; justify-content: space-between;">
            <p>Введите расстояние в милях:
            <input id="distance-input" type="number" style="width: calc(35% - 20px);"></p>
            <div>
                <button type='button' class='macro-button-swich' id="more-functional">
                    <p style="margin: 0 0.5em 0 0; line-height: initial;">Долгое путешествие</p>
                    <p style="margin:auto; font-size: small;">🏕️</p>
                    <p style="margin:auto; "> ${assist(LongTravel)}</p>
                    
                </button>
            </div>     
        </div>
        <div style="display: flex; align-items: end; justify-content: space-around;">${moveCheckbox.join("\n")}</div>
        <div style="flex-grow: 1; margin-right: 10px;">
            <p>Введите скорость:
            <input id="speed-input" type="number" placeholder="Базовый темп (при пустом поле)" style="width: calc(70% - 20px);"></p>
        </div>
        <div>
            <div style="font-size: small;">
                <p><input type="checkbox" id="difficult-terrain" value="true">🗺️Пересеченная местность</p>
                <p><input type="checkbox" id="crewed-transport" value="true">🕛Использование 24 часового путешествия</p>
                <p>
                    <input type="checkbox" id="dice-roll-checkbox" value="1d20">🎲Проверка 
                    <input id="dice-roll" type="number" placeholder="1d20" style="width: calc(18% - 20px);"> за каждый 
                    <select id="dice-roll-time" style="width: 15%">
                        <option value="day" selected>день</option>
                        <option value="hour" >час</option>
                        <option value="week">неделю</option>
                    </select> путешествия
                </p>
        </div>
        <div>
            <p>Выберите темп:
            <select id="pace" style="width: 50%">
                <option value="fast">Быстрый</option>
                <option value="normal" selected>Нормальный</option>
                <option value="slow">Медленный</option>
            </select></p>
        </div>   
</div>


`
} 




///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
/*
    СБОР ОТВЕТА
*/
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

const createMessage = ({days,hours,distance,selectedPace,isCrewedTransport,isUndergroundTravel,userEnteredSpeed,milesPerHour,milesPerDay,isDifficultTerrain}) => {
    //основное сообщение
    let messageContent = `Время: ${days} дней и ${hours}. <br>
    Расстояние: ${distance} миль. <br>
    ${settings.paceOptions[selectedPace].description}. <br>
    Пересеченная местность: ${isDifficultTerrain ? "Да" : "Нет"}. <br>
    ${(isCrewedTransport ? "Использование 24 часового путешествия.<br>"  : "")}
    ${(isUndergroundTravel ? 'Путешествие в подземье. <br>' : '')}
    Введенная скорость: ${userEnteredSpeed ? userEnteredSpeed + (isSeaTravel ? " мили/ч" : " фт/раунд") : "Базовая"}. <br>
    Скорость в милях/час: ${milesPerHour}. <br>
    Скорость в милях/день: ${milesPerDay}.`;

    ChatMessage.create({
        content: messageContent,
        speaker: ChatMessage.getSpeaker(),
        whisper: ChatMessage.getWhisperRecipients("GM"),
    });
}


///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
/*
    ВЫЧИСЛЯЛКИ
*/
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

const forcedHikeMoveFormula = (overhour) => {return 10 + overhour + new Roll(settings.overhourCheckModifier).evaluate()._total} // формула расчета усталости


///////////////////////////////////////////////////////
/*основной расчет*/
///////////////////////////////////////////////////////
const calculateDistance = () => {
        
}

function toFix (number) {
    const part = number - Math.trunc(number)
    return  Math.floor(number) + ((part > 0.05)? part.toFixed(1) : 0);
}

function roundDown(num) {
    return Math.floor(num);
}

function convertHoursToTime(hours) {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')} часа`;
}




//рсчет форсированного марша
const forcedHikeMoveCalc = (overhours = 1) => {
    if (overhours == 0) return []
    let answer = []
    for (let over = 1; over < overhours; over++) {
        answer.push(`${settings.defaultHoursPerDay+over} час - ${forcedHikeMoveFormula(over)}`)
    }
    return answer
}


const countRollsForumula = ({diceRollTime, weeks, days, totalDays, hoursPerDay,diceRoll}) => {
    let CountRolls = 0;
    switch (diceRollTime) {
        case "week":
            CountRolls = weeks
            break;
        case "hour":
            CountRolls = roundDown(totalDays * hoursPerDay)
            break;
        default:
            CountRolls = days
            break;
    }
    return Array(CountRolls).fill(new Roll(`${diceRoll}`).evaluate({async: false})._total);
};



///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
/*
    ОБРАБОТЧИК ОТВЕТА
*/
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////



const mainDialogCallback = (html) => {
    let data = {}

    data.distance = parseFloat($(html).find("#distance-input").val()) || 1;
    data.userEnteredSpeed = parseFloat($(html).find("#speed-input").val());
    data.selectedPace = $(html).find("#pace").val();

    data.isSeaTravel = $(html).find("#sea-travel").is(":checked") || false;
    data.
    data.isDifficultTerrain = $(html).find("#difficult-terrain").is(":checked") || false;
    data.isCrewedTransport = $(html).find("#crewed-transport").is(":checked") || false;
    data.isUndergroundTravel = $(html).find("#underground-travel").is(":checked") || false;
    data.isGallop = $(html).find("#gallop-travel").is(":checked") || false;

    //Форсированное перемещение
    const isOverhourMovement = $(html).find("#overhour-checkbox").is(":checked") || false
    const overhour = parseFloat($(html).find("#overhour-value").val()) || 1;
    data.isOverhourMovement = isOverhourMovement;
    data.overhour = overhour;
    //бросок кубика каждый
    data.isCheckedDiceRoll = $(html).find("#dice-roll-checkbox").is(":checked") || false
    data.diceRollTime = $(html).find("#dice-roll-time").val() || "day"
    data.diceRoll = $(html).find("#dice-roll").val() || "1d20"

    let speed = data.userEnteredSpeed || settings.defaultSpeed;
    let mainSpeed = speed;
    let hoursPerDay = data.isCrewedTransport ? settings.crewedTransportHoursPerDay : (settings.defaultHoursPerDay + ((isOverhourMovement)? overhour : 0)) ;
    
    
    let defaultSpeed = settings.defaultSpeed;
    data.mainSpeed = mainSpeed;
    data.hoursPerDay = hoursPerDay;
    let milesPerHour;
    let milesPerDay;
    console.log(1);
    

    let
    
    let move = settings.TypesOfMoves.default
    //Переключение типа формулы
    if (data.isUndergroundTravel) {
        move = settings.TypesOfMoves.underground
    }else if (data.isSeaTravel){
        move = settings.TypesOfMoves.shipped
    }else if (data.isGallop){
        move = settings.TypesOfMoves.gallop
    }

    

    // Сначала рассчитываем скорость с учетом темпа
    if (move.paceOptionsActive) speed *= settings.paceOptions[data.selectedPace].modifier

    if (move.mainFormulaIsDays) {
        milesPerDay = roundDown(move.formula({speed, mainSpeed, hoursPerDay, overhour ,defaultSpeed}))
        // Затем применяем модификатор местности   
        if (data.isDifficultTerrain && move.difficultTerrain) milesPerDay *= settings.difficultyMovement;
        milesPerHour = toFix(milesPerDay / hoursPerDay)
    }else{
        data.milesPerHour = toFix(move.formula({speed, mainSpeed, hoursPerDay, overhour,defaultSpeed}))
        // Затем применяем модификатор местности   
        if (data.isDifficultTerrain && move.difficultTerrain) milesPerHour *= settings.difficultyMovement;
        data.milesPerDay = roundDown(data.milesPerHour * hoursPerDay)
    }

    //посчитаем деенечки
    data.totalDays = data.distance / milesPerDay;

    data.milesPerDay = milesPerDay
    data.milesPerHour = milesPerHour
    data.days = Math.floor(totalDays);
    data.hours = convertHoursToTime((totalDays - data.days) * hoursPerDay);
    data.weeks = Math.floor(data.days/settings.weekLength)
    data.countRolls = countRollsForumula(data);
    createMessage(data)
}


///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
/*ОСНОВНОЕ ДИАЛОГОВОЕ ОКНО*/
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////


//обработчик событий в макросе
const handleRender = (html) => {
    for (const key in settings.TypesOfMoves) {
        if (Object.hasOwnProperty.call(settings.TypesOfMoves, key)) {
            if (key == "default" ) continue; 
            html.on('click',`#move-checkbox-${key}`, (htmlc) => buttonBlocker(htmlc.target,key));
        }
    }
    
}


//собственно окошко
const mainWindow = new Dialog({
    title: "Расчет времени путешествия",
    content,
    buttons: {
        go:{
            icon: '<i class="fas fa-check"></i>',
            label: "Готово",
            callback: html => mainDialogCallback(html)
        },
    },
    default: "close",
    render: handleRender,
    close: html => {} //console.log("This always is logged no matter which option is chosen")    
},{ 
    scale: true,
  })
mainWindow.render(true);



///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
/*спасибо за внимание на этом все*/
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

for ()


<table>
<tr>
  <td ${colspan}><h2 style="margin-bottom:0; ${center}">Значения характеристик</h2>
  
</tr>
<tr style="${center} border-bottom:1px solid #000">
  ${header}
  <th style="border-left:1px solid #000">Итог</th>
</tr>
${tableRows}
<tr style="border-top: 1px solid #000">
  <th colspan="${rolls.length}" style="${center}">Финальная сумма:</th>
  <th style="${center}">${finalSum}</th>
</tr>

</table>






let tableRows = '';
let finalSum = 0;
for(let {terms, total} of stats) {
  tableRows += `<tr style="text-align:center">`;
  tableRows += terms[0].results.map(({result, discarded}) => `<td style="${colorSetter(result, 1, faces, discarded)}">${result}</td>`).join('');
  tableRows += `<td style="border-left:1px solid #000; ${colorSetter(total, totalLow, totalHigh)}">${total}</td></tr>`;
  finalSum += total;
}

const colspan = `colspan="${rolls.length + 1}"`;
const center = `text-align:center;`;

content = `
  <table>
    <tr>
      <td ${colspan}><h2 style="margin-bottom:0; ${center}">Значения характеристик</h2>
      <div style="margin-bottom: 0.5rem; ${center}">${statString} были проброшены ${numRolls} раз.</div></td>
    </tr>
    <tr style="${center} border-bottom:1px solid #000">
      ${header}
      <th style="border-left:1px solid #000">Итог</th>
    </tr>
    ${tableRows}
    <tr style="border-top: 1px solid #000">
      <th colspan="${rolls.length}" style="${center}">Финальная сумма:</th>
      <th style="${center}">${finalSum}</th>
    </tr>

  </table>
`;














/*


const colspan = `colspan="${rolls.length + 1}"`;
const center = `text-align:center;`;

content = `
  <table>
    <tr>
      <td ${colspan}><h2 style="margin-bottom:0; ${center}">Значения характеристик</h2>
      <div style="margin-bottom: 0.5rem; ${center}">${statString} были проброшены ${numRolls} раз.</div></td>
    </tr>
    <tr style="${center} border-bottom:1px solid #000">
      ${header}
      <th style="border-left:1px solid #000">Итог</th>
    </tr>
    ${tableRows}
    <tr style="border-top: 1px solid #000">
      <th colspan="${rolls.length}" style="${center}">Финальная сумма:</th>
      <th style="${center}">${finalSum}</th>
    </tr>

  </table>
`;


*/





/**
 *      <div>
        
        
            <p class="move-checkbox";">📈 Путешествие в несколько этапов</p>
            <input type="checkbox" id="stages" value="true" onclick="buttonActiveStageList()">
        </div>
        </div>



                        <p style="margin: auto;">
                    <input type="checkbox" id="overhour-checkbox" value="1">🌡️Форсированное путешествие +
                    <input id="overhour-value" type="number" placeholder="1" style="width: calc(15% - 20px);"> часов в день 
                </p>
                
                <details style="margin: auto;" class = "info">
                        <summary>О форсировании</summary>
                        Работает 2 способами<br>
                        1) Добавляет к перемещению в день часы перемещения и помечает сложность для каждого часа сверх нормы<br>
                        <p style="font-size: smaller;margin: auto;"> (будте аккуратны) подсчет усталости мы тут не ведем</p>
                        2) При галлопе и выключенной галочке указанное число считается как часы галопа в день
                </details>
 */