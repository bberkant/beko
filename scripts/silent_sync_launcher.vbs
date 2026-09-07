Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Find script directory and project directory
scriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
projectDir = FSO.GetParentFolderName(scriptDir)

' If run from Startup folder or elsewhere, locate projectDir
If Not FSO.FileExists(projectDir & "\scripts\run_sync_daemon.js") Then
    If FSO.FileExists(scriptDir & "\scripts\run_sync_daemon.js") Then
        projectDir = scriptDir
    Else
        candidate1 = "C:\Users\berka\.gemini\antigravity\scratch\beko-guncel"
        If FSO.FileExists(candidate1 & "\scripts\run_sync_daemon.js") Then
            projectDir = candidate1
        End If
    End If
End If

WshShell.CurrentDirectory = projectDir

Do While True
    ' Run Node sync daemon completely hidden in background (0 = hide window, True = wait for exit)
    WshShell.Run "node scripts/run_sync_daemon.js", 0, True
    WScript.Sleep 3000
Loop
