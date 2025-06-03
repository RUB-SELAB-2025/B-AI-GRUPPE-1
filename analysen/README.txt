1. libwebsockets installieren:
-----------------------------

MSYS2 Installieren

in der MINGW64 konsole:
pacman -Syu
pacman -S mingw-w64-x86_64-gcc
pacman -S mingw-w64-x86_64-libwebsockets

wenn alles geklappt hat:
/mingw64/include/ | grep libwebsockets
=> libwebsockets.h 


2. compilen:
-----------
gcc -o backend.exe backend.c -lwebsockets

