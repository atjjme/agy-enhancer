Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptsDir = fso.GetParentFolderName(WScript.ScriptFullName)
rootDir = fso.GetParentFolderName(scriptsDir)
ws.CurrentDirectory = rootDir

targetJs = scriptsDir & "\loader.js"
If WScript.Arguments.Count > 0 Then
    targetJs = WScript.Arguments(0)
End If

nodeExe = "node"
If fso.FileExists("C:\Program Files\nodejs\node.exe") Then
    nodeExe = Chr(34) & "C:\Program Files\nodejs\node.exe" & Chr(34)
ElseIf fso.FileExists("D:\Program Files\nodejs\node.exe") Then
    nodeExe = Chr(34) & "D:\Program Files\nodejs\node.exe" & Chr(34)
End If

cmd = nodeExe & " " & Chr(34) & targetJs & Chr(34)
ws.Run cmd, 0, False
