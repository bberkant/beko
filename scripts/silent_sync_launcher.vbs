Set WshShell = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
projectDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(scriptDir)
WshShell.CurrentDirectory = projectDir

Do While True
    ' Run Node sync daemon completely hidden in background (0 = hide window, True = wait for exit)
    WshShell.Run "node scripts/run_sync_daemon.js", 0, True
    WScript.Sleep 3000
Loop
