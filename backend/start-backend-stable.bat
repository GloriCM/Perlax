@echo off
cd src\Host\Perlax.Web
ping -t 127.0.0.1 | dotnet bin\Debug\net9.0\Perlax.Web.dll
