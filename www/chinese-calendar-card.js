const CARD_VERSION = '0.1.0';
const ENGLISH_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
const CHINESE_MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', 
                        '七月', '八月', '九月', '十月', '十一月', '十二月'];
const WEEKDAYS = ['星期日   Sunday', '星期一   Monday', '星期二   Tuesday', '星期三   Wednesday', 
                  '星期四   Thursday', '星期五   Friday', '星期六   Saturday'];

class ChineseCalendarCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._initialized = false;
        this._lastHass = null;
        this._elements = {};
        this.loadOpenCC();
    }

    loadOpenCC() {
        if (!window.OpenCC) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/cn2t.js';
            script.onload = () => {
                console.log('opencc-js 已載入');
                this.render();
            };
            script.onerror = () => console.error('無法載入 opencc-js');
            document.head.appendChild(script);
        } else {
            this.render();
        }
    }

    setConfig(config) {
        if (!config.date_entity || !config.time_entity || !config.lunar_entity || 
            !config.yi_entity || !config.ji_entity || !config.rolling_text_entity || 
            !config.today_entity || !config.lunar_year_entity) {
            throw new Error('請在配置中指定所有實體');
        }
        this.config = {
            ...config,
            holidayColor: config.holidayColor || '#CC0000',
            workdayColor: config.workdayColor || '#006400'
        };
        this.render();
    }

    set hass(hass) {
        this._hass = hass;
        if (this.needsRender(hass)) {
            this._lastHass = hass;
            this.render();
        }
    }

    needsRender(newHass) {
        if (!this._lastHass || !this.config) return true;
        const entities = [
            this.config.date_entity,
            this.config.time_entity,
            this.config.lunar_entity,
            this.config.yi_entity,
            this.config.ji_entity,
            this.config.rolling_text_entity,
            this.config.today_entity,
            this.config.lunar_year_entity,
            this.config.workday_entity
        ].filter(Boolean);
        return entities.some(entity => {
            const newState = newHass.states[entity]?.state || 'N/A';
            const oldState = this._lastHass.states[entity]?.state || 'N/A';
            return newState !== oldState;
        });
    }

    fixConversion(text) {
        return text.replace(/衝/g, '沖');
    }

    prepareData() {
        const converter = window.OpenCC.Converter({ from: 'cn', to: 'tw' });
        const dateState = this._hass.states[this.config.date_entity];
        const timeState = this._hass.states[this.config.time_entity];
        const dateStr = dateState ? dateState.state : 'N/A';
        const timeStr = timeState ? timeState.state : 'N/A';

        const date = dateStr !== 'N/A' ? new Date(dateStr) : new Date();
        const formatTime = (time) => {
            const [hours, minutes] = time.split(':');
            let hourNum = parseInt(hours, 10);
            const ampm = hourNum >= 12 ? 'PM' : 'AM';
            hourNum = hourNum % 12 || 12;
            return `${String(hourNum).padStart(2, '0')}:${minutes} ${ampm}`;
        };

        const workdayEntity = this.config.workday_entity ? this._hass.states[this.config.workday_entity] : null;
        const isSunday = date.getDay() === 0;
        const isHoliday = workdayEntity && workdayEntity.state === 'off';

        return {
            englishMonth: ENGLISH_MONTHS[date.getMonth()],
            year: date.getFullYear(),
            chineseMonth: CHINESE_MONTHS[date.getMonth()],
            day: date.getDate(),
            weekday: WEEKDAYS[date.getDay()],
            formattedTime: timeStr !== 'N/A' ? formatTime(timeStr) : 'N/A',
            lunarYear: this._hass.states[this.config.lunar_year_entity] ? this.fixConversion(converter(this._hass.states[this.config.lunar_year_entity].state)) : 'N/A',
            lunar: this._hass.states[this.config.lunar_entity] ? this.fixConversion(converter(this._hass.states[this.config.lunar_entity].state)) : 'N/A',
            yi: this._hass.states[this.config.yi_entity] ? this._hass.states[this.config.yi_entity].state.split(' ').map(item => this.fixConversion(converter(item.trim()))) : ['無'],
            ji: this._hass.states[this.config.ji_entity] ? this._hass.states[this.config.ji_entity].state.split(' ').map(item => this.fixConversion(converter(item.trim()))) : ['無'],
            eventSummary: this._hass.states[this.config.rolling_text_entity] ? this.fixConversion(this._hass.states[this.config.rolling_text_entity].state) : '無日程',
            todayText: this._hass.states[this.config.today_entity] ? this.fixConversion(converter(this._hass.states[this.config.today_entity].state)) : 'N/A',
            themeColor: isSunday || isHoliday ? this.config.holidayColor : this.config.workdayColor
        };
    }

    render() {
        if (!this._hass || !this.config || !window.OpenCC) return;

        const shadow = this.shadowRoot;
        const data = this.prepareData();

        if (!this._initialized) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = new URL(`chinese-calendar-card.css?v=${CARD_VERSION}`, import.meta.url).href;
            shadow.appendChild(link);

            shadow.innerHTML += `
                <div class="calendar">
                    <div class="header">
                        <div class="english-month"></div>
                        <div class="year"></div>
                        <div class="chinese-month"></div>
                    </div>
                    <div class="current-time"></div>
                    <div class="date"></div>
                    <div class="content-wrapper">
                        <div class="today-text"></div>
                        <table class="table-container">
                            <tr>
                                <td class="suitable">宜<br><div class="yi-ji-container"></div></td>
                                <td class="weekday-lunar"></td>
                                <td class="forbidden">忌<br><div class="yi-ji-container"></div></td>
                            </tr>
                        </table>
                        <div class="schedule-container">
                            <div class="schedule-text"></div>
                        </div>
                    </div>
                </div>
            `;

            this._elements.calendar = shadow.querySelector('.calendar');
            this._elements.header = shadow.querySelector('.header');
            this._elements.englishMonth = shadow.querySelector('.english-month');
            this._elements.year = shadow.querySelector('.year');
            this._elements.chineseMonth = shadow.querySelector('.chinese-month');
            this._elements.currentTime = shadow.querySelector('.current-time');
            this._elements.date = shadow.querySelector('.date');
            this._elements.todayText = shadow.querySelector('.today-text');
            this._elements.table = shadow.querySelector('.table-container');
            this._elements.suitable = shadow.querySelector('.suitable .yi-ji-container');
            this._elements.forbidden = shadow.querySelector('.forbidden .yi-ji-container');
            this._elements.weekdayLunar = shadow.querySelector('.weekday-lunar');
            this._elements.scheduleContainer = shadow.querySelector('.schedule-container');
            this._elements.scheduleText = shadow.querySelector('.schedule-text');
            this._initialized = true;
        }

        this.updateElements(data);
    }

    updateElements(data) {
        // 設置主題色變量
        this._elements.calendar.style.setProperty('--theme-color', data.themeColor);

        this.updateWithFade(this._elements.englishMonth, data.englishMonth);
        this.updateWithFade(this._elements.year, data.year);
        this.updateWithFade(this._elements.chineseMonth, data.chineseMonth);
        this.updateWithFade(this._elements.currentTime, data.formattedTime);
        this.updateWithFade(this._elements.date, data.day);
        this.updateWithFade(this._elements.todayText, data.todayText);

        this.updateWithFade(this._elements.suitable, data.yi.join('<br>'), null, null, true);
        this.updateWithFade(this._elements.forbidden, data.ji.join('<br>'), null, null, true);

        const newWeekdayContent = `<span class="highlight-weekday">${data.weekday}</span><div class="lunar-year">${data.lunarYear}</div>${data.lunar}`;
        this.updateWithFade(this._elements.weekdayLunar, newWeekdayContent, null, null, true);

        this.updateWithFade(this._elements.scheduleText, data.eventSummary);
        this.updateMarquee();
    }

    updateWithFade(element, newValue, styleProp = null, styleValue = null, isHTML = false) {
        if ((isHTML && element.innerHTML !== newValue) || (!isHTML && element.textContent !== String(newValue))) {
            element.classList.remove('fade-in');
            void element.offsetWidth; // 觸發重繪
            if (isHTML) {
                element.innerHTML = newValue;
            } else {
                element.textContent = newValue;
            }
            if (styleProp) element.style[styleProp] = styleValue;
            element.classList.add('fade-in');
        }
    }

    updateMarquee() {
        requestAnimationFrame(() => {
            if (this._elements.scheduleText.scrollWidth > this._elements.scheduleText.clientWidth) {
                const containerWidth = this._elements.scheduleText.clientWidth;
                const contentWidth = this._elements.scheduleText.scrollWidth;
                const speed = 50;
                const duration = (contentWidth + containerWidth) / speed;
                this._elements.scheduleText.style.setProperty('--marquee-duration', `${duration}s`);
                this._elements.scheduleText.classList.add('overflow');
            } else {
                this._elements.scheduleText.classList.remove('overflow');
            }
        });
    }

    static getConfigElement() {
        return document.createElement('chinese-calendar-card-config');
    }

    static getStubConfig() {
        return {
            date_entity: 'sensor.date',
            time_entity: 'sensor.time',
            lunar_entity: 'sensor.lunar',
            yi_entity: 'sensor.yi',
            ji_entity: 'sensor.ji',
            rolling_text_entity: 'input_text.calendar',
            today_entity: 'sensor.today',
            lunar_year_entity: 'sensor.lunar_year',
            workday_entity: 'binary_sensor.workday',
            holidayColor: '#CC0000',
            workdayColor: '#006400'
        };
    }
}

class ChineseCalendarCardConfig extends HTMLElement {
    setConfig(config) {
        this.innerHTML = `
            <div>
                <paper-input label="Date Entity" value="${config.date_entity || 'sensor.date'}"></paper-input>
                <paper-input label="Time Entity" value="${config.time_entity || 'sensor.time'}"></paper-input>
                <paper-input label="Lunar Entity" value="${config.lunar_entity || 'sensor.lunar'}"></paper-input>
                <paper-input label="Yi Entity" value="${config.yi_entity || 'sensor.yi'}"></paper-input>
                <paper-input label="Ji Entity" value="${config.ji_entity || 'sensor.ji'}"></paper-input>
                <paper-input label="Rolling Text Entity" value="${config.rolling_text_entity || 'input_text.calendar'}"></paper-input>
                <paper-input label="Today Entity" value="${config.today_entity || 'sensor.today'}"></paper-input>
                <paper-input label="Lunar Year Entity" value="${config.lunar_year_entity || 'sensor.lunar_year'}"></paper-input>
                <paper-input label="Workday Entity" value="${config.workday_entity || 'binary_sensor.workday'}"></paper-input>
                <paper-input label="Holiday Color" value="${config.holidayColor || '#CC0000'}"></paper-input>
                <paper-input label="Workday Color" value="${config.workdayColor || '#006400'}"></paper-input>
            </div>
        `;
    }
}

customElements.define('chinese-calendar-card', ChineseCalendarCard);
customElements.define('chinese-calendar-card-config', ChineseCalendarCardConfig);