--[[

+ Есть баг того, что заданная скорость (дробная, она округляется вверх и очень динамично меняется скорость из-за этого косяка). Надо сохранять в переменную, и от этого значения устанавливать только целое число, тогда все будет плавнее и гуд.
+ Что делать когда достигли верхнего/нижнего предела по скорости. Если ПИД оставить как есть, то интегральная составляющая загонит в небеса. Да и самой вентустановкой что делать.
* Навести порядок и довести до ума. Положить ввиде кода в архив.

]]--

---------------------------------------------------------------------------------
-----------------------------------НАСТРОЙКИ-------------------------------------
---------------------------------------------------------------------------------

-- Настройки устройств
basicSettings = {
	modeID = nil,			        -- ID режима ПВУ
	fanID = nil,		            -- ID скорости ПВУ
	temperatureID = nil,			-- ID температуры ПВУ
	CO2ID = nil				        -- ID датчика СО2
}






-- Настройки PID регулятора
PID_Settings = {
	KP = nil,			            -- Коэффициент пропорциональности
	KI = nil,		                -- Коэффициент интегральности
	KD = nil,			            -- Коэффициент дифференциальности
	integral = 0,                   -- Интегральная составляющая
    last_error = 0,                 -- Последняя ошибка
    speed = 0                       -- Cкорость
}

fanMin = nil
fanMax = nil
temperatureMin = nil
temperatureMax = nil
co2Min = 300
co2Max = 1500
speedMin = 26
speedMax = 69

targetCO2 = nil
targetManualSpeed = nil

dt = 60 -- Временной интервал между итерациями
timeSync = 3
cyclePID = dt/timeSync/5
pidWork = cyclePID


-- Версия ПО
softVersion = 'v1.1D_20231113';



THERMOSTATE_MODES = {
    Off         = {id = 0},
    Away        = {id = 1},
    Home        = {id = 2},
    Boost       = {id = 3},
    Travelling  = {id = 4},
}
THERMOSTATE_MODES_NAME_LIST = {}
for k,_ in pairs(THERMOSTATE_MODES) do
    THERMOSTATE_MODES_NAME_LIST[#THERMOSTATE_MODES_NAME_LIST + 1] = k 
end

ACCEPTED_MODES = {
    manual      = {label: "АВТО"}
    auto        = {label: ""}
}

ACCEPDED_SPEED_MODES = {
    auto        = {id: 0, label: "АВТО"}
    first       = {id: 1, label: "40%"}
    second      = {id: 2, label: "60%"}
    third       = {id: 3, label: "100%"}
}

---------------------------------------------------------------------------------
---------------------------------ОСНОВНОЙ КОД------------------------------------
---------------------------------------------------------------------------------




---- ОСНОВНЫЕ ----

-- Первый запуск
function QuickApp:onInit()

    self:debug("Запуск виртуального устройства")
    self:updateProperty("supportedThermostatModes", THERMOSTATE_MODES_NAME_LIST)

    -- Получение данных ID
    basicSettings.modeID = tonumber(self:getVariable("id_mode"))
    basicSettings.temperatureID = tonumber(self:getVariable("id_temperature"))
    basicSettings.fanID = tonumber(self:getVariable("id_speed"))
    basicSettings.CO2ID = tonumber(self:getVariable("id_CO2"))

    -- Получение данных для PID регулятора
    PID_Settings.KP = tonumber(self:getVariable("KP"))
    PID_Settings.KI = tonumber(self:getVariable("KI"))
    PID_Settings.KD = tonumber(self:getVariable("KD"))

    PID_Settings.speed = hub.getValue(basicSettings.fanID, "value")


    -- Получение данных (локальных переменных)
    fanMin = tonumber(self:getVariable("speed_min"))
    fanMax = tonumber(self:getVariable("speed_max"))
    temperatureMin = tonumber(self:getVariable("temperature_min"))
    temperatureMax = tonumber(self:getVariable("temperature_max"))
    targetCO2 = tonumber(self:getVariable("target_CO2"))
    targetManualSpeed = tonumber(self:getVariable("speed_manual"))
    

    -- Обновление лейбов устройства
    if self:getVariable("mode") == "auto" then
        self:updateView ("modeInfo", "text", "Регулировка скорости HOME: АВТО")
        self:updateView ("A_Info_CO2", "text", "АВТО | Заданный уровень СО2, ppm: " .. tonumber(self:getVariable("target_CO2")))
        self:updateView ("A_Info_Min", "text", "АВТО | Скорость MIN, %: " .. tonumber(self:getVariable("speed_min")))
        self:updateView ("A_Info_Max", "text", "АВТО | Скорость MAX, %: " .. tonumber(self:getVariable("speed_max")))
        self:updateView ("M_Info_Speed", "text", "РУЧНАЯ | Скорость воздуха, %: -")
    elseif self:getVariable("mode") == "manual" then
        self:updateView ("modeInfo", "text", "Регулировка скорости HOME: РУЧНАЯ")
        self:updateView ("A_Info_CO2", "text", "АВТО | Заданный уровень СО2, ppm: -")
        self:updateView ("A_Info_Min", "text", "АВТО | Скорость MIN, %: -")
        self:updateView ("A_Info_Max", "text", "АВТО | Скорость MAX, %: -")
        self:updateView ("M_Info_Speed", "text", "РУЧНАЯ | Скорость воздуха, %: " .. tonumber(self:getVariable("speed_manual")) )
    else
        self:modeSpeedManual()
    end
    self:updateView ("temperature", "text", "Подогрев входа воздуха: " .. tonumber(hub.getValue(basicSettings.temperatureID, "value")) .. " °C")


    self:work()

end


-- Основная функция
function QuickApp:work()
    -- self:debug("work")
    self:sync()

    if hub.getValue(self.id, "thermostatMode") == "Home" and self:getVariable("mode") == "auto" then
        if pidWork == 0 then
            self:pid()
        else
            -- self:debug("Задержка PID - " .. pidWork)
            pidWork = pidWork-1
        end
    else
        pidWork = cyclePID
    end
    
    hub.setTimeout(timeSync*1000, function() self:work() end)
end

-- Обновление состояния
function QuickApp:sync()
    -- self:debug("sync")

    -- Режим термостата
    local currentMode = hub.getValue(basicSettings.modeID, "value")
    for key,value in pairs(THERMOSTATE_MODES) do 
        if currentMode == value.id then
            currentMode = key
            if currentMode ~= hub.getValue(self.id, "thermostatMode") then
                self:updateProperty("thermostatMode", currentMode)
            end
            break
        end
    end
    

    -- Температура
    self: updateView ("temperature", "text", "Подогрев входа воздуха: " .. hub.getValue(basicSettings.temperatureID, "value") .. " °C")

    -- Скорость воздуха (только в ручном режиме)
    if currentMode == "Home" and self:getVariable("mode") == "manual" then
        self: updateView ("M_Info_Speed", "text", "РУЧНАЯ | Скорость воздуха, %: " .. hub.getValue(basicSettings.fanID, "value") )
        self:setVariable("speed_manual", hub.getValue(basicSettings.fanID, "value"))
    end

end


-- ПИД регулятор
function QuickApp:pid()
    self:debug("ПИД Регулятор")

    local currentCO2 = hub.getValue(basicSettings.CO2ID, "value") -- Текущее значение СО2
    local currentError = currentCO2 - tonumber(self:getVariable("target_CO2")) -- Текущее значение ошибки СО2
    self:debug("Текущее значение СО2: " .. currentCO2 .. "/" .. self:getVariable("target_CO2") .. " (" .. currentError .. ")")

    local currenSpeed = PID_Settings.speed -- Текущая скорость вентилятора -- hub.getValue(basicSettings.fanID, "value")
    self:debug("Текущая скорость вентилятора: " .. currenSpeed)

    local currentIntegral = PID_Settings.integral + currentError * dt
    local derivative = (currentError - PID_Settings.last_error) / dt



    local output = PID_Settings.KP * currentError + PID_Settings.KI * currentIntegral + PID_Settings.KD * derivative
    self:debug("Пропорциональная составляющая: " .. PID_Settings.KP * currentError)
    self:debug("Интегральная составляющая: " .. PID_Settings.KI * currentIntegral)
    self:debug("Дифференциальная составляющая: " .. PID_Settings.KD * derivative)
    
    local newSpeed = currenSpeed + output
    
    self:debug("Необходимая скорость: " .. newSpeed .. " (" .. output .. ")")

    -- Отделяем целое и дробное
    local speedInstall_1, speedInstall_2 = math.modf(newSpeed)
    

    -- Сделать проверку на установку значения между заданными
    if speedInstall_1 >= speedMin then
        if speedInstall_1 <= speedMax then
            PID_Settings.integral = currentIntegral
            PID_Settings.last_error = tonumber(currentError)
            PID_Settings.speed = newSpeed;
            hub.call(basicSettings.fanID, "setValue", speedInstall_1)
            self:debug("Устанавлена скорость: " .. speedInstall_1)
        else
            hub.call(basicSettings.fanID, "setValue", speedMax)
            PID_Settings.speed = speedMax;
            self:debug("Устанавлена скорость: " .. speedMax)
        end
    else
        hub.call(basicSettings.fanID, "setValue", speedMin)
        PID_Settings.speed = speedMin;
        self:debug("Устанавлена скорость: " .. speedMin)
    end


    -- Обнуление таймера
    pidWork = cyclePID

end


---- ТЕРМОСТАТ ----

-- Установка режима
function QuickApp:setThermostatMode(mode)
    self:updateProperty("thermostatMode", mode)
    if THERMOSTATE_MODES[mode] ~= nil then 
        hub.call(basicSettings.modeID, "setValue", THERMOSTATE_MODES[mode].id)
    else
        hub.call(basicSettings.modeID, "setValue", THERMOSTATE_MODES["Off"].id)
    end
end

---- КНОПКИ ----

-- Регулировка скорости --
-- АВТО
function QuickApp:Button_Modes()
    local currentValue = self:getVariable("mode")
    if currentValue ~= "auto" then 
        self:setVariable("mode", "auto")
        self:updateView ("modeInfo", "text", "Регулировка скорости HOME: АВТО")
        self:updateView ("A_Info_CO2", "text", "АВТО | Заданный уровень СО2, ppm: " .. tonumber(self:getVariable("target_CO2")))
        self:updateView ("A_Info_Min", "text", "АВТО | Скорость MIN, %: " .. tonumber(self:getVariable("speed_min")))
        self:updateView ("A_Info_Max", "text", "АВТО | Скорость MAX, %: " .. tonumber(self:getVariable("speed_max")))
        self:updateView ("M_Info_Speed", "text", "РУЧНАЯ | Скорость воздуха, %: -")
    end
end
-- РУЧНАЯ
function QuickApp:modeSpeedManual()
    local currentValue = self:getVariable("mode")
    if currentValue ~= "manual" then 
        self:setVariable("mode", "manual")
        self:updateView ("modeInfo", "text", "Регулировка скорости HOME: РУЧНАЯ")
        self:updateView ("A_Info_CO2", "text", "АВТО | Заданный уровень СО2, ppm: -")
        self:updateView ("A_Info_Min", "text", "АВТО | Скорость MIN, %: -")
        self:updateView ("A_Info_Max", "text", "АВТО | Скорость MAX, %: -")
        self:updateView ("M_Info_Speed", "text", "РУЧНАЯ | Скорость воздуха, %: " .. tonumber(self:getVariable("speed_manual")) )
    end
    -- Установить скорость из сохраненных параметров
    if tonumber(hub.getValue(basicSettings.fanID, "value")) ~= tonumber(self:getVariable("speed_manual")) then
        hub.call(basicSettings.fanID, "setValue", tonumber(self:getVariable("speed_manual")))
    end
end





-- АВТО | Скорость --
-- СО2 
function QuickApp:Button_Speed(event)
    local button = tostring(event.elementName)
  
    if (ButtonHolder[button] == nil) 
        return;
    end;
    local x = ButtonHolder[button]
    local currentValue = tonumber(self:getVariable("target_CO2"))
    if currentValue+x >= co2Min and currentValue+x <= co2Max then
        self:setVariable("target_CO2", currentValue+x)
        function vision (mode) {
            ACCEPDED_SPEED_MODES[mode]
        }
        self:updateView ("A_Info_Speed", "text", "АВТО | Заданный уровень СО2, ppm: " .. currentValue+x)
    end
end
self:setVariable("speed", currentValue+x)
self:updateView ("A_Info_Min", "text", "АВТО | Скорость MIN, %: " .. currentValue+x)






-- АВТО | Минимальная скорость --
-- Cкорость MIN "-5"
function QuickApp:speedMinRemove5()
    if self:getVariable("mode") == "auto" then
        local x = -5
        local currentValue = tonumber(self:getVariable("speed_min"))
        if currentValue+x >= speedMin and currentValue+x <= speedMax then
            self:setVariable("speed_min", currentValue+x)
            self:updateView ("A_Info_Min", "text", "АВТО | Скорость MIN, %: " .. currentValue+x)
        end
    end
end
-- Cкорость MIN "-1"
function QuickApp:speedMinRemove1()
    if self:getVariable("mode") == "auto" then
        local x = -1
        local currentValue = tonumber(self:getVariable("speed_min"))
        if currentValue+x >= speedMin and currentValue+x <= speedMax then
            self:setVariable("speed_min", currentValue+x)
            self:updateView ("A_Info_Min", "text", "АВТО | Скорость MIN, %: " .. currentValue+x)
        end
    end
end
-- Cкорость MIN "+1"
function QuickApp:speedMinAdd1()
    if self:getVariable("mode") == "auto" then
        local x = 1
        local currentValue = tonumber(self:getVariable("speed_min"))
        if currentValue+x >= speedMin and currentValue+x <= speedMax then
            self:setVariable("speed_min", currentValue+x)
            self:updateView ("A_Info_Min", "text", "АВТО | Скорость MIN, %: " .. currentValue+x)
        end
    end
end
-- Cкорость MIN "+5"
function QuickApp:speedMinAdd5()
    if self:getVariable("mode") == "auto" then
        local x = 5
        local currentValue = tonumber(self:getVariable("speed_min"))
        if currentValue+x >= speedMin and currentValue+x <= speedMax then
            self:setVariable("speed_min", currentValue+x)
            self:updateView ("A_Info_Min", "text", "АВТО | Скорость MIN, %: " .. currentValue+x)
        end
    end
end


-- АВТО | Максимальная скорость --
-- Cкорость MAX "-5"
function QuickApp:speedMaxRemove5()
    if self:getVariable("mode") == "auto" then
        local x = -5
        local currentValue = tonumber(self:getVariable("speed_max"))
        if currentValue+x >= speedMin and currentValue+x <= speedMax then
            self:setVariable("speed_max", currentValue+x)
            self:updateView ("A_Info_Max", "text", "АВТО | Скорость MAX, %: " .. currentValue+x)
        end
    end
end
-- Cкорость MAX "-1"
function QuickApp:speedMaxRemove1()
    if self:getVariable("mode") == "auto" then
        local x = -1
        local currentValue = tonumber(self:getVariable("speed_max"))
        if currentValue+x >= speedMin and currentValue+x <= speedMax then
            self:setVariable("speed_max", currentValue+x)
            self:updateView ("A_Info_Max", "text", "АВТО | Скорость MAX, %: " .. currentValue+x)
        end
    end
end
-- Cкорость MAX "+1"
function QuickApp:speedMaxAdd1()
    if self:getVariable("mode") == "auto" then
        local x = 1
        local currentValue = tonumber(self:getVariable("speed_max"))
        if currentValue+x >= speedMin and currentValue+x <= speedMax then
            self:setVariable("speed_max", currentValue+x)
            self:updateView ("A_Info_Max", "text", "АВТО | Скорость MAX, %: " .. currentValue+x)
        end
    end
end
-- Cкорость MAX "+5"
function QuickApp:speedMax5()
    if self:getVariable("mode") == "auto" then
        local x = 5
        local currentValue = tonumber(self:getVariable("speed_max"))
        if currentValue+x >= speedMin and currentValue+x <= speedMax then
            self:setVariable("speed_max", currentValue+x)
            self:updateView ("A_Info_Max", "text", "АВТО | Скорость MAX, %: " .. currentValue+x)
        end
    end
end


-- РУЧНАЯ | Скорость --
-- Cкорость MANUAL "-5"
function QuickApp:speedManualRemove5()
    if self:getVariable("mode") == "manual" then
        local x = -5
        local currentValue = tonumber(self:getVariable("speed_manual")) 
        -- hub.getValue(basicSettings.fanID, "value")
        if currentValue+x >= speedMin and currentValue+x <= speedMax then
            self:setVariable("speed_manual", currentValue+x)
            hub.call(basicSettings.fanID, "setValue", currentValue+x)
            self:updateView ("M_Info_Speed", "text", "РУЧНАЯ | Скорость воздуха, %: " .. currentValue+x)
        end
    end  
end
-- Cкорость MANUAL "-1"
function QuickApp:speedManualRemove1()
    if self:getVariable("mode") == "manual" then
        local x = -1
        local currentValue = tonumber(self:getVariable("speed_manual")) 
        -- hub.getValue(basicSettings.fanID, "value")
        if currentValue+x >= speedMin and currentValue+x <= speedMax then
            self:setVariable("speed_manual", currentValue+x)
            hub.call(basicSettings.fanID, "setValue", currentValue+x)
            self:updateView ("M_Info_Speed", "text", "РУЧНАЯ | Скорость воздуха, %: " .. currentValue+x)
        end
    end   
end
-- Cкорость MANUAL "+1"
function QuickApp:speedManualAdd1()
    if self:getVariable("mode") == "manual" then
        local x = 1
        local currentValue = tonumber(self:getVariable("speed_manual")) 
        -- hub.getValue(basicSettings.fanID, "value")
        if currentValue+x >= speedMin and currentValue+x <= speedMax then
            self:setVariable("speed_manual", currentValue+x)
            hub.call(basicSettings.fanID, "setValue", currentValue+x)
            self:updateView ("M_Info_Speed", "text", "РУЧНАЯ | Скорость воздуха, %: " .. currentValue+x)
        end
    end
end
-- Cкорость MANUAL "+5"
function QuickApp:speedManualAdd5()
    if self:getVariable("mode") == "manual" then
        local x = 5
        local currentValue = tonumber(self:getVariable("speed_manual")) 
        -- hub.getValue(basicSettings.fanID, "value")
        if currentValue+x >= speedMin and currentValue+x <= speedMax then
            self:setVariable("speed_manual", currentValue+x)
            hub.call(basicSettings.fanID, "setValue", currentValue+x)
            self:updateView ("M_Info_Speed", "text", "РУЧНАЯ | Скорость воздуха, %: " .. currentValue+x)
        end
    end  
end


-- ОБЩЕЕ | Температура подогреваемого воздуха --
-- Увеличение температуры воздуха
function QuickApp:tempAdd()
    local x = 1
    local currentValue = tonumber(hub.getValue(basicSettings.temperatureID, "value"))
    if currentValue+x >= temperatureMin and currentValue+x <= temperatureMax then 
        hub.call(basicSettings.temperatureID, "setValue", currentValue+x)
        self:updateView ("temperature", "text", "Подогрев входа воздуха: " .. currentValue+x .. " °C")
    end
end
-- Уменьшение температуры воздуха
function QuickApp:tempRemove()
    local x = -1
    local currentValue = tonumber(hub.getValue(basicSettings.temperatureID, "value"))
    if currentValue+x >= temperatureMin and currentValue+x <= temperatureMax then 
        hub.call(basicSettings.temperatureID, "setValue", currentValue+x)
        self:updateView ("temperature", "text", "Подогрев входа воздуха: " .. currentValue+x .. " °C")
    end
end


---------------------------------------------------------------------------------
-----------------------------------НАСТРОЙКИ-------------------------------------
---------------------------------------------------------------------------------






1) мне нужно получить температуру с устройств всех который я перечислю ид





function getListOfKeys (listOfProperty) 
    
end


-- Выбор режима счета 
-- СО2 















--[[
1. Создать ВУ типа РЕЛЕ 
2. Добавить кнопки/ярлыки: 

   
        
   
   

    * (ярлык) "" 


    + * (ярлык) "Регулировка температуры:" [РУЧНАЯ / АВТО] - infoMainLabel
    + * (кнопки) [АВТО][РУЧН] - button_mode_switsher {button_mode_auto, button_mode_manual}
    + * (ярлык) "АВТО | t воздуха: "[х]" + "[y]" ("[z]") ℃" - infoAutoLabel 
    -(думай) * (кнопки) [MIN][AVR][MAX][+][-] 
            button_temp_max,button_temp_min,button_temp_avg,button_temp_minus,button_temp_plus onrelease: button_temperature
            где x - результат мин, ср, макс; y - значения дельты, z - результат x+y 
            
    + * (ярлык) "РУЧНАЯ | t воздуха:"[значение]" ℃" - infoManualLabel
    + * (кнопки) [-][+] - on released button_temp_manual {button_temp_manual_m,button_temp_manual_p}



    * (ярлык)   "Регулировка скорости: " [РУЧНАЯ / АВТО] - speedInfoModeLabel
    * (ярлык) "Текущая скорость: "[значение] - speedlabel
    * (кнопки) [авто][выкл][низкая][средняя][высокая] - on released Button_Speed {button_vent_off, button_vent_2,button_vent_3,button_vent_4}





    
    (кнопки) [низкая][средняя][высокая] - on released Button_Speed {button_vent_off, button_vent_2,button_vent_3,button_vent_4}
    * (ярлык) "АВТО | Уровень СО2: " [значение] " ppm - LevelCO2Label
   + * (кнопки) [-50][-10][+10][+50] - onrelease Button_CO2
   {button_co2_m50,button_co2_m10,button_co2_p10,button_co2_p50}
    
   + * (кнопки) [низкая][средняя][высокая] - on released Button_Speed {button_vent_off, button_vent_2,button_vent_3,button_vent_4}
  +  * (ярлык) "Тихий режим: "[значение] - silenceModeLabel
  +  * (кнопки) [вкл][выкл] - Button_SilenceMode {button_silence_on, button_silence_off}
]]--


--[[ Модель ПВВ: SistemAir

    * Режим работы:

        а. Основные:
        1 - Manual, 2 - Crowded, 3 - Refresh, 4 - Fireplace, 5 - Away, 6 - Holiday
        
        б. Дополнительные:
        0 - Auto, 7 - Cooker Hood, 8 - Vacuum Cleaner, 9 .. 11 - CDI, 12 - Pressure Guard

    * Скорость: 0/1 - OFF, 2 - LOW, 3 - NORMAL, 3 - HIGH

    * Температура: 12__30

    v2.01

]]--

-- LABELS = {infoTemperatureLabel, infoSpeedLabel,silenceModeLabel}
--!USEGLOBAL = {lastValue = 2, silenceMode = false, target_CO2 = 400, timeSync = 3 }


---------------------------------------------------------------------------------
-----------------------------------НАСТРОЙКИ-------------------------------------
---------------------------------------------------------------------------------

temperatureMin = 12;
temperatureMax = 25;

---------------------------------------------------------------------------------
---------------------------------ОСНОВНОЙ КОД------------------------------------
---------------------------------------------------------------------------------
-- РАБОЧИЕ ПЕРЕМЕННЫЕ --
-- ID устройств
basicSettings = {
	modeID = nil,			        -- ID режима ПВУ
	fanID = nil,		            -- ID скорости ПВУ
	temperatureID = nil			    -- ID температуры ПВУ
}

LIST_CO2_SENSORS_ID = {

}

LIST_TEMP_SENSORS_ID = {

}



DISCRETE_TEMP_DELTA = 0.5
DISCRETE_TEMP_MANUAL = 0.5
MAX_SILENCE_MODE = 2
timeSync = 3


-- Определение доступных режимов работы

-- Определение доступных скоростей
QuickApp.supportSpeed = {
    [0] = {value = 0, label = "ВЫКЛ"},
    [1] = {value = 1, label = "ВЫКЛ"},
    [2] = {value = 2, label = "Низкая"},
    [3] = {value = 3, label = "Средняя"},
    [4] = {value = 4, label = "Высокая"},
}
QuickApp.supportTempMode = {
    auto = {label = "АВТО"},
    manual = {label = "РУЧНОЙ"},
}
QuickApp.supportSpeedMode = {
    auto = {label = "АВТО"},
    manual = {label = "РУЧНОЙ"},
}

---- ОСНОВНЫЕ ----
-- Вспомогательные функции --
function getSensorsValue(ListOfSensors) 
    local max = 0
    local min = 0
    local avg = 0
    local i   = 0
    for k,v in pairs(ListOfSensors) do
        local value = fibaro.getValue(v, "value")
        if value == nil then goto continue end
        if max < value then max = value end
        if min > value then min = value end
        i = i + 1
        avg = avg + value
        ::continue::
    end
    avg = avg/id
    return {avg, min, max}
end


-- Первый запуск
function QuickApp:onInit()
    
    self:debug("Запуск виртуального устройства")
    

    
    -- Получение данных ID
    basicSettings.modeID = tonumber(self:getVariable("id_mode"))
    basicSettings.fanID = tonumber(self:getVariable("id_speed"))
    basicSettings.temperatureID = tonumber(self:getVariable("id_temperature"))
    
    -- Начальные температуры
    self.temperatures = {
        basic = temperatureMin
        delta = 0
    }
    self.temperatures.target = QuickApp.temperatures.basic + QuickApp.temperatures.delta

    local syncTime = tonumber(self:getVariable("timeSync"))
    if (syncTime > 0) then timeSync = syncTime end
    self.modeDeviceTemp = QuickApp.supportTempMode.auto
    self.modeDeviceSpeed = QuickApp.supportSpeedMode.auto
    self:work()
end

-- Основная функция (рекурсивный вызов с задержкой)
function QuickApp:work()
    -- self:debug("work")
    self:sync()
    hub.setTimeout(timeSync*1000, function() self:work() end)
end


-- Обновление состояния
function QuickApp:sync()
    self:debug("sync")

    -- Обновление состояние статуса ПВУ
    local valueSpeed = tonumber(hub.getValue(basicSettings.fanID, "value"))
    if (valueSpeed >= 2) then 
        if not(hub.getValue(self.id, "value")) then 
            self:updateProperty("value", true)
        end
        -- Сохранение последней установленной скорости
        if (valueSpeed ~= tonumber(self:getVariable("lastValue")) ) then
            self:setVariable("lastValue", valueSpeed)
        end
    else
        if (hub.getValue(self.id, "value")) then 
            self:updateProperty("value", false)
        end
    end

    -- Проверка разрешенного режима
    if (hub.getValue(basicSettings.modeID, "value") ~= 1) then
        hub.call(basicSettings.modeID, "setValue", 1)
    end

    if QuickApp.supportSpeed[valueSpeed] == nil then
        self:debug("Неизвестная скорость - " .. valueSpeed) end 

    -- Обновление информации
    self:updateInfoMainLabel()
    self:updateSpeedLabel()
    self:updateInfoManualLabel ()

end

---- ОБНОВЛЕНИЕ ВИЗУАЛА ----
----------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------
-- Регулировка температуры:
function QuickApp:updateInfoMainLabel () 
    self: updateView ("infoMainLabel", "text", "Регулировка температуры: " .. self.modeDeviceTemp.label) end
-- Изменение значения скорости
function QuickApp:updateSpeedLabel () 
    self: updateView ("speedlabel", "text", "Текущая скорость: " .. self.supportSpeed[tonumber(hub.getValue(basicSettings.fanID, "value")].label) end
-- Обновление информации о автоматическом выборе температуры
function QuickApp:updateInfoAutoLabel ()
    local basic = self.temperatures.basic
    local delta = self.temperatures.delta
    local target = self.temperatures.target
    self:updateView ("infoAutoLabel", "text", "АВТО | t воздуха: "..basic.." + "..delta.."("..target..")℃" ) end
-- Обновление информации о введенной в ручную температуре
function QuickApp:updateInfoManualLabel ()
    temperature = "-"
    if (QuickApp.supportTempMode.manual == self.modeDeviceTemp) then temperature = hub.getValue(basicSettings.temperatureID, "value") end
    self:updateView ("infoManualLabel", "text", "РУЧНОЙ | Подогрев воздуха до: " .. temperature .. " °C") end



---- КНОПКИ ----
----------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------

-- Температура подогреваемого воздуха --
-- Переключение режима обогрева
function QuickApp:button_mode_switsher(event)
    local button = tostring(event.elementName)
    -- CHECK PLACEHOLDER --Поменять ид под конкретное устройство или поменять ид устройств
    local ButtonHolder = {
        button_mode_auto   = self.supportTempMode.auto
        button_mode_manual = self.supportTempMode.manual
    }
    if (ButtonHolder[button] == nil) then self:error("BAD INPUT BUTTON") return; end;
    local buttonProperties = ButtonHolder[button]
    self.modeDeviceTemp = buttonProperties
    self:debug("PUSHED BUTTON" .. event.elementName .. "with result" .. buttonProperties.label)
    self:updateInfoMainLabel()
end




+ * (ярлык) "АВТО | t воздуха: "[х]" + "[y]" ("[z]") ℃" - infoAutoLabel
где x - результат мин, ср, макс; y - значения дельты, z - результат x+y 
   + * (кнопки) [MIN][AVR][MAX][+][-] 
    button_temp_max,button_temp_min,button_temp_avg,button_temp_minus,button_temp_plus onrelease: button_temperature
-- Переключение вентиляции АВТО/РУЧНОЙ--
function QuickApp:button_temperature(event)
    local button = tostring(event.elementName)
    -- CHECK PLACEHOLDER
    --Поменять ид под конкретное устройство или поменять ид устройств
    local ButtonHolder = {
        button_temp_minus   = {change = DISCRETE_TEMP_DELTA * -1, action = false}
        button_temp_min     = {change = false, action = }
        button_temp_avg     = {change = false, action = }
        button_temp_max     = {change = DISCRETE_TEMP_DELTA , action = false}
        button_temp_plus    = DISCRETE_TEMP_DELTA
    }
    if (ButtonHolder[button] == nil) then
        return;
    end;
    local buttonProperties = ButtonHolder[button]
    self: updateView ("silenceModeLabel", "text", buttonProperties.label)
    self:setVariable("silenceMode", buttonProperties.value)
end



-- Ручное редактирование
function QuickApp:button_temp_manual()
    local button = tostring(event.elementName)
    -- CHECK PLACEHOLDER
    --Поменять ид под конкретное устройство или поменять ид устройств
    local ButtonHolder = {
        button_temp_manual_m = DISCRETE_TEMP_MANUAL * -1,
        button_temp_manual_p = DISCRETE_TEMP_MANUAL,
    }
    if (ButtonHolder[button] == nil) then
        return;
    end;
    local currentValue = tonumber(hub.getValue(basicSettings.temperatureID, "value"))
    local x = ButtonHolder[button]
    if currentValue+x >= temperatureMin and currentValue+x <= temperatureMax then 
        hub.call(basicSettings.temperatureID, "setValue", currentValue+x)
    else
        hub.call(basicSettings.temperatureID, "setValue", temperatureMax)
    end
    self:updateInfoManualLabel()
end

-- Переключение вентиляции АВТО/РУЧНОЙ--
function QuickApp:Button_VentMode(event)
    local button = tostring(event.elementName)
    -- CHECK PLACEHOLDER
    --Поменять ид под конкретное устройство или поменять ид устройств
    local ButtonHolder = {
        button_ID_14_2_auto = {value = false, label = "Активорован Тихий режим"},
        button_ID_14_2_manual = {value = true, label = "Тихий режим выключен"},
    }
    if (ButtonHolder[button] == nil) then
        return;
    end;
    local buttonProperties = ButtonHolder[button]
    self: updateView ("silenceModeLabel", "text", buttonProperties.label)
    self:setVariable("silenceMode", buttonProperties.value)
end

-- СО2 
-- Заданный уровень СО2 --
function QuickApp:Button_CO2(event)
    local button = tostring(event.elementName)
    -- CHECK PLACEHOLDER
    --Поменять ид под конкретное устройство или поменять ид устройств
    local ButtonHolder = {
        button_ID_14_2_m50 = -50,
        button_ID_14_2_m10 = -10,
        button_ID_14_2_10 = 10,
        button_ID_14_2_50 = 50,
    }
    if (ButtonHolder[button] == nil) then
        return;
    end;
    local x = ButtonHolder[button]
    local currentValue = tonumber(self:getVariable("target_CO2"))
    if currentValue+x >= co2Min and currentValue+x <= co2Max then
        self:setVariable("target_CO2", currentValue+x)
        self:updateView ("LevelCO2Label", "text", self.modeDevice.label .. "| Заданный уровень СО2, ppm: " .. currentValue+x)
    end
end

-- Регулировка скорости --
function QuickApp:Button_Speed()
    local button = tostring(event.elementName)
    -- CHECK PLACEHOLDER
    --Поменять ид под конкретное устройство или поменять ид устройств
    local ButtonHolder = {
        button_vent_off = {value = 0, label = "ВЫКЛ"},
        button_vent_2 = {value = 2, label = "Низкая"},
        button_vent_3 = {value = 3, label = "Средняя"},
        button_vent_4 = {value = 4, label = "Высокая"},
    }
    if (ButtonHolder[button] == nil) then
        return;
    end;
    local buttonProperties = ButtonHolder[button]
    local valueSpeed = tonumber(hub.getValue(basicSettings.fanID, "value"))
    -- проверка на режим
     
    -- Установка нужной скорости
    if (valueSpeed ~= buttonProperties.value) then
        hub.call(basicSettings.fanID,  "setValue", buttonProperties.value)
    end

    -- Обновление статуса
    if not(hub.getValue(self.id, "value")) then 
        self:updateProperty("value", true)
    end

    -- Обновление информации о скорости ПВУ
    local textSpeed = self.modeDevice.label .. "| Скорость ПВУ: " .. buttonProperties.label
    self:updateView("infoSpeedLabel", "text", textSpeed)

    -- Обновление последней установленной скорости
    self:setVariable("lastValue", buttonProperties.value)

    -- Отладка
    self:debug("Установленая скорость - " .. valueSpeed)
    self:debug("Текст - " .. textSpeed)
     
end

-- Тихий тежим включение и выключение--
function QuickApp:Button_SilenceMode()
    local button = tostring(event.elementName)
    -- CHECK PLACEHOLDER
    --Поменять ид под конкретное устройство или поменять ид устройств
    local ButtonHolder = {
        button_silence_off = {value = false, label = "Активорован Тихий режим"},
        button_ID_14_2_on = {value = true, label = "Тихий режим выключен"},
    }
    if (ButtonHolder[button] == nil) then
        return;
    end;
    local buttonProperties = ButtonHolder[button]
    self:debug(buttonProperties.label)
    self:updateView ("silenceModeLabel", "text", buttonProperties.label)
    self:setVariable("silenceMode", buttonProperties.value)
end