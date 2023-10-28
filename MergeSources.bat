@echo off
pushd %~dp0


set output_js=%1
shift
set filenames=
:CHECK_AND_SHIFT_ARGS
if "%1"=="" goto END_PARSE_ARGS
set filenames=%filenames% %1
shift
goto CHECK_AND_SHIFT_ARGS
:END_PARSE_ARGS

echo %output_js%
echo %filenames%
break>%output_js%

setlocal enabledelayedexpansion
for %%n in (%filenames%) do (
    if not exist %%n.js (
        echo %%n.js was not found
    ) else (
        type %%n.js>>%output_js%
    )
)

endlocal

popd
