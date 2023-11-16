


/*Макрос для расчета темпа путешествия
Спасибо за макрос Salamander!
Доработал Xeonis 
-------------------------------------------------------------------------------------
Эти настройки можно изменять

Стандартные настройки*/
let settings = {

}
const defaultSpeed = 30; // Базовая скорость 30 футов за раунд
const defaultHoursPerDay = 8; //Базовое время путешествий
const crewedTransportHoursPerDay = 24; // часов в сутках
const undergroundTravelDivider = 4; //модификатор подземья
const difficultyMovement = 0.5 //модификатор трудной местности
const weekLength = 7; // количество дней в неделе

const forcedHikeMoveFormula = (overhour) => {return 10 + overhour} // формула расчета усталости

const paceOptions = {
    fast: {
        modifier: 1.3334,
        description: "Быстрый темп: Штраф −5 к пассивному значению Мудрости (Внимательность)",
        name: "Быстрый"
    },
    normal: {
        modifier: 0.6667,
        description: "Нормальный темп",
        name: "Нормальный"
    },
    slow: {
        modifier: 1.3334,
        description: "Медленный темп: Возможность перемещаться скрытно",
        name: "Быстрый"
    },
}


//Формылы 
const TypesOfMoves = {
    underground: {
        default: true,
        label: "Морской транспорт",
        paceOptionsActive:true,
        difficultTerrain: true,
        mainFormulaInDays: false,
        formula: ({speed}) => {return ((speed / 10) / undergroundTravelDivider);},
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
            return ((speed* (hoursPerDay-overhour)) + (overhour*2*defaultSpeed*paceOptions.fast.modifier)) / 10;
        },
        placeholder: 'Темп путешествия в галопом'
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
    speedInput.placeholder = TypesOfMoves.default.placeholder;
    //перебираю, включаю нужные и выключаю не нужные
    for (const key in TypesOfMoves) {
        if (Object.hasOwnProperty.call(TypesOfMoves, key)) {
            if (key == "default" ) continue; 
            const element = document.getElementById(`move-checkbox-${key}`);
            if (!element === null) continue;
            if (travel == key && box.checked) {
                speedInput.placeholder = TypesOfMoves[key].placeholder
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
    for (const key in TypesOfMoves) {
        if (Object.hasOwnProperty.call(TypesOfMoves, key)) {
            if (key == "default" ) continue; 
            const element = TypesOfMoves[key];
            moveCheckbox.push(`<div style="text-align: center;"><p class="move-checkbox">${element.label.replace(/ /g ,"<br>")}</p>
                                <input type="checkbox" style="margin:auto" id="move-checkbox-${key}"></div>`)
        }
    }
    // позсказки
    let assist = (text) => {return `<i class="tip fas fa-info-circle" data-tooltip="${text}"></i>`}



    return `
    <style>
        .move-checkbox {
            line-height: 1; font-size: smaller;
        }
    </style>
    <div class ="macro-travel">
        <div style="flex-grow: 1;">
            <p>Введите расстояние в милях:
            <input id="distance-input" type="number" style="width: calc(40% - 20px);"></p>
        </div>
        <div>
            <p class="move-checkbox";">📈 Путешествие в несколько этапов</p>
            <input type="checkbox" id="stages" value="true" onclick="buttonActiveStageList()">
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
    ${paceOptions[selectedPace].description}. <br>
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


///////////////////////////////////////////////////////
/*основной расчет*/
///////////////////////////////////////////////////////
const calculateDistance = () => {
        
}

function toFix (number) {
    const part = number - Math.trunc(number)
    return  Math.floor(number) + (part > 0.05)? part.toFixed(1) : 0
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
        answer.push(`${defaultHoursPerDay+over} час - ${forcedHikeMoveFormula(over)}`)
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
    let data = {}

    data.distance = parseFloat($(html).find("#distance-input").val()) || 1;
    data.userEnteredSpeed = parseFloat($(html).find("#speed-input").val());
    data.selectedPace = $(html).find("#pace").val();

    data.isSeaTravel = $(html).find("#sea-travel").is(":checked") || false;
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

    let speed = data.userEnteredSpeed || defaultSpeed;
    let mainSpeed = speed;
    let hoursPerDay = data.isCrewedTransport ? crewedTransportHoursPerDay : (defaultHoursPerDay + ((isOverhourMovement)? overhour : 0)) ;
    data.mainSpeed = mainSpeed;
    data.hoursPerDay = hoursPerDay;
    let milesPerHour;
    let milesPerDay;
    console.log(1);
    


    
    let move = TypesOfMoves.default
    //Переключение типа формулы
    if (data.isUndergroundTravel) {
        move = TypesOfMoves.underground
    }else if (data.isSeaTravel){
        move = TypesOfMoves.shipped
    }else if (data.isGallop){
        move = TypesOfMoves.gallop
    }

    

    // Сначала рассчитываем скорость с учетом темпа
    if (move.paceOptionsActive) speed *= paceOptions[data.selectedPace].modifier

    if (move.mainFormulaIsDays) {
        milesPerDay = roundDown(move.formula({speed, mainSpeed, hoursPerDay, overhour ,defaultSpeed}))
        // Затем применяем модификатор местности   
        if (data.isDifficultTerrain && move.difficultTerrain) milesPerDay *= difficultyMovement;
        milesPerHour = toFix(milesPerDay / hoursPerDay)
    }else{
        milesPerHour = toFix(move.formula({speed, mainSpeed, hoursPerDay, overhour,defaultSpeed}))
        // Затем применяем модификатор местности   
        if (data.isDifficultTerrain && move.difficultTerrain) milesPerHour *= difficultyMovement;
        milesPerDay = roundDown(milesPerHour * hoursPerDay)
    }

    //посчитаем деенечки
    let totalDays = data.distance / milesPerDay;
    data.totalDays = totalDays
    data.milesPerDay = milesPerDay
    data.milesPerHour = milesPerHour
    data.days = Math.floor(totalDays);
    data.hours = convertHoursToTime((totalDays - data.days) * hoursPerDay);
    data.weeks = Math.floor(data.days/weekLength)
    data.countRolls = countRollsForumula(data);
    console.log(data);
    createMessage(data)
}


///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
/*ОСНОВНОЕ ДИАЛОГОВОЕ ОКНО*/
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////


//обработчик событий в макросе
const handleRender = (html) => {
    console.log(1);
    for (const key in TypesOfMoves) {
        if (Object.hasOwnProperty.call(TypesOfMoves, key)) {
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
    close: html => console.log("This always is logged no matter which option is chosen")    
},{
    resizable:true, 
  })
mainWindow.render(true);



///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
/*спасибо за внимание на этом все*/
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////






















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




