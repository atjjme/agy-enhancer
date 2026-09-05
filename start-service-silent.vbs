Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = currentDir
jsScript = currentDir & "\scripts\loader.js"

nodeExe = "node"
defaultNodePath = "D:\Program Files\nodejs\node.exe"
If fso.FileExists(defaultNodePath) Then
    nodeExe = """" & defaultNodePath & """"
End If

' 0 表示完全隐藏窗口运行 node
ws.Run nodeExe & " """ & jsScript & """", 0, False

