# 사이버시계

Electron 기반의 데스크톱 디지털 시계입니다. 투명 배경, 항상 위 표시, 온도 표시, 알람, 색상/밝기 설정을 지원합니다.

## 주요 기능

- 최소 시작 크기 `300x80`
- 종료 직전 창 크기 기억 후 다음 실행 때 복원
- 설정 패널 열림 상태 기억
- 현재 온도 표시
- 12시간제 AM/PM 표시
- 알람 설정
- 알람 설정
- 색상, 밝기 및 배경 투명도 조절

## 실행 방법

### 일반 사용자

1. GitHub 저장소의 `Releases`에서 `DigitalClock_Release.zip`을 다운로드합니다.
2. 압축을 풉니다.
3. `DigitalClock-win32-x64\DigitalClock.exe`를 실행합니다.

주의:

- GitHub의 초록색 `Code > Download ZIP`은 소스코드 아카이브입니다.
- 실행 파일이 들어 있는 배포본은 `Releases`에 올라가는 `DigitalClock_Release.zip`입니다.

### 개발용

```bash
git clone https://github.com/mrsure1/digital_clock.git
cd digital_clock
npm install
npm start
```

## 빌드

개발용 실행:

```bash
npm start
```

배포용 폴더 생성:

```bash
npm run pack:win
```

생성 위치:

- `dist/DigitalClock-win32-x64`

## 저장되는 설정

앱은 다음 정보를 로컬에 저장합니다.

- 마지막 창 크기
- 설정 패널 열림 상태
- 날씨 조회 도시
- 배경 투명도 설정값

## 라이선스

ISC
