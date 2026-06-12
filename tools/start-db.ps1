# Starts the portable PostgreSQL server (run before working on the project).
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
& "$root\pgsql\bin\pg_ctl.exe" -D "$root\pgdata" -l "$root\pg.log" start
