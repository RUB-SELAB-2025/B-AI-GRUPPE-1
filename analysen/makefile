backend: build build/main.o build/data.o build/incoming.o build/outgoing.o config.h
	gcc -o backend build/main.o build/data.o build/incoming.o build/outgoing.o -lwebsockets

build/main.o: main.c
	gcc -o build/main.o -c main.c 

build/data.o: data.c data.h
	gcc -o build/data.o -c data.c 

build/incoming.o: incoming.c incoming.h
	gcc -o build/incoming.o -c incoming.c 

build/outgoing.o: outgoing.c outgoing.h
	gcc -o build/outgoing.o -c outgoing.c 

build:
	mkdir build

