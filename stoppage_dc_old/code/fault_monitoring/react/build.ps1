$scriptpath = $MyInvocation.MyCommand.Path
$dir = Split-Path $scriptpath
Write-host "My directory is $dir"

cd $dir

npm run build
copy -Path .\build\* -Destination ..\static\ -PassThru -Force -Recurse
copy -Path .\build\* -Destination ..\..\static\ -PassThru -Force -Recurse
copy -Path .\build\index.html -Destination ..\templates\index.html -Force