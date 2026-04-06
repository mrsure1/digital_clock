Set WshShell = CreateObject("WScript.Shell")
' 0은 윈도우 창을 숨긴 상태로 실행함을 의미합니다. false는 실행이 끝날 때까지 기다리지 않음을 의미합니다.
' cd /d "D:\MrSure\clock" && npm start 명령을 터미널 창 없이 실행합니다.
WshShell.Run "cmd.exe /c cd /d ""D:\MrSure\clock"" && npm start", 0, false
