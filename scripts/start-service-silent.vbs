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
    nodeExe = """C:\Program Files\nodejs\node.exe"""
ElseIf fso.FileExists("D:\Program Files\nodejs\node.exe") Then
    nodeExe = """D:\Program Files\nodejs\node.exe"""
End If

ws.Run nodeExe & " """ & targetJs & """", 0, False
