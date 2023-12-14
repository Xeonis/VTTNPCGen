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







