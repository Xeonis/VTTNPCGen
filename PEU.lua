--[[
1. Создать ВУ типа РЕЛЕ 
2. Добавить кнопки/ярлыки: 

   
        


    

    + * (ярлык) "Регулировка температуры:" [РУЧНАЯ / АВТО] - infoMainLabel
    + * (кнопки) [АВТО][РУЧН] - button_mode_switsher {button_mode_auto, button_mode_manual}
    + * (ярлык) "АВТО | t воздуха: "[х]" + "[y]" ("[z]") ℃" - infoAutoLabel 
    -(думай) * (кнопки) [MIN][AVR][MAX][+][-] 
            button_temp_max,button_temp_min,button_temp_avg,button_temp_minus,button_temp_plus onrelease: button_temperature
            где x - результат мин, ср, макс; y - значения дельты, z - результат x+y 

    + * (ярлык) "РУЧНАЯ | t воздуха:"[значение]" ℃" - infoManualLabel
    + * (кнопки) [-][+] - on released button_temp_manual {button_temp_manual_m,button_temp_manual_p}

    * (ярлык) "" 


    + * (ярлык)   "Регулировка скорости: " [РУЧНАЯ / АВТО] - speedInfoModeLabel
    + * (ярлык) "Текущая скорость: "[значение] - speedlabel
    + * (кнопки) [авто][выкл][низкая][средняя][высокая] - on released Button_Speed {button_vent_off, button_vent_2,button_vent_3,button_vent_4}
      -  * (ярлык) "АВТО | Уровень СО2: " [значение] " ppm - LevelCO2Label
     - * (кнопки) [-50][-10][+10][+50] - onrelease Button_CO2




    
    (кнопки) [низкая][средняя][высокая] - on released Button_Speed {button_vent_off, button_vent_2,button_vent_3,button_vent_4}

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
QuickApp = {}
fibaro = {}
hub = {}
---------------------------------------------------------------------------------
-----------------------------------НАСТРОЙКИ-------------------------------------
---------------------------------------------------------------------------------

temperatureMin = 12;
temperatureMax = 25;
DeltaMax = 3;
DeltaMin = -3;
co2Min = 300;
co2Max = 1500;
-- Шаг счета дельты
DISCRETE_TEMP_DELTA = 0.5
-- Шаг счета температуры в ручной режиме
DISCRETE_TEMP_MANUAL = 0.5
-- Максимальный уровень скорости при активной тихом режиме
MAX_SILENCE_MODE = 2
-- Время обновления
timeSync = 3

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
    avg = avg/i
    return {avg, min, max}
end
-- Команды апаратам--
function QuickApp:setSpeed() 
    
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
    
    if QuickApp.supportSpeed[valueSpeed] == nil then
        self:debug("Неизвестная скорость - " .. valueSpeed) end 

     if 
end;





-- Первый запуск
function QuickApp:onInit()
    self:debug("Запуск виртуального устройства")
    
    -- Получение данных ID
    basicSettings.modeID = tonumber(self:getVariable("id_mode"))
    basicSettings.fanID = tonumber(self:getVariable("id_speed"))
    basicSettings.temperatureID = tonumber(self:getVariable("id_temperature"))
    
    -- Начальные температуры
    self.temperatures = {
        basic = temperatureMin,
        delta = 0
    }
    self.temperatures.target = self.temperatures.basic + self.temperatures.delta

    self.reasonByActive = {}

    if (self.modeDeviceTemp == self.supportTempMode.auto) then

    end;

    local syncTime = tonumber(self:getVariable("timeSync"))
    if (syncTime > 0) then timeSync = syncTime end
    self.modeDeviceTemp = self.supportTempMode.auto
    self.modeDeviceSpeed = self.supportSpeedMode.auto

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


    self:setSpeed()

    --Нужно ли это тут?
    -- Проверка разрешенного режима
    if (hub.getValue(basicSettings.modeID, "value") ~= 1) then
        hub.call(basicSettings.modeID, "setValue", 1)
    end


    --    
    

    -- Обновление информации
    self:updateInfoMainLabel()
    self:updateSpeedLabel()
    self:updateInfoManualLabel()
    self:updateSpeedInfoModeLabel()

end

---- ОБНОВЛЕНИЕ ВИЗУАЛА ----
----------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------

-- Регулировка температуры:
function QuickApp:updateInfoMainLabel () 
    self: updateView ("infoMainLabel", "text", "Регулировка температуры: " .. self.modeDeviceTemp.label) end
    
-- Изменение значения скорости
function QuickApp:updateSpeedLabel () 
    self: updateView ("speedlabel", "text", "Текущая скорость: " .. self.supportSpeed[tonumber(hub.getValue(basicSettings.fanID, "value"))].label) end

-- Обновление информации о автоматическом выборе температуры
function QuickApp:updateInfoAutoLabel ()
    local basic = self.temperatures.basic
    local delta = self.temperatures.delta
    local target = self.temperatures.target
    self:updateView ("infoAutoLabel", "text", "АВТО | t воздуха: "..basic.." + "..delta.."("..target..")℃" ) end
    
-- Обновление информации о введенной в ручную температуре
function QuickApp:updateInfoManualLabel ()
    local temperature = "-"
    if (self.supportTempMode.manual == self.modeDeviceTemp) then temperature = hub.getValue(basicSettings.temperatureID, "value") end
    self:updateView ("infoManualLabel", "text", "РУЧНОЙ | Подогрев воздуха до: " .. temperature .. " °C") end

-- Обновление информации о режиме вентиляции
function QuickApp:updateSpeedInfoModeLabel () self:updateView ("speedInfoModeLabel", "text", "Регулировка скорости: " .. self.modeDeviceSpeed.label .. " °C") end






---- КНОПКИ ----
----------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------
----------------------------------------------
-- Температура подогреваемого воздуха --
-- Переключение режима обогрева
function QuickApp:button_mode_switsher(event)
    local button = tostring(event.elementName)
    -- CHECK PLACEHOLDER --Поменять ид под конкретное устройство или поменять ид устройств
    local ButtonHolder = {
        button_mode_auto   = self.supportTempMode.auto,
        button_mode_manual = self.supportTempMode.manual
    }
    if (ButtonHolder[button] == nil) then self:error("BAD INPUT BUTTON") return; end;
    local buttonProperties = ButtonHolder[button]
    self.modeDeviceTemp = buttonProperties
    self:debug("PUSHED BUTTON" .. event.elementName .. "with result" .. buttonProperties.label)
    self:updateInfoMainLabel()
end


-- +- auto avg min max --
function QuickApp:button_temperature(event)
    local button = tostring(event.elementName)
    -- CHECK PLACEHOLDER
    --Поменять ид под конкретное устройство или поменять ид устройств
    local ButtonHolder = {
        button_temp_minus   = DISCRETE_TEMP_DELTA * -1,
        button_temp_plus    = DISCRETE_TEMP_DELTA
    }
    local ButtonHolder2 = {
        button_temp_min     = 1, -- дописать логику переключения
        button_temp_avg     = 1,
        button_temp_max     = 1
    }

    if (ButtonHolder[button] ~= nil) then
        local x = ButtonHolder[button]
        if self.temperatures.delta+x >= DeltaMin and self.temperatures.delta+x <= DeltaMax then 
            self.temperatures.delta = self.temperatures.delta + x
        end
        self:debug("PUSHED BUTTON" .. event.elementName)
        self:updateInfoAutoLabel()
    elseif ButtonHolder2[button] ~= nil then
        local x = ButtonHolder[button]
        -- допиши меня
        Broke
        self:debug("PUSHED BUTTON" .. event.elementName)
        self:updateInfoAutoLabel()
    else
        self:error("BAD INPUT BUTTON") return; end;
    end;
end



-- Ручное редактирование температуры
function QuickApp:button_temp_manual(event)
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


----------------------------------------------
----------------------------------------------
-- Скорость потока --
-- Переключение вентиляции АВТО/РУЧНОЙ--
function QuickApp:Button_VentMode(event)
    local button = tostring(event.elementName)
    -- CHECK PLACEHOLDER --Поменять ид под конкретное устройство или поменять ид устройств
    local ButtonHolder = {
        button_mode_auto   = self.supportSpeedMode.auto,
        button_mode_manual = self.supportSpeedMode.manual
    }
    if (ButtonHolder[button] == nil) then self:error("BAD INPUT BUTTON") return; end;
    local buttonProperties = ButtonHolder[button]
    self.modeDeviceSpeed = buttonProperties
    self:debug("PUSHED BUTTON" .. event.elementName .. "with result" .. buttonProperties.label)
    self:updateSpeedInfoModeLabel()
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
function QuickApp:Button_Speed(event)
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
function QuickApp:Button_SilenceMode(event)
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