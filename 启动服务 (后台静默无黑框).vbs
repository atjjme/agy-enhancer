Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
jsScript = currentDir & "\scripts\loader.js"

' 0 表示完全隐藏窗口运行 node
ws.Run "node """ & jsScript & """", 0, False
