Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get script directory
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Start server hidden (window style 0 = hidden)
WshShell.Run "cmd /c cd /d """ & scriptDir & """ && npm start", 0, False

' Wait 4 seconds for server to start
WScript.Sleep 4000

' Open browser
WshShell.Run "http://localhost:3001"
