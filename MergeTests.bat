@echo off
echo CURRENT_DIR=%~dp0

set TMP_TEST_JS=%1
set SOURCE_FILE_NAMES=Graph

call %~dp0MergeSources.bat %TMP_TEST_JS% %SOURCE_FILE_NAMES%

@REM set TEST_UTIL_FILE_NAMES=TestGlobals
@REM for %%n in (%TEST_UTIL_FILE_NAMES%) do (
@REM     if exist %~dp0Tests\%%n.js (
@REM         type %~dp0Tests\%%n.js>>%TMP_TEST_JS%
@REM     ) else (
@REM         echo %~dp0Tests\%%n.js was not found
@REM     )
@REM )

setlocal enabledelayedexpansion

set TEST_FILE_NAMES=Graph
for %%n in (%TEST_FILE_NAMES%) do (
    if exist %~dp0Tests\%%n.test.js (
        type %~dp0Tests\%%n.test.js>>%TMP_TEST_JS%
    ) else (
        echo %~dp0Tests\%%n.test.js was not found
    )
)

endlocal
