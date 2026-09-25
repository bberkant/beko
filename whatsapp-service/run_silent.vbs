Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
Do While True
    WshShell.Run "node.exe whatsapp-gateway.mjs", 0, True
    WScript.Sleep 3000
Loop
