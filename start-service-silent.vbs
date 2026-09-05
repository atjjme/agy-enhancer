Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = currentDir
jsScript = currentDir & "\scripts\loader.js"

nodeExe = "node"
If fso.FileExists("C:\Program Files\nodejs\node.exe") Then
    nodeExe = """C:\Program Files\nodejs\node.exe"""
ElseIf fso.FileExists("D:\Program Files\nodejs\node.exe") Then
    nodeExe = """D:\Program Files\nodejs\node.exe"""
End If

' 0 表示完全隐藏窗口运行 node
ws.Run nodeExe & " """ & jsScript & """", 0, False

