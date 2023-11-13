/*Макрос для расчета темпа путешествия
Спасибо за макрос Salamander!
Доработал Xeonis 
-------------------------------------------------------------------------------------
Эти настройки можно изменять
Стандартные настройки*/
const defaultSpeed = 30; // Базовая скорость 30 футов за раунд
const defaultHoursPerDay = 8; //Базовое время путешествий
const crewedTransportHoursPerDay = 24; // часов в сутках
const undergroundTravelDivider = 4; //модификатор подземья
const difficultyMovement = 0.5 //модификатор трудной местности
const weekLength = 7; // количество дней в неделе

const forcedHikeMoveFormula = (overhour) => {return 10 + overhour} // формула расчета усталости

const paceOptions = {
  fast: 1.3334,
  normal: 1,
  slow: 0.6667
};
//Описания для  
const paceDescriptions = {
  fast: "Быстрый темп: Штраф −5 к пассивному значению Мудрости (Внимательность)",
  normal: "Нормальный темп",
  slow: "Медленный темп: Возможность перемещаться скрытно"
};
//Формылы 
const TypesOfMoves = {
    underground: {
        paceOptions:true,
        difficultTerrain: true,
        mainFormulaInDays: false,
        formula: ({speed}) => {return ((speed / 10) / undergroundTravelDivider);}
    },
    shipped: {
        paceOptions:true,
        difficultTerrain: true,
        mainFormulaIsDays: true,
        formula: ({speed}) => {return (speed);}
    },
    default: {
        paceOptions:true,
        difficultTerrain: true,
        mainFormulaIsDays: false,
        formula: ({speed}) => {return (speed) / 10;}
    },
    gallop:{
        paceOptions:true,
        difficultTerrain: true,
        mainFormulaIsDays: true,
        formula: ({speed, overhour = 1, hoursPerDay, defaultSpeed}) => {
            return ((speed* (hoursPerDay-overhour)) + (overhour*2*defaultSpeed*paceOptions.fast)) / 10;
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

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
/*
    ФУНКЦИИ ОТОБРАЖЕНИЯ ДИАЛОГОВОГО ОКНА
*/
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

const buttonBlocker = (box,isTravel) =>  {
    const speedInput = document.getElementById('speed-input');
    const undergroundCheckbox = document.getElementById('underground-travel');
    const seaCheckbox = document.getElementById('sea-travel');
    const gallopCheckbox = document.getElementById('gallop-travel');
    console.log(1);
    speedInput.placeholder = 'Базовый темп (при пустом поле)';
    
        if (box.checked && isTravel == "sea") {
            speedInput.placeholder = 'Введите скорость судна (мили/ч)';
            seaCheckbox.checked = true;
            undergroundCheckbox.checked = false;
            gallopCheckbox.checked = false;
        }
        
        if (box.checked && isTravel == "dung") {
            speedInput.placeholder = 'Темп путешествия в подземье';
            seaCheckbox.checked = false;
            undergroundCheckbox.checked = true;
            gallopCheckbox.checked = false;
        }

        if (box.checked && isTravel == "galo") {
            speedInput.placeholder = 'Темп путешествия в галопом';
            seaCheckbox.checked = false;
            undergroundCheckbox.checked = false;
            gallopCheckbox.checked = true;
        }
}


let content = `
    <div style="display: flex; align-items: center;">
    <div style="flex-grow: 1;">
        <p>Введите расстояние в милях:
        <input id="distance-input" type="number" style="width: calc(40% - 20px);"></p>
    </div>
    </div>
    <div style="display: flex; align-items: end; justify-content: space-around;">
            <div>
                <p style="line-height: 1; font-size: smaller;">Морской<br>транспорт</p>
                <input type="checkbox" id="sea-travel" value="true" onclick="buttonBlocker(this,'sea')">
            </div>
            <div>
                <p style="line-height: 1; font-size: smaller;">Подземье</p>
                <input type="checkbox" id="underground-travel" onclick="buttonBlocker(this,'dung')">
            </div>
            <div>
                <p style="line-height: 1; font-size: smaller;">Галоп</p>
                <input type="checkbox" id="gallop-travel" onclick="buttonBlocker(this,'galo')">
            </div>  
    </div>
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
            <p style="margin: auto;">
                <input type="checkbox" id="overhour-checkbox" value="1">🌡️Форсированное путешествие +
                <input id="overhour-value" type="number" placeholder="1" style="width: calc(15% - 20px);"> часов в день
            </p>
            <details style="margin: auto;">
                    <summary>О форсировании</summary>
                    Работает 2 способами<br>
                    1) Добавляет к перемещению в день часы перемещения и помечает сложность для каждого часа сверх нормы<br>
                    <p style="font-size: smaller;margin: auto;"> (будте аккуратны) подсчет усталости мы тут не ведем</p>
                    2) При галлопе и выключенной галочке указанное число считается как часы галопа в день
            </details>
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
<script>
    buttonBlocker = ${buttonBlocker.toString()}
</script>
`



///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
/*
    СБОР ОТВЕТА
*/
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

const createMessage = () => {
    //основное сообщение
    let messageContent = `Время: ${days} дней и ${hours}. <br>
    Расстояние: ${distance} миль. <br>
    ${paceDescriptions[selectedPace]}. <br>
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
        answer.push(`${defaultHoursPerDay+over} час - ${forcedHikeMoveFormula(over)}`)
    }
    return answer
}


//рсчет форсированного марша


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
    return Array(CountRolls).fill(new Roll(`${diceRoll}`).evaluate({async: false}));
};



///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
/*
    ОБРАБОТЧИК ОТВЕТА
*/
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////



const mainDialogCallback = (html) => {
    const distance = parseFloat($(html).find("#distance-input").val()) || 1;
    const userEnteredSpeed = parseFloat($(html).find("#speed-input").val());
    const selectedPace = $(html).find("#pace").val();

    const isSeaTravel = $(html).find("#sea-travel").is(":checked") || false;
    const isDifficultTerrain = $(html).find("#difficult-terrain").is(":checked") || false;
    const isCrewedTransport = $(html).find("#crewed-transport").is(":checked") || false;
    const isUndergroundTravel = $(html).find("#underground-travel").is(":checked") || false;
    const isGallop = $(html).find("#gallop-travel").is(":checked") || false;

    //Форсированное перемещение
    const isOverhourMovement = $(html).find("#overhour-checkbox").is(":checked") || false
    const overhour = parseFloat($(html).find("#overhour-value").val()) || 1;
    
    //бросок кубика каждый
    const isCheckedDiceRoll = $(html).find("#dice-roll-checkbox").is(":checked") || false
    const diceRollTime = $(html).find("#dice-roll-time").val() || "day"
    const diceRoll = $(html).find("#dice-roll").val() || "1d20"

    let speed = userEnteredSpeed || defaultSpeed;
    let mainSpeed = speed;
    let hoursPerDay = isCrewedTransport ? crewedTransportHoursPerDay : (defaultHoursPerDay + ((isOverhourMovement)? overhour : 0)) ;

    let milesPerHour;
    let milesPerDay;
    console.log(1);
    
    
    let move = TypesOfMoves.default
    //Переключение типа формулы
    if (isUndergroundTravel) {
        move = TypesOfMoves.underground
    }else if (isSeaTravel){
        move = TypesOfMoves.shipped
    }else if (isGallop){
        move = TypesOfMoves.gallop
    }

    

    // Сначала рассчитываем скорость с учетом темпа
    if (move.paceOptions) speed *= paceOptions[selectedPace]

    if (move.mainFormulaIsDays) {
        milesPerDay = roundDown(move.formula({speed, mainSpeed, hoursPerDay, overhour ,defaultSpeed}))
        // Затем применяем модификатор местности   
        if (isDifficultTerrain && move.difficultTerrain) milesPerDay *= difficultyMovement;
        milesPerHour = (milesPerDay / hoursPerDay).toFixed(1)
    }else{
        milesPerHour = move.formula({speed, mainSpeed, hoursPerDay, overhour,defaultSpeed})
        // Затем применяем модификатор местности   
        if (isDifficultTerrain && move.difficultTerrain) milesPerHour *= difficultyMovement;
        milesPerDay = roundDown(milesPerHour * hoursPerDay)
    }

    //посчитаем деенечки
    let totalDays = distance / milesPerDay;
    let days = Math.floor(totalDays);
    let hours = convertHoursToTime((totalDays - days) * hoursPerDay);
    let weeks = Math.floor(days/weekLength)
    let countRolls = countRollsForumula({diceRollTime, weeks, days, totalDays, hoursPerDay,diceRoll});
    
    createMessage()
}


///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
/*ОСНОВНОЕ ДИАЛОГОВОЕ ОКНО*/
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
 
await Dialog.prompt({
    title: "Расчет времени путешествия",
    close: () => {console.log("log me");},
    content,
    label: "Готово",
    callback: (html) => mainDialogCallback(html)
        
});

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
/*спасибо за внимание на этом все*/
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

























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





/**
 * Генерирует характеристики персонажа и выводит результат в виде таблицы.
 * Author: @Kekilla#7036 & KrishMero1792
 */
 
// Formula for rolling 
const statString = '4d6kh3';

// times to roll those stats
const numRolls = 6;


//////////////////////////////////////////
// Don't touch anything below this line //
//////////////////////////////////////////
const stats = Array(numRolls).fill(0).map(e=>new Roll(statString).evaluate({async: false}));

const rollData = stats[0].dice[0];
const {faces, values: keptRolls, results: rolls} = rollData;
const totalAverage = (faces/2 + 1) * keptRolls.length;
const totalDeviation = faces/2;
const totalLow = Math.ceil(totalAverage - totalDeviation);
const totalHigh = Math.ceil(totalAverage + totalDeviation);

const header = rolls.map((roll, index) => `<th>D${index + 1}</th>`).join('');

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


ChatMessage.create({content});

function colorSetter(number,low,high, discarded)
{
  if(discarded === true) return 'text-decoration:line-through;color:gray';
  if(number <= low) return 'color:red';
  if(number >= high) return 'color:green';
  return '';
}





