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

let alarmTime = null;
let currentCity = localStorage.getItem('clock-city') || '';
let audioCtx = null;
let activeOscillators = []; // 현재 재생 중인 소리들을 추적

// 0. 사이버 알람 소리 생성 함수 (Web Audio API)
function playAlarmSound() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } else if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  // 이전 소리 목록 초기화
  activeOscillators = [];

  const playTone = (freq, startTime, duration) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine'; // 부드러운 소리
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
    
    activeOscillators.push(osc); // 트래킹 추가
  };

  // 프리미엄 사이버 비프음 시퀀스를 5초 동안 반복 (0.5초 간격 * 10회)
  const now = audioCtx.currentTime;
  for (let i = 0; i < 10; i++) {
    const timeOffset = i * 0.5;
    playTone(880, now + timeOffset, 0.1);         // 첫 번째 톤
    playTone(1320, now + timeOffset + 0.15, 0.2); // 두 번째 톤
  }
}

// 알람 소리 즉시 정지 함수
function stopAlarmSound() {
  activeOscillators.forEach(osc => {
    try {
      osc.stop();
    } catch (e) {
      // 이미 멈춘 경우 무시
    }
  });
  activeOscillators = [];
}

// 저장된 도시가 있으면 입력창에 표시
if (currentCity) {
  cityInput.value = currentCity;
}

// 1. 실시간 시계 및 깜빡임 로직
function updateClock() {
  const now = new Date();
  let rawHours = now.getHours();
  const ampm = rawHours >= 12 ? '오후' : '오전';
  
  // 12시간제로 변환
  let h = rawHours % 12;
  h = h ? h : 12; // 0시를 12시로 표시
  
  // 맨 앞 시간이 1자리일 때 0을 제거 (String 변환 시 자동으로 0 없음)
  const hStr = String(h);
  const mStr = String(now.getMinutes()).padStart(2, '0');

  hoursEl.textContent = hStr;
  minutesEl.textContent = mStr;

  // 오전/오후 표시기 업데이트
  if (ampm === '오전') {
    amRow.classList.add('active');
    pmRow.classList.remove('active');
  } else {
    pmRow.classList.add('active');
    amRow.classList.remove('active');
  }

  // 알람 체크
  const checkH = String(rawHours).padStart(2, '0');
  const checkM = String(now.getMinutes()).padStart(2, '0');
  if (alarmTime && `${checkH}:${checkM}` === alarmTime) {
    playAlarmSound(); 
    alert(`[알람] 설정하신 시간 ${alarmTime} 입니다!`);
    stopAlarmSound(); // 알람 창을 닫으면 소리 정지
    alarmTime = null;
    alarmStatus.textContent = '알람 없음';
  }
}

// 0.5초마다 호출하여 ":" 깜빡임 구현 (시계는 1초마다 업데이트해도 됨)
setInterval(() => {
  updateClock();
  separatorEl.style.opacity = separatorEl.style.opacity === '0' ? '1' : '0';
}, 500);

// 2. 기온 정보 가져오기 (wttr.in)
async function fetchWeather() {
  try {
    const city = currentCity ? `${currentCity}` : '';
    // format=%t : 기온만 가져옴 (예: +15°C)
    // 도시명이 있으면 그 도시를, 없으면 IP 기반 자동 감지
    const url = `https://wttr.in/${city}?format=%t`;
    const response = await fetch(url);
    if (response.ok) {
      const temp = await response.text();
      tempEl.textContent = temp.trim();
    } else {
      tempEl.textContent = '--°C';
    }
  } catch (error) {
    console.error('날씨 정보를 가져오는 데 실패했습니다:', error);
    tempEl.textContent = '연결 오류';
  }
}

// 초기 호출 및 30분마다 업데이트
fetchWeather();
setInterval(fetchWeather, 1800000);

// 3. 설정 패널 토글
toggleBtn.addEventListener('click', () => {
  const isExpanded = settingsPanel.classList.toggle('expanded');
  toggleBtn.textContent = isExpanded ? '설정 닫기 ▴' : '명령 설정 ▾';
});

// 4. 색상 및 밝기 조절
colorPicker.addEventListener('input', (e) => {
  const color = e.target.value;
  document.documentElement.style.setProperty('--clock-color', color);
  document.documentElement.style.setProperty('--clock-glow', `${color}88`);
});

brightnessSlider.addEventListener('input', (e) => {
  const brightness = e.target.value;
  // 시계 표시부 전체에 필터 적용
  document.getElementById('clock-display').style.filter = `brightness(${brightness})`;
});

// 5. 알람 설정
setAlarmBtn.addEventListener('click', () => {
  if (alarmInput.value) {
    alarmTime = alarmInput.value;
    alarmStatus.textContent = `설정됨: ${alarmTime}`;
  }
});

// 5-1. 위치(도시) 설정 저장 및 날씨 새로고침
saveCityBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  currentCity = city;
  localStorage.setItem('clock-city', city);
  fetchWeather(); // 즉시 새로고침
  alert(`위치가 '${city || '자동 감지'}'으로 설정되었습니다.`);
});

// 6. 앱 종료
closeBtn.addEventListener('click', () => {
  ipcRenderer.send('close-app');
});

// 7. 창 크기에 따른 폰트 크기 반응형 조절
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  // 너비나 높이 중 작은 쪽에 맞춰 폰트 크기 계산 (약간의 오프셋 고려)
  const baseSize = Math.min(width / 5, height / 2);
  hoursEl.style.fontSize = `${baseSize}px`;
  minutesEl.style.fontSize = `${baseSize}px`;
  separatorEl.style.fontSize = `${baseSize * 0.9}px`;
});

// 초기 실행 시점에 리사이즈 이벤트 강제 발생시켜 크기 맞춤
window.dispatchEvent(new Event('resize'));
