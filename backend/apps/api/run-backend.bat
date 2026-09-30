@echo off
set "JAVA_HOME=C:\Program Files\Java\jdk-21.0.11"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "DB_PORT=5433"
echo Starting Foodie Backend using %JAVA_HOME%...
call .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"

