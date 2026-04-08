const { ipcRenderer } = require('electron');

// DOM 요소 참조
const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const separatorEl = document.getElementById('separator');
const amRow = document.getElementById('am-row');
const pmRow = document.getElementById('pm-row');
const tempEl = document.getElementById('temp-display');
const closeBtn = document.getElementById('close-btn');
const toggleBtn = document.getElementById('toggle-settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const colorPicker = document.getElementById('color-picker');
const brightnessSlider = document.getElementById('brightness-slider');
const alarmInput = document.getElementById('alarm-time');
const setAlarmBtn = document.getElementById('set-alarm-btn');
const alarmStatus = document.getElementById('alarm-status');
const cityInput = document.getElementById('city-input');
const saveCityBtn = document.getElementById('save-city-btn');

// 상태 변수
let alarmTime = null;
let currentCity = localStorage.getItem('clock-city') || '';
let audioCtx = null;
let activeOscillators = [];

// 저장된 도시가 있으면 입력창에 표시
if (currentCity) {
  cityInput.value = currentCity;
}

// --- 0. 알람 비프음 생성 (Web Audio API) ---
function playAlarmSound() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } else if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  activeOscillators = [];

  const playTone = (freq, startTime, duration) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
    activeOscillators.push(osc);
  };

  const now = audioCtx.currentTime;
  for (let i = 0; i < 10; i++) {
    const timeOffset = i * 0.5;
    playTone(880, now + timeOffset, 0.1);
    playTone(1320, now + timeOffset + 0.15, 0.2);
  }
}

function stopAlarmSound() {
  activeOscillators.forEach(osc => {
    try { osc.stop(); } catch (e) {}
  });
  activeOscillators = [];
}

// --- 1. 시계 업데이트 ---
function updateClock() {
  const now = new Date();
  let rawHours = now.getHours();
  const ampm = rawHours >= 12 ? 'pm' : 'am';

  let h = rawHours % 12;
  h = h ? h : 12;

  const hStr = String(h);
  const mStr = String(now.getMinutes()).padStart(2, '0');

  if (hoursEl) hoursEl.textContent = hStr;
  if (minutesEl) minutesEl.textContent = mStr;

  if (ampm === 'am') {
    if (amRow) amRow.classList.add('active');
    if (pmRow) pmRow.classList.remove('active');
  } else {
    if (pmRow) pmRow.classList.add('active');
    if (amRow) amRow.classList.remove('active');
  }

  // 알람 체크
  const checkH = String(rawHours).padStart(2, '0');
  const checkM = String(now.getMinutes()).padStart(2, '0');
  if (alarmTime && checkH + ':' + checkM === alarmTime) {
    playAlarmSound();
    alert('[알람] 설정하신 시간 ' + alarmTime + ' 입니다!');
    stopAlarmSound();
    alarmTime = null;
    if (alarmStatus) alarmStatus.textContent = '알람 없음';
  }
}

setInterval(() => {
  updateClock();
  if (separatorEl) {
    separatorEl.style.opacity = separatorEl.style.opacity === '0' ? '1' : '0';
  }
}, 500);

// --- 2. 기온 정보 (wttr.in + Open-Meteo 폴백) ---
async function fetchWeather() {
  try {
    const city = currentCity || '';
    const url = 'https://wttr.in/' + city + '?format=%t';
    const response = await fetch(url);
    if (response.ok) {
      const temp = await response.text();
      if (temp && !temp.includes('Unknown') && !temp.includes('Sorry') && temp.trim().length < 15) {
        if (tempEl) tempEl.textContent = temp.trim();
        return;
      }
    }
  } catch (error) {
    console.warn('wttr.in failed, switching to fallback:', error.message);
  }

  try {
    let lat = 37.5665;
    let lon = 126.9780;
    if (currentCity) {
      const geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(currentCity) + '&count=1&language=ko';
      const geoRes = await fetch(geoUrl);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          lat = geoData.results[0].latitude;
          lon = geoData.results[0].longitude;
        }
      }
    }
    const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current_weather=true';
    const weatherRes = await fetch(weatherUrl);
    if (weatherRes.ok) {
      const weatherData = await weatherRes.json();
      if (weatherData.current_weather) {
        const temp = weatherData.current_weather.temperature;
        if (tempEl) tempEl.textContent = temp + String.fromCharCode(176) + 'C';
        return;
      }
    }
  } catch (error) {
    console.error('Fallback weather API also failed:', error);
  }
  if (tempEl) tempEl.textContent = '--' + String.fromCharCode(176) + 'C';
}

fetchWeather();
setInterval(fetchWeather, 1800000);

const MIN_WINDOW_WIDTH = 300;
const MIN_WINDOW_HEIGHT = 80;
const EXPANDED_WINDOW_WIDTH = 500;
const EXPANDED_WINDOW_HEIGHT = 420;
const SETTINGS_EXPANDED_STORAGE_KEY = 'clock-settings-expanded';

function syncSettingsState(isExpanded) {
  localStorage.setItem(SETTINGS_EXPANDED_STORAGE_KEY, isExpanded ? 'true' : 'false');
}

// --- 3. 설정 패널 토글 ---
function toggleSettings(forceClose) {
  if (forceClose) {
    settingsPanel.classList.remove('expanded');
    toggleBtn.classList.remove('active');
  } else {
    settingsPanel.classList.toggle('expanded');
    toggleBtn.classList.toggle('active');
  }

  const isExpanded = settingsPanel.classList.contains('expanded');
  syncSettingsState(isExpanded);
  ipcRenderer.send('resize-window', {
    width: isExpanded ? EXPANDED_WINDOW_WIDTH : MIN_WINDOW_WIDTH,
    height: isExpanded ? EXPANDED_WINDOW_HEIGHT : MIN_WINDOW_HEIGHT,
  });
  
  // 리사이징 함수 호출하여 시계 크기 즉시 조정
  setTimeout(resizeClock, 50); 
}

if (toggleBtn) {
  toggleBtn.onclick = () => toggleSettings(false);
}

const closeSettingsBtn = document.getElementById('close-settings-btn');
if (closeSettingsBtn) {
  closeSettingsBtn.onclick = () => toggleSettings(true);
}

if (localStorage.getItem(SETTINGS_EXPANDED_STORAGE_KEY) === 'true') {
  settingsPanel.classList.add('expanded');
  toggleBtn.classList.add('active');
}

// --- 4. 색상 및 밝기 조절 ---
colorPicker.addEventListener('input', (e) => {
  const color = e.target.value;
  document.documentElement.style.setProperty('--clock-color', color);
  document.documentElement.style.setProperty('--clock-glow', color + '88');
});

brightnessSlider.addEventListener('input', (e) => {
  const brightness = e.target.value;
  document.getElementById('clock-display').style.filter = 'brightness(' + brightness + ')';
});

// --- 5. 알람 설정 ---
setAlarmBtn.addEventListener('click', () => {
  if (alarmInput.value) {
    alarmTime = alarmInput.value;
    alarmStatus.textContent = '설정됨: ' + alarmTime;
  }
});

// --- 5-1. 위치 설정 저장 ---
saveCityBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  currentCity = city;
  localStorage.setItem('clock-city', city);
  fetchWeather();
  alert('위치가 [' + (city || '자동 감지') + '](으)로 설정되었습니다.');
});

// --- 6. 앱 종료 ---
closeBtn.addEventListener('click', () => {
  ipcRenderer.send('close-app');
});

// --- 7. 반응형 폰트 크기 고도화 ---
function resizeClock() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // 설정 패널이 닫혀 있을 때는 화면 전체를 활용, 열려 있을 때는 상단 일부만 활용
  const isExpanded = settingsPanel.classList.contains('expanded');
  const availableHeight = isExpanded ? height * 0.35 : height;
  
  // 가로/세로 중 더 크기를 제한하는 쪽에 맞춰 폰트 사이즈 계산
  const baseSize = Math.min(width * 0.155, availableHeight * 0.72);
  
  if (hoursEl) hoursEl.style.fontSize = baseSize + 'px';
  if (minutesEl) minutesEl.style.fontSize = baseSize + 'px';
  if (separatorEl) separatorEl.style.fontSize = (baseSize * 0.9) + 'px';
  
  if (tempEl) tempEl.style.fontSize = Math.max(baseSize * 0.25, 14) + 'px';
  
  const ampmIndicator = document.getElementById('ampm-indicator');
  if (ampmIndicator) {
    ampmIndicator.style.fontSize = Math.max(baseSize * 0.15, 12) + 'px';
  }
}

window.addEventListener('resize', resizeClock);
window.addEventListener('load', resizeClock);

// 초기 실행
resizeClock();
